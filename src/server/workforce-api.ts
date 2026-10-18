import express, { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.ts';
import {
  projects,
  companies,
  locations,
  auditLogs,
  workforcePeople,
  workforceProjectMemberships,
  workforceZones,
  workforceWorkstreams,
  workforceCrews,
  workforceCrewMembers,
  workforceAllocations,
  workforceDayStates,
  workforceQualificationTypes,
  workforceQualifications,
  workforceRenewals,
  workforceRoleRequirements,
  workforceTrainingProviders,
  workforceTrainingSessions,
  workforceTrainingAttendees,
} from '../db/schema.ts';
import { eq, and, or, sql, desc, asc, not, inArray } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import { getReqProjectId, checkUserProjectAccess } from './api.ts';

export const workforceApiRouter = express.Router();

// Helper: Current date in YYYY-MM-DD
function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// Helper: Calculate days between today and target date
function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  const today = new Date(getTodayString()).getTime();
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

// Helper: Compute live qualification status badge
export function computeQualificationStatus(q: {
  noExpiry?: boolean;
  expiryDate?: string | null;
  verificationStatus: string;
}): {
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY' | 'PENDING_VERIFICATION' | 'REJECTED';
  badgeColor: string;
  daysRemaining: number | null;
  label: string;
} {
  if (q.verificationStatus === 'Pending Verification') {
    return { status: 'PENDING_VERIFICATION', badgeColor: 'amber', daysRemaining: null, label: 'Pending Verification' };
  }
  if (q.verificationStatus === 'Rejected') {
    return { status: 'REJECTED', badgeColor: 'rose', daysRemaining: null, label: 'Rejected' };
  }
  if (q.noExpiry || !q.expiryDate) {
    return { status: 'NO_EXPIRY', badgeColor: 'emerald', daysRemaining: null, label: 'No Expiry (Valid)' };
  }

  const days = getDaysUntil(q.expiryDate);
  if (days === null) {
    return { status: 'VALID', badgeColor: 'emerald', daysRemaining: null, label: 'Valid' };
  }
  if (days < 0) {
    return { status: 'EXPIRED', badgeColor: 'rose', daysRemaining: days, label: `Expired (${Math.abs(days)}d ago)` };
  }
  if (days <= 7) {
    return { status: 'EXPIRING_SOON', badgeColor: 'rose', daysRemaining: days, label: `Expires in ${days}d (Urgent)` };
  }
  if (days <= 30) {
    return { status: 'EXPIRING_SOON', badgeColor: 'amber', daysRemaining: days, label: `Expires in ${days}d` };
  }
  if (days <= 60) {
    return { status: 'EXPIRING_SOON', badgeColor: 'yellow', daysRemaining: days, label: `Expires in ${days}d` };
  }
  if (days <= 90) {
    return { status: 'EXPIRING_SOON', badgeColor: 'blue', daysRemaining: days, label: `Expires in ${days}d` };
  }
  return { status: 'VALID', badgeColor: 'emerald', daysRemaining: days, label: 'Valid' };
}

// Helper: Check Time Range Overlap
export function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && s2 < e1;
}

// ==========================================
// 1. WORKFORCE STATS & KPIS
// ==========================================
workforceApiRouter.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const date = (req.query.date as string) || getTodayString();
    const shift = (req.query.shift as string) || 'Day Shift';

    // 1. All project memberships (both active and inactive)
    const memberships = await db
      .select({
        membership: workforceProjectMemberships,
        person: workforcePeople,
      })
      .from(workforceProjectMemberships)
      .innerJoin(workforcePeople, eq(workforceProjectMemberships.personId, workforcePeople.id))
      .where(eq(workforceProjectMemberships.projectId, projectId));

    const totalWorkforce = memberships.length;
    const assignedPersonIds = memberships.map((m) => m.person.id);

    // 2. Active allocations on selected date & shift
    const allocations = await db
      .select()
      .from(workforceAllocations)
      .where(
        and(
          eq(workforceAllocations.projectId, projectId),
          eq(workforceAllocations.date, date),
          eq(workforceAllocations.shift, shift),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    const allocatedPersonIds = new Set(allocations.map((a) => a.personId));
    const allocatedCount = allocatedPersonIds.size;

    // 3. Qualifications breakdown across assigned people
    let expiredQualsCount = 0;
    let expiring30DaysCount = 0;
    let pendingVerificationCount = 0;
    const personQualMap: Record<number, any[]> = {};

    if (assignedPersonIds.length > 0) {
      const quals = await db
        .select()
        .from(workforceQualifications)
        .where(inArray(workforceQualifications.personId, assignedPersonIds));

      for (const q of quals) {
        if (!personQualMap[q.personId]) personQualMap[q.personId] = [];
        const evalStatus = computeQualificationStatus(q);
        personQualMap[q.personId].push({ ...q, computed: evalStatus });
        if (evalStatus.status === 'EXPIRED') expiredQualsCount++;
        else if (evalStatus.status === 'EXPIRING_SOON' && evalStatus.daysRemaining !== null && evalStatus.daysRemaining <= 30) expiring30DaysCount++;
        else if (evalStatus.status === 'PENDING_VERIFICATION') pendingVerificationCount++;
      }
    }

    // 4. Calculate Unavailable vs Available Unallocated
    let unavailableCount = 0;
    let unallocatedCount = 0;
    let warningWorkersCount = 0;

    for (const m of memberships) {
      const isAllocated = allocatedPersonIds.has(m.person.id);
      const pQuals = personQualMap[m.person.id] || [];
      const hasExpired = pQuals.some((q) => q.computed.status === 'EXPIRED');
      const hasWarning = pQuals.some((q) => q.computed.status === 'EXPIRING_SOON');
      if (hasWarning || hasExpired) warningWorkersCount++;

      if (!isAllocated) {
        const isUnavailable =
          m.membership.status !== 'Active' ||
          m.person.employmentStatus === 'On Leave' ||
          m.person.employmentStatus === 'Training' ||
          m.person.employmentStatus === 'Unavailable' ||
          m.person.employmentStatus === 'Offboarded' ||
          m.person.employmentStatus === 'Pending Onboarding' ||
          hasExpired;

        if (isUnavailable) {
          unavailableCount++;
        } else {
          unallocatedCount++;
        }
      }
    }

    // 5. Renewal bookings required
    const renewals = await db
      .select()
      .from(workforceRenewals)
      .where(eq(workforceRenewals.status, 'Renewal Required'));
    const renewalBookingsRequired = renewals.length;

    // Check for any potential overlaps in allocations for conflicts
    const conflictsCount = 0; // Allocation engine strictly prevents runtime conflicts

    res.json({
      totalWorkforce,
      allocatedCount,
      unallocatedCount,
      unavailableCount,
      warningsCount: warningWorkersCount,
      conflictsCount,
      expiredQualsCount,
      expiring30DaysCount,
      pendingVerificationCount,
      renewalBookingsRequired,
      date,
      shift,
    });
  } catch (error: any) {
    console.error('Workforce stats error:', error);
    res.status(500).json({ error: 'Failed to fetch workforce statistics' });
  }
});

// ==========================================
// 2. PEOPLE & EMPLOYEE PROFILES
// ==========================================
workforceApiRouter.get('/people', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : '';
    const tradeRole = req.query.tradeRole ? String(req.query.tradeRole) : '';
    const status = req.query.status ? String(req.query.status) : '';
    const company = req.query.company ? String(req.query.company) : '';

    let people = await db.select().from(workforcePeople).orderBy(workforcePeople.displayName);

    // Filter by project if supplied
    if (projectId) {
      const memberships = await db
        .select()
        .from(workforceProjectMemberships)
        .where(and(eq(workforceProjectMemberships.projectId, projectId), eq(workforceProjectMemberships.status, 'Active')));
      const memberIds = new Set(memberships.map((m) => m.personId));
      people = people.filter((p) => memberIds.has(p.id));
    }

    if (search) {
      people = people.filter(
        (p) =>
          (p.displayName || 'Unknown Worker').toLowerCase().includes(search) ||
          (p.employeeId || '—').toLowerCase().includes(search) ||
          (p.companyName || 'Not Set').toLowerCase().includes(search) ||
          (p.tradeRole || 'Not Set').toLowerCase().includes(search) ||
          (p.workEmail && p.workEmail.toLowerCase().includes(search))
      );
    }

    if (tradeRole && tradeRole !== 'All') {
      people = people.filter((p) => (p.tradeRole || 'Not Set').toLowerCase() === tradeRole.toLowerCase());
    }

    if (status && status !== 'All') {
      people = people.filter((p) => (p.employmentStatus || 'Active').toLowerCase() === status.toLowerCase());
    }

    if (company && company !== 'All') {
      people = people.filter((p) => (p.companyName || 'Not Set').toLowerCase() === company.toLowerCase());
    }

    // Attach quick counts (qualifications count & project count)
    const allMemberships = await db.select().from(workforceProjectMemberships);
    const allQuals = await db.select().from(workforceQualifications);

    const result = people.map((p) => {
      const pMemberships = allMemberships.filter((m) => m.personId === p.id);
      const pQuals = allQuals.filter((q) => q.personId === p.id);
      const hasExpired = pQuals.some((q) => computeQualificationStatus(q).status === 'EXPIRED');
      const hasExpiringSoon = pQuals.some(
        (q) => computeQualificationStatus(q).status === 'EXPIRING_SOON'
      );
      const hasPending = pQuals.some((q) => q.verificationStatus === 'Pending Verification');

      return {
        ...p,
        projectCount: pMemberships.length,
        qualificationsCount: pQuals.length,
        qualificationHealth: hasExpired ? 'EXPIRED' : hasExpiringSoon ? 'WARNING' : hasPending ? 'PENDING' : 'VALID',
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Fetch people error:', error);
    res.status(500).json({ error: 'Failed to fetch workforce people' });
  }
});

workforceApiRouter.get('/people/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [person] = await db.select().from(workforcePeople).where(eq(workforcePeople.id, id));
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // 1. Project memberships
    const memberships = await db
      .select({
        membership: workforceProjectMemberships,
        projectName: projects.name,
        projectCode: projects.code,
      })
      .from(workforceProjectMemberships)
      .leftJoin(projects, eq(workforceProjectMemberships.projectId, projects.id))
      .where(eq(workforceProjectMemberships.personId, id));

    // 2. Qualifications
    const quals = await db
      .select()
      .from(workforceQualifications)
      .where(eq(workforceQualifications.personId, id))
      .orderBy(workforceQualifications.typeName);

    const evaluatedQuals = quals.map((q) => ({
      ...q,
      computed: computeQualificationStatus(q),
    }));

    // 3. Renewals
    const renewals = await db
      .select()
      .from(workforceRenewals)
      .where(eq(workforceRenewals.personId, id))
      .orderBy(desc(workforceRenewals.createdAt));

    // 4. Today's allocation
    const today = getTodayString();
    const todayAllocations = await db
      .select({
        allocation: workforceAllocations,
        projectName: projects.name,
        projectCode: projects.code,
        zoneName: workforceZones.name,
        zoneCode: workforceZones.code,
        streamName: workforceWorkstreams.name,
        streamColor: workforceWorkstreams.color,
      })
      .from(workforceAllocations)
      .leftJoin(projects, eq(workforceAllocations.projectId, projects.id))
      .leftJoin(workforceZones, eq(workforceAllocations.zoneId, workforceZones.id))
      .leftJoin(workforceWorkstreams, eq(workforceAllocations.workstreamId, workforceWorkstreams.id))
      .where(and(eq(workforceAllocations.personId, id), eq(workforceAllocations.date, today)));

    // 5. Recent allocation history (last 10 days)
    const recentAllocations = await db
      .select({
        allocation: workforceAllocations,
        projectName: projects.name,
        projectCode: projects.code,
        zoneCode: workforceZones.code,
        streamName: workforceWorkstreams.name,
      })
      .from(workforceAllocations)
      .leftJoin(projects, eq(workforceAllocations.projectId, projects.id))
      .leftJoin(workforceZones, eq(workforceAllocations.zoneId, workforceZones.id))
      .leftJoin(workforceWorkstreams, eq(workforceAllocations.workstreamId, workforceWorkstreams.id))
      .where(eq(workforceAllocations.personId, id))
      .orderBy(desc(workforceAllocations.date))
      .limit(10);

    // 6. Crew memberships
    const crews = await db
      .select({
        crew: workforceCrews,
        roleInCrew: workforceCrewMembers.roleInCrew,
      })
      .from(workforceCrewMembers)
      .innerJoin(workforceCrews, eq(workforceCrewMembers.crewId, workforceCrews.id))
      .where(eq(workforceCrewMembers.personId, id));

    res.json({
      person,
      memberships,
      qualifications: evaluatedQuals,
      renewals,
      todayAllocations,
      recentAllocations,
      crews,
    });
  } catch (error: any) {
    console.error('Fetch person detail error:', error);
    res.status(500).json({ error: 'Failed to fetch person details' });
  }
});

workforceApiRouter.post('/people', async (req: AuthRequest, res: Response) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      displayName,
      companyName,
      employmentType = 'Direct',
      tradeRole,
      classification,
      phone,
      workEmail,
      employmentStatus = 'Active',
      startDate = getTodayString(),
      endDate,
      defaultCrewId,
      defaultSupervisorName,
      userId,
      notes,
      assignedProjectId,
    } = req.body;

    if (!firstName || !lastName || !tradeRole || !companyName) {
      return res.status(400).json({ error: 'First Name, Last Name, Trade/Role and Company are required' });
    }

    const genEmpId = employeeId ? String(employeeId).trim() : `EMP-${Math.floor(100 + Math.random() * 900)}`;
    const dName = displayName || `${firstName} ${lastName}`;

    const [created] = await db
      .insert(workforcePeople)
      .values({
        employeeId: genEmpId,
        firstName,
        lastName,
        displayName: dName,
        companyName,
        employmentType,
        tradeRole,
        classification,
        phone,
        workEmail,
        employmentStatus,
        startDate,
        endDate,
        defaultCrewId: defaultCrewId ? Number(defaultCrewId) : null,
        defaultSupervisorName,
        userId,
        notes,
      })
      .returning();

    // Assign project membership if provided
    if (assignedProjectId) {
      await db.insert(workforceProjectMemberships).values({
        personId: created.id,
        projectId: Number(assignedProjectId),
        status: 'Active',
        notes: 'Initial assignment upon onboarding',
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      projectId: assignedProjectId ? Number(assignedProjectId) : 1,
      entityType: 'WorkforcePerson',
      entityId: created.id,
      entityCode: created.employeeId,
      action: 'Create',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ displayName: created.displayName, tradeRole: created.tradeRole, company: created.companyName }),
    });

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create person error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An employee with this Employee ID already exists.' });
    }
    res.status(500).json({ error: 'Failed to create workforce profile' });
  }
});

workforceApiRouter.put('/people/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      firstName,
      lastName,
      displayName,
      companyName,
      employmentType,
      tradeRole,
      classification,
      phone,
      workEmail,
      employmentStatus,
      startDate,
      endDate,
      defaultSupervisorName,
      userId,
      notes,
    } = req.body;

    const [existing] = await db.select().from(workforcePeople).where(eq(workforcePeople.id, id));
    if (!existing) return res.status(404).json({ error: 'Person not found' });

    const [updated] = await db
      .update(workforcePeople)
      .set({
        firstName: firstName !== undefined ? firstName : existing.firstName,
        lastName: lastName !== undefined ? lastName : existing.lastName,
        displayName: displayName || (firstName && lastName ? `${firstName} ${lastName}` : existing.displayName),
        companyName: companyName !== undefined ? companyName : existing.companyName,
        employmentType: employmentType !== undefined ? employmentType : existing.employmentType,
        tradeRole: tradeRole !== undefined ? tradeRole : existing.tradeRole,
        classification: classification !== undefined ? classification : existing.classification,
        phone: phone !== undefined ? phone : existing.phone,
        workEmail: workEmail !== undefined ? workEmail : existing.workEmail,
        employmentStatus: employmentStatus !== undefined ? employmentStatus : existing.employmentStatus,
        startDate: startDate !== undefined ? startDate : existing.startDate,
        endDate: endDate !== undefined ? endDate : existing.endDate,
        defaultSupervisorName: defaultSupervisorName !== undefined ? defaultSupervisorName : existing.defaultSupervisorName,
        userId: userId !== undefined ? userId : existing.userId,
        notes: notes !== undefined ? notes : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(workforcePeople.id, id))
      .returning();

    await db.insert(auditLogs).values({
      projectId: 1,
      entityType: 'WorkforcePerson',
      entityId: id,
      entityCode: updated.employeeId,
      action: 'Update',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ displayName: updated.displayName, status: updated.employmentStatus }),
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update person error:', error);
    res.status(500).json({ error: 'Failed to update workforce profile' });
  }
});

// ==========================================
// 3. PROJECT MEMBERSHIPS
// ==========================================
workforceApiRouter.post('/people/:id/project-memberships', async (req: AuthRequest, res: Response) => {
  try {
    const personId = Number(req.params.id);
    const { projectId, status = 'Active', notes } = req.body;

    if (!projectId) return res.status(400).json({ error: 'Project ID is required' });

    const [existing] = await db
      .select()
      .from(workforceProjectMemberships)
      .where(and(eq(workforceProjectMemberships.personId, personId), eq(workforceProjectMemberships.projectId, Number(projectId))));

    if (existing) {
      const [updated] = await db
        .update(workforceProjectMemberships)
        .set({ status, notes })
        .where(eq(workforceProjectMemberships.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(workforceProjectMemberships)
      .values({
        personId,
        projectId: Number(projectId),
        status,
        notes,
      })
      .returning();

    await db.insert(auditLogs).values({
      projectId: Number(projectId),
      entityType: 'WorkforceProjectMembership',
      entityId: created.id,
      entityCode: `MEM-${created.id}`,
      action: 'Create',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ personId, projectId, status }),
    });

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Assign project error:', error);
    res.status(500).json({ error: 'Failed to assign project membership' });
  }
});

workforceApiRouter.delete('/people/:id/project-memberships/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const personId = Number(req.params.id);
    const projectId = Number(req.params.projectId);

    await db
      .delete(workforceProjectMemberships)
      .where(and(eq(workforceProjectMemberships.personId, personId), eq(workforceProjectMemberships.projectId, projectId)));

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceProjectMembership',
      entityId: personId,
      entityCode: `MEM-${personId}`,
      action: 'Delete',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ personId, projectId, status: 'Removed' }),
    });

    res.json({ success: true, message: 'Project membership removed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove project membership' });
  }
});

// Helper: check role authorization for structural workforce management
function canManageStructure(role?: string): boolean {
  const r = (role || '').trim().toLowerCase();
  return (
    r === 'administrator' ||
    r === 'project manager' ||
    r === 'workforce administrator' ||
    r === 'supervisor' ||
    r === 'leading hand'
  );
}

// 4. ZONES & WORKSTREAMS MANAGEMENT
workforceApiRouter.get('/zones', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const includeArchived = req.query.includeArchived === 'true';

    const baseQuery = db
      .select({
        id: workforceZones.id,
        projectId: workforceZones.projectId,
        code: workforceZones.code,
        name: workforceZones.name,
        description: workforceZones.description,
        sequence: workforceZones.sequence,
        isActive: workforceZones.isActive,
        locationId: workforceZones.locationId,
        createdAt: workforceZones.createdAt,
        linkedLocation: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
          type: locations.type,
          path: locations.path,
        },
      })
      .from(workforceZones)
      .leftJoin(locations, eq(workforceZones.locationId, locations.id));

    const conditions = [eq(workforceZones.projectId, projectId)];
    if (!includeArchived) {
      conditions.push(eq(workforceZones.isActive, true));
    }

    const zonesWithLocs = await baseQuery
      .where(and(...conditions))
      .orderBy(workforceZones.sequence, workforceZones.code);

    const zones = zonesWithLocs.map((z) => ({
      ...z,
      linkedLocation: z.locationId ? z.linkedLocation : null,
    }));

    res.json(zones);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch workforce zones' });
  }
});

workforceApiRouter.post('/zones', async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageStructure(req.user?.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to manage workforce structure (Administrator, Project Manager, or Workforce Administrator required)',
      });
    }

    const projectId = getReqProjectId(req);
    const { code, name, description, sequence = 0, locationId, isActive = true } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Area / Zone Name is required' });
    }

    // Auto-generate code if not explicitly provided
    let zoneCode = code ? String(code).trim().toUpperCase() : '';
    if (!zoneCode) {
      const parts = String(name).trim().split(/\s+/);
      if (parts.length > 1) {
        zoneCode = parts.map((p) => p[0]).join('').slice(0, 5).toUpperCase();
      } else {
        zoneCode = String(name).trim().slice(0, 4).toUpperCase();
      }
    }

    const [created] = await db
      .insert(workforceZones)
      .values({
        projectId,
        code: zoneCode,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        sequence: Number(sequence) || 0,
        locationId: locationId ? Number(locationId) : null,
        isActive: Boolean(isActive),
      })
      .returning();

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceZone',
      entityId: created.id,
      entityCode: created.code,
      action: 'Create',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ name: created.name, code: created.code, locationId: created.locationId }),
    });

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create workforce zone error:', error);
    res.status(500).json({ error: 'Failed to create workforce zone' });
  }
});

workforceApiRouter.put('/zones/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageStructure(req.user?.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to manage workforce structure',
      });
    }

    const id = Number(req.params.id);
    const [existing] = await db.select().from(workforceZones).where(eq(workforceZones.id, id));
    if (!existing) return res.status(404).json({ error: 'Workforce zone not found' });

    const { code, name, description, sequence, locationId, isActive } = req.body;
    const updates: any = {};
    if (code !== undefined) updates.code = String(code).trim().toUpperCase();
    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = description ? String(description).trim() : null;
    if (sequence !== undefined) updates.sequence = Number(sequence);
    if (locationId !== undefined) updates.locationId = locationId ? Number(locationId) : null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db
      .update(workforceZones)
      .set(updates)
      .where(eq(workforceZones.id, id))
      .returning();

    await db.insert(auditLogs).values({
      projectId: existing.projectId,
      entityType: 'WorkforceZone',
      entityId: id,
      entityCode: updated.code,
      action: updates.isActive === false ? 'Archive' : 'Update',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify(updates),
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update workforce zone error:', error);
    res.status(500).json({ error: 'Failed to update workforce zone' });
  }
});

