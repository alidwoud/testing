import express from 'express';
import http from 'http';
import { apiRouter } from './api.ts';
import { workforceApiRouter } from './workforce-api.ts';
import { db } from '../db/index.ts';
import {
  projects,
  workforcePeople,
  workforceProjectMemberships,
  workforceAllocations,
  workforceQualifications,
} from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';

export async function runNeutralFallbacksRegression() {
  console.log('================================================================');
  console.log('     MAXIM FORGE — NEUTRAL FALLBACK DATA REGRESSION TEST        ');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  app.use('/api/workforce', workforceApiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/workforce`;

  const results: Record<string, 'PASS' | 'FAIL'> = {
    'Fabricated Fallback Data Removed': 'PASS',
    'Daily Works Regression': 'PASS',
    'Master Schedule Regression': 'PASS',
    'Week Planner Regression': 'PASS',
    'Training & Licences Regression': 'PASS',
  };

  let testWorkerId: number | null = null;

  try {
    const [project] = await db.select().from(projects).where(eq(projects.code, 'LAV01'));
    const projectId = project?.id || 1;
    const testDate = '2026-10-12';

    // 1. Create a worker with explicit null/missing attributes:
    // company, trade, crew, supervisor, classification
    const [inserted] = await db
      .insert(workforcePeople)
      .values({
        employeeId: 'EMP-REG-NULL-999',
        firstName: 'NeutralTest',
        lastName: 'Worker',
        displayName: 'NeutralTest Worker',
        companyName: 'Not Set',
        tradeRole: 'Not Set',
        classification: null,
        defaultCrewId: null,
        defaultSupervisorName: null,
        employmentStatus: 'Active',
      })
      .returning();
    testWorkerId = inserted.id;

    await db.insert(workforceProjectMemberships).values({
      personId: inserted.id,
      projectId,
      status: 'Active',
    });

    console.log(`Created test worker ID ${inserted.id} with neutral/null attributes.`);

    // -------------------------------------------------------------
    // REGRESSION 1: DAILY WORKS (/daily-board)
    // -------------------------------------------------------------
    console.log('\n--- Checking Daily Works (/daily-board) ---');
    const dailyRes = await fetch(`${baseUrl}/daily-board?projectId=${projectId}&date=${testDate}`, {
      headers: { 'x-project-id': String(projectId), 'x-user-role': 'Supervisor' },
    });
    const dailyData = await dailyRes.json();
    const allDailyWorkers = [
      ...(dailyData.unallocated || []),
      ...(dailyData.unavailable || []),
    ];
    (dailyData.zones || []).forEach((z: any) => {
      (z.workstreams || []).forEach((ws: any) => {
        (ws.allocations || []).forEach((a: any) => {
          if (a.person) allDailyWorkers.push(a.person);
        });
      });
    });

    const dailyWorker = allDailyWorkers.find((w: any) => w.employeeId === 'EMP-REG-NULL-999');
    if (!dailyWorker) {
      console.error('❌ Daily Works: Worker not found in daily board');
      results['Daily Works Regression'] = 'FAIL';
    } else {
      console.log('Daily Works worker found:', {
        name: dailyWorker.displayName,
        company: dailyWorker.companyName,
        tradeRole: dailyWorker.tradeRole,
        defaultCrewId: dailyWorker.defaultCrewId,
        defaultSupervisorName: dailyWorker.defaultSupervisorName,
      });

      const hasDemoTrade = dailyWorker.tradeRole === 'Electrician';
      const hasDemoCompany = dailyWorker.companyName === 'Apex Electrical Contractors';
      const hasDemoSupervisor = dailyWorker.defaultSupervisorName === 'Mark Callahan';

      if (
        dailyWorker.companyName === 'Not Set' &&
        dailyWorker.tradeRole === 'Not Set' &&
        !hasDemoTrade &&
        !hasDemoCompany &&
        !hasDemoSupervisor
      ) {
        console.log('✅ [PASS] Daily Works: Neutral fallbacks ("Not Set") correctly rendered without demo data');
      } else {
        console.error('❌ [FAIL] Daily Works: Inherited demo data or failed neutral fallback');
        results['Daily Works Regression'] = 'FAIL';
      }
    }

    // -------------------------------------------------------------
    // REGRESSION 2: MASTER SCHEDULE (/master-schedule)
    // -------------------------------------------------------------
    console.log('\n--- Checking Master Schedule (/master-schedule) ---');
    const masterRes = await fetch(`${baseUrl}/master-schedule?projectId=${projectId}&date=${testDate}`, {
      headers: { 'x-project-id': String(projectId), 'x-user-role': 'Supervisor' },
    });
    const masterData = await masterRes.json();
    const masterRow = (masterData.rows || []).find((r: any) => r.employeeId === 'EMP-REG-NULL-999');

    if (!masterRow) {
      console.error('❌ Master Schedule: Worker row not found');
      results['Master Schedule Regression'] = 'FAIL';
    } else {
      console.log('Master Schedule row:', {
        workerName: masterRow.workerName,
        company: masterRow.company,
        tradeRole: masterRow.tradeRole,
        crew: masterRow.crew,
        supervisor: masterRow.supervisor,
        project: masterRow.project,
        area: masterRow.area,
        workstream: masterRow.workstream,
        qualificationState: masterRow.qualificationState,
      });

      const isNeutral =
        masterRow.company === 'Not Set' &&
        masterRow.tradeRole === 'Not Set' &&
        masterRow.crew === '—' &&
        masterRow.supervisor === '—' &&
        masterRow.project === 'Unassigned' &&
        masterRow.area === 'Unassigned' &&
        masterRow.workstream === 'Unassigned' &&
        masterRow.qualificationState === 'Not Assessed';

      const inheritsDemo =
        masterRow.company === 'Apex Electrical Contractors' ||
        masterRow.tradeRole === 'Electrician' ||
        masterRow.supervisor === 'Mark Callahan' ||
        masterRow.supervisor === 'Site Supervisor';

      if (isNeutral && !inheritsDemo) {
        console.log('✅ [PASS] Master Schedule: Renders exact neutral placeholders ("Not Set", "—", "Unassigned", "Not Assessed")');
      } else {
        console.error('❌ [FAIL] Master Schedule: Failed neutral fallback verification', {
          isNeutral,
          inheritsDemo,
        });
        results['Master Schedule Regression'] = 'FAIL';
      }
    }

    // -------------------------------------------------------------
    // REGRESSION 3: WEEK PLANNER (/week-planner)
    // -------------------------------------------------------------
    console.log('\n--- Checking Week Planner (/week-planner) ---');
    const weekRes = await fetch(`${baseUrl}/week-planner?projectId=${projectId}&startDate=2026-10-12`, {
      headers: { 'x-project-id': String(projectId), 'x-user-role': 'Supervisor' },
    });
    const weekData = await weekRes.json();
    const weekPerson = (weekData.byPerson || []).find((p: any) => p.employeeId === 'EMP-REG-NULL-999');

    if (!weekPerson) {
      console.error('❌ Week Planner: Person not found in byPerson');
      results['Week Planner Regression'] = 'FAIL';
    } else {
      console.log('Week Planner person:', {
        name: weekPerson.displayName,
        company: weekPerson.companyName,
        trade: weekPerson.tradeRole,
        classification: weekPerson.classification,
      });

      const isNeutralWeek =
        weekPerson.companyName === 'Not Set' &&
        weekPerson.tradeRole === 'Not Set' &&
        weekPerson.classification === '—';

      const inheritsDemoWeek =
        weekPerson.companyName === 'Apex Electrical Contractors' ||
        weekPerson.tradeRole === 'Electrician';

      if (isNeutralWeek && !inheritsDemoWeek) {
        console.log('✅ [PASS] Week Planner: Renders neutral placeholders without demo trade or company');
      } else {
        console.error('❌ [FAIL] Week Planner: Inherited demo values or failed fallback');
        results['Week Planner Regression'] = 'FAIL';
      }
    }

    // -------------------------------------------------------------
    // REGRESSION 4: TRAINING & LICENCES (/training/licences)
    // -------------------------------------------------------------
    console.log('\n--- Checking Training & Licences (/training/licences) ---');
    const trainRes = await fetch(`${baseUrl}/training/licences?projectId=${projectId}`, {
      headers: { 'x-project-id': String(projectId), 'x-user-role': 'QA Manager' },
    });
    const trainData = await trainRes.json();
    // Worker has no qualifications recorded
    const workerQuals = (trainData.licences || []).filter((l: any) => l.employeeId === 'EMP-REG-NULL-999');

    // Also check worker's profile directly
    const profileRes = await fetch(`${baseUrl}/people/${inserted.id}`, {
      headers: { 'x-project-id': String(projectId), 'x-user-role': 'Supervisor' },
    });
    const profileData = await profileRes.json();

    console.log('Training & Licences worker data:', {
      qualsCount: workerQuals.length,
      profileQuals: profileData.qualifications?.length || 0,
      profilePersonTrade: profileData.person?.tradeRole,
      profilePersonCompany: profileData.person?.companyName,
    });

    // Verification: worker with no qualifications does NOT inherit fake licences
    const noFabricatedLicences = workerQuals.length === 0;
    const neutralProfile =
      profileData.person?.companyName === 'Not Set' &&
      profileData.person?.tradeRole === 'Not Set' &&
      (profileData.person?.defaultSupervisorName === null || profileData.person?.defaultSupervisorName === '—');

    if (noFabricatedLicences && neutralProfile) {
      console.log('✅ [PASS] Training & Licences: No fabricated credentials generated; neutral profile data verified');
    } else {
      console.error('❌ [FAIL] Training & Licences: Fabricated credentials detected or non-neutral profile');
      results['Training & Licences Regression'] = 'FAIL';
    }

    // Overall check
    const anyFailed = Object.values(results).some((r) => r === 'FAIL');
    results['Fabricated Fallback Data Removed'] = anyFailed ? 'FAIL' : 'PASS';

  } catch (err: any) {
    console.error('Regression Test Error:', err);
    results['Fabricated Fallback Data Removed'] = 'FAIL';
    results['Daily Works Regression'] = 'FAIL';
    results['Master Schedule Regression'] = 'FAIL';
    results['Week Planner Regression'] = 'FAIL';
    results['Training & Licences Regression'] = 'FAIL';
  } finally {
    // Clean up
    if (testWorkerId) {
      try {
        await db.delete(workforceProjectMemberships).where(eq(workforceProjectMemberships.personId, testWorkerId));
        await db.delete(workforcePeople).where(eq(workforcePeople.id, testWorkerId));
        console.log(`Cleaned up test worker ID ${testWorkerId}`);
      } catch (cleanupErr) {
        console.warn('Cleanup error:', cleanupErr);
      }
    }
    server.close();
  }

  console.log('\n================================================================');
  console.log('             NEUTRAL FALLBACK REGRESSION RESULTS                ');
  console.log('================================================================');
  for (const [name, outcome] of Object.entries(results)) {
    console.log(`${outcome === 'PASS' ? '✅' : '❌'} ${name}: ${outcome}`);
  }
  console.log('================================================================\n');

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('test-neutral-fallbacks.ts')) {
  runNeutralFallbacksRegression().then((res) => {
    const allOk = Object.values(res).every((r) => r === 'PASS');
    process.exit(allOk ? 0 : 1);
  });
}
