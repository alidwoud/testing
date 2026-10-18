import { db } from '../db/index.ts';
import { cables, itrInstances, itrTemplates, equipment, locations } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export async function seedScaleRecords() {
  console.log('Beginning large-scale benchmark seeding...');

  // Get project equipment and templates
  const allEq = await db.select().from(equipment).where(eq(equipment.projectId, 1));
  const [installTpl] = await db.select().from(itrTemplates).where(eq(itrTemplates.code, 'ITR-EL-01'));
  const [testTpl] = await db.select().from(itrTemplates).where(eq(itrTemplates.code, 'ITR-EL-02'));

  const eqCodes = allEq.map((e) => e.equipmentCode);
  if (eqCodes.length < 2) {
    console.error('Not enough equipment to seed cables');
    return;
  }

  // Check current cable count
  const existingCables = await db.select().from(cables).where(eq(cables.projectId, 1));
  const neededCables = Math.max(0, 5000 - existingCables.length);

  console.log(`Current cables: ${existingCables.length}. Generating ${neededCables} cables to reach 5,000...`);

  const cableTypes = [
    '4C 240mm² Cu XLPE',
    '4C 185mm² Cu XLPE',
    '4C 95mm² Cu XLPE',
    '1C 630mm² Cu XLPE',
    '1C 120mm² Cu Earth',
    '2C 4mm² Instrumentation',
  ];
  const systems = ['LV Power', 'HV Power', 'Control', 'ELV Comms'];
  const companies = ['Apex Electrical Contractors', 'Stark Power Systems'];

  const batchSize = 500;
  const startId = existingCables.length + 1;

  for (let i = 0; i < neededCables; i += batchSize) {
    const chunk: any[] = [];
    const count = Math.min(batchSize, neededCables - i);

    for (let j = 0; j < count; j++) {
      const idx = startId + i + j;
      const from = eqCodes[(idx % eqCodes.length)];
      const to = eqCodes[((idx + 1) % eqCodes.length)];
      const isInstalled = idx % 5 !== 0;
      const isTerminated = isInstalled && idx % 4 !== 0;
      const isTested = isTerminated && idx % 3 !== 0;
      const isApproved = isTested && idx % 2 === 0;

      chunk.push({
        projectId: 1,
        cableId: `CB-SCALE-${String(idx).padStart(5, '0')}`,
        fromEquipmentCode: from,
        toEquipmentCode: to,
        system: systems[idx % systems.length],
        cableType: cableTypes[idx % cableTypes.length],
        cableSize: '240mm²',
        coreCount: 4,
        length: 20 + (idx % 80),
        responsibleCompany: companies[idx % companies.length],
        installationStatus: isInstalled ? 'Installed' : 'Not Installed',
        terminationStatus: isTerminated ? 'Terminated' : 'Not Terminated',
        testingStatus: isTested ? 'Tested' : 'Not Tested',
        qaStatus: isApproved ? 'Approved' : isTested ? 'Pending Review' : 'Not Started',
      });
    }

    await db.insert(cables).values(chunk);
    console.log(`Inserted cable batch: ${i + count} / ${neededCables}`);
  }

  // Now check ITR count
  const existingItrs = await db.select().from(itrInstances).where(eq(itrInstances.projectId, 1));
  const neededItrs = Math.max(0, 10000 - existingItrs.length);
  console.log(`Current ITRs: ${existingItrs.length}. Generating ${neededItrs} ITRs to reach 10,000...`);

  const tplId = testTpl?.id || installTpl?.id || 1;
  const tplTitle = testTpl?.title || 'LV Cable Insulation Test';
  const startItrId = existingItrs.length + 1;

  for (let i = 0; i < neededItrs; i += batchSize) {
    const chunk: any[] = [];
    const count = Math.min(batchSize, neededItrs - i);

    for (let j = 0; j < count; j++) {
      const idx = startItrId + i + j;
      const targetNum = 1 + (idx % 4500);
      const isApproved = idx % 2 === 0;

      chunk.push({
        projectId: 1,
        itrNumber: `ITR-SCALE-${String(idx).padStart(6, '0')}`,
        templateId: tplId,
        templateTitle: `CB-SCALE-${String(targetNum).padStart(5, '0')} — ${tplTitle}`,
        targetType: 'Cable',
        targetId: targetNum,
        targetCode: `CB-SCALE-${String(targetNum).padStart(5, '0')}`,
        status: isApproved ? 'Approved' : idx % 3 === 0 ? 'Submitted' : 'Draft',
        autoPopulatedData: JSON.stringify({ cableId: `CB-SCALE-${String(targetNum).padStart(5, '0')}` }),
        formData: JSON.stringify({
          spreadsheet_rows: [
            { phase: 'L1-E', reading: '1000', unit: 'MΩ', result: 'PASS' },
            { phase: 'L2-E', reading: '1005', unit: 'MΩ', result: 'PASS' },
          ],
        }),
        assignedTo: 'Dave Miller',
        assignedCompany: 'Apex Electrical Contractors',
        reviewedByName: isApproved ? 'Mark Callahan (Supervisor)' : null,
      });
    }

    await db.insert(itrInstances).values(chunk);
    console.log(`Inserted ITR batch: ${i + count} / ${neededItrs}`);
  }

  console.log('Scale seeding complete: Database has 5,000+ cables and 10,000+ ITRs.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedScaleRecords().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