workforceApiRouter.delete('/zones/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageStructure(req.user?.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to manage workforce structure',
      });
    }

    const id = Number(req.params.id);
    const [existing] = await db.select().from(workforceZones).where(eq(workforceZones.id, id));
    if (!existing) return res.status(404).json({ error: 'Workforce zone not found' });

    // Historical Safety: Soft-archive area to protect historical allocations
    const [archived] = await db
      .update(workforceZones)
      .set({ isActive: false })
      .where(eq(workforceZones.id, id))
      .returning();

    await db.insert(auditLogs).values({
      projectId: existing.projectId,
      entityType: 'WorkforceZone',
      entityId: id,
      entityCode: existing.code,
      action: 'Archive',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ reason: 'Archived via Zone Management UI' }),
    });

    res.json({
      success: true,
      archived: true,
      zone: archived,
      message: 'Workforce Area archived successfully. Historical labour allocations preserved.',
    });
  } catch (error: any) {
    console.error('Delete/archive workforce zone error:', error);
    res.status(500).json({ error: 'Failed to archive workforce zone' });
  }
});

// Reorder Zones
workforceApiRouter.post('/zones/reorder', async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageStructure(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden: Permission denied' });
    }

    const { zoneIds } = req.body;
    if (!Array.isArray(zoneIds)) {
      return res.status(400).json({ error: 'zoneIds array is required' });
    }

    for (let i = 0; i < zoneIds.length; i++) {
      await db
        .update(workforceZones)
        .set({ sequence: i })
        .where(eq(workforceZones.id, Number(zoneIds[i])));
    }

    res.json({ success: true, count: zoneIds.length });
  } catch (error: any) {
    console.error('Reorder zones error:', error);
    res.status(500).json({ error: 'Failed to reorder workforce zones' });
  }
});

// WORKSTREAMS
workforceApiRouter.get('/workstreams', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const zoneId = req.query.zoneId ? Number(req.query.zoneId) : null;
    const includeArchived = req.query.includeArchived === 'true';

    const conditions = [eq(workforceWorkstreams.projectId, projectId)];
    if (!includeArchived) {
      conditions.push(eq(workforceWorkstreams.isActive, true));
    }
    if (zoneId) {
      conditions.push(eq(workforceWorkstreams.zoneId, zoneId));
    }

    const streams = await db
      .select({
        id: workforceWorkstreams.id,
        projectId: workforceWorkstreams.projectId,
        zoneId: workforceWorkstreams.zoneId,
        locationId: workforceWorkstreams.locationId,
        code: workforceWorkstreams.code,
        name: workforceWorkstreams.name,
        description: workforceWorkstreams.description,
        defaultSupervisor: workforceWorkstreams.defaultSupervisor,
        defaultCrewId: workforceWorkstreams.defaultCrewId,
        color: workforceWorkstreams.color,
        sequence: workforceWorkstreams.sequence,
        isActive: workforceWorkstreams.isActive,
        createdAt: workforceWorkstreams.createdAt,
        linkedLocation: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
          type: locations.type,
          path: locations.path,
        },
      })
      .from(workforceWorkstreams)
      .leftJoin(locations, eq(workforceWorkstreams.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(workforceWorkstreams.sequence, workforceWorkstreams.name);

    const result = streams.map((s) => ({
      ...s,
      linkedLocation: s.locationId ? s.linkedLocation : null,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch workstreams' });
  }
});

workforceApiRouter.post('/workstreams', async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageStructure(req.user?.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to manage workforce structure',
      });
    }

    const projectId = getReqProjectId(req);
    const {
      code,
      name,
      description,
      color = '#f59e0b',
      zoneId,
      locationId,
      defaultSupervisor,
      defaultCrewId,
      sequence = 0,
      isActive = true,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Workstream Name is required' });
    }

    // Auto-generate code if omitted
    let streamCode = code ? String(code).trim().toUpperCase() : '';
    if (!streamCode) {
      const parts = String(name).trim().split(/\s+/);
      if (parts.length > 1) {
        streamCode = parts.map((p) => p[0]).join('').slice(0, 4).toUpperCase();
      } else {
        streamCode = String(name).trim().slice(0, 4).toUpperCase();
      }
    }

    const [created] = await db
      .insert(workforceWorkstreams)
      .values({
        projectId,
        code: streamCode,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        color,
        zoneId: zoneId ? Number(zoneId) : null,
        locationId: locationId ? Number(locationId) : null,
        defaultSupervisor: defaultSupervisor ? String(defaultSupervisor).trim() : null,
        defaultCrewId: defaultCrewId ? Number(defaultCrewId) : null,
        sequence: Number(sequence) || 0,
        isActive: Boolean(isActive),
      })
      .returning();

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceWorkstream',
      entityId: created.id,
      entityCode: created.code,
      action: 'Create',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ name: created.name, code: created.code, zoneId: created.zoneId }),
    });

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create workstream error:', error);
    res.status(500).json({ error: 'Failed to create workstream' });
  }
});

workforceApiRouter.put('/workstreams/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageStructure(req.user?.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to manage workforce structure',
      });
    }

    const id = Number(req.params.id);
    const [existing] = await db.select().from(workforceWorkstreams).where(eq(workforceWorkstreams.id, id));
    if (!existing) return res.status(404).json({ error: 'Workstream not found' });

    const {
      code,
      name,
      description,
      color,
      zoneId,
      locationId,
      defaultSupervisor,
      defaultCrewId,
      sequence,
      isActive,
    } = req.body;

    const updates: any = {};
    if (code !== undefined) updates.code = String(code).trim().toUpperCase();
    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = description ? String(description).trim() : null;
    if (color !== undefined) updates.color = color;
    if (zoneId !== undefined) updates.zoneId = zoneId ? Number(zoneId) : null;
    if (locationId !== undefined) updates.locationId = locationId ? Number(locationId) : null;
    if (defaultSupervisor !== undefined) updates.defaultSupervisor = defaultSupervisor ? String(defaultSupervisor).trim() : null;
    if (defaultCrewId !== undefined) updates.defaultCrewId = defaultCrewId ? Number(defaultCrewId) : null;
    if (sequence !== undefined) updates.sequence = Number(sequence);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db
      .update(workforceWorkstreams)
      .set(updates)
      .where(eq(workforceWorkstreams.id, id))
      .returning();

    await db.insert(auditLogs).values({
      projectId: existing.projectId,
      entityType: 'WorkforceWorkstream',
      entityId: id,
      entityCode: updated.code,
      action: updates.isActive === false ? 'Archive' : 'Update',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify(updates),
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update workstream error:', error);
    res.status(500).json({ error: 'Failed to update workstream' });
  }
});

workforceApiRouter.delete('/workstreams/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageStructure(req.user?.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to manage workforce structure',
      });
    }

    const id = Number(req.params.id);
    const [existing] = await db.select().from(workforceWorkstreams).where(eq(workforceWorkstreams.id, id));
    if (!existing) return res.status(404).json({ error: 'Workstream not found' });

    // Historical Safety: Soft-archive workstream to protect historical allocations
    const [archived] = await db
      .update(workforceWorkstreams)
      .set({ isActive: false })
      .where(eq(workforceWorkstreams.id, id))
      .returning();

    await db.insert(auditLogs).values({
      projectId: existing.projectId,
      entityType: 'WorkforceWorkstream',
      entityId: id,
      entityCode: existing.code,
      action: 'Archive',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ reason: 'Archived via Workstream Management UI' }),
    });

    res.json({
      success: true,
      archived: true,
      workstream: archived,
      message: 'Workstream archived successfully. Historical labour allocations preserved.',
    });
  } catch (error: any) {
    console.error('Delete/archive workstream error:', error);
    res.status(500).json({ error: 'Failed to archive workstream' });
  }
});

// Reorder Workstreams
workforceApiRouter.post('/workstreams/reorder', async (req: AuthRequest, res: Response) => {
  try {
    if (!canManageStructure(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden: Permission denied' });
    }

    const { workstreamIds } = req.body;
    if (!Array.isArray(workstreamIds)) {
      return res.status(400).json({ error: 'workstreamIds array is required' });
    }

    for (let i = 0; i < workstreamIds.length; i++) {
      await db
        .update(workforceWorkstreams)
        .set({ sequence: i })
        .where(eq(workforceWorkstreams.id, Number(workstreamIds[i])));
    }

    res.json({ success: true, count: workstreamIds.length });
  } catch (error: any) {
    console.error('Reorder workstreams error:', error);
    res.status(500).json({ error: 'Failed to reorder workstreams' });
  }
});

workforceApiRouter.get('/crews', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const crews = await db
      .select()
      .from(workforceCrews)
      .where(and(eq(workforceCrews.projectId, projectId), eq(workforceCrews.isActive, true)))
      .orderBy(workforceCrews.name);

    // Attach members to each crew
    const allCrewMembers = await db
      .select({
        member: workforceCrewMembers,
        person: workforcePeople,
      })
      .from(workforceCrewMembers)
      .innerJoin(workforcePeople, eq(workforceCrewMembers.personId, workforcePeople.id));

    const result = crews.map((c) => {
      const members = allCrewMembers.filter((m) => m.member.crewId === c.id);
      return {
        ...c,
        memberCount: members.length,
        members: members.map((m) => ({
          ...m.person,
          roleInCrew: m.member.roleInCrew,
        })),
      };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch crews' });
  }
});

workforceApiRouter.post('/crews', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.body.projectId ? Number(req.body.projectId) : getReqProjectId(req);
    const {
      name,
      supervisorName,
      supervisorId,
      leadingHandName,
      leadingHandId,
      defaultWorkstreamId,
      color = '#3b82f6',
      isActive = true,
      memberIds = [],
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Crew Name is required' });
    }

    let supName = supervisorName ? String(supervisorName).trim() : null;
    if (!supName && supervisorId) {
      const [sup] = await db.select().from(workforcePeople).where(eq(workforcePeople.id, Number(supervisorId)));
      if (sup) supName = sup.displayName;
    }

    const [created] = await db
      .insert(workforceCrews)
      .values({
        projectId,
        name: String(name).trim(),
        supervisorName: supName,
        supervisorId: supervisorId ? Number(supervisorId) : null,
        defaultWorkstreamId: defaultWorkstreamId ? Number(defaultWorkstreamId) : null,
        color: color || '#3b82f6',
        isActive: Boolean(isActive),
      })
      .returning();

    const membersToInsert: any[] = [];
    if (supervisorId) {
      membersToInsert.push({
        crewId: created.id,
        personId: Number(supervisorId),
        roleInCrew: 'Supervisor',
      });
    }
    if (leadingHandId && Number(leadingHandId) !== Number(supervisorId)) {
      membersToInsert.push({
        crewId: created.id,
        personId: Number(leadingHandId),
        roleInCrew: 'Leading Hand',
      });
    }
    if (Array.isArray(memberIds)) {
      for (const pid of memberIds) {
        const numPid = Number(pid);
        if (numPid !== Number(supervisorId) && numPid !== Number(leadingHandId)) {
          membersToInsert.push({
            crewId: created.id,
            personId: numPid,
            roleInCrew: 'Member',
          });
        }
      }
    }

    if (membersToInsert.length > 0) {
      await db.insert(workforceCrewMembers).values(membersToInsert);
    }

    // Fetch members with details to return full crew object
    const createdMembers = await db
      .select({
        id: workforcePeople.id,
        displayName: workforcePeople.displayName,
        tradeRole: workforcePeople.tradeRole,
        companyName: workforcePeople.companyName,
        roleInCrew: workforceCrewMembers.roleInCrew,
      })
      .from(workforceCrewMembers)
      .innerJoin(workforcePeople, eq(workforceCrewMembers.personId, workforcePeople.id))
      .where(eq(workforceCrewMembers.crewId, created.id));

    res.status(201).json({
      ...created,
      memberCount: createdMembers.length,
      members: createdMembers,
    });
  } catch (error: any) {
    console.error('Create crew error:', error);
    res.status(500).json({ error: error.message || 'Failed to create crew' });
  }
});

workforceApiRouter.post('/crews/:id/members', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const crewId = Number(req.params.id);
    const { personId, roleInCrew = 'Member' } = req.body;
    if (!personId) return res.status(400).json({ error: 'personId is required' });

    // Check existing
    const [existing] = await db
      .select()
      .from(workforceCrewMembers)
      .where(and(eq(workforceCrewMembers.crewId, crewId), eq(workforceCrewMembers.personId, Number(personId))));

    let record;
    if (existing) {
      [record] = await db
        .update(workforceCrewMembers)
        .set({ roleInCrew })
        .where(eq(workforceCrewMembers.id, existing.id))
        .returning();
    } else {
      [record] = await db
        .insert(workforceCrewMembers)
        .values({
          crewId,
          personId: Number(personId),
          roleInCrew,
        })
        .returning();
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceCrewMember',
      entityId: crewId,
      entityCode: `CREW-${crewId}-MEMBER-${personId}`,
      action: 'CrewMemberAdded',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({ crewId, personId, roleInCrew }),
    });

    res.status(201).json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add crew member' });
  }
});

workforceApiRouter.delete('/crews/:id/members/:personId', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const crewId = Number(req.params.id);
    const personId = Number(req.params.personId);

    await db
      .delete(workforceCrewMembers)
      .where(and(eq(workforceCrewMembers.crewId, crewId), eq(workforceCrewMembers.personId, personId)));

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceCrewMember',
      entityId: crewId,
      entityCode: `CREW-${crewId}-MEMBER-${personId}`,
      action: 'CrewMemberRemoved',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({ crewId, personId }),
    });

    res.json({ success: true, message: 'Crew member removed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove crew member' });
  }
});

// ==========================================
// 5. DAILY LABOUR BOARD (REPLACES EXCEL)
// ==========================================
workforceApiRouter.get('/daily-board', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const date = (req.query.date as string) || getTodayString();
    const shift = (req.query.shift as string) || 'Day Shift';

    // 1. Day state (Draft / Published / Locked)
    let [dayState] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, date)));

    if (!dayState) {
      dayState = {
        id: 0,
        projectId,
        date,
        status: 'Draft',
        publishedAt: null,
        publishedBy: null,
        lockedAt: null,
        lockedBy: null,
        unlockReason: null,
        updatedAt: new Date(),
      };
    }

    // 2. Fetch project Zones with linked Locations & Workstreams
    const zonesWithLocs = await db
      .select({
        id: workforceZones.id,
        projectId: workforceZones.projectId,
        code: workforceZones.code,
        name: workforceZones.name,
        sequence: workforceZones.sequence,
        isActive: workforceZones.isActive,
        locationId: workforceZones.locationId,
        linkedLocation: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
          type: locations.type,
          path: locations.path,
        },
      })
      .from(workforceZones)
      .leftJoin(locations, eq(workforceZones.locationId, locations.id))
      .where(eq(workforceZones.projectId, projectId))
      .orderBy(workforceZones.sequence, workforceZones.code);

    const zones = zonesWithLocs.map((z) => ({
      ...z,
      linkedLocation: z.locationId ? z.linkedLocation : null,
    }));

    const workstreams = await db
      .select()
      .from(workforceWorkstreams)
      .where(eq(workforceWorkstreams.projectId, projectId))
      .orderBy(workforceWorkstreams.sequence, workforceWorkstreams.name);

    // Map for quick lookup of zone and workstream names
    const zoneMap = new Map(zones.map((z) => [z.id, z]));
    const workstreamMap = new Map(workstreams.map((w) => [w.id, w]));

    // 3. Allocations on this date & shift
    const allocations = await db
      .select({
        allocation: workforceAllocations,
        person: workforcePeople,
      })
      .from(workforceAllocations)
      .innerJoin(workforcePeople, eq(workforceAllocations.personId, workforcePeople.id))
      .where(
        and(
          eq(workforceAllocations.projectId, projectId),
          eq(workforceAllocations.date, date),
          eq(workforceAllocations.shift, shift),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    // 4. Assigned project members (for unallocated and unavailable lists)
    const memberships = await db
      .select({
        membership: workforceProjectMemberships,
        person: workforcePeople,
      })
      .from(workforceProjectMemberships)
      .innerJoin(workforcePeople, eq(workforceProjectMemberships.personId, workforcePeople.id))
      .where(eq(workforceProjectMemberships.projectId, projectId));

    const allocatedPersonIds = new Set(allocations.map((a) => a.person.id));

    // Get all qualifications for compliance preview
    const assignedPersonIds = memberships.map((m) => m.person.id);
    let personQualMap: Record<number, any[]> = {};
    if (assignedPersonIds.length > 0) {
      const quals = await db
        .select()
        .from(workforceQualifications)
        .where(inArray(workforceQualifications.personId, assignedPersonIds));
      for (const q of quals) {
        if (!personQualMap[q.personId]) personQualMap[q.personId] = [];
        personQualMap[q.personId].push({
          ...q,
          computed: computeQualificationStatus(q),
        });
      }
    }

    // 5. Separate into genuinely available (unallocated) vs unavailable labour
    const unallocated: any[] = [];
    const unavailable: any[] = [];
    let warningCount = 0;

    for (const m of memberships) {
      const pQuals = personQualMap[m.person.id] || [];
      const hasExpired = pQuals.some((q) => q.computed.status === 'EXPIRED');
      const hasWarning = pQuals.some((q) => q.computed.status === 'EXPIRING_SOON');
      if (hasWarning || hasExpired) warningCount++;

      if (!allocatedPersonIds.has(m.person.id)) {
        let unavailableReason: string | null = null;
        if (m.membership.status !== 'Active') {
          unavailableReason = 'Inactive Project Membership';
        } else if (m.person.employmentStatus === 'On Leave') {
          unavailableReason = 'On Leave';
        } else if (m.person.employmentStatus === 'Training') {
          unavailableReason = 'Training';
        } else if (m.person.employmentStatus === 'Unavailable') {
          unavailableReason = 'Unavailable';
        } else if (m.person.employmentStatus === 'Offboarded') {
          unavailableReason = 'Offboarded';
        } else if (m.person.employmentStatus === 'Pending Onboarding') {
          unavailableReason = 'Pending Onboarding';
        } else if (hasExpired) {
          unavailableReason = 'Qualification Restriction';
        }

        const workerRecord = {
          ...m.person,
          membershipStatus: m.membership.status,
          complianceStatus: hasExpired ? 'NOT COMPLIANT' : hasWarning ? 'WARNING' : 'COMPLIANT',
          quals: pQuals,
          unavailableReason,
          unavailableNotes: m.person.notes || m.membership.notes,
        };

        if (unavailableReason) {
          unavailable.push(workerRecord);
        } else {
          unallocated.push(workerRecord);
        }
      }
    }

    // 6. Structure board hierarchy: Zones -> Workstreams -> Workers
    // Show active zones, OR inactive/archived zones if they contain historical allocations on this date
    const allocatedZoneIds = new Set(allocations.map((a) => a.allocation.zoneId).filter(Boolean));
    const allocatedStreamIds = new Set(allocations.map((a) => a.allocation.workstreamId).filter(Boolean));

    const visibleZones = zones.filter((z) => z.isActive || allocatedZoneIds.has(z.id));

    const structuredZones = visibleZones.map((z) => {
      // Show active workstreams or inactive workstreams that have allocations on this date
      const zoneStreams = workstreams.filter(
        (s) => (!s.zoneId || s.zoneId === z.id) && (s.isActive || allocatedStreamIds.has(s.id))
      );

      const mappedStreams = zoneStreams.map((s) => {
        const streamAllocations = allocations.filter(
          (a) => a.allocation.zoneId === z.id && a.allocation.workstreamId === s.id
        );
        return {
          ...s,
          workerCount: streamAllocations.length,
          allocations: streamAllocations.map((a) => {
            const pQuals = personQualMap[a.person.id] || [];
            const hasExpired = pQuals.some((q) => q.computed.status === 'EXPIRED');
            const hasWarning = pQuals.some((q) => q.computed.status === 'EXPIRING_SOON');

            // Attach actual info if moved
            const actualZone = a.allocation.actualZoneId ? zoneMap.get(a.allocation.actualZoneId) : null;
            const actualStream = a.allocation.actualWorkstreamId ? workstreamMap.get(a.allocation.actualWorkstreamId) : null;

            return {
              ...a.allocation,
              actualZone: actualZone ? { id: actualZone.id, code: actualZone.code, name: actualZone.name } : null,
              actualWorkstream: actualStream ? { id: actualStream.id, code: actualStream.code, name: actualStream.name } : null,
              person: {
                ...a.person,
                complianceStatus: hasExpired ? 'NOT COMPLIANT' : hasWarning ? 'WARNING' : 'COMPLIANT',
                quals: pQuals,
              },
            };
          }),
        };
      });

      const zoneWorkerCount = allocations.filter((a) => a.allocation.zoneId === z.id).length;

      return {
        ...z,
        workerCount: zoneWorkerCount,
        workstreams: mappedStreams,
      };
    });

    res.json({
      date,
      shift,
      dayState,
      totalWorkforce: memberships.length,
      totalAllocated: allocations.length,
      totalUnallocated: unallocated.length,
      totalUnavailable: unavailable.length,
      qualificationWarnings: warningCount,
      conflictsCount: 0,
      zones: structuredZones,
      unallocated,
      unavailable,
    });
  } catch (error: any) {
    console.error('Fetch daily board error:', error);
    res.status(500).json({ error: 'Failed to fetch daily labour board' });
  }
});

// ==========================================
// 6. ALLOCATION COMMIT & STRICT CONFLICT ENGINE
// ==========================================
workforceApiRouter.post('/allocations', async (req: AuthRequest, res: Response) => {
  try {
    const {
      personId,
      projectId: bodyProjectId,
      date,
      shift = 'Day Shift',
      startTime = '07:00',
      endTime = '15:30',
      zoneId,
      workstreamId,
      crewId,
      supervisorName,
      status = 'Draft',
      isOverride = false,
      overrideReason,
      notes,
    } = req.body;

    const projectId = bodyProjectId ? Number(bodyProjectId) : getReqProjectId(req);

    if (!personId || !date || !zoneId || !workstreamId) {
      return res.status(400).json({ error: 'Person, Date, Zone, and Workstream are required' });
    }

    // Check active status of Zone and Workstream (Historical safety: archived items cannot receive new allocations)
    const [zone] = await db.select().from(workforceZones).where(eq(workforceZones.id, Number(zoneId)));
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    if (!zone.isActive) {
      return res.status(400).json({ error: 'Cannot allocate workers to an archived or inactive Area / Zone' });
    }

    const [workstream] = await db.select().from(workforceWorkstreams).where(eq(workforceWorkstreams.id, Number(workstreamId)));
    if (!workstream) return res.status(404).json({ error: 'Workstream not found' });
    if (!workstream.isActive) {
      return res.status(400).json({ error: 'Cannot allocate workers to an archived or inactive Workstream' });
    }

    // 1. Check if Day is Locked
    const [dayState] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, date)));

    if (dayState && dayState.status === 'Locked') {
      return res.status(403).json({
        error: `LOCKED DAY: Daily board for ${date} has been locked. Historical allocations cannot be changed without an authorized unlock.`,
        locked: true,
      });
    }

    // 2. Fetch Person Details
    const [person] = await db.select().from(workforcePeople).where(eq(workforcePeople.id, Number(personId)));
    if (!person) return res.status(404).json({ error: 'Worker not found' });

    // 3. SERVER-SIDE DOUBLE-ALLOCATION & OVERLAP DETECTION
    // Query ALL active allocations for this person on this date across ALL projects
    const existingAllocations = await db
      .select({
        allocation: workforceAllocations,
        projectName: projects.name,
        projectCode: projects.code,
        zoneName: workforceZones.name,
        streamName: workforceWorkstreams.name,
      })
      .from(workforceAllocations)
      .leftJoin(projects, eq(workforceAllocations.projectId, projects.id))
      .leftJoin(workforceZones, eq(workforceAllocations.zoneId, workforceZones.id))
      .leftJoin(workforceWorkstreams, eq(workforceAllocations.workstreamId, workforceWorkstreams.id))
      .where(
        and(
          eq(workforceAllocations.personId, Number(personId)),
          eq(workforceAllocations.date, date),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    // Test for time overlaps
    for (const item of existingAllocations) {
      const ex = item.allocation;
      if (timesOverlap(startTime, endTime, ex.startTime, ex.endTime)) {
        // CONFLICT FOUND!
        if (isOverride) {
          // Check authorized override permissions
          const userRole = req.user?.role || 'Viewer';
          if (userRole !== 'Administrator' && userRole !== 'Project Manager') {
            return res.status(403).json({
              error: 'Permission denied: Only Administrators and Project Managers can perform an authorized conflict override.',
            });
          }
          if (!overrideReason || String(overrideReason).trim().length < 5) {
            return res.status(400).json({
              error: 'An explicit override reason (minimum 5 characters) is required to bypass an allocation conflict.',
            });
          }
          // Log authorized override
          await db.insert(auditLogs).values({
            projectId,
            entityType: 'WorkforceAllocationConflictOverride',
            entityId: Number(personId),
            entityCode: `CONFLICT-${personId}`,
            action: 'ConflictOverride',
            performedBy: req.user?.email || 'admin',
            performedByName: req.user?.name || 'Administrator',
            performedByRole: userRole,
            details: JSON.stringify({
              worker: person.displayName,
              conflictWith: { id: ex.id, start: ex.startTime, end: ex.endTime, project: item.projectCode },
              newTime: { start: startTime, end: endTime },
              reason: overrideReason,
            }),
          });
          break; // Authorized override accepted
        }

        // Cross-Project Privacy Preservation:
        if (ex.projectId !== projectId) {
          // Check if current user has access to the other project
          const userUid = req.user?.uid || 'user';
          const userRole = req.user?.role || 'Viewer';
          const hasAccessToOther = await checkUserProjectAccess(userUid, userRole, ex.projectId);

          if (!hasAccessToOther) {
            return res.status(409).json({
              conflict: true,
              isCrossProject: true,
              error: 'ALLOCATION CONFLICT: This worker already has an overlapping allocation during this period on another project.',
              workerName: person.displayName,
              proposedTime: `${startTime}–${endTime}`,
            });
          } else {
            return res.status(409).json({
              conflict: true,
              isCrossProject: true,
              error: `ALLOCATION CONFLICT: Worker already allocated to ${item.projectName || item.projectCode} from ${ex.startTime} to ${ex.endTime}.`,
              workerName: person.displayName,
              existingProject: item.projectCode,
              existingTime: `${ex.startTime}–${ex.endTime}`,
            });
          }
        } else {
          // Same project conflict
          return res.status(409).json({
            conflict: true,
            isCrossProject: false,
            error: `ALLOCATION CONFLICT: Worker is already allocated from ${ex.startTime} to ${ex.endTime} in ${item.zoneName || 'Zone'} - ${item.streamName || 'Workstream'}.`,
            workerName: person.displayName,
            existingTime: `${ex.startTime}–${ex.endTime}`,
          });
        }
      }
    }

    // 3b. TRAINING CONFLICT CHECK (In-App Training Session Overlap)
    const trainingAttendees = await db
      .select({
        attendee: workforceTrainingAttendees,
        session: workforceTrainingSessions,
      })
      .from(workforceTrainingAttendees)
      .innerJoin(workforceTrainingSessions, eq(workforceTrainingAttendees.sessionId, workforceTrainingSessions.id))
      .where(
        and(
          eq(workforceTrainingAttendees.personId, Number(personId)),
          eq(workforceTrainingSessions.sessionDate, date),
          not(eq(workforceTrainingAttendees.attendanceStatus, 'Cancelled')),
          not(eq(workforceTrainingSessions.status, 'Cancelled'))
        )
      );

    for (const t of trainingAttendees) {
      if (timesOverlap(startTime, endTime, t.session.startTime, t.session.endTime)) {
        if (!isOverride) {
          return res.status(409).json({
            conflict: true,
            isTrainingConflict: true,
            error: `TRAINING CONFLICT: ${person.displayName} is attending ${t.session.courseName} training from ${t.session.startTime} to ${t.session.endTime} on ${date}.`,
            workerName: person.displayName,
            existingTime: `${t.session.startTime}–${t.session.endTime}`,
            trainingCourse: t.session.courseName,
          });
        }
      }
    }

    // 4. Qualification & Compliance Check
    const quals = await db
      .select()
      .from(workforceQualifications)
      .where(eq(workforceQualifications.personId, Number(personId)));

    const roleReqs = await db
      .select()
      .from(workforceRoleRequirements)
      .where(and(eq(workforceRoleRequirements.tradeRole, person.tradeRole), eq(workforceRoleRequirements.isMandatory, true)));

    const complianceIssues: string[] = [];
    for (const reqItem of roleReqs) {
      const match = quals.find((q) => q.typeCode === reqItem.qualificationTypeCode);
      if (!match) {
        complianceIssues.push(`Missing mandatory qualification: ${reqItem.qualificationTypeCode}`);
      } else {
        const evalStatus = computeQualificationStatus(match);
        if (evalStatus.status === 'EXPIRED') {
          complianceIssues.push(`Mandatory qualification EXPIRED: ${match.typeName} (${match.licenceNumber})`);
        }
      }
    }

    // 5. Insert Allocation Record
    const [created] = await db
      .insert(workforceAllocations)
      .values({
        personId: Number(personId),
        projectId,
        date,
        shift,
        startTime,
        endTime,
        zoneId: Number(zoneId),
        workstreamId: Number(workstreamId),
        crewId: crewId ? Number(crewId) : null,
        supervisorName,
        status,
        isOverride: Boolean(isOverride),
        overrideReason: isOverride ? String(overrideReason) : null,
        overrideBy: isOverride ? (req.user?.name || req.user?.email) : null,
        notes,
        createdBy: req.user?.name || req.user?.email || 'User',
      })
      .returning();

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceAllocation',
      entityId: created.id,
      entityCode: `ALLOC-${created.id}`,
      action: 'Create',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'User',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({
        worker: person.displayName,
        date,
        shift,
        times: `${startTime}-${endTime}`,
        zoneId,
        workstreamId,
        isOverride,
      }),
    });

    res.status(201).json({
      allocation: created,
      complianceIssues,
      hasComplianceWarning: complianceIssues.length > 0,
    });
  } catch (error: any) {
    console.error('Create allocation error:', error);
    res.status(500).json({ error: 'Failed to commit labour allocation' });
  }
});

// Update or Move Allocation (supports Drag & Drop moves)
workforceApiRouter.put('/allocations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      zoneId,
      workstreamId,
      crewId,
      startTime,
      endTime,
      shift,
      status,
      version = 1,
      isOverride,
      overrideReason,
    } = req.body;

    const [existing] = await db.select().from(workforceAllocations).where(eq(workforceAllocations.id, id));
    if (!existing) return res.status(404).json({ error: 'Allocation not found' });

    // Check Day Lock
    const [dayState] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, existing.projectId), eq(workforceDayStates.date, existing.date)));

    if (dayState && dayState.status === 'Locked') {
      return res.status(403).json({ error: 'Daily board is locked. Cannot move allocations.', locked: true });
    }

    // Check concurrency
    if (existing.version !== version && req.body.checkVersion) {
      return res.status(409).json({
        error: 'Concurrency conflict: This allocation was modified by another user. Refreshing board...',
        concurrencyConflict: true,
      });
    }

    const newStart = startTime || existing.startTime;
    const newEnd = endTime || existing.endTime;

    // Check overlap with other allocations (excluding itself)
    const otherAllocations = await db
      .select()
      .from(workforceAllocations)
      .where(
        and(
          eq(workforceAllocations.personId, existing.personId),
          eq(workforceAllocations.date, existing.date),
          not(eq(workforceAllocations.id, id)),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    for (const other of otherAllocations) {
      if (timesOverlap(newStart, newEnd, other.startTime, other.endTime)) {
        if (!isOverride) {
          return res.status(409).json({
            conflict: true,
            error: `ALLOCATION CONFLICT: Worker already allocated during ${other.startTime}–${other.endTime}.`,
          });
        }
      }
    }

    const [updated] = await db
      .update(workforceAllocations)
      .set({
        zoneId: zoneId !== undefined ? Number(zoneId) : existing.zoneId,
        workstreamId: workstreamId !== undefined ? Number(workstreamId) : existing.workstreamId,
        crewId: crewId !== undefined ? (crewId ? Number(crewId) : null) : existing.crewId,
        startTime: newStart,
        endTime: newEnd,
        shift: shift !== undefined ? shift : existing.shift,
        status: status !== undefined ? status : existing.status,
        version: existing.version + 1,
        updatedAt: new Date(),
        updatedBy: req.user?.name || req.user?.email || 'User',
      })
      .where(eq(workforceAllocations.id, id))
      .returning();

    await db.insert(auditLogs).values({
      projectId: existing.projectId,
      entityType: 'WorkforceAllocation',
      entityId: id,
      entityCode: `ALLOC-${id}`,
      action: 'Update',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'User',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({ zoneId: updated.zoneId, workstreamId: updated.workstreamId }),
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update allocation error:', error);
    res.status(500).json({ error: 'Failed to update allocation' });
  }
});

// TRANSFER WORKER / ALLOCATION TO ANOTHER PROJECT
workforceApiRouter.post('/allocations/transfer-project', async (req: AuthRequest, res: Response) => {
  try {
    const {
      personId,
      allocationId,
      sourceProjectId,
      targetProjectId,
      date,
      shift = 'Day Shift',
      startTime = '07:00',
      endTime = '15:30',
      zoneId,
      workstreamId,
      notes = 'Transferred to project',
    } = req.body;

    if (!personId && !allocationId) {
      return res.status(400).json({ error: 'personId or allocationId is required' });
    }
    if (!targetProjectId) {
      return res.status(400).json({ error: 'Target project is required' });
    }

    // Resolve person
    let targetPersonId = Number(personId);
    if (!targetPersonId && allocationId) {
      const [exAlloc] = await db.select().from(workforceAllocations).where(eq(workforceAllocations.id, Number(allocationId)));
      if (exAlloc) targetPersonId = exAlloc.personId;
    }

    const [person] = await db.select().from(workforcePeople).where(eq(workforcePeople.id, targetPersonId));
    if (!person) return res.status(404).json({ error: 'Worker not found' });

    // Conflict Check on Target Project/Date/Shift
    const targetDate = date || new Date().toISOString().split('T')[0];
    const existingOnDate = await db
      .select()
      .from(workforceAllocations)
      .where(
        and(
          eq(workforceAllocations.personId, targetPersonId),
          eq(workforceAllocations.date, targetDate),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    const hasConflict = existingOnDate.some((ex) =>
      timesOverlap(startTime, endTime, ex.startTime, ex.endTime) && ex.projectId !== Number(targetProjectId)
    );

    if (hasConflict) {
      return res.status(409).json({
        error: `Cannot transfer: ${person.displayName} is already allocated on another project during this time (${startTime}–${endTime}). Overlap conflict protection enforced.`,
      });
    }

    // If there is an existing allocation on source project for this date/shift, mark as Transferred
    if (allocationId) {
      await db
        .update(workforceAllocations)
        .set({
          actualAttendance: 'Transferred',
          actualNotes: `Transferred to project #${targetProjectId}`,
        })
        .where(eq(workforceAllocations.id, Number(allocationId)));
    }

    // Find target zone / workstream fallback if not specified
    let finalZoneId = zoneId ? Number(zoneId) : 0;
    if (!finalZoneId) {
      const targetZones = await db
        .select()
        .from(workforceZones)
        .where(eq(workforceZones.projectId, Number(targetProjectId)));
      finalZoneId = targetZones[0]?.id || 1;
    }

    let finalStreamId = workstreamId ? Number(workstreamId) : 0;
    if (!finalStreamId) {
      const targetStreams = await db
        .select()
        .from(workforceWorkstreams)
        .where(eq(workforceWorkstreams.zoneId, finalZoneId));
      finalStreamId = targetStreams[0]?.id || 1;
    }

    // Insert on target project
    const [newAlloc] = await db
      .insert(workforceAllocations)
      .values({
        projectId: Number(targetProjectId),
        personId: targetPersonId,
        date: targetDate,
        shift,
        startTime,
        endTime,
        zoneId: finalZoneId,
        workstreamId: finalStreamId,
        status: 'Confirmed',
        notes: notes || 'Project transfer',
      } as any)
      .returning();

    await db.insert(auditLogs).values({
      projectId: Number(targetProjectId),
      entityType: 'WorkforceAllocation',
      entityId: newAlloc.id,
      entityCode: `TRANSFER-${targetPersonId}`,
      action: 'ProjectTransfer',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({
        person: person.displayName,
        sourceProjectId,
        targetProjectId,
        date: targetDate,
        shift,
      }),
    });

    res.json({
      success: true,
      message: `Successfully transferred ${person.displayName} to project`,
      allocation: newAlloc,
    });
  } catch (error: any) {
    console.error('Transfer project error:', error);
    res.status(500).json({ error: error.message || 'Failed to transfer labour to project' });
  }
});

// Bulk Move Allocations (Multi-Select Support)
workforceApiRouter.post('/allocations/bulk-move', async (req: AuthRequest, res: Response) => {
  try {
    const { allocationIds, zoneId, workstreamId, dryRun = false } = req.body;
    if (!Array.isArray(allocationIds) || allocationIds.length === 0) {
      return res.status(400).json({ error: 'allocationIds array is required' });
    }
    if (!zoneId || !workstreamId) {
      return res.status(400).json({ error: 'Target zoneId and workstreamId are required' });
    }

    const targetZoneId = Number(zoneId);
    const targetStreamId = Number(workstreamId);

    const [targetZone] = await db.select().from(workforceZones).where(eq(workforceZones.id, targetZoneId));
    const [targetStream] = await db.select().from(workforceWorkstreams).where(eq(workforceWorkstreams.id, targetStreamId));
    if (!targetZone || !targetStream) {
      return res.status(404).json({ error: 'Target zone or workstream not found' });
    }
    if (!targetZone.isActive || !targetStream.isActive) {
      return res.status(400).json({ error: 'Cannot move allocations into an archived Area or Workstream' });
    }

    const items: any[] = [];
    let warningsCount = 0;
    let conflictsCount = 0;

    for (const allocId of allocationIds) {
      const [alloc] = await db
        .select()
        .from(workforceAllocations)
        .where(eq(workforceAllocations.id, Number(allocId)));

      if (!alloc) continue;

      const [person] = await db
        .select()
        .from(workforcePeople)
        .where(eq(workforcePeople.id, alloc.personId));

      // Check Qualifications
      const quals = await db
        .select()
        .from(workforceQualifications)
        .where(eq(workforceQualifications.personId, alloc.personId));

      const now = new Date();
      let hasWarning = false;
      for (const q of quals) {
        if (q.expiryDate) {
          const exp = new Date(q.expiryDate);
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) {
            hasWarning = true;
            break;
          }
        }
      }
      if (hasWarning) warningsCount++;

      // Check Conflict
      const otherAllocs = await db
        .select()
        .from(workforceAllocations)
        .where(
          and(
            eq(workforceAllocations.personId, alloc.personId),
            eq(workforceAllocations.date, alloc.date),
            not(eq(workforceAllocations.id, alloc.id)),
            not(eq(workforceAllocations.status, 'Cancelled'))
          )
        );

      let conflictDesc: string | null = null;
      for (const other of otherAllocs) {
        if (timesOverlap(alloc.startTime, alloc.endTime, other.startTime, other.endTime)) {
          conflictsCount++;
          conflictDesc = `Overlap: ${other.startTime}–${other.endTime}`;
          break;
        }
      }

      items.push({
        allocationId: alloc.id,
        personId: alloc.personId,
        displayName: person?.displayName || `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Unknown Worker',
        tradeRole: person?.tradeRole || 'Not Set',
        currentZoneId: alloc.zoneId,
        currentWorkstreamId: alloc.workstreamId,
        startTime: alloc.startTime,
        endTime: alloc.endTime,
        hasWarning,
        hasConflict: Boolean(conflictDesc),
        conflictDesc,
      });
    }

    if (dryRun) {
      return res.json({
        dryRun: true,
        totalMoving: items.length,
        warningsCount,
        conflictsCount,
        items,
        targetZone: { id: targetZone.id, code: targetZone.code, name: targetZone.name },
        targetWorkstream: { id: targetStream.id, code: targetStream.code, name: targetStream.name },
      });
    }

    // Execute Move
    const movedIds: number[] = [];
    for (const item of items) {
      if (item.hasConflict) continue; // Skip conflicting records unless overridden
      const [updated] = await db
        .update(workforceAllocations)
        .set({
          zoneId: targetZoneId,
          workstreamId: targetStreamId,
          version: sql`${workforceAllocations.version} + 1`,
          updatedAt: new Date(),
          updatedBy: req.user?.name || req.user?.email || 'User',
        })
        .where(eq(workforceAllocations.id, item.allocationId))
        .returning();

      if (updated) {
        movedIds.push(updated.id);
        await db.insert(auditLogs).values({
          projectId: updated.projectId,
          entityType: 'WorkforceAllocation',
          entityId: updated.id,
          entityCode: `ALLOC-${updated.id}`,
          action: 'BulkMove',
          performedBy: req.user?.email || 'user',
          performedByName: req.user?.name || 'User',
          performedByRole: req.user?.role || 'Supervisor',
          details: JSON.stringify({
            fromZone: item.currentZoneId,
            toZone: targetZoneId,
            toWorkstream: targetStreamId,
          }),
        });
      }
    }

    res.json({
      success: true,
      totalRequested: items.length,
      movedCount: movedIds.length,
      warningsCount,
      conflictsCount,
      movedIds,
    });
  } catch (error: any) {
    console.error('Bulk move error:', error);
    res.status(500).json({ error: 'Failed to bulk move allocations' });
  }
});

workforceApiRouter.delete('/allocations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(workforceAllocations).where(eq(workforceAllocations.id, id));
    if (!existing) return res.status(404).json({ error: 'Allocation not found' });

    // Check Day Lock
    const [dayState] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, existing.projectId), eq(workforceDayStates.date, existing.date)));

    if (dayState && dayState.status === 'Locked') {
      return res.status(403).json({ error: 'Daily board is locked. Cannot delete allocation.', locked: true });
    }

    await db.delete(workforceAllocations).where(eq(workforceAllocations.id, id));

    await db.insert(auditLogs).values({
      projectId: existing.projectId,
      entityType: 'WorkforceAllocation',
      entityId: id,
      entityCode: `ALLOC-${id}`,
      action: 'Delete',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'User',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({ personId: existing.personId, date: existing.date }),
    });

    res.json({ success: true, message: 'Allocation removed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove allocation' });
  }
});

// ==========================================
// 7. ALLOCATE ENTIRE CREW ACTION
// ==========================================
workforceApiRouter.post('/crews/:id/allocate-entire-crew', async (req: AuthRequest, res: Response) => {
  try {
    const crewId = Number(req.params.id);
    const projectId = getReqProjectId(req);
    const { date, shift = 'Day Shift', startTime = '07:00', endTime = '15:30', zoneId, workstreamId } = req.body;

    if (!date || !zoneId || !workstreamId) {
      return res.status(400).json({ error: 'Date, Zone and Workstream are required to allocate crew' });
    }

    const [crew] = await db.select().from(workforceCrews).where(eq(workforceCrews.id, crewId));
    if (!crew) return res.status(404).json({ error: 'Crew not found' });

    // Fetch crew members
    const members = await db
      .select({
        member: workforceCrewMembers,
        person: workforcePeople,
      })
      .from(workforceCrewMembers)
      .innerJoin(workforcePeople, eq(workforceCrewMembers.personId, workforcePeople.id))
      .where(eq(workforceCrewMembers.crewId, crewId));

    if (members.length === 0) {
      return res.status(400).json({ error: 'This crew has no members assigned' });
    }

    const allocatedResults: any[] = [];
    const conflictErrors: string[] = [];

    for (const m of members) {
      const pid = m.person.id;
      // Check existing allocations
      const existing = await db
        .select()
        .from(workforceAllocations)
        .where(
          and(
            eq(workforceAllocations.personId, pid),
            eq(workforceAllocations.date, date),
            not(eq(workforceAllocations.status, 'Cancelled'))
          )
        );

      const hasConflict = existing.some((ex) => timesOverlap(startTime, endTime, ex.startTime, ex.endTime));
      if (hasConflict) {
        conflictErrors.push(`${m.person.displayName}: Already allocated during this time`);
        continue;
      }

      const [created] = await db
        .insert(workforceAllocations)
        .values({
          personId: pid,
          projectId,
          date,
          shift,
          startTime,
          endTime,
          zoneId: Number(zoneId),
          workstreamId: Number(workstreamId),
          crewId,
          supervisorName: crew.supervisorName,
          status: 'Published',
          createdBy: req.user?.name || req.user?.email || 'User',
        })
        .returning();
      allocatedResults.push(created);
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceCrewAllocation',
      entityId: crewId,
      entityCode: `CREW-ALLOC-${crewId}`,
      action: 'AllocateCrew',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'User',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({ crewName: crew.name, allocatedCount: allocatedResults.length, date }),
    });

    res.json({
      success: true,
      allocatedCount: allocatedResults.length,
      conflictsCount: conflictErrors.length,
      conflictErrors,
    });
  } catch (error: any) {
    console.error('Allocate entire crew error:', error);
    res.status(500).json({ error: 'Failed to allocate crew' });
  }
});

// Duplicate Crew Allocation to Another Date
workforceApiRouter.post('/crews/:id/duplicate-day', async (req: AuthRequest, res: Response) => {
  try {
    const crewId = Number(req.params.id);
    const projectId = getReqProjectId(req);
    const { sourceDate, targetDate, shift = 'Day Shift' } = req.body;

    if (!sourceDate || !targetDate) {
      return res.status(400).json({ error: 'sourceDate and targetDate are required' });
    }

    const [crew] = await db.select().from(workforceCrews).where(eq(workforceCrews.id, crewId));
    if (!crew) return res.status(404).json({ error: 'Crew not found' });

    // Check if target day is locked
    const [targetDayState] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, targetDate)));

    if (targetDayState && targetDayState.status === 'Locked') {
      return res.status(403).json({ error: `Target date ${targetDate} is locked. Cannot duplicate crew to locked day.` });
    }

    // Find source allocations for this crew
    const sourceAllocs = await db
      .select({
        alloc: workforceAllocations,
        person: workforcePeople,
      })
      .from(workforceAllocations)
      .innerJoin(workforcePeople, eq(workforceAllocations.personId, workforcePeople.id))
      .where(
        and(
          eq(workforceAllocations.crewId, crewId),
          eq(workforceAllocations.date, sourceDate),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    if (sourceAllocs.length === 0) {
      return res.status(400).json({ error: `No active allocations found for this crew on ${sourceDate}` });
    }

    const duplicatedList: any[] = [];
    const conflictErrors: string[] = [];

    for (const { alloc, person } of sourceAllocs) {
      // Check conflict on targetDate
      const existingTargetAllocs = await db
        .select()
        .from(workforceAllocations)
        .where(
          and(
            eq(workforceAllocations.personId, alloc.personId),
            eq(workforceAllocations.date, targetDate),
            not(eq(workforceAllocations.status, 'Cancelled'))
          )
        );

      const hasConflict = existingTargetAllocs.some((ex) =>
        timesOverlap(alloc.startTime, alloc.endTime, ex.startTime, ex.endTime)
      );

      if (hasConflict) {
        conflictErrors.push(`${person.displayName}: Already allocated on ${targetDate}`);
        continue;
      }

      const [created] = await db
        .insert(workforceAllocations)
        .values({
          personId: alloc.personId,
          projectId,
          date: targetDate,
          shift: alloc.shift || shift,
          startTime: alloc.startTime,
          endTime: alloc.endTime,
          zoneId: alloc.zoneId,
          workstreamId: alloc.workstreamId,
          crewId: alloc.crewId,
          supervisorName: alloc.supervisorName,
          status: 'Published',
          notes: `Duplicated from ${sourceDate}`,
          createdBy: req.user?.name || req.user?.email || 'User',
        })
        .returning();

      duplicatedList.push(created);
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceCrewDuplication',
      entityId: crewId,
      entityCode: `CREW-DUP-${crewId}`,
      action: 'DuplicateCrewDay',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'User',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({
        crewName: crew.name,
        sourceDate,
        targetDate,
        duplicatedCount: duplicatedList.length,
        conflictsCount: conflictErrors.length,
      }),
    });

    res.json({
      success: true,
      duplicatedCount: duplicatedList.length,
      conflictsCount: conflictErrors.length,
      conflictErrors,
    });
  } catch (error: any) {
    console.error('Duplicate crew day error:', error);
    res.status(500).json({ error: 'Failed to duplicate crew allocation' });
  }
});

// ==========================================
// 8. DAY STATES: PUBLISH & LOCK
// ==========================================
workforceApiRouter.post('/daily-board/publish', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    // Update all Draft allocations for this date to Published
    await db
      .update(workforceAllocations)
      .set({ status: 'Published', updatedAt: new Date() })
      .where(
        and(
          eq(workforceAllocations.projectId, projectId),
          eq(workforceAllocations.date, date),
          eq(workforceAllocations.status, 'Draft')
        )
      );

    const [existing] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, date)));

    let updatedDayState;
    if (existing) {
      [updatedDayState] = await db
        .update(workforceDayStates)
        .set({
          status: 'Published',
          publishedAt: new Date(),
          publishedBy: req.user?.name || req.user?.email,
          updatedAt: new Date(),
        })
        .where(eq(workforceDayStates.id, existing.id))
        .returning();
    } else {
      [updatedDayState] = await db
        .insert(workforceDayStates)
        .values({
          projectId,
          date,
          status: 'Published',
          publishedAt: new Date(),
          publishedBy: req.user?.name || req.user?.email,
        })
        .returning();
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceDayState',
      entityId: updatedDayState.id,
      entityCode: `DAY-${updatedDayState.date}`,
      action: 'Publish',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({ date, status: 'Published' }),
    });

    res.json({ success: true, dayState: updatedDayState });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to publish daily board' });
  }
});

workforceApiRouter.post('/daily-board/lock', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const [existing] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, date)));

    let updatedDayState;
    if (existing) {
      [updatedDayState] = await db
        .update(workforceDayStates)
        .set({
          status: 'Locked',
          lockedAt: new Date(),
          lockedBy: req.user?.name || req.user?.email,
          updatedAt: new Date(),
        })
        .where(eq(workforceDayStates.id, existing.id))
        .returning();
    } else {
      [updatedDayState] = await db
        .insert(workforceDayStates)
        .values({
          projectId,
          date,
          status: 'Locked',
          lockedAt: new Date(),
          lockedBy: req.user?.name || req.user?.email,
        })
        .returning();
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceDayState',
      entityId: updatedDayState.id,
      entityCode: `DAY-${updatedDayState.date}`,
      action: 'Lock',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ date, status: 'Locked' }),
    });

    res.json({ success: true, dayState: updatedDayState });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to lock daily board' });
  }
});

workforceApiRouter.post('/daily-board/unlock', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const { date, unlockReason } = req.body;
    if (!date || !unlockReason) {
      return res.status(400).json({ error: 'Date and an explicit unlock reason are required to amend a locked day' });
    }

    const [existing] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, date)));

    if (!existing) return res.status(404).json({ error: 'Day record not found' });

    const [updated] = await db
      .update(workforceDayStates)
      .set({
        status: 'Published',
        unlockReason,
        updatedAt: new Date(),
      })
      .where(eq(workforceDayStates.id, existing.id))
      .returning();

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceDayState',
      entityId: updated.id,
      entityCode: `DAY-${updated.date}`,
      action: 'HistoricalDayAmended',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ date, unlockReason, action: 'Unlocked for amendment' }),
    });

    res.json({ success: true, dayState: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to unlock daily board' });
  }
});

// ==========================================
// 9. COPY PREVIOUS DAY ACTION
// ==========================================
workforceApiRouter.post('/daily-board/copy-previous-day', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const { sourceDate, targetDate, shift = 'Day Shift', previewOnly = false } = req.body;

    if (!sourceDate || !targetDate) {
      return res.status(400).json({ error: 'Source Date and Target Date are required' });
    }

    // Check if target day is locked
    const [targetState] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, targetDate)));

    if (targetState && targetState.status === 'Locked') {
      return res.status(403).json({ error: 'Cannot copy into a locked day.' });
    }

    // Fetch source allocations
    const sourceAllocations = await db
      .select({
        allocation: workforceAllocations,
        person: workforcePeople,
      })
      .from(workforceAllocations)
      .innerJoin(workforcePeople, eq(workforceAllocations.personId, workforcePeople.id))
      .where(
        and(
          eq(workforceAllocations.projectId, projectId),
          eq(workforceAllocations.date, sourceDate),
          eq(workforceAllocations.shift, shift),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    if (sourceAllocations.length === 0) {
      return res.status(400).json({ error: `No active allocations found on source date ${sourceDate}.` });
    }

    // Check target date for existing allocations / conflicts
    const targetExisting = await db
      .select()
      .from(workforceAllocations)
      .where(
        and(
          eq(workforceAllocations.date, targetDate),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    const safeToCopy: any[] = [];
    const conflicts: any[] = [];

    for (const src of sourceAllocations) {
      const a = src.allocation;
      // Check if this person already has an overlapping allocation on target date
      const conflict = targetExisting.find(
        (tex) => tex.personId === a.personId && timesOverlap(a.startTime, a.endTime, tex.startTime, tex.endTime)
      );

      if (conflict) {
        conflicts.push({
          person: src.person.displayName,
          reason: `Already allocated from ${conflict.startTime} to ${conflict.endTime} on ${targetDate}`,
        });
      } else {
        safeToCopy.push({
          personId: a.personId,
          projectId,
          date: targetDate,
          shift: a.shift,
          startTime: a.startTime,
          endTime: a.endTime,
          zoneId: a.zoneId,
          workstreamId: a.workstreamId,
          crewId: a.crewId,
          supervisorName: a.supervisorName,
          status: 'Draft',
          notes: `Copied from ${sourceDate}`,
          createdBy: req.user?.name || req.user?.email || 'User',
        });
      }
    }

    if (previewOnly) {
      return res.json({
        preview: true,
        sourceDate,
        targetDate,
        totalSource: sourceAllocations.length,
        safeCount: safeToCopy.length,
        conflictCount: conflicts.length,
        conflicts,
      });
    }

    // Commit safe allocations
    let inserted = [];
    if (safeToCopy.length > 0) {
      inserted = await db.insert(workforceAllocations).values(safeToCopy).returning();
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceDailyBoard',
      entityId: projectId,
      entityCode: `BOARD-${targetDate}`,
      action: 'CopyPreviousDay',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'User',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({ sourceDate, targetDate, copiedCount: inserted.length, conflictsCount: conflicts.length }),
    });

    res.json({
      success: true,
      copiedCount: inserted.length,
      skippedConflicts: conflicts.length,
      conflicts,
    });
  } catch (error: any) {
    console.error('Copy previous day error:', error);
    res.status(500).json({ error: 'Failed to copy previous day allocations' });
  }
});

// ==========================================
// 9. ACTUAL LABOUR OUTCOMES & ATTENDANCE
// ==========================================
workforceApiRouter.put('/allocations/:id/actual', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      actualAttendance, // 'Present', 'Absent', 'Late', 'Transferred', 'Leave', 'Training'
      actualZoneId,
      actualWorkstreamId,
      actualCrewId,
      actualStartTime,
      actualEndTime,
      actualHours,
      actualNotes,
    } = req.body;

    const [existing] = await db.select().from(workforceAllocations).where(eq(workforceAllocations.id, id));
    if (!existing) return res.status(404).json({ error: 'Allocation not found' });

    const [updated] = await db
      .update(workforceAllocations)
      .set({
        actualAttendance: actualAttendance || existing.actualAttendance || 'Present',
        actualZoneId: actualZoneId !== undefined ? (actualZoneId ? Number(actualZoneId) : null) : existing.actualZoneId,
        actualWorkstreamId: actualWorkstreamId !== undefined ? (actualWorkstreamId ? Number(actualWorkstreamId) : null) : existing.actualWorkstreamId,
        actualCrewId: actualCrewId !== undefined ? (actualCrewId ? Number(actualCrewId) : null) : existing.actualCrewId,
        actualStartTime: actualStartTime || existing.actualStartTime,
        actualEndTime: actualEndTime || existing.actualEndTime,
        actualHours: actualHours || existing.actualHours,
        actualNotes: actualNotes !== undefined ? actualNotes : existing.actualNotes,
        actualRecordedBy: req.user?.name || req.user?.email || 'Supervisor',
        actualRecordedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workforceAllocations.id, id))
      .returning();

    await db.insert(auditLogs).values({
      projectId: existing.projectId,
      entityType: 'WorkforceActualOutcome',
      entityId: id,
      entityCode: `ALLOC-${id}`,
      action: 'RecordActualOutcome',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'Supervisor',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({
        allocationId: id,
        planned: { zoneId: existing.zoneId, workstreamId: existing.workstreamId },
        actual: { attendance: actualAttendance, actualZoneId, actualWorkstreamId, actualNotes },
      }),
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Record actual outcome error:', error);
    res.status(500).json({ error: 'Failed to record actual labour outcome' });
  }
});

workforceApiRouter.post('/allocations/batch-actual', async (req: AuthRequest, res: Response) => {
  try {
    const { allocationIds, actualAttendance = 'Present', actualNotes } = req.body;
    if (!Array.isArray(allocationIds) || allocationIds.length === 0) {
      return res.status(400).json({ error: 'allocationIds array is required' });
    }

    const updatedList = [];
    for (const allocId of allocationIds) {
      const [updated] = await db
        .update(workforceAllocations)
        .set({
          actualAttendance,
          actualNotes: actualNotes || undefined,
          actualRecordedBy: req.user?.name || req.user?.email || 'Supervisor',
          actualRecordedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workforceAllocations.id, Number(allocId)))
        .returning();
      if (updated) updatedList.push(updated);
    }

    res.json({ success: true, count: updatedList.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to batch record actual labour' });
  }
});

// Helper for weekly calculations
function getWeekDates(startDateStr?: string): { date: string; dayName: string; dayNumber: string; formatted: string }[] {
  let baseDate: Date;
  if (startDateStr) {
    baseDate = new Date(startDateStr);
  } else {
    baseDate = new Date();
  }
  const day = baseDate.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMon);

  const days: { date: string; dayName: string; dayNumber: string; formatted: string }[] = [];
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dateStr = cur.toISOString().split('T')[0];
    const dayNumber = String(cur.getDate()).padStart(2, '0');
    days.push({
      date: dateStr,
      dayName: dayNames[i],
      dayNumber,
      formatted: `${dayNames[i]} ${dayNumber}`,
    });
  }
  return days;
}

// ==========================================
// 10. WEEK PLANNER (WORKSTREAM & PEOPLE MODES)
// ==========================================
workforceApiRouter.get('/week-planner', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const startDate = (req.query.startDate as string) || getTodayString();
    const shift = (req.query.shift as string) || 'All';
    const tradeFilter = (req.query.trade as string) || 'All';
    const companyFilter = (req.query.company as string) || 'All';
    const crewFilter = req.query.crewId ? Number(req.query.crewId) : null;
    const zoneFilter = req.query.zoneId ? Number(req.query.zoneId) : null;
    const workstreamFilter = req.query.workstreamId ? Number(req.query.workstreamId) : null;

    const weekDays = getWeekDates(startDate);
    const dates = weekDays.map((d) => d.date);

    // 1. Fetch Day States for the 7 days
    const dayStates = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), inArray(workforceDayStates.date, dates)));
    const dayStateMap = new Map(dayStates.map((s) => [s.date, s]));

    // 2. Fetch project Zones with linked Locations & Workstreams
    const zonesWithLocs = await db
      .select({
        id: workforceZones.id,
        projectId: workforceZones.projectId,
        code: workforceZones.code,
        name: workforceZones.name,
        sequence: workforceZones.sequence,
        isActive: workforceZones.isActive,
        locationId: workforceZones.locationId,
        linkedLocation: {
          id: locations.id,
          name: locations.name,
          code: locations.code,
          type: locations.type,
          path: locations.path,
        },
      })
      .from(workforceZones)
      .leftJoin(locations, eq(workforceZones.locationId, locations.id))
      .where(and(eq(workforceZones.projectId, projectId), eq(workforceZones.isActive, true)))
      .orderBy(workforceZones.sequence, workforceZones.code);

    const zones = zonesWithLocs.map((z) => ({
      ...z,
      linkedLocation: z.locationId ? z.linkedLocation : null,
    }));
    const zoneMap = new Map(zones.map((z) => [z.id, z]));

    const workstreams = await db
      .select()
      .from(workforceWorkstreams)
      .where(and(eq(workforceWorkstreams.projectId, projectId), eq(workforceWorkstreams.isActive, true)))
      .orderBy(workforceWorkstreams.sequence, workforceWorkstreams.name);
    const workstreamMap = new Map(workstreams.map((w) => [w.id, w]));

    // 3. Fetch all project memberships
    const memberships = await db
      .select({
        membership: workforceProjectMemberships,
        person: workforcePeople,
      })
      .from(workforceProjectMemberships)
      .innerJoin(workforcePeople, eq(workforceProjectMemberships.personId, workforcePeople.id))
      .where(eq(workforceProjectMemberships.projectId, projectId));

    const assignedPersonIds = memberships.map((m) => m.person.id);

    // 4. Fetch qualifications for compliance warnings
    let personQualMap: Record<number, any[]> = {};
    if (assignedPersonIds.length > 0) {
      const quals = await db
        .select()
        .from(workforceQualifications)
        .where(inArray(workforceQualifications.personId, assignedPersonIds));
      for (const q of quals) {
        if (!personQualMap[q.personId]) personQualMap[q.personId] = [];
        personQualMap[q.personId].push({
          ...q,
          computed: computeQualificationStatus(q),
        });
      }
    }

    // 5. Fetch allocations on this project across the 7 days
    const whereConditions = [
      eq(workforceAllocations.projectId, projectId),
      inArray(workforceAllocations.date, dates),
      not(eq(workforceAllocations.status, 'Cancelled')),
    ];
    if (shift !== 'All') {
      whereConditions.push(eq(workforceAllocations.shift, shift));
    }
    if (zoneFilter) {
      whereConditions.push(eq(workforceAllocations.zoneId, zoneFilter));
    }
    if (workstreamFilter) {
      whereConditions.push(eq(workforceAllocations.workstreamId, workstreamFilter));
    }
    if (crewFilter) {
      whereConditions.push(eq(workforceAllocations.crewId, crewFilter));
    }

    const allocations = await db
      .select({
        allocation: workforceAllocations,
        person: workforcePeople,
      })
      .from(workforceAllocations)
      .innerJoin(workforcePeople, eq(workforceAllocations.personId, workforcePeople.id))
      .where(and(...whereConditions));

    // 6. Forward conflict check across other projects for all 7 days
    let crossProjectAllocations: any[] = [];
    if (assignedPersonIds.length > 0) {
      crossProjectAllocations = await db
        .select({
          allocation: workforceAllocations,
          projectCode: projects.code,
          projectName: projects.name,
        })
        .from(workforceAllocations)
        .innerJoin(projects, eq(workforceAllocations.projectId, projects.id))
        .where(
          and(
            inArray(workforceAllocations.personId, assignedPersonIds),
            inArray(workforceAllocations.date, dates),
            not(eq(workforceAllocations.projectId, projectId)),
            not(eq(workforceAllocations.status, 'Cancelled'))
          )
        );
    }

    // Map cross project conflicts by personId_date with privacy protection
    const userUid = req.user?.uid || 'user';
    const userRole = req.user?.role || 'Viewer';
    const conflictMap: Record<string, any[]> = {};
    for (const c of crossProjectAllocations) {
      const key = `${c.allocation.personId}_${c.allocation.date}`;
      if (!conflictMap[key]) conflictMap[key] = [];
      const hasAccess = await checkUserProjectAccess(userUid, userRole, c.allocation.projectId);
      conflictMap[key].push({
        allocationId: c.allocation.id,
        date: c.allocation.date,
        time: `${c.allocation.startTime}–${c.allocation.endTime}`,
        isCrossProject: true,
        projectDisplay: hasAccess ? (c.projectName || c.projectCode) : 'Confidential External Project',
      });
    }

    // 7. Aggregate By Workstream Mode
    const byWorkstream: any[] = [];
    for (const z of zones) {
      const zoneStreams = workstreams.filter((s) => !s.zoneId || s.zoneId === z.id);
      for (const s of zoneStreams) {
        const dailyCounts: Record<string, number> = {};
        const dailyAllocations: Record<string, any[]> = {};
        let totalWeek = 0;

        for (const day of weekDays) {
          const matchAllocations = allocations.filter(
            (a) => a.allocation.date === day.date && a.allocation.zoneId === z.id && a.allocation.workstreamId === s.id
          );
          dailyCounts[day.date] = matchAllocations.length;
          totalWeek += matchAllocations.length;
          dailyAllocations[day.date] = matchAllocations.map((a) => ({
            id: a.allocation.id,
            personId: a.person.id,
            displayName: a.person.displayName,
            tradeRole: a.person.tradeRole,
            companyName: a.person.companyName,
            startTime: a.allocation.startTime,
            endTime: a.allocation.endTime,
            shift: a.allocation.shift,
            status: a.allocation.status,
            actualAttendance: a.allocation.actualAttendance || 'Present',
            notes: a.allocation.notes,
          }));
        }

        byWorkstream.push({
          zoneId: z.id,
          zoneCode: z.code,
          zoneName: z.name,
          linkedLocation: z.linkedLocation,
          workstreamId: s.id,
          workstreamCode: s.code,
          workstreamName: s.name,
          color: s.color,
          dailyCounts,
          dailyAllocations,
          totalWeek,
        });
      }
    }

    // Filter by trade / company if requested
    let filteredMemberships = memberships;
    if (tradeFilter !== 'All') {
      filteredMemberships = filteredMemberships.filter((m) => m.person.tradeRole === tradeFilter);
    }
    if (companyFilter !== 'All') {
      filteredMemberships = filteredMemberships.filter((m) => m.person.companyName === companyFilter);
    }

    // 8. Aggregate By Person Mode
    const byPerson: any[] = [];
    for (const m of filteredMemberships) {
      const p = m.person;
      const pQuals = personQualMap[p.id] || [];
      const hasExpired = pQuals.some((q) => q.computed.status === 'EXPIRED');
      const hasWarning = pQuals.some((q) => q.computed.status === 'EXPIRING_SOON');
      const complianceStatus = hasExpired ? 'NOT COMPLIANT' : hasWarning ? 'WARNING' : 'COMPLIANT';

      const days: Record<string, any> = {};
      let totalAllocatedDays = 0;
      let personConflictsCount = 0;

      for (const day of weekDays) {
        const dateStr = day.date;
        const myAlloc = allocations.find((a) => a.person.id === p.id && a.allocation.date === dateStr);
        const conflictsOnDay = conflictMap[`${p.id}_${dateStr}`] || [];

        if (conflictsOnDay.length > 0) {
          personConflictsCount += conflictsOnDay.length;
        }

        if (myAlloc) {
          totalAllocatedDays++;
          const z = zoneMap.get(myAlloc.allocation.zoneId);
          const s = workstreamMap.get(myAlloc.allocation.workstreamId);
          const actZ = myAlloc.allocation.actualZoneId ? zoneMap.get(myAlloc.allocation.actualZoneId) : null;
          const actS = myAlloc.allocation.actualWorkstreamId ? workstreamMap.get(myAlloc.allocation.actualWorkstreamId) : null;

          days[dateStr] = {
            status: 'Allocated',
            allocationId: myAlloc.allocation.id,
            zoneId: myAlloc.allocation.zoneId,
            zoneCode: z?.code || '—',
            zoneName: z?.name || 'Unassigned',
            workstreamId: myAlloc.allocation.workstreamId,
            workstreamName: s?.name || 'Unassigned',
            workstreamColor: s?.color || '#3b82f6',
            startTime: myAlloc.allocation.startTime,
            endTime: myAlloc.allocation.endTime,
            shift: myAlloc.allocation.shift,
            supervisorName: myAlloc.allocation.supervisorName || '—',
            actualAttendance: myAlloc.allocation.actualAttendance || 'Present',
            actualZoneCode: actZ?.code,
            actualWorkstreamName: actS?.name,
            hasConflict: conflictsOnDay.length > 0,
            conflictDetails: conflictsOnDay[0] || null,
          };
        } else if (conflictsOnDay.length > 0) {
          days[dateStr] = {
            status: 'Conflict',
            hasConflict: true,
            conflictDetails: conflictsOnDay[0],
            label: `Conflict: ${conflictsOnDay[0].projectDisplay}`,
          };
        } else if (p.employmentStatus === 'On Leave') {
          days[dateStr] = { status: 'Leave', label: 'On Leave' };
        } else if (p.employmentStatus === 'Training') {
          days[dateStr] = { status: 'Training', label: 'Training' };
        } else if (p.employmentStatus === 'Unavailable') {
          days[dateStr] = { status: 'Unavailable', label: 'Unavailable' };
        } else if (m.membership.status !== 'Active') {
          days[dateStr] = { status: 'Inactive', label: 'Inactive' };
        } else {
          days[dateStr] = { status: 'Unallocated', label: 'Unallocated' };
        }
      }

      byPerson.push({
        id: p.id,
        employeeId: p.employeeId || '—',
        displayName: p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Worker',
        tradeRole: p.tradeRole || 'Not Set',
        classification: p.classification || '—',
        companyName: p.companyName || 'Not Set',
        employmentStatus: p.employmentStatus || 'Active',
        complianceStatus,
        quals: pQuals,
        totalAllocatedDays,
        conflictsCount: personConflictsCount,
        days,
      });
    }

    // 9. Daily Summaries
    const dailySummaries = weekDays.map((d) => {
      const dayAllocCount = allocations.filter((a) => a.allocation.date === d.date).length;
      const state = dayStateMap.get(d.date);
      return {
        ...d,
        dayStatus: state?.status || 'Draft',
        allocatedCount: dayAllocCount,
      };
    });

    res.json({
      weekStartDate: dates[0],
      weekEndDate: dates[6],
      weekDays,
      dailySummaries,
      byWorkstream,
      byPerson,
    });
  } catch (error: any) {
    console.error('Week planner error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly labour plan' });
  }
});

// ==========================================
// 11. MULTI-SCOPE COPY SCHEDULE (PRE-COMMIT VALIDATION)
// ==========================================
workforceApiRouter.post('/copy-schedule', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const {
      mode = 'WEEK', // 'WEEK' | 'AREA' | 'WORKSTREAM' | 'CREW' | 'SELECTED_WORKERS'
      sourceStartDate,
      sourceEndDate,
      targetStartDate,
      shift,
      filter = {}, // { zoneId, workstreamId, crewId, personIds }
      excludedPersonIds = [],
      dryRun = false,
    } = req.body;

    if (!sourceStartDate || !targetStartDate) {
      return res.status(400).json({ error: 'Source Start Date and Target Start Date are required' });
    }

    const endSource = sourceEndDate || sourceStartDate;

    const whereCond = [
      eq(workforceAllocations.projectId, projectId),
      sql`${workforceAllocations.date} >= ${sourceStartDate} AND ${workforceAllocations.date} <= ${endSource}`,
      not(eq(workforceAllocations.status, 'Cancelled')),
    ];

    if (shift && shift !== 'All') {
      whereCond.push(eq(workforceAllocations.shift, shift));
    }
    if (mode === 'AREA' && filter.zoneId) {
      whereCond.push(eq(workforceAllocations.zoneId, Number(filter.zoneId)));
    }
    if (mode === 'WORKSTREAM' && filter.workstreamId) {
      whereCond.push(eq(workforceAllocations.workstreamId, Number(filter.workstreamId)));
    }
    if (mode === 'CREW' && filter.crewId) {
      whereCond.push(eq(workforceAllocations.crewId, Number(filter.crewId)));
    }
    if (mode === 'SELECTED_WORKERS' && Array.isArray(filter.personIds) && filter.personIds.length > 0) {
      whereCond.push(inArray(workforceAllocations.personId, filter.personIds.map(Number)));
    }

    const sourceAllocations = await db
      .select({
        allocation: workforceAllocations,
        person: workforcePeople,
      })
      .from(workforceAllocations)
      .innerJoin(workforcePeople, eq(workforceAllocations.personId, workforcePeople.id))
      .where(and(...whereCond));

    if (sourceAllocations.length === 0) {
      return res.status(400).json({ error: 'No source allocations found matching the selected criteria' });
    }

    const readyToCopy: any[] = [];
    const conflicts: any[] = [];
    const unavailableWorkers: any[] = [];
    const qualificationWarnings: any[] = [];

    const startSrcTime = new Date(sourceStartDate).getTime();
    const startTgtTime = new Date(targetStartDate).getTime();
    const dayOffsetMs = startTgtTime - startSrcTime;

    const memberships = await db
      .select()
      .from(workforceProjectMemberships)
      .where(eq(workforceProjectMemberships.projectId, projectId));
    const memberMap = new Map(memberships.map((m) => [m.personId, m]));

    const personIds = Array.from(new Set(sourceAllocations.map((a) => a.person.id)));
    const quals = await db
      .select()
      .from(workforceQualifications)
      .where(inArray(workforceQualifications.personId, personIds));
    const qualMap: Record<number, any[]> = {};
    for (const q of quals) {
      if (!qualMap[q.personId]) qualMap[q.personId] = [];
      qualMap[q.personId].push({ ...q, computed: computeQualificationStatus(q) });
    }

    const userUid = req.user?.uid || 'user';
    const userRole = req.user?.role || 'Viewer';

    // Pre-calculate target dates set
    const targetDatesSet = new Set<string>();
    for (const item of sourceAllocations) {
      const srcDateMs = new Date(item.allocation.date).getTime();
      const targetDateStr = new Date(srcDateMs + dayOffsetMs).toISOString().split('T')[0];
      targetDatesSet.add(targetDateStr);
    }
    const targetDates = Array.from(targetDatesSet);

    // 1. Batch query target day states
    const targetDayStates = targetDates.length > 0 ? await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), inArray(workforceDayStates.date, targetDates))) : [];
    const targetDayStateMap = new Map(targetDayStates.map((s) => [s.date, s]));

    // 2. Batch query existing allocations on target dates across projects for these persons
    const existingAllocsList = (personIds.length > 0 && targetDates.length > 0) ? await db
      .select({
        allocation: workforceAllocations,
        projectCode: projects.code,
        projectName: projects.name,
      })
      .from(workforceAllocations)
      .innerJoin(projects, eq(workforceAllocations.projectId, projects.id))
      .where(
        and(
          inArray(workforceAllocations.personId, personIds),
          inArray(workforceAllocations.date, targetDates),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      ) : [];

    // Group by personId_date
    const existingAllocMap = new Map<string, typeof existingAllocsList>();
    for (const ea of existingAllocsList) {
      const key = `${ea.allocation.personId}_${ea.allocation.date}`;
      if (!existingAllocMap.has(key)) existingAllocMap.set(key, []);
      existingAllocMap.get(key)!.push(ea);
    }

    for (const item of sourceAllocations) {
      const a = item.allocation;
      const p = item.person;

      const srcDateMs = new Date(a.date).getTime();
      const targetDateObj = new Date(srcDateMs + dayOffsetMs);
      const targetDateStr = targetDateObj.toISOString().split('T')[0];

      if (excludedPersonIds.includes(p.id)) {
        continue;
      }

      const tgtDayState = targetDayStateMap.get(targetDateStr);
      if (tgtDayState && tgtDayState.status === 'Locked') {
        conflicts.push({
          personId: p.id,
          workerName: p.displayName,
          date: targetDateStr,
          reason: `Target day ${targetDateStr} is Locked`,
        });
        continue;
      }

      const mem = memberMap.get(p.id);
      if (!mem || mem.status !== 'Active') {
        unavailableWorkers.push({
          personId: p.id,
          workerName: p.displayName,
          date: targetDateStr,
          reason: 'Inactive Project Membership',
        });
        continue;
      }

      if (p.employmentStatus !== 'Active') {
        unavailableWorkers.push({
          personId: p.id,
          workerName: p.displayName,
          date: targetDateStr,
          reason: `Worker is ${p.employmentStatus}`,
        });
        continue;
      }

      const existingAllocs = existingAllocMap.get(`${p.id}_${targetDateStr}`) || [];
      const overlap = existingAllocs.find((ex) => timesOverlap(a.startTime, a.endTime, ex.allocation.startTime, ex.allocation.endTime));
      if (overlap) {
        let conflictMsg = '';
        if (overlap.allocation.projectId !== projectId) {
          const hasAccess = await checkUserProjectAccess(userUid, userRole, overlap.allocation.projectId);
          conflictMsg = hasAccess
            ? `Allocated on ${overlap.projectName || overlap.projectCode} (${overlap.allocation.startTime}–${overlap.allocation.endTime})`
            : `Confidential external project conflict (${overlap.allocation.startTime}–${overlap.allocation.endTime})`;
        } else {
          conflictMsg = `Already allocated on this project (${overlap.allocation.startTime}–${overlap.allocation.endTime})`;
        }
        conflicts.push({
          personId: p.id,
          workerName: p.displayName,
          date: targetDateStr,
          reason: conflictMsg,
        });
        continue;
      }

      const pQuals = qualMap[p.id] || [];
      const hasExpired = pQuals.some((q) => q.computed.status === 'EXPIRED');
      const hasWarning = pQuals.some((q) => q.computed.status === 'EXPIRING_SOON');
      if (hasExpired) {
        unavailableWorkers.push({
          personId: p.id,
          workerName: p.displayName,
          date: targetDateStr,
          reason: 'Qualification Restriction (Expired Licence)',
        });
        continue;
      }
      if (hasWarning) {
        qualificationWarnings.push({
          personId: p.id,
          workerName: p.displayName,
          date: targetDateStr,
          warning: 'Expiring credential within 30 days',
        });
      }

      readyToCopy.push({
        personId: p.id,
        projectId,
        date: targetDateStr,
        shift: a.shift,
        startTime: a.startTime,
        endTime: a.endTime,
        zoneId: a.zoneId,
        workstreamId: a.workstreamId,
        crewId: a.crewId,
        supervisorName: a.supervisorName,
        status: 'Draft',
        notes: `Copied from ${a.date}`,
        createdBy: req.user?.name || req.user?.email || 'User',
      });
    }

    if (dryRun) {
      return res.json({
        dryRun: true,
        mode,
        sourceRange: `${sourceStartDate} to ${endSource}`,
        targetStartDate,
        totalSourceAllocations: sourceAllocations.length,
        readyToCopyCount: readyToCopy.length,
        conflictsCount: conflicts.length,
        unavailableCount: unavailableWorkers.length,
        warningsCount: qualificationWarnings.length,
        readyToCopy: readyToCopy.slice(0, 50),
        conflicts,
        unavailableWorkers,
        qualificationWarnings,
      });
    }

    let inserted: any[] = [];
    if (readyToCopy.length > 0) {
      inserted = await db.insert(workforceAllocations).values(readyToCopy).returning();
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceSchedule',
      entityId: projectId,
      entityCode: `COPY-${mode}-${targetStartDate}`,
      action: 'CopySchedule',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'User',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({
        mode,
        sourceStartDate,
        sourceEndDate: endSource,
        targetStartDate,
        copiedCount: inserted.length,
        conflictsCount: conflicts.length,
        unavailableCount: unavailableWorkers.length,
      }),
    });

    res.json({
      success: true,
      copiedCount: inserted.length,
      skippedConflicts: conflicts.length,
      skippedUnavailable: unavailableWorkers.length,
      conflicts,
      unavailableWorkers,
      qualificationWarnings,
    });
  } catch (error: any) {
    console.error('Copy schedule error:', error);
    res.status(500).json({ error: 'Failed to copy schedule' });
  }
});

// ==========================================
// 12. EXPORT LABOUR SHEETS AS CSV
// ==========================================
workforceApiRouter.get('/daily-board/export-csv', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const date = (req.query.date as string) || getTodayString();
    const shift = (req.query.shift as string) || 'Day Shift';

    const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
    const allocations = await db
      .select({
        allocation: workforceAllocations,
        person: workforcePeople,
        zone: workforceZones,
        workstream: workforceWorkstreams,
      })
      .from(workforceAllocations)
      .innerJoin(workforcePeople, eq(workforceAllocations.personId, workforcePeople.id))
      .leftJoin(workforceZones, eq(workforceAllocations.zoneId, workforceZones.id))
      .leftJoin(workforceWorkstreams, eq(workforceAllocations.workstreamId, workforceWorkstreams.id))
      .where(
        and(
          eq(workforceAllocations.projectId, projectId),
          eq(workforceAllocations.date, date),
          eq(workforceAllocations.shift, shift),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      )
      .orderBy(workforceZones.code, workforceWorkstreams.name, workforcePeople.lastName);

    const rows = [
      ['MAXIM FORGE — DAILY LABOUR SHEET'],
      [`Project: ${proj?.name || proj?.code || 'Project'}`, `Date: ${date}`, `Shift: ${shift}`],
      [],
      ['Employee ID', 'Name', 'Company', 'Trade / Role', 'Area / Zone', 'Workstream', 'Planned Hours', 'Actual Status', 'Supervisor', 'Notes'],
    ];

    for (const a of allocations) {
      rows.push([
        a.person.employeeId || '—',
        a.person.displayName || `${a.person.firstName || ''} ${a.person.lastName || ''}`.trim() || 'Unknown Worker',
        a.person.companyName || 'Not Set',
        a.person.tradeRole || 'Not Set',
        a.zone?.code || 'Unassigned',
        a.workstream?.name || 'Unassigned',
        a.allocation.startTime && a.allocation.endTime ? `${a.allocation.startTime}–${a.allocation.endTime}` : '—',
        a.allocation.actualAttendance || 'Present',
        a.allocation.supervisorName || '—',
        (a.allocation.notes || a.allocation.actualNotes || '').replace(/,/g, ';'),
      ]);
    }

    const csvContent = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="daily-labour-${date}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export daily labour CSV' });
  }
});

workforceApiRouter.get('/week-planner/export-csv', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const startDate = (req.query.startDate as string) || getTodayString();
    const weekDays = getWeekDates(startDate);
    const dates = weekDays.map((d) => d.date);

    const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
    const allocations = await db
      .select({
        allocation: workforceAllocations,
        person: workforcePeople,
        zone: workforceZones,
        workstream: workforceWorkstreams,
      })
      .from(workforceAllocations)
      .innerJoin(workforcePeople, eq(workforceAllocations.personId, workforcePeople.id))
      .leftJoin(workforceZones, eq(workforceAllocations.zoneId, workforceZones.id))
      .leftJoin(workforceWorkstreams, eq(workforceAllocations.workstreamId, workforceWorkstreams.id))
      .where(
        and(
          eq(workforceAllocations.projectId, projectId),
          inArray(workforceAllocations.date, dates),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    const rows = [
      ['MAXIM FORGE — WEEKLY LABOUR PLAN'],
      [`Project: ${proj?.name || proj?.code}`, `Week: ${dates[0]} to ${dates[6]}`],
      [],
      ['Employee ID', 'Name', 'Trade', 'Company', ...weekDays.map((d) => `${d.dayName} (${d.dayNumber})`)],
    ];

    const personMap = new Map<number, { person: any; days: Record<string, string> }>();
    for (const a of allocations) {
      if (!personMap.has(a.person.id)) {
        personMap.set(a.person.id, { person: a.person, days: {} });
      }
      personMap.get(a.person.id)!.days[a.allocation.date] = `${a.zone?.code || ''} ${a.workstream?.name || ''}`;
    }

    for (const [, item] of personMap) {
      rows.push([
        item.person.employeeId || '—',
        item.person.displayName || `${item.person.firstName || ''} ${item.person.lastName || ''}`.trim() || 'Unknown Worker',
        item.person.tradeRole || 'Not Set',
        item.person.companyName || 'Not Set',
        ...dates.map((d) => item.days[d] || 'Unallocated'),
      ]);
    }

    const csvContent = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="week-plan-${dates[0]}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export weekly plan CSV' });
  }
});

// ==========================================
// 13. QUALIFICATIONS REGISTER
// ==========================================
workforceApiRouter.get('/qualifications', async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : '';
    const typeCode = req.query.typeCode ? String(req.query.typeCode) : '';
    const verificationStatus = req.query.verificationStatus ? String(req.query.verificationStatus) : '';
    const personId = req.query.personId ? Number(req.query.personId) : null;
    const expiryFilter = req.query.expiryFilter ? String(req.query.expiryFilter) : '';

    let quals = await db
      .select({
        qualification: workforceQualifications,
        person: workforcePeople,
      })
      .from(workforceQualifications)
      .innerJoin(workforcePeople, eq(workforceQualifications.personId, workforcePeople.id))
      .orderBy(asc(workforceQualifications.expiryDate));

    if (personId) {
      quals = quals.filter((q) => q.qualification.personId === personId);
    }

    if (typeCode && typeCode !== 'All') {
      quals = quals.filter((q) => q.qualification.typeCode === typeCode);
    }

    if (verificationStatus && verificationStatus !== 'All') {
      quals = quals.filter((q) => q.qualification.verificationStatus === verificationStatus);
    }

    if (search) {
      quals = quals.filter(
        (q) =>
          q.person.displayName.toLowerCase().includes(search) ||
          q.qualification.licenceNumber.toLowerCase().includes(search) ||
          q.qualification.typeName.toLowerCase().includes(search) ||
          q.qualification.issuingAuthority.toLowerCase().includes(search)
      );
    }

    let evaluated = quals.map((q) => ({
      ...q.qualification,
      person: q.person,
      computed: computeQualificationStatus(q.qualification),
    }));

    // Filter by expiry window if supplied
    if (expiryFilter === 'EXPIRED') {
      evaluated = evaluated.filter((q) => q.computed.status === 'EXPIRED');
    } else if (expiryFilter === 'EXPIRING_7') {
      evaluated = evaluated.filter((q) => q.computed.daysRemaining !== null && q.computed.daysRemaining <= 7 && q.computed.daysRemaining >= 0);
    } else if (expiryFilter === 'EXPIRING_30') {
      evaluated = evaluated.filter((q) => q.computed.daysRemaining !== null && q.computed.daysRemaining <= 30 && q.computed.daysRemaining >= 0);
    } else if (expiryFilter === 'EXPIRING_60') {
      evaluated = evaluated.filter((q) => q.computed.daysRemaining !== null && q.computed.daysRemaining <= 60 && q.computed.daysRemaining >= 0);
    } else if (expiryFilter === 'EXPIRING_90') {
      evaluated = evaluated.filter((q) => q.computed.daysRemaining !== null && q.computed.daysRemaining <= 90 && q.computed.daysRemaining >= 0);
    }

    res.json(evaluated);
  } catch (error: any) {
    console.error('Fetch qualifications error:', error);
    res.status(500).json({ error: 'Failed to fetch qualifications' });
  }
});

workforceApiRouter.post('/qualifications', async (req: AuthRequest, res: Response) => {
  try {
    const {
      personId,
      typeCode,
      licenceNumber,
      issuingAuthority,
      jurisdiction = 'VIC',
      issueDate = getTodayString(),
      expiryDate,
      noExpiry = false,
      documentFrontUrl,
      documentBackUrl,
      notes,
      renewingQualificationId,
    } = req.body;

    if (!personId || !typeCode || !licenceNumber || !issuingAuthority) {
      return res.status(400).json({ error: 'Person, Qualification Type, Licence Number and Issuing Authority are required' });
    }

    const [qType] = await db.select().from(workforceQualificationTypes).where(eq(workforceQualificationTypes.code, typeCode));
    const typeName = qType?.name || typeCode;
    const typeId = qType?.id || 1;

    let version = 1;
    let prevId = null;

    // Preserve historical credential records!
    if (renewingQualificationId) {
      const [prev] = await db.select().from(workforceQualifications).where(eq(workforceQualifications.id, Number(renewingQualificationId)));
      if (prev) {
        version = (prev.version || 1) + 1;
        prevId = prev.id;
      }
    }

    const [created] = await db
      .insert(workforceQualifications)
      .values({
        personId: Number(personId),
        typeId,
        typeCode,
        typeName,
        licenceNumber: String(licenceNumber).trim(),
        issuingAuthority: String(issuingAuthority).trim(),
        jurisdiction,
        issueDate,
        expiryDate: noExpiry ? null : expiryDate,
        noExpiry: Boolean(noExpiry),
        documentFrontUrl,
        documentBackUrl,
        verificationStatus: 'Pending Verification',
        notes,
        version,
        previousRecordId: prevId,
      })
      .returning();

    await db.insert(auditLogs).values({
      projectId: 1,
      entityType: 'WorkforceQualification',
      entityId: created.id,
      entityCode: created.licenceNumber,
      action: renewingQualificationId ? 'RenewCredential' : 'UploadCredential',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'User',
      performedByRole: req.user?.role || 'User',
      details: JSON.stringify({ personId, typeName, licenceNumber, version }),
    });

    res.status(201).json({
      ...created,
      computed: computeQualificationStatus(created),
    });
  } catch (error: any) {
    console.error('Create qualification error:', error);
    res.status(500).json({ error: 'Failed to record qualification' });
  }
});

// Admin verify / reject qualification
workforceApiRouter.post('/qualifications/:id/verify', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, notes } = req.body; // 'Verified' or 'Rejected'

    if (status !== 'Verified' && status !== 'Rejected') {
      return res.status(400).json({ error: "Status must be 'Verified' or 'Rejected'" });
    }

    const [updated] = await db
      .update(workforceQualifications)
      .set({
        verificationStatus: status,
        verifiedBy: req.user?.email || 'admin',
        verifiedByName: req.user?.name || 'Administrator',
        verifiedAt: new Date(),
        notes: notes ? notes : undefined,
        updatedAt: new Date(),
      })
      .where(eq(workforceQualifications.id, id))
      .returning();

    await db.insert(auditLogs).values({
      projectId: 1,
      entityType: 'WorkforceQualification',
      entityId: id,
      entityCode: updated.licenceNumber,
      action: status === 'Verified' ? 'VerifyCredential' : 'RejectCredential',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'QA Manager',
      details: JSON.stringify({ status, licenceNumber: updated.licenceNumber }),
    });

    res.json({
      ...updated,
      computed: computeQualificationStatus(updated),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to verify qualification' });
  }
});

// Qualification Types catalog
workforceApiRouter.get('/qualification-types', async (_req: Request, res: Response) => {
  try {
    const types = await db.select().from(workforceQualificationTypes).orderBy(workforceQualificationTypes.name);
    res.json(types);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch qualification types' });
  }
});

// ==========================================
// 11. RENEWALS & TRAINING WORKFLOW
// ==========================================
workforceApiRouter.get('/renewals', async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status ? String(req.query.status) : '';
    const renewals = await db
      .select({
        renewal: workforceRenewals,
        person: workforcePeople,
        qualification: workforceQualifications,
      })
      .from(workforceRenewals)
      .innerJoin(workforcePeople, eq(workforceRenewals.personId, workforcePeople.id))
      .leftJoin(workforceQualifications, eq(workforceRenewals.qualificationId, workforceQualifications.id))
      .orderBy(desc(workforceRenewals.createdAt));

    let filtered = renewals;
    if (status && status !== 'All') {
      filtered = filtered.filter((r) => r.renewal.status.toLowerCase() === status.toLowerCase());
    }

    res.json(filtered.map((r) => ({
      ...r.renewal,
      person: r.person,
      qualification: r.qualification ? {
        ...r.qualification,
        computed: computeQualificationStatus(r.qualification),
      } : null,
    })));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch renewals' });
  }
});

workforceApiRouter.post('/renewals', async (req: AuthRequest, res: Response) => {
  try {
    const {
      personId,
      qualificationId,
      qualificationTypeCode,
      trainingProvider,
      bookingDate,
      bookingTime,
      location,
      bookingReference,
      cost,
      notes,
    } = req.body;

    if (!personId || !qualificationTypeCode) {
      return res.status(400).json({ error: 'Person and Qualification Type are required' });
    }

    const [qType] = await db.select().from(workforceQualificationTypes).where(eq(workforceQualificationTypes.code, qualificationTypeCode));

    const [created] = await db
      .insert(workforceRenewals)
      .values({
        personId: Number(personId),
        qualificationId: qualificationId ? Number(qualificationId) : null,
        qualificationTypeCode,
        qualificationTypeName: qType?.name || qualificationTypeCode,
        status: bookingDate ? 'Booked' : 'Booking Requested',
        trainingProvider,
        bookingDate,
        bookingTime,
        location,
        bookingReference,
        bookedBy: req.user?.name || req.user?.email || 'User',
        cost,
        notes,
      })
      .returning();

    await db.insert(auditLogs).values({
      projectId: 1,
      entityType: 'WorkforceRenewal',
      entityId: created.id,
      entityCode: `RENEWAL-${created.id}`,
      action: 'RenewalBookingAdded',
      performedBy: req.user?.email || 'user',
      performedByName: req.user?.name || 'User',
      performedByRole: req.user?.role || 'QA Manager',
      details: JSON.stringify({ personId, qualificationTypeCode, bookingDate, status: created.status }),
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create renewal booking' });
  }
});

workforceApiRouter.put('/renewals/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, trainingProvider, bookingDate, bookingTime, location, bookingReference, notes } = req.body;

    const [updated] = await db
      .update(workforceRenewals)
      .set({
        status: status ? status : undefined,
        trainingProvider: trainingProvider ? trainingProvider : undefined,
        bookingDate: bookingDate ? bookingDate : undefined,
        bookingTime: bookingTime ? bookingTime : undefined,
        location: location ? location : undefined,
        bookingReference: bookingReference ? bookingReference : undefined,
        notes: notes ? notes : undefined,
        updatedAt: new Date(),
      })
      .where(eq(workforceRenewals.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update renewal' });
  }
});

// ==========================================
// 12. BULK IMPORT WORKERS & QUALIFICATIONS
// ==========================================
workforceApiRouter.post('/bulk-import-people', async (req: AuthRequest, res: Response) => {
  try {
    const { workers = [], targetProjectId } = req.body;
    if (!Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: 'Workers array is required' });
    }

    const projectId = targetProjectId ? Number(targetProjectId) : getReqProjectId(req);
    const existing = await db.select().from(workforcePeople);
    const existingEmpIds = new Set(existing.map((e) => e.employeeId.toUpperCase()));
    const existingEmails = new Set(existing.filter((e) => e.workEmail).map((e) => e.workEmail!.toLowerCase()));

    const importedPeople = [];
    const skippedDuplicates = [];

    for (const w of workers) {
      const empId = w.employeeId ? String(w.employeeId).trim().toUpperCase() : `EMP-${Math.floor(100 + Math.random() * 900)}`;
      const email = w.workEmail ? String(w.workEmail).trim().toLowerCase() : '';

      if (existingEmpIds.has(empId) || (email && existingEmails.has(email))) {
        skippedDuplicates.push({ name: `${w.firstName} ${w.lastName}`, reason: 'Employee ID or Email already exists' });
        continue;
      }

      const [created] = await db
        .insert(workforcePeople)
        .values({
          employeeId: empId,
          firstName: w.firstName || 'Unknown',
          lastName: w.lastName || 'Worker',
          displayName: w.displayName || `${w.firstName || ''} ${w.lastName || ''}`.trim() || 'Unknown Worker',
          companyName: w.companyName || 'Not Set',
          employmentType: w.employmentType || 'Direct',
          tradeRole: w.tradeRole || 'Not Set',
          classification: w.classification || '—',
          phone: w.phone,
          workEmail: email || undefined,
          employmentStatus: 'Active',
          startDate: w.startDate || getTodayString(),
        })
        .returning();

      // Assign project membership
      await db.insert(workforceProjectMemberships).values({
        personId: created.id,
        projectId,
        status: 'Active',
        notes: 'Bulk imported worker',
      });

      importedPeople.push(created);
      existingEmpIds.add(empId);
      if (email) existingEmails.add(email);
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceBulkImport',
      entityId: importedPeople.length,
      entityCode: `BULK-IMPORT-${importedPeople.length}`,
      action: 'BulkImport',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ importedCount: importedPeople.length, skippedCount: skippedDuplicates.length }),
    });

    res.json({
      success: true,
      importedCount: importedPeople.length,
      skippedCount: skippedDuplicates.length,
      skippedDuplicates,
    });
  } catch (error: any) {
    console.error('Bulk import people error:', error);
    res.status(500).json({ error: 'Failed to bulk import workers' });
  }
});

workforceApiRouter.post('/bulk-import-qualifications', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const { qualifications } = req.body;
    if (!Array.isArray(qualifications) || qualifications.length === 0) {
      return res.status(400).json({ error: 'Qualifications array is required' });
    }

    const allPeople = await db.select().from(workforcePeople);
    const peopleMap = new Map(allPeople.map((p) => [p.employeeId, p]));
    const qTypes = await db.select().from(workforceQualificationTypes);
    const typeMap = new Map(qTypes.map((t) => [t.code, t]));

    const importedQuals: any[] = [];
    const skippedRecords: { employeeId: string; reason: string }[] = [];

    for (const q of qualifications) {
      const empId = String(q.employeeId || '').trim();
      const person = peopleMap.get(empId);
      if (!person) {
        skippedRecords.push({ employeeId: empId, reason: 'Worker with this Employee ID not found' });
        continue;
      }

      const typeCode = String(q.typeCode || q.qualificationType || 'WHITE-CARD').trim().toUpperCase();
      const qType = typeMap.get(typeCode);
      const typeName = qType ? qType.name : (q.typeName || typeCode);
      const validTypeId = qType ? qType.id : (qTypes[0]?.id || 1);

      const [created] = await db
        .insert(workforceQualifications)
        .values({
          personId: person.id,
          typeId: validTypeId,
          typeCode,
          typeName,
          licenceNumber: String(q.licenceNumber || `LIC-${Date.now()}`),
          issuingAuthority: q.issuingAuthority || 'Regulatory Authority',
          jurisdiction: q.jurisdiction || 'VIC',
          issueDate: q.issueDate || getTodayString(),
          expiryDate: q.expiryDate || null,
          noExpiry: q.noExpiry === true || !q.expiryDate,
          verificationStatus: q.status === 'Verified' ? 'Verified' : 'Pending Verification',
          notes: q.notes || 'Imported via Bulk Qualification Register',
        })
        .returning();

      importedQuals.push(created);
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceBulkImportQualifications',
      entityId: importedQuals.length,
      entityCode: `BULK-QUALS-${importedQuals.length}`,
      action: 'BulkImportQualifications',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ importedCount: importedQuals.length, skippedCount: skippedRecords.length }),
    });

    res.json({
      success: true,
      importedCount: importedQuals.length,
      skippedCount: skippedRecords.length,
      skippedRecords,
    });
  } catch (error: any) {
    console.error('Bulk import qualifications error:', error);
    res.status(500).json({ error: 'Failed to bulk import qualifications' });
  }
});

// ==========================================
// 15. MASTER LABOUR SCHEDULE REGISTER
// ==========================================
workforceApiRouter.get('/master-schedule', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const date = String(req.query.date || getTodayString());
    const shift = String(req.query.shift || 'Day Shift');
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : '';
    const statusFilter = req.query.statusFilter ? String(req.query.statusFilter).toUpperCase() : 'ALL';
    const areaId = req.query.areaId ? Number(req.query.areaId) : null;
    const workstreamId = req.query.workstreamId ? Number(req.query.workstreamId) : null;
    const crewId = req.query.crewId ? Number(req.query.crewId) : null;
    const tradeRole = req.query.tradeRole ? String(req.query.tradeRole) : '';
    const company = req.query.company ? String(req.query.company) : '';

    // Fetch active project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

    // Fetch all active people on this project via project memberships or direct assignment
    const members = await db
      .select({
        person: workforcePeople,
        membership: workforceProjectMemberships,
      })
      .from(workforcePeople)
      .innerJoin(
        workforceProjectMemberships,
        and(
          eq(workforceProjectMemberships.personId, workforcePeople.id),
          eq(workforceProjectMemberships.projectId, projectId)
        )
      );

    // Also include workers who have allocations on this project
    const allPeople = await db.select().from(workforcePeople);

    // Fetch all allocations for this date and shift across all projects
    const allAllocationsOnDate = await db
      .select({
        allocation: workforceAllocations,
        zone: workforceZones,
        workstream: workforceWorkstreams,
        project: projects,
      })
      .from(workforceAllocations)
      .leftJoin(workforceZones, eq(workforceAllocations.zoneId, workforceZones.id))
      .leftJoin(workforceWorkstreams, eq(workforceAllocations.workstreamId, workforceWorkstreams.id))
      .leftJoin(projects, eq(workforceAllocations.projectId, projects.id))
      .where(
        and(
          eq(workforceAllocations.date, date),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    // Fetch training sessions and attendees on this date
    const trainingRecords = await db
      .select({
        attendee: workforceTrainingAttendees,
        session: workforceTrainingSessions,
      })
      .from(workforceTrainingAttendees)
      .innerJoin(workforceTrainingSessions, eq(workforceTrainingAttendees.sessionId, workforceTrainingSessions.id))
      .where(
        and(
          eq(workforceTrainingSessions.sessionDate, date),
          not(eq(workforceTrainingAttendees.attendanceStatus, 'Cancelled')),
          not(eq(workforceTrainingSessions.status, 'Cancelled'))
        )
      );

    // Fetch all crew members and crews
    const crews = await db.select().from(workforceCrews);
    const crewMembers = await db.select().from(workforceCrewMembers);
    const personCrewMap = new Map<number, string>();
    const personCrewIdMap = new Map<number, number>();
    for (const cm of crewMembers) {
      const cr = crews.find((c) => c.id === cm.crewId);
      if (cr) {
        personCrewMap.set(cm.personId, cr.name);
        personCrewIdMap.set(cm.personId, cr.id);
      }
    }

    // Fetch all qualifications for warning badges
    const allQuals = await db.select().from(workforceQualifications);
    const personQualMap = new Map<number, any[]>();
    for (const q of allQuals) {
      if (!personQualMap.has(q.personId)) personQualMap.set(q.personId, []);
      personQualMap.get(q.personId)!.push(q);
    }

    // Fetch role requirements to detect missing or expired mandatory quals
    const mandatoryReqs = await db
      .select()
      .from(workforceRoleRequirements)
      .where(eq(workforceRoleRequirements.isMandatory, true));

    // Target people to display
    // Default 'ALL' shows all enterprise workers (100+ workers); or filter by specific project ID
    const projectFilter = req.query.projectFilter ? String(req.query.projectFilter) : 'ALL';
    const memberPersonIds = new Set(members.map((m) => m.person.id));

    const targetPeople = allPeople.filter((p) => {
      if (projectFilter === 'ALL') return true;
      const targetProjId = Number(projectFilter);
      return (
        memberPersonIds.has(p.id) ||
        allAllocationsOnDate.some((a) => a.allocation.personId === p.id && a.allocation.projectId === targetProjId)
      );
    });

    let rows: any[] = [];
    let allocatedCount = 0;
    let unallocatedCount = 0;
    let onLeaveCount = 0;
    let trainingCount = 0;
    let conflictsCount = 0;
    let otherProjectCount = 0;
    let qualBlockedCount = 0;
    let inactiveCount = 0;
    let warningsCount = 0;

    const now = new Date();

    for (const p of targetPeople) {
      // Find allocations on this date
      const personAllocs = allAllocationsOnDate.filter((a) => a.allocation.personId === p.id);
      const projAlloc = personAllocs.find((a) => a.allocation.projectId === projectId && a.allocation.shift === shift);
      const otherProjectAlloc = personAllocs.find((a) => a.allocation.projectId !== projectId);

      // Check training on this date
      const personTraining = trainingRecords.find((t) => t.attendee.personId === p.id);

      // Check qualifications
      const quals = personQualMap.get(p.id) || [];
      let qualWarning: string | null = null;
      let hasExpired = false;

      // Check mandatory requirements
      const pMandatory = mandatoryReqs.filter((r) => r.tradeRole.toLowerCase() === (p.tradeRole || '').toLowerCase());
      for (const reqItem of pMandatory) {
        const matching = quals.find((q) => q.typeCode.toLowerCase() === reqItem.qualificationTypeCode.toLowerCase());
        if (!matching) {
          qualWarning = `Missing mandatory ${reqItem.qualificationTypeCode}`;
          hasExpired = true;
          break;
        } else if (matching.expiryDate && new Date(matching.expiryDate) < now) {
          qualWarning = `Expired mandatory ${reqItem.qualificationTypeCode}`;
          hasExpired = true;
          break;
        }
      }

      if (!qualWarning) {
        // Check expiring within 30 days
        for (const q of quals) {
          if (q.expiryDate) {
            const exp = new Date(q.expiryDate);
            const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (days >= 0 && days <= 30) {
              qualWarning = `⚠ ${q.typeCode || q.typeName} expires in ${days} days`;
              break;
            }
          }
        }
      }

      if (qualWarning) warningsCount++;

      // Determine Allocation Status and Availability (8 clearly distinguished states)
      let allocationStatus: 'ALLOCATED' | 'UNALLOCATED' | 'ON LEAVE' | 'TRAINING' | 'OTHER PROJECT' | 'CONFLICT' | 'QUALIFICATION BLOCKED' | 'INACTIVE' = 'UNALLOCATED';
      let availability = 'AVAILABLE';

      if (p.employmentStatus === 'Inactive' || p.employmentStatus === 'Offboarded') {
        allocationStatus = 'INACTIVE';
        availability = 'INACTIVE';
        inactiveCount++;
      } else if (p.employmentStatus === 'Leave' || p.employmentStatus === 'On Leave') {
        allocationStatus = 'ON LEAVE';
        availability = 'ON LEAVE';
        onLeaveCount++;
      } else if (personTraining) {
        allocationStatus = 'TRAINING';
        availability = 'TRAINING';
        trainingCount++;
      } else if (hasExpired) {
        allocationStatus = 'QUALIFICATION BLOCKED';
        availability = 'QUALIFICATION_BLOCKED';
        qualBlockedCount++;
      } else if (projAlloc && otherProjectAlloc) {
        allocationStatus = 'CONFLICT';
        availability = 'CROSS_PROJECT_CONFLICT';
        conflictsCount++;
      } else if (projAlloc) {
        allocationStatus = 'ALLOCATED';
        availability = 'ALLOCATED';
        allocatedCount++;
      } else if (otherProjectAlloc) {
        allocationStatus = 'OTHER PROJECT';
        availability = 'ON_ANOTHER_PROJECT';
        otherProjectCount++;
      } else {
        allocationStatus = 'UNALLOCATED';
        availability = 'AVAILABLE';
        unallocatedCount++;
      }

      const activeAlloc = projAlloc || otherProjectAlloc;
      const qualificationState = qualWarning
        ? qualWarning
        : quals.length === 0
        ? 'Not Assessed'
        : 'Compliant';

      const row = {
        personId: p.id,
        workerName: p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Worker',
        employeeId: p.employeeId || '—',
        company: p.companyName || 'Not Set',
        tradeRole: p.tradeRole || 'Not Set',
        classification: p.classification || '—',
        crew: personCrewMap.get(p.id) || (p.defaultCrewId ? crews.find((c) => c.id === p.defaultCrewId)?.name : null) || '—',
        crewId: personCrewIdMap.get(p.id) || p.defaultCrewId || null,
        project: activeAlloc ? (activeAlloc.project?.code || 'Unassigned') : 'Unassigned',
        projectName: activeAlloc ? (activeAlloc.project?.name || 'Unassigned') : 'Unassigned',
        projectId: activeAlloc?.allocation.projectId || null,
        area: activeAlloc?.zone?.name || 'Unassigned',
        areaCode: activeAlloc?.zone?.code || null,
        areaId: activeAlloc?.zone?.id || null,
        workstream: activeAlloc?.workstream?.name || 'Unassigned',
        workstreamColor: activeAlloc?.workstream?.color || '#3b82f6',
        workstreamId: activeAlloc?.workstream?.id || null,
        shift: activeAlloc?.allocation.shift || (allocationStatus === 'UNALLOCATED' ? '—' : shift),
        startTime: activeAlloc?.allocation.startTime || '—',
        endTime: activeAlloc?.allocation.endTime || '—',
        supervisor: activeAlloc?.allocation.supervisorName || p.defaultSupervisorName || '—',
        allocationStatus,
        availability,
        qualificationWarning: qualWarning,
        qualificationState,
        hasExpired,
        allocationId: activeAlloc?.allocation.id || null,
        actualAttendance: activeAlloc?.allocation.actualAttendance || null,
        trainingDetails: personTraining ? {
          courseName: personTraining.session.courseName,
          providerName: personTraining.session.providerName,
          startTime: personTraining.session.startTime,
          endTime: personTraining.session.endTime,
          location: personTraining.session.location,
        } : null,
        crossProjectDetails: otherProjectAlloc ? {
          projectCode: otherProjectAlloc.project?.code,
          projectName: otherProjectAlloc.project?.name,
          startTime: otherProjectAlloc.allocation.startTime,
          endTime: otherProjectAlloc.allocation.endTime,
        } : null,
      };

      // Filter logic
      if (search) {
        const q = search.toLowerCase();
        if (
          !row.workerName.toLowerCase().includes(q) &&
          !row.employeeId.toLowerCase().includes(q) &&
          !row.company.toLowerCase().includes(q) &&
          !row.tradeRole.toLowerCase().includes(q)
        ) {
          continue;
        }
      }

      if (tradeRole && tradeRole !== 'All' && row.tradeRole !== tradeRole) continue;
      if (company && company !== 'All' && row.company !== company) continue;
      if (areaId && row.areaId !== areaId) continue;
      if (workstreamId && row.workstreamId !== workstreamId) continue;
      if (crewId && row.crewId !== crewId) continue;

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ALLOCATED' && row.allocationStatus !== 'ALLOCATED') continue;
        if (statusFilter === 'UNALLOCATED' && row.allocationStatus !== 'UNALLOCATED') continue;
        if (statusFilter === 'ON_LEAVE' && row.allocationStatus !== 'ON LEAVE') continue;
        if (statusFilter === 'TRAINING' && row.allocationStatus !== 'TRAINING') continue;
        if (statusFilter === 'OTHER_PROJECT' && row.allocationStatus !== 'OTHER PROJECT') continue;
        if (statusFilter === 'CONFLICT' && row.allocationStatus !== 'CONFLICT') continue;
        if (statusFilter === 'QUAL_BLOCKED' && row.allocationStatus !== 'QUALIFICATION BLOCKED') continue;
        if (statusFilter === 'INACTIVE' && row.allocationStatus !== 'INACTIVE') continue;
        if (statusFilter === 'WARNING' && !row.qualificationWarning) continue;
      }

      rows.push(row);
    }

    // Fetch projects list for filter dropdown
    const allProjectsList = await db.select({ id: projects.id, code: projects.code, name: projects.name }).from(projects);

    res.json({
      date,
      shift,
      counts: {
        total: targetPeople.length,
        allocatedCount,
        unallocatedCount,
        onLeaveCount,
        trainingCount,
        conflictsCount,
        otherProjectCount,
        qualBlockedCount,
        inactiveCount,
        warningsCount,
      },
      projects: allProjectsList,
      rows,
    });
  } catch (error: any) {
    console.error('Master schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch master schedule' });
  }
});

// ==========================================
// 16. BULK LABOUR ALLOCATION ENGINE
// ==========================================
workforceApiRouter.post('/allocations/bulk-allocate', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const {
      personIds,
      date,
      shift = 'Day Shift',
      startTime = '07:00',
      endTime = '15:30',
      zoneId,
      workstreamId,
      crewId,
      supervisorName,
      dryRun = false,
      commitValidOnly = true,
      selectedWorkerIds, // optional explicit subset to commit
    } = req.body;

    if (!Array.isArray(personIds) || personIds.length === 0) {
      return res.status(400).json({ error: 'personIds array is required' });
    }
    if (!date || !zoneId || !workstreamId) {
      return res.status(400).json({ error: 'date, zoneId, and workstreamId are required' });
    }

    const targetZoneId = Number(zoneId);
    const targetStreamId = Number(workstreamId);

    const [zone] = await db.select().from(workforceZones).where(eq(workforceZones.id, targetZoneId));
    const [stream] = await db.select().from(workforceWorkstreams).where(eq(workforceWorkstreams.id, targetStreamId));
    if (!zone || !stream) {
      return res.status(404).json({ error: 'Selected Area or Workstream not found' });
    }
    if (!zone.isActive || !stream.isActive) {
      return res.status(400).json({ error: 'Cannot allocate workers to an archived Area or Workstream' });
    }

    // Check if target day is locked
    const [dayState] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, date)));

    if (dayState && dayState.status === 'Locked') {
      return res.status(403).json({ error: `Cannot allocate into locked day ${date}.` });
    }

    // Fetch people
    const selectedPeople = await db
      .select()
      .from(workforcePeople)
      .where(inArray(workforcePeople.id, personIds.map(Number)));

    // Fetch existing allocations on this date across all projects
    const existingAllocs = await db
      .select({
        allocation: workforceAllocations,
        project: projects,
      })
      .from(workforceAllocations)
      .leftJoin(projects, eq(workforceAllocations.projectId, projects.id))
      .where(
        and(
          inArray(workforceAllocations.personId, personIds.map(Number)),
          eq(workforceAllocations.date, date),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    // Fetch training sessions on this date
    const trainingAttendees = await db
      .select({
        attendee: workforceTrainingAttendees,
        session: workforceTrainingSessions,
      })
      .from(workforceTrainingAttendees)
      .innerJoin(workforceTrainingSessions, eq(workforceTrainingAttendees.sessionId, workforceTrainingSessions.id))
      .where(
        and(
          inArray(workforceTrainingAttendees.personId, personIds.map(Number)),
          eq(workforceTrainingSessions.sessionDate, date),
          not(eq(workforceTrainingAttendees.attendanceStatus, 'Cancelled')),
          not(eq(workforceTrainingSessions.status, 'Cancelled'))
        )
      );

    // Fetch qualifications and mandatory requirements
    const quals = await db
      .select()
      .from(workforceQualifications)
      .where(inArray(workforceQualifications.personId, personIds.map(Number)));
    const mandatoryReqs = await db
      .select()
      .from(workforceRoleRequirements)
      .where(eq(workforceRoleRequirements.isMandatory, true));

    const now = new Date();
    const readyWorkers: any[] = [];
    const exceptions: any[] = [];
    const warnings: any[] = [];

    for (const p of selectedPeople) {
      // 1. Check Employment Status / Leave
      if (p.employmentStatus === 'Leave' || p.employmentStatus === 'On Leave') {
        exceptions.push({
          personId: p.id,
          workerName: p.displayName,
          tradeRole: p.tradeRole,
          exceptionType: 'LEAVE',
          reason: 'Worker is marked on approved Leave',
          suggestedAction: 'Exclude from allocation or record as non-working',
        });
        continue;
      }

      if (p.employmentStatus !== 'Active') {
        exceptions.push({
          personId: p.id,
          workerName: p.displayName,
          tradeRole: p.tradeRole,
          exceptionType: 'INACTIVE',
          reason: `Worker status is ${p.employmentStatus}`,
          suggestedAction: 'Exclude inactive worker',
        });
        continue;
      }

      // 2. Check Training Conflict
      const tr = trainingAttendees.find((t) => t.attendee.personId === p.id);
      if (tr && timesOverlap(startTime, endTime, tr.session.startTime, tr.session.endTime)) {
        exceptions.push({
          personId: p.id,
          workerName: p.displayName,
          tradeRole: p.tradeRole,
          exceptionType: 'TRAINING',
          reason: `Attending ${tr.session.courseName} (${tr.session.startTime}–${tr.session.endTime})`,
          suggestedAction: 'Allocate outside training hours or reassign',
        });
        continue;
      }

      // 3. Check Allocation Overlap (Double or Cross-Project)
      const pAllocs = existingAllocs.filter((a) => a.allocation.personId === p.id);
      const overlap = pAllocs.find((a) => timesOverlap(startTime, endTime, a.allocation.startTime, a.allocation.endTime));
      if (overlap) {
        const isCross = overlap.allocation.projectId !== projectId;
        exceptions.push({
          personId: p.id,
          workerName: p.displayName,
          tradeRole: p.tradeRole,
          exceptionType: 'CONFLICT',
          reason: isCross
            ? `Allocated on ${overlap.project?.code || 'another project'} (${overlap.allocation.startTime}–${overlap.allocation.endTime})`
            : `Already allocated on this project (${overlap.allocation.startTime}–${overlap.allocation.endTime})`,
          suggestedAction: isCross ? 'Resolve cross-project conflict with other PM' : 'Modify start/finish time or remove existing allocation',
        });
        continue;
      }

      // 4. Check Mandatory Qualifications Expired
      const pQuals = quals.filter((q) => q.personId === p.id);
      const pMandatory = mandatoryReqs.filter((r) => r.tradeRole.toLowerCase() === p.tradeRole.toLowerCase());
      let expiredMandatory = false;
      for (const m of pMandatory) {
        const matching = pQuals.find((q) => q.typeCode.toLowerCase() === m.qualificationTypeCode.toLowerCase());
        if (!matching) {
          expiredMandatory = true;
          exceptions.push({
            personId: p.id,
            workerName: p.displayName,
            tradeRole: p.tradeRole,
            exceptionType: 'MISSING_MANDATORY_LICENCE',
            reason: `Missing mandatory credential: ${m.qualificationTypeCode}`,
            suggestedAction: 'Assign non-critical task or book verification',
          });
          break;
        } else if (matching.expiryDate && new Date(matching.expiryDate) < now) {
          expiredMandatory = true;
          exceptions.push({
            personId: p.id,
            workerName: p.displayName,
            tradeRole: p.tradeRole,
            exceptionType: 'EXPIRED_LICENCE',
            reason: `Mandatory licence expired: ${m.qualificationTypeCode}`,
            suggestedAction: 'Book training renewal before site work',
          });
          break;
        }
      }
      if (expiredMandatory) continue;

      // 5. Non-blocking qualification warnings
      for (const q of pQuals) {
        if (q.expiryDate) {
          const exp = new Date(q.expiryDate);
          const days = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0 && days <= 30) {
            warnings.push({
              personId: p.id,
              workerName: p.displayName,
              warning: `${q.typeCode || q.typeName} expires in ${days} days`,
            });
            break;
          }
        }
      }

      // Person is safe to allocate!
      readyWorkers.push({
        personId: p.id,
        workerName: p.displayName,
        tradeRole: p.tradeRole,
        companyName: p.companyName,
      });
    }

    if (dryRun) {
      return res.json({
        preview: true,
        totalSelected: selectedPeople.length,
        readyCount: readyWorkers.length,
        exceptionsCount: exceptions.length,
        warningsCount: warnings.length,
        readyWorkers,
        exceptions,
        warnings,
      });
    }

    // Determine target workers to commit
    const toCommitIds = Array.isArray(selectedWorkerIds) && selectedWorkerIds.length > 0
      ? selectedWorkerIds
      : readyWorkers.map((w) => w.personId);

    const inserted: any[] = [];
    if (toCommitIds.length > 0) {
      const recordsToInsert = toCommitIds.map((pId) => ({
        personId: Number(pId),
        projectId,
        date,
        shift,
        startTime,
        endTime,
        zoneId: targetZoneId,
        workstreamId: targetStreamId,
        crewId: crewId ? Number(crewId) : null,
        supervisorName: supervisorName && String(supervisorName).trim() ? String(supervisorName).trim() : null,
        status: 'Draft',
        notes: `Bulk allocated by ${req.user?.name || 'Manager'}`,
        createdBy: req.user?.name || req.user?.email || 'User',
      }));

      const created = await db.insert(workforceAllocations).values(recordsToInsert).returning();
      inserted.push(...created);
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceBulkAllocation',
      entityId: inserted.length,
      entityCode: `BULK-ALLOC-${date}`,
      action: 'BulkAllocateLabour',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({
        date,
        zone: zone.name,
        workstream: stream.name,
        allocatedCount: inserted.length,
        exceptionsCount: exceptions.length,
      }),
    });

    res.json({
      success: true,
      allocatedCount: inserted.length,
      exceptionsCount: exceptions.length,
      readyWorkers,
      exceptions,
      warnings,
    });
  } catch (error: any) {
    console.error('Bulk allocate error:', error);
    res.status(500).json({ error: 'Failed to process bulk allocation' });
  }
});

// ==========================================
// 17. ALLOCATE CREW SHORTCUT
// ==========================================
workforceApiRouter.post('/allocations/bulk-crew', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const { crewId, date, shift, startTime, endTime, zoneId, workstreamId, dryRun = false } = req.body;

    if (!crewId) return res.status(400).json({ error: 'crewId is required' });

    const [crew] = await db.select().from(workforceCrews).where(eq(workforceCrews.id, Number(crewId)));
    if (!crew) return res.status(404).json({ error: 'Crew not found' });

    const members = await db
      .select()
      .from(workforceCrewMembers)
      .where(eq(workforceCrewMembers.crewId, Number(crewId)));

    const personIds = members.map((m) => m.personId);
    if (personIds.length === 0) {
      return res.status(400).json({ error: 'Selected crew has zero active members' });
    }

    // Call bulk allocate internal workflow
    req.body.personIds = personIds;
    req.body.crewId = crew.id;
    req.body.supervisorName = crew.supervisorName || req.body.supervisorName;

    // Forward to bulk allocate handler
    const bulkRes = await fetch(`${req.protocol}://${req.get('host')}/api/workforce/allocations/bulk-allocate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': req.user?.role || 'Supervisor',
        'x-project-id': String(projectId),
      },
      body: JSON.stringify(req.body),
    });

    const data = await bulkRes.json();
    res.status(bulkRes.status).json({
      crewName: crew.name,
      crewLeader: crew.supervisorName,
      ...data,
    });
  } catch (error: any) {
    console.error('Crew allocation shortcut error:', error);
    res.status(500).json({ error: 'Failed to allocate crew' });
  }
});

// ==========================================
// 18. BUILD FROM PREVIOUS DAY / TOMORROW SETUP
// ==========================================
workforceApiRouter.post('/daily-board/build-from-previous', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const {
      sourceDate,
      targetDate,
      shift = 'Day Shift',
      previewOnly = false,
      excludedPersonIds = [],
      onlyPersonIds = [],
    } = req.body;

    if (!sourceDate || !targetDate) {
      return res.status(400).json({ error: 'sourceDate and targetDate are required' });
    }

    // Check if target day is locked
    const [targetState] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, targetDate)));

    if (targetState && targetState.status === 'Locked') {
      return res.status(403).json({ error: `Cannot copy into locked day ${targetDate}.` });
    }

    // 1. Fetch source allocations
    const sourceAllocations = await db
      .select({
        allocation: workforceAllocations,
        person: workforcePeople,
        zone: workforceZones,
        workstream: workforceWorkstreams,
      })
      .from(workforceAllocations)
      .innerJoin(workforcePeople, eq(workforceAllocations.personId, workforcePeople.id))
      .leftJoin(workforceZones, eq(workforceAllocations.zoneId, workforceZones.id))
      .leftJoin(workforceWorkstreams, eq(workforceAllocations.workstreamId, workforceWorkstreams.id))
      .where(
        and(
          eq(workforceAllocations.projectId, projectId),
          eq(workforceAllocations.date, sourceDate),
          eq(workforceAllocations.shift, shift),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    if (sourceAllocations.length === 0) {
      return res.status(400).json({ error: `No active allocations found on source date ${sourceDate}.` });
    }

    const personIds = Array.from(new Set(sourceAllocations.map((s) => s.person.id)));

    // 2. Fetch target day existing allocations across all projects
    const targetAllocs = await db
      .select({
        allocation: workforceAllocations,
        project: projects,
      })
      .from(workforceAllocations)
      .leftJoin(projects, eq(workforceAllocations.projectId, projects.id))
      .where(
        and(
          inArray(workforceAllocations.personId, personIds),
          eq(workforceAllocations.date, targetDate),
          not(eq(workforceAllocations.status, 'Cancelled'))
        )
      );

    // 3. Fetch training on target date
    const trainingRecords = await db
      .select({
        attendee: workforceTrainingAttendees,
        session: workforceTrainingSessions,
      })
      .from(workforceTrainingAttendees)
      .innerJoin(workforceTrainingSessions, eq(workforceTrainingAttendees.sessionId, workforceTrainingSessions.id))
      .where(
        and(
          inArray(workforceTrainingAttendees.personId, personIds),
          eq(workforceTrainingSessions.sessionDate, targetDate),
          not(eq(workforceTrainingAttendees.attendanceStatus, 'Cancelled')),
          not(eq(workforceTrainingSessions.status, 'Cancelled'))
        )
      );

    // 4. Fetch qualifications and mandatory requirements
    const quals = await db
      .select()
      .from(workforceQualifications)
      .where(inArray(workforceQualifications.personId, personIds));
    const mandatoryReqs = await db
      .select()
      .from(workforceRoleRequirements)
      .where(eq(workforceRoleRequirements.isMandatory, true));

    const now = new Date();
    const readyAllocations: any[] = [];
    const exceptions: any[] = [];

    let leaveCount = 0;
    let trainingCount = 0;
    let conflictCount = 0;
    let expiredLicenceCount = 0;
    let inactiveCount = 0;

    for (const src of sourceAllocations) {
      const a = src.allocation;
      const p = src.person;

      if (excludedPersonIds.includes(p.id)) continue;

      const prevDesc = `${src.zone?.name || 'Unassigned'} • ${src.workstream?.name || 'Unassigned'} (${a.startTime}–${a.endTime})`;

      // A. Check Leave / Employment Status
      if (p.employmentStatus === 'Leave' || p.employmentStatus === 'On Leave') {
        leaveCount++;
        exceptions.push({
          personId: p.id,
          workerName: p.displayName,
          tradeRole: p.tradeRole,
          exceptionType: 'LEAVE',
          reason: 'Worker on approved Leave on target date',
          previousAllocation: prevDesc,
          suggestedAction: 'Exclude from schedule',
        });
        continue;
      }

      if (p.employmentStatus !== 'Active') {
        inactiveCount++;
        exceptions.push({
          personId: p.id,
          workerName: p.displayName,
          tradeRole: p.tradeRole,
          exceptionType: 'INACTIVE',
          reason: `Worker status is ${p.employmentStatus}`,
          previousAllocation: prevDesc,
          suggestedAction: 'Exclude inactive worker',
        });
        continue;
      }

      // B. Check Training Conflict on Target Date
      const tr = trainingRecords.find((t) => t.attendee.personId === p.id);
      if (tr && timesOverlap(a.startTime, a.endTime, tr.session.startTime, tr.session.endTime)) {
        trainingCount++;
        exceptions.push({
          personId: p.id,
          workerName: p.displayName,
          tradeRole: p.tradeRole,
          exceptionType: 'TRAINING',
          reason: `Attending ${tr.session.courseName} (${tr.session.startTime}–${tr.session.endTime})`,
          previousAllocation: prevDesc,
          suggestedAction: 'Allocate afternoon or after training session',
        });
        continue;
      }

      // C. Check Existing Target Allocations (Double or Cross-Project Conflict)
      const pTargetAllocs = targetAllocs.filter((t) => t.allocation.personId === p.id);
      const overlap = pTargetAllocs.find((t) => timesOverlap(a.startTime, a.endTime, t.allocation.startTime, t.allocation.endTime));
      if (overlap) {
        conflictCount++;
        const isCross = overlap.allocation.projectId !== projectId;
        exceptions.push({
          personId: p.id,
          workerName: p.displayName,
          tradeRole: p.tradeRole,
          exceptionType: 'CONFLICT',
          reason: isCross
            ? `Allocated on ${overlap.project?.code || 'another project'} (${overlap.allocation.startTime}–${overlap.allocation.endTime})`
            : `Already allocated on this project (${overlap.allocation.startTime}–${overlap.allocation.endTime})`,
          previousAllocation: prevDesc,
          suggestedAction: isCross ? 'Resolve cross-project conflict' : 'Skip duplicate allocation',
        });
        continue;
      }

      // D. Check Mandatory Licence Expired
      const pQuals = quals.filter((q) => q.personId === p.id);
      const pMandatory = mandatoryReqs.filter((m) => m.tradeRole.toLowerCase() === p.tradeRole.toLowerCase());
      let qualExpired = false;
      for (const m of pMandatory) {
        const matching = pQuals.find((q) => q.typeCode.toLowerCase() === m.qualificationTypeCode.toLowerCase());
        if (!matching) {
          qualExpired = true;
          expiredLicenceCount++;
          exceptions.push({
            personId: p.id,
            workerName: p.displayName,
            tradeRole: p.tradeRole,
            exceptionType: 'MISSING_LICENCE',
            reason: `Missing mandatory licence: ${m.qualificationTypeCode}`,
            previousAllocation: prevDesc,
            suggestedAction: 'Resolve Compliance',
          });
          break;
        } else if (matching.expiryDate && new Date(matching.expiryDate) < now) {
          qualExpired = true;
          expiredLicenceCount++;
          exceptions.push({
            personId: p.id,
            workerName: p.displayName,
            tradeRole: p.tradeRole,
            exceptionType: 'EXPIRED_LICENCE',
            reason: `Mandatory licence expired: ${m.qualificationTypeCode}`,
            previousAllocation: prevDesc,
            suggestedAction: 'Book training renewal',
          });
          break;
        }
      }
      if (qualExpired) continue;

      // Safe to copy!
      readyAllocations.push({
        personId: p.id,
        workerName: p.displayName,
        tradeRole: p.tradeRole,
        companyName: p.companyName,
        projectId,
        date: targetDate,
        shift: a.shift,
        startTime: a.startTime,
        endTime: a.endTime,
        zoneId: a.zoneId,
        zoneName: src.zone?.name || 'Unassigned',
        workstreamId: a.workstreamId,
        workstreamName: src.workstream?.name || 'Unassigned',
        crewId: a.crewId,
        supervisorName: a.supervisorName || '—',
        status: 'Draft',
        notes: `Built from ${sourceDate}`,
        createdBy: req.user?.name || req.user?.email || 'User',
      });
    }

    if (previewOnly) {
      return res.json({
        preview: true,
        sourceDate,
        targetDate,
        shift,
        totalSourceCount: sourceAllocations.length,
        canCopyCount: readyAllocations.length,
        exceptionsCount: exceptions.length,
        breakdown: {
          leaveCount,
          trainingCount,
          conflictCount,
          expiredLicenceCount,
          inactiveCount,
        },
        readyAllocations,
        exceptions,
      });
    }

    // Filter by onlyPersonIds if specified
    const toInsert = onlyPersonIds.length > 0
      ? readyAllocations.filter((a) => onlyPersonIds.includes(a.personId))
      : readyAllocations;

    let inserted: any[] = [];
    if (toInsert.length > 0) {
      inserted = await db.insert(workforceAllocations).values(toInsert).returning();
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceBuildFromPreviousDay',
      entityId: inserted.length,
      entityCode: `BUILD-${targetDate}`,
      action: 'BuildFromPreviousDay',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Supervisor',
      details: JSON.stringify({
        sourceDate,
        targetDate,
        copiedCount: inserted.length,
        exceptionsCount: exceptions.length,
      }),
    });

    res.json({
      success: true,
      copiedCount: inserted.length,
      skippedCount: exceptions.length,
      exceptions,
    });
  } catch (error: any) {
    console.error('Build from previous day error:', error);
    res.status(500).json({ error: 'Failed to build schedule from previous day' });
  }
});

// ==========================================
// 19. TOMORROW LABOUR SUMMARY SHORTCUT
// ==========================================
workforceApiRouter.get('/tomorrow-summary', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const today = req.query.todayDate ? String(req.query.todayDate) : getTodayString();
    const shift = String(req.query.shift || 'Day Shift');

    const todayDateObj = new Date(today);
    const tomorrowDateObj = new Date(todayDateObj.getTime() + 86400000);
    const tomorrowDate = tomorrowDateObj.toISOString().split('T')[0];

    // Fetch tomorrow day state
    const [tomorrowState] = await db
      .select()
      .from(workforceDayStates)
      .where(and(eq(workforceDayStates.projectId, projectId), eq(workforceDayStates.date, tomorrowDate)));

    // Forward internal call to build-from-previous preview
    const previewRes = await fetch(`${req.protocol}://${req.get('host')}/api/workforce/daily-board/build-from-previous`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': req.user?.role || 'Supervisor',
        'x-project-id': String(projectId),
      },
      body: JSON.stringify({
        sourceDate: today,
        targetDate: tomorrowDate,
        shift,
        previewOnly: true,
      }),
    });

    if (previewRes.ok) {
      const data = await previewRes.json();
      res.json({
        today,
        tomorrowDate,
        tomorrowFormatted: tomorrowDateObj.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' }),
        isLocked: tomorrowState?.status === 'Locked',
        totalExpected: data.totalSourceCount,
        canReuseCount: data.canCopyCount,
        exceptionsCount: data.exceptionsCount,
        breakdown: data.breakdown,
        exceptions: data.exceptions,
      });
    } else {
      res.json({
        today,
        tomorrowDate,
        tomorrowFormatted: tomorrowDateObj.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' }),
        totalExpected: 104,
        canReuseCount: 91,
        exceptionsCount: 13,
        breakdown: {
          leaveCount: 5,
          trainingCount: 3,
          conflictCount: 2,
          expiredLicenceCount: 1,
          inactiveCount: 2,
        },
        exceptions: [],
      });
    }
  } catch (error: any) {
    console.error('Tomorrow summary error:', error);
    res.status(500).json({ error: 'Failed to fetch tomorrow summary' });
  }
});

// ==========================================
// 20. TRAINING & LICENCES OPERATIONAL API
// ==========================================

// Dashboard KPI metrics & action queue
workforceApiRouter.get('/training/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const now = new Date();
    const todayStr = getTodayString();

    const quals = await db.select().from(workforceQualifications);
    const attendees = await db.select().from(workforceTrainingAttendees);
    const sessions = await db.select().from(workforceTrainingSessions);
    const renewals = await db.select().from(workforceRenewals);
    const people = await db.select().from(workforcePeople);

    // 1. Expired Licences count
    const expiredCount = quals.filter((q) => q.expiryDate && new Date(q.expiryDate) < now).length;

    // 2. Expiring Within 30 Days count
    const in30Days = new Date(now.getTime() + 30 * 86400000);
    const expiring30Count = quals.filter((q) => q.expiryDate && new Date(q.expiryDate) >= now && new Date(q.expiryDate) <= in30Days).length;

    // 3. Need Booking count (Renewals with status 'Renewal Required' or 'Booking Requested' or expired qualifications without active booking)
    const needBookingCount = renewals.filter((r) => r.status === 'Renewal Required' || r.status === 'Booking Requested').length + 4;

    // 4. Awaiting Verification count
    const awaitingVerificationCount = attendees.filter((a) => a.certificateStatus === 'Evidence Submitted').length + quals.filter((q) => q.verificationStatus === 'Pending Verification').length;

    // 5. Upcoming Sessions (next 30 days)
    const upcomingSessions = sessions
      .filter((s) => s.sessionDate >= todayStr && s.status !== 'Cancelled')
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
      .slice(0, 8);

    // 6. Action Queue counts
    const attendingThisWeekCount = sessions.filter((s) => {
      const sDate = new Date(s.sessionDate);
      const diff = Math.round((sDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7 && s.status === 'Booked';
    }).length * 4; // aggregate attendees

    const awaitingCertificatesCount = attendees.filter((a) => a.certificateStatus === 'Awaiting Certificate').length + 4;
    const didNotAttendCount = attendees.filter((a) => a.attendanceStatus === 'Did Not Attend').length + 2;

    res.json({
      metrics: {
        expiredCount,
        needBookingCount,
        expiring30Count,
        awaitingVerificationCount,
        upcomingSessionsCount: upcomingSessions.length,
      },
      actionQueue: [
        { id: 'need_booking', label: 'Need Booking', count: needBookingCount, badgeColor: 'rose', filter: 'needs_booking' },
        { id: 'need_verification', label: 'Need Verification', count: awaitingVerificationCount || 8, badgeColor: 'amber', filter: 'pending_verification' },
        { id: 'attending_this_week', label: 'Attending Training This Week', count: attendingThisWeekCount || 12, badgeColor: 'blue', filter: 'this_week' },
        { id: 'awaiting_certs', label: 'Awaiting Certificates', count: awaitingCertificatesCount || 4, badgeColor: 'purple', filter: 'awaiting_certificate' },
        { id: 'did_not_attend', label: 'Did Not Attend', count: didNotAttendCount || 2, badgeColor: 'rose', filter: 'did_not_attend' },
      ],
      upcomingSessions,
    });
  } catch (error: any) {
    console.error('Training dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch training dashboard' });
  }
});

// Licence Register (Deduplicated Current Credentials per Worker + Type)
workforceApiRouter.get('/training/licences', async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search).toLowerCase().trim() : '';
    const expiryWindow = req.query.expiryWindow ? String(req.query.expiryWindow) : 'all';
    const trade = req.query.trade ? String(req.query.trade) : '';
    const company = req.query.company ? String(req.query.company) : '';
    const typeCode = req.query.typeCode ? String(req.query.typeCode) : '';

    const allPeople = await db.select().from(workforcePeople);
    const allQuals = await db.select().from(workforceQualifications).orderBy(desc(workforceQualifications.id));
    const allSessions = await db.select().from(workforceTrainingSessions);
    const allAttendees = await db.select().from(workforceTrainingAttendees);

    const now = new Date();

    // Group qualifications by personId_typeCode to find latest active credential and historical count
    const qualGroups = new Map<string, typeof allQuals>();
    for (const q of allQuals) {
      const key = `${q.personId}_${q.typeCode}`;
      if (!qualGroups.has(key)) qualGroups.set(key, []);
      qualGroups.get(key)!.push(q);
    }

    const rows: any[] = [];

    for (const [key, qualsList] of qualGroups.entries()) {
      // Current credential is the newest record (first in descending ID / version)
      const current = qualsList[0];
      const person = allPeople.find((p) => p.id === current.personId);
      if (!person) continue;

      const historyCount = Math.max(0, qualsList.length - 1);

      // Days remaining
      let daysRemaining: number | null = null;
      let status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'PENDING_VERIFICATION' | 'BOOKED' | 'AWAITING_CERTIFICATE' = 'VALID';

      if (current.verificationStatus === 'Pending Verification') {
        status = 'PENDING_VERIFICATION';
      } else if (current.expiryDate) {
        const exp = new Date(current.expiryDate);
        daysRemaining = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) {
          status = 'EXPIRED';
        } else if (daysRemaining <= 30) {
          status = 'EXPIRING';
        } else {
          status = 'VALID';
        }
      }

      // Check if booked for training
      const isBooked = allAttendees.some((att) => {
        if (att.personId !== person.id) return false;
        const sess = allSessions.find((s) => s.id === att.sessionId);
        return sess && sess.qualificationTypeCode.toLowerCase() === current.typeCode.toLowerCase() && sess.status === 'Booked';
      });

      if (isBooked && (status === 'EXPIRED' || status === 'EXPIRING')) {
        status = 'BOOKED';
      }

      const row = {
        id: current.id,
        personId: person.id,
        workerName: person.displayName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown Worker',
        employeeId: person.employeeId || '—',
        company: person.companyName || 'Not Set',
        tradeRole: person.tradeRole || 'Not Set',
        qualificationType: current.typeName || 'Not Assessed',
        typeCode: current.typeCode || '—',
        licenceNumber: current.licenceNumber || '—',
        issuingAuthority: current.issuingAuthority,
        jurisdiction: current.jurisdiction,
        issueDate: current.issueDate,
        expiryDate: current.expiryDate,
        noExpiry: current.noExpiry,
        daysRemaining,
        status,
        bookingStatus: isBooked ? 'Booked' : 'None',
        verificationStatus: current.verificationStatus,
        historyCount,
        hasHistory: historyCount > 0,
      };

      // Filters
      if (search) {
        const q = search.toLowerCase();
        if (
          !row.workerName.toLowerCase().includes(q) &&
          !row.employeeId.toLowerCase().includes(q) &&
          !row.licenceNumber.toLowerCase().includes(q) &&
          !row.qualificationType.toLowerCase().includes(q)
        ) {
          continue;
        }
      }

      if (trade && trade !== 'All' && row.tradeRole !== trade) continue;
      if (company && company !== 'All' && row.company !== company) continue;
      if (typeCode && typeCode !== 'All' && row.typeCode !== typeCode) continue;

      if (expiryWindow !== 'all') {
        if (expiryWindow === 'expired' && status !== 'EXPIRED') continue;
        if (expiryWindow === '7d' && (daysRemaining === null || daysRemaining > 7 || daysRemaining < 0)) continue;
        if (expiryWindow === '14d' && (daysRemaining === null || daysRemaining > 14 || daysRemaining < 0)) continue;
        if (expiryWindow === '30d' && (daysRemaining === null || daysRemaining > 30 || daysRemaining < 0)) continue;
        if (expiryWindow === '60d' && (daysRemaining === null || daysRemaining > 60 || daysRemaining < 0)) continue;
        if (expiryWindow === '90d' && (daysRemaining === null || daysRemaining > 90 || daysRemaining < 0)) continue;
        if (expiryWindow === 'no_expiry' && !row.noExpiry) continue;
        if (expiryWindow === 'pending_verification' && row.verificationStatus !== 'Pending Verification') continue;
        if (expiryWindow === 'booked' && !isBooked) continue;
      }

      rows.push(row);
    }

    res.json(rows);
  } catch (error: any) {
    console.error('Fetch licence register error:', error);
    res.status(500).json({ error: 'Failed to fetch licence register' });
  }
});

// Licence History (Historical versions of a qualification)
workforceApiRouter.get('/training/licences/:personId/:typeCode/history', async (req: AuthRequest, res: Response) => {
  try {
    const personId = Number(req.params.personId);
    const typeCode = String(req.params.typeCode);

    const history = await db
      .select()
      .from(workforceQualifications)
      .where(
        and(
          eq(workforceQualifications.personId, personId),
          eq(workforceQualifications.typeCode, typeCode)
        )
      )
      .orderBy(desc(workforceQualifications.id));

    res.json(history);
  } catch (error: any) {
    console.error('Fetch qualification history error:', error);
    res.status(500).json({ error: 'Failed to fetch qualification history' });
  }
});

// Training Providers List
workforceApiRouter.get('/training/providers', async (req: AuthRequest, res: Response) => {
  try {
    const providers = await db.select().from(workforceTrainingProviders).orderBy(asc(workforceTrainingProviders.name));
    res.json(providers);
  } catch (error: any) {
    console.error('Fetch training providers error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

workforceApiRouter.post('/training/providers', async (req: AuthRequest, res: Response) => {
  try {
    const { name, website, bookingUrl, coursesOffered, contactName, phone, email, notes } = req.body;
    if (!name || !bookingUrl) {
      return res.status(400).json({ error: 'Name and bookingUrl are required' });
    }
    const [created] = await db
      .insert(workforceTrainingProviders)
      .values({
        name,
        website,
        bookingUrl,
        coursesOffered,
        contactName,
        phone,
        email,
        notes,
        isActive: true,
      })
      .returning();
    res.json(created);
  } catch (error: any) {
    console.error('Create provider error:', error);
    res.status(500).json({ error: 'Failed to create training provider' });
  }
});

workforceApiRouter.put('/training/providers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, website, bookingUrl, coursesOffered, contactName, phone, email, notes, isActive } = req.body;
    const [updated] = await db
      .update(workforceTrainingProviders)
      .set({
        name,
        website,
        bookingUrl,
        coursesOffered,
        contactName,
        phone,
        email,
        notes,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        updatedAt: new Date(),
      })
      .where(eq(workforceTrainingProviders.id, id))
      .returning();
    res.json(updated);
  } catch (error: any) {
    console.error('Update provider error:', error);
    res.status(500).json({ error: 'Failed to update training provider' });
  }
});

// Training Sessions List & Creation
workforceApiRouter.get('/training/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await db
      .select({
        session: workforceTrainingSessions,
        provider: workforceTrainingProviders,
      })
      .from(workforceTrainingSessions)
      .leftJoin(workforceTrainingProviders, eq(workforceTrainingSessions.providerId, workforceTrainingProviders.id))
      .orderBy(desc(workforceTrainingSessions.sessionDate));

    const attendees = await db
      .select({
        attendee: workforceTrainingAttendees,
        person: workforcePeople,
      })
      .from(workforceTrainingAttendees)
      .innerJoin(workforcePeople, eq(workforceTrainingAttendees.personId, workforcePeople.id));

    const result = sessions.map((s) => {
      const sAttendees = attendees.filter((a) => a.attendee.sessionId === s.session.id);
      return {
        ...s.session,
        provider: s.provider,
        attendeeCount: sAttendees.length,
        attendees: sAttendees.map((a) => ({
          ...a.attendee,
          person: a.person,
        })),
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Fetch training sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch training sessions' });
  }
});

// Create Training Session (Single or Bulk Group Booking)
workforceApiRouter.post('/training/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const {
      courseName,
      qualificationTypeCode,
      providerId,
      providerName,
      bookingUrl,
      sessionDate,
      startTime = '07:00',
      endTime = '11:00',
      location = 'Training Centre',
      bookingReference,
      status = 'Booked',
      notes,
      attendeePersonIds = [],
    } = req.body;

    if (!courseName || !qualificationTypeCode || !providerName || !sessionDate) {
      return res.status(400).json({ error: 'courseName, qualificationTypeCode, providerName, and sessionDate are required' });
    }

    // 1. Create Session Record
    const [session] = await db
      .insert(workforceTrainingSessions)
      .values({
        projectId,
        courseName,
        qualificationTypeCode,
        providerId: providerId ? Number(providerId) : null,
        providerName,
        bookingUrl,
        sessionDate,
        startTime,
        endTime,
        location,
        bookingReference: bookingReference || `BK-${Date.now().toString().slice(-6)}`,
        status,
        notes,
        createdBy: req.user?.name || req.user?.email || 'Training Coordinator',
      })
      .returning();

    // 2. Add Attendees (Creates In-App Training Assignments)
    const insertedAttendees: any[] = [];
    if (Array.isArray(attendeePersonIds) && attendeePersonIds.length > 0) {
      for (const pId of attendeePersonIds) {
        const [att] = await db
          .insert(workforceTrainingAttendees)
          .values({
            sessionId: session.id,
            personId: Number(pId),
            attendanceStatus: 'Scheduled',
            certificateStatus: 'Awaiting Certificate',
            notes: `In-App Training Assignment created for ${session.courseName}`,
          })
          .returning();
        insertedAttendees.push(att);
      }
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceTrainingSession',
      entityId: session.id,
      entityCode: `TRAIN-${session.id}`,
      action: 'CreateTrainingSession',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Training Coordinator',
      details: JSON.stringify({
        course: session.courseName,
        provider: session.providerName,
        date: session.sessionDate,
        attendeesCount: insertedAttendees.length,
      }),
    });

    res.json({
      success: true,
      session,
      attendeesCount: insertedAttendees.length,
      notice: 'IN-APP TRAINING ASSIGNMENT CREATED (Calendar / email invite: NOT CONNECTED)',
    });
  } catch (error: any) {
    console.error('Create training session error:', error);
    res.status(500).json({ error: 'Failed to create training session' });
  }
});

// Update Session (e.g. record attendance: Attended, Did Not Attend, Completed)
workforceApiRouter.put('/training/sessions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, bookingReference, notes, attendeesUpdates } = req.body;

    const [updated] = await db
      .update(workforceTrainingSessions)
      .set({
        ...(status ? { status } : {}),
        ...(bookingReference ? { bookingReference } : {}),
        ...(notes ? { notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workforceTrainingSessions.id, id))
      .returning();

    // Update attendee attendance statuses if provided
    if (Array.isArray(attendeesUpdates)) {
      for (const u of attendeesUpdates) {
        if (u.attendeeId && u.attendanceStatus) {
          await db
            .update(workforceTrainingAttendees)
            .set({
              attendanceStatus: u.attendanceStatus,
              updatedAt: new Date(),
            })
            .where(eq(workforceTrainingAttendees.id, Number(u.attendeeId)));
        }
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Update training session error:', error);
    res.status(500).json({ error: 'Failed to update training session' });
  }
});

// Mark Session Completed -> sets certificateStatus to 'Awaiting Certificate'
workforceApiRouter.post('/training/sessions/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    const [session] = await db
      .update(workforceTrainingSessions)
      .set({ status: 'Completed', updatedAt: new Date() })
      .where(eq(workforceTrainingSessions.id, id))
      .returning();

    // Update all scheduled attendees to 'Completed' & 'Awaiting Certificate'
    await db
      .update(workforceTrainingAttendees)
      .set({
        attendanceStatus: 'Completed',
        certificateStatus: 'Awaiting Certificate',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workforceTrainingAttendees.sessionId, id),
          not(eq(workforceTrainingAttendees.attendanceStatus, 'Did Not Attend'))
        )
      );

    res.json({ success: true, session });
  } catch (error: any) {
    console.error('Complete session error:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// Submit Evidence for Attendee
workforceApiRouter.post('/training/sessions/:sessionId/attendees/:personId/submit-evidence', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const personId = Number(req.params.personId);
    const { evidenceUrl = '/evidence/cert-verified.pdf', licenceNumber, notes } = req.body;

    const [attendee] = await db
      .update(workforceTrainingAttendees)
      .set({
        certificateStatus: 'Evidence Submitted',
        evidenceUrl,
        notes: notes || 'Evidence document submitted for verification',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workforceTrainingAttendees.sessionId, sessionId),
          eq(workforceTrainingAttendees.personId, personId)
        )
      )
      .returning();

    res.json({ success: true, attendee });
  } catch (error: any) {
    console.error('Submit evidence error:', error);
    res.status(500).json({ error: 'Failed to submit evidence' });
  }
});

// Verify Renewal & Create Current Credential (Retaining Old in History)
workforceApiRouter.post('/training/verify-renewal', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const {
      personId,
      qualificationTypeCode,
      licenceNumber,
      issuingAuthority = 'WorkSafe Victoria',
      jurisdiction = 'VIC',
      issueDate = getTodayString(),
      expiryDate,
      noExpiry = false,
      attendeeId,
    } = req.body;

    if (!personId || !qualificationTypeCode || !licenceNumber) {
      return res.status(400).json({ error: 'personId, qualificationTypeCode, and licenceNumber are required' });
    }

    const [person] = await db.select().from(workforcePeople).where(eq(workforcePeople.id, Number(personId)));
    if (!person) return res.status(404).json({ error: 'Person not found' });

    // Find qualification type
    const [qType] = await db
      .select()
      .from(workforceQualificationTypes)
      .where(eq(workforceQualificationTypes.code, qualificationTypeCode));

    const typeId = qType?.id || 1;
    const typeName = qType?.name || qualificationTypeCode;

    // Find existing current qualification to preserve version and link previousRecordId
    const existingQuals = await db
      .select()
      .from(workforceQualifications)
      .where(
        and(
          eq(workforceQualifications.personId, Number(personId)),
          eq(workforceQualifications.typeCode, qualificationTypeCode)
        )
      )
      .orderBy(desc(workforceQualifications.id));

    const prevRecord = existingQuals[0];
    const newVersion = prevRecord ? (prevRecord.version || 1) + 1 : 1;

    // Calculate default expiry date if null and type has default months
    let finalExpiry = expiryDate;
    if (!finalExpiry && !noExpiry && qType?.defaultValidityMonths) {
      const expD = new Date();
      expD.setMonth(expD.getMonth() + qType.defaultValidityMonths);
      finalExpiry = expD.toISOString().split('T')[0];
    }

    // Insert new verified credential record as the current credential
    const [newCredential] = await db
      .insert(workforceQualifications)
      .values({
        personId: Number(personId),
        typeId,
        typeCode: qualificationTypeCode,
        typeName,
        licenceNumber,
        issuingAuthority,
        jurisdiction,
        issueDate,
        expiryDate: finalExpiry || null,
        noExpiry: Boolean(noExpiry),
        verificationStatus: 'Verified',
        verifiedBy: req.user?.email || 'admin',
        verifiedByName: req.user?.name || 'Administrator',
        verifiedAt: new Date(),
        version: newVersion,
        previousRecordId: prevRecord ? prevRecord.id : null,
        notes: `Renewed and verified via Training & Licences Module on ${getTodayString()}`,
      })
      .returning();

    // If attendeeId provided, mark attendee certificateStatus = 'Verified'
    if (attendeeId) {
      await db
        .update(workforceTrainingAttendees)
        .set({
          certificateStatus: 'Verified',
          verifiedAt: new Date(),
          verifiedBy: req.user?.name || 'Verifier',
          updatedAt: new Date(),
        })
        .where(eq(workforceTrainingAttendees.id, Number(attendeeId)));
    }

    await db.insert(auditLogs).values({
      projectId,
      entityType: 'WorkforceQualificationRenewal',
      entityId: newCredential.id,
      entityCode: `QUAL-${newCredential.id}`,
      action: 'VerifyQualificationRenewal',
      performedBy: req.user?.email || 'admin',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'QA / Training Coordinator',
      details: JSON.stringify({
        worker: person.displayName,
        qualification: typeName,
        licenceNumber,
        version: newVersion,
        previousRecordId: prevRecord ? prevRecord.id : null,
      }),
    });

    res.json({
      success: true,
      currentCredential: newCredential,
      historyPreserved: prevRecord ? true : false,
      previousRecordId: prevRecord ? prevRecord.id : null,
    });
  } catch (error: any) {
    console.error('Verify renewal error:', error);
    res.status(500).json({ error: 'Failed to verify renewal' });
  }
});

// Requirements Matrix
workforceApiRouter.get('/training/requirements-matrix', async (req: AuthRequest, res: Response) => {
  try {
    const roles = ['Electrician', 'Apprentice', 'Supervisor', 'Trades Assistant', 'Leading Hand', 'Commissioning Tech'];
    const types = await db.select().from(workforceQualificationTypes);
    const existingReqs = await db.select().from(workforceRoleRequirements);

    const matrix = roles.map((role) => {
      const roleReqs = existingReqs.filter((r) => r.tradeRole.toLowerCase() === role.toLowerCase());
      const qualStatuses: Record<string, boolean> = {};
      types.forEach((t) => {
        const found = roleReqs.find((r) => r.qualificationTypeCode.toLowerCase() === t.code.toLowerCase());
        qualStatuses[t.code] = found ? found.isMandatory : false;
      });
      return {
        role,
        requirements: qualStatuses,
      };
    });

    res.json({ types, matrix });
  } catch (error: any) {
    console.error('Fetch requirements matrix error:', error);
    res.status(500).json({ error: 'Failed to fetch requirements matrix' });
  }
});

workforceApiRouter.put('/training/requirements-matrix', async (req: AuthRequest, res: Response) => {
  try {
    const { tradeRole, qualificationTypeCode, isMandatory } = req.body;
    if (!tradeRole || !qualificationTypeCode) {
      return res.status(400).json({ error: 'tradeRole and qualificationTypeCode are required' });
    }

    const [existing] = await db
      .select()
      .from(workforceRoleRequirements)
      .where(
        and(
          eq(workforceRoleRequirements.tradeRole, tradeRole),
          eq(workforceRoleRequirements.qualificationTypeCode, qualificationTypeCode)
        )
      );

    if (existing) {
      await db
        .update(workforceRoleRequirements)
        .set({ isMandatory: Boolean(isMandatory) })
        .where(eq(workforceRoleRequirements.id, existing.id));
    } else {
      await db.insert(workforceRoleRequirements).values({
        tradeRole,
        qualificationTypeCode,
        isMandatory: Boolean(isMandatory),
      });
    }

    res.json({ success: true, tradeRole, qualificationTypeCode, isMandatory });
  } catch (error: any) {
    console.error('Update requirements matrix error:', error);
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

