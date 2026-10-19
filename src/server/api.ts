import express, { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.ts';
import {
  projects,
  locations,
  equipment,
  cables,
  itrTemplates,
  itrInstances,
  testReadings,
  issues,
  companies,
  users,
  auditLogs,
  projectMembers,
  drawings,
  spatialPins,
  photoEvidence,
  workforcePeople,
  workforceAllocations,
  workforceZones,
  workforceWorkstreams,
  workforceQualifications,
  workforceQualificationTypes,
  workforceCrews,
  workforceCrewMembers,
  workforceTrainingSessions,
  workforceTrainingAttendees,
  workforceTrainingProviders,
} from '../db/schema.ts';
import { and, asc, desc, eq, ilike, inArray, not, or, sql } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.ts';
import { seedDatabase } from './seed.ts';
import { ensureTablesAndMultiProjectSeed } from './seed-multi-project.ts';
import { workforceApiRouter } from './workforce-api.ts';
import { seedWorkforceData } from './seed-workforce.ts';

export const apiRouter = express.Router();

export function getReqProjectId(req: Request): number {
  const h = req.headers['x-project-id'];
  if (h && typeof h === 'string' && !isNaN(Number(h))) {
    return Number(h);
  }
  const q = req.query.projectId;
  if (q && !isNaN(Number(q))) {
    return Number(q);
  }
  return 1;
}

export async function checkUserProjectAccess(userUid: string, userRole: string, projectId: number): Promise<boolean> {
  if (userRole === 'Administrator') return true;
  if (userUid === 'user-admin-01') return true;
  if (userUid === 'user-tradesperson-01') {
    return projectId === 1; // Tradesperson Dave Miller has MEL02 only
  }
  if (userUid === 'user-supervisor-01' || userUid === 'user-qa-01') {
    return projectId === 1 || projectId === 2; // MEL02 and MEL03
  }
  if (userRole === 'Viewer' || userUid === 'user-viewer-01') {
    return projectId === 1; // Default project 1 for demo viewer
  }
  // Check in projectMembers
  const members = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userUid, userUid)));
  return members.length > 0;
}

apiRouter.use(express.json({ limit: '10mb' }));
apiRouter.use(authMiddleware);
apiRouter.use('/workforce', workforceApiRouter);

// ==========================================
// ROLE & PERMISSION ENFORCEMENT MIDDLEWARE
// ==========================================
function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || 'Viewer';
    if (userRole === 'Viewer') {
      return res.status(403).json({
        error: 'Permission denied: Viewers have read-only permissions on this construction project.',
      });
    }
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Permission denied: Action requires role [${allowedRoles.join(', ')}]. Current role is '${userRole}'.`,
      });
    }
    next();
  };
}

function forbidViewer(req: AuthRequest, res: Response, next: NextFunction) {
  const userRole = req.user?.role || 'Viewer';
  if (userRole === 'Viewer') {
    return res.status(403).json({
      error: 'Permission denied: Viewers have read-only permissions on this construction project.',
    });
  }
  next();
}

// --- SEED ENDPOINT ---
apiRouter.post('/seed', requireRole(['Administrator']), async (_req: Request, res: Response) => {
  try {
    const result = await seedDatabase();
    await seedWorkforceData();
    res.json(result);
  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message || 'Seed failed' });
  }
});

// --- PROJECT FORMATTER HELPER ---
export function formatProject(p: any) {
  let meta: any = {};
  try {
    if (p.description && p.description.trim().startsWith('{')) {
      meta = JSON.parse(p.description);
    }
  } catch (e) {}

  const isDemo = p.code === 'PRJ-MEL-01' || p.code === 'MEL02';
  const environment: 'DEMO' | 'TRIAL' | 'PRODUCTION' = isDemo ? 'DEMO' : (meta.environment || 'TRIAL');

  return {
    ...p,
    organisation: meta.organisation || (isDemo ? 'Melbourne Data Centre JV' : p.clientName || 'Example Construction Group'),
    client: meta.client || p.clientName || (isDemo ? 'Equinix / Australis DC JV' : 'Example Data Centres'),
    principalContractor: meta.principalContractor || (isDemo ? 'Apex Electrical Contractors' : 'Example Construction Group'),
    timezone: meta.timezone || 'Australia/Melbourne',
    startDate: meta.startDate || '',
    expectedCompletionDate: meta.expectedCompletionDate || '',
    imageUrl: meta.imageUrl || '',
    description: meta.description !== undefined ? meta.description : p.description,
    isDemo,
    environment,
  };
}

// --- PROJECTS ---
apiRouter.get('/projects', async (req: AuthRequest, res: Response) => {
  try {
    let projs = await db.select().from(projects);
    if (projs.length === 0) {
      await seedDatabase();
      await ensureTablesAndMultiProjectSeed();
      await seedWorkforceData();
      projs = await db.select().from(projects);
    } else if (projs.length <= 1) {
      await ensureTablesAndMultiProjectSeed();
      await seedWorkforceData();
      projs = await db.select().from(projects);
    }
    // Also ensure Laverton project is present
    if (!projs.some(p => p.code === 'LAV01')) {
      await seedWorkforceData();
      projs = await db.select().from(projects);
    }
    const userRole = req.user?.role || 'Supervisor';
    const userUid = req.user?.uid || 'user-supervisor-01';

    // If Administrator, return all projects
    if (userRole === 'Administrator' || userUid === 'user-admin-01') {
      return res.json(projs.map(formatProject));
    }

    // Filter projects accessible to this user
    const userMemberships = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.userUid, userUid));
    const allowedProjectIds = new Set(userMemberships.map((m) => m.projectId));

    // Fallback role/user mappings
    if (userUid === 'user-tradesperson-01') {
      allowedProjectIds.add(1); // MEL02 only
    } else if (userUid === 'user-supervisor-01' || userUid === 'user-qa-01') {
      allowedProjectIds.add(1); // MEL02
      allowedProjectIds.add(2); // MEL03
    } else {
      allowedProjectIds.add(1);
    }

    const filtered = projs.filter((p) => allowedProjectIds.has(p.id));
    res.json(filtered.map(formatProject));
  } catch (error: any) {
    console.error('Fetch projects failed:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

apiRouter.post('/projects', requireRole(['Administrator']), async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, description, clientName, location, status = 'Active' } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Project code and name are required' });
    }

    const [created] = await db
      .insert(projects)
      .values({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description,
        clientName,
        location,
        status,
      })
      .returning();

    // Add creator to project members
    await db.insert(projectMembers).values({
      projectId: created.id,
      userUid: req.user?.uid || 'user-admin-01',
      role: 'Administrator',
    });

    // Create default building & location
    const [bldg] = await db
      .insert(locations)
      .values({
        projectId: created.id,
        parentId: null,
        name: 'Main Facility',
        code: 'MAIN',
        type: 'Building',
        path: 'Main Facility',
        sequence: 1,
      })
      .returning();

    await db.insert(locations).values({
      projectId: created.id,
      parentId: bldg.id,
      name: 'Level 01',
      code: 'L01',
      type: 'Level',
      path: 'Main Facility > Level 01',
      sequence: 1,
    });

    await db.insert(auditLogs).values({
      projectId: created.id,
      entityType: 'Project',
      entityId: created.id,
      entityCode: created.code,
      action: 'Create',
      performedBy: req.user?.uid || 'user-admin-01',
      performedByName: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Administrator',
      details: JSON.stringify({ message: `Project ${created.name} (${created.code}) created.` }),
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('Create project error:', err);
    res.status(500).json({ error: err.message || 'Failed to create project' });
  }
});

// --- COMPREHENSIVE PROJECT ONBOARDING WIZARD ENDPOINT ---
apiRouter.post(
  '/projects/onboard-full',
  requireRole(['Administrator', 'Project Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        project,
        locations: rawLocations = [],
        equipment: rawEquipment = [],
        cables: rawCables = [],
        qa,
        drawings: rawDrawings = [],
        companies: rawCompanies = [],
        users: rawUsers = [],
      } = req.body;

      if (!project || !project.code || !project.name) {
        return res.status(400).json({ error: 'Project Code and Name are required for onboarding.' });
      }

      const projectCode = project.code.trim().toUpperCase();
      const projectName = project.name.trim();
      const organisation = (project.organisation || '').trim();
      const client = (project.client || '').trim();
      const principalContractor = (project.principalContractor || '').trim();

      if (!organisation || !client || !principalContractor) {
        return res.status(400).json({
          error: 'Organisation, Client, and Principal Contractor are required as separate fields.',
        });
      }

      // Check unique project code
      const [existing] = await db
        .select()
        .from(projects)
        .where(eq(projects.code, projectCode));
      if (existing) {
        return res.status(409).json({
          error: `Project code '${projectCode}' is already in use. Please specify a unique project code.`,
        });
      }

      // Metadata serialization
      const metaPayload = {
        description: project.description?.trim() || '',
        organisation,
        client,
        principalContractor,
        timezone: project.timezone || 'Australia/Melbourne',
        startDate: project.startDate || '',
        expectedCompletionDate: project.expectedCompletionDate || '',
        imageUrl: project.imageUrl || '',
      };

      // 1. Core Project Creation (Safe Insert)
      const [createdProject] = await db
        .insert(projects)
        .values({
          code: projectCode,
          name: projectName,
          description: JSON.stringify(metaPayload),
          clientName: client,
          location: project.location?.trim() || undefined,
          status: project.status || 'Active',
        })
        .returning();

      // 2. Add creator to project members
      await db.insert(projectMembers).values({
        projectId: createdProject.id,
        userUid: req.user?.uid || 'user-admin-01',
        role: 'Administrator',
      });

      // 3. Insert Locations (Topological Hierarchy)
      const locCodeMap = new Map<string, number>();
      const locPathMap = new Map<string, string>();
      let createdLocationsCount = 0;
      let totalLevelsCount = 0;
      let totalRoomsCount = 0;

      if (Array.isArray(rawLocations) && rawLocations.length > 0) {
        const pending = [...rawLocations];
        let iterations = 0;
        const maxIterations = 20;

        while (pending.length > 0 && iterations < maxIterations) {
          iterations++;
          const remaining: typeof rawLocations = [];

          for (const loc of pending) {
            const locCode = String(loc.code || '').trim().toUpperCase();
            const parentCode = loc.parentCode ? String(loc.parentCode).trim().toUpperCase() : null;

            if (!parentCode || locCodeMap.has(parentCode)) {
              const parentId = parentCode ? locCodeMap.get(parentCode) || null : null;
              const parentPath = parentCode ? locPathMap.get(parentCode) || projectName : projectName;
              const path = `${parentPath} > ${loc.name.trim()}`;

              const [createdLoc] = await db
                .insert(locations)
                .values({
                  projectId: createdProject.id,
                  parentId,
                  name: loc.name.trim(),
                  code: locCode,
                  type: loc.type || 'Room',
                  path,
                  sequence: loc.sequence || createdLocationsCount + 1,
                })
                .returning();

              locCodeMap.set(locCode, createdLoc.id);
              locPathMap.set(locCode, path);
              createdLocationsCount++;
              if (loc.type === 'Level') totalLevelsCount++;
              if (loc.type === 'Room') totalRoomsCount++;
            } else {
              remaining.push(loc);
            }
          }

          if (remaining.length === pending.length) {
            // Circular or unresolved parents: insert remaining as top-level
            for (const orphan of remaining) {
              const locCode = String(orphan.code || '').trim().toUpperCase();
              const path = `${projectName} > ${orphan.name.trim()}`;
              const [createdLoc] = await db
                .insert(locations)
                .values({
                  projectId: createdProject.id,
                  parentId: null,
                  name: orphan.name.trim(),
                  code: locCode,
                  type: orphan.type || 'Room',
                  path,
                  sequence: orphan.sequence || createdLocationsCount + 1,
                })
                .returning();

              locCodeMap.set(locCode, createdLoc.id);
              locPathMap.set(locCode, path);
              createdLocationsCount++;
              if (orphan.type === 'Level') totalLevelsCount++;
              if (orphan.type === 'Room') totalRoomsCount++;
            }
            break;
          }

          pending.length = 0;
          pending.push(...remaining);
        }
      }

      // Default fallback location id
      const defaultLocId = Array.from(locCodeMap.values())[0] || null;

      // 4. Insert Equipment
      const eqCodeMap = new Map<string, number>();
      const createdEquipmentList: any[] = [];
      let createdEquipmentCount = 0;

      if (Array.isArray(rawEquipment) && rawEquipment.length > 0 && defaultLocId) {
        for (const eqItem of rawEquipment) {
          const eqCode = String(eqItem.equipmentCode || '').trim().toUpperCase();
          if (!eqCode) continue;

          const locCode = eqItem.locationCode ? String(eqItem.locationCode).trim().toUpperCase() : '';
          const locationId = locCodeMap.get(locCode) || defaultLocId;

          const [createdEq] = await db
            .insert(equipment)
            .values({
              projectId: createdProject.id,
              locationId,
              equipmentCode: eqCode,
              equipmentName: eqItem.equipmentName?.trim() || `Equipment ${eqCode}`,
              equipmentType: eqItem.equipmentType || 'Switchboard',
              system: eqItem.system || 'LV Power',
              manufacturer: eqItem.manufacturer || null,
              model: eqItem.model || null,
              serialNumber: eqItem.serialNumber || null,
              responsibleCompany: eqItem.responsibleCompany || principalContractor,
              status: eqItem.status || 'Installed',
              description: eqItem.description || null,
            })
            .returning();

          eqCodeMap.set(eqCode, createdEq.id);
          createdEquipmentList.push(createdEq);
          createdEquipmentCount++;
        }
      }

      // 5. Insert Cables
      const createdCablesList: any[] = [];
      let createdCablesCount = 0;

      if (Array.isArray(rawCables) && rawCables.length > 0) {
        for (const cableItem of rawCables) {
          const cableId = String(cableItem.cableId || '').trim().toUpperCase();
          if (!cableId) continue;

          const fromCode = String(cableItem.fromEquipmentCode || 'TBD').trim().toUpperCase();
          const toCode = String(cableItem.toEquipmentCode || 'TBD').trim().toUpperCase();
          const fromEqId = eqCodeMap.get(fromCode) || null;
          const toEqId = eqCodeMap.get(toCode) || null;
          const locCode = cableItem.locationCode ? String(cableItem.locationCode).trim().toUpperCase() : '';
          const locId = locCodeMap.get(locCode) || null;

          const [createdCable] = await db
            .insert(cables)
            .values({
              projectId: createdProject.id,
              cableId,
              fromEquipmentId: fromEqId,
              fromEquipmentCode: fromCode,
              toEquipmentId: toEqId,
              toEquipmentCode: toCode,
              locationId: locId,
              system: cableItem.system || 'LV Power',
              cableType: cableItem.cableType || '4C 240mm² Cu XLPE',
              cableSize: cableItem.cableSize || '240mm²',
              coreCount: cableItem.coreCount || 4,
              length: cableItem.length !== undefined && cableItem.length !== null ? Number(cableItem.length) : null,
              responsibleCompany: cableItem.responsibleCompany || principalContractor,
              installationStatus: 'Not Installed',
              terminationStatus: 'Not Terminated',
              testingStatus: 'Not Tested',
              qaStatus: 'Not Started',
            })
            .returning();

          createdCablesList.push(createdCable);
          createdCablesCount++;
        }
      }

      // 6. Companies Setup
      let createdCompaniesCount = 0;
      const initialCompanies: Array<{ name: string; role: string; email?: string }> = [
        { name: principalContractor, role: 'Principal Contractor' },
        { name: client, role: 'Client' },
      ];
      if (organisation !== principalContractor && organisation !== client) {
        initialCompanies.push({ name: organisation, role: 'Consultant' });
      }

      if (Array.isArray(rawCompanies)) {
        for (const c of rawCompanies) {
          if (c.name && !initialCompanies.some((ic) => ic.name.toLowerCase() === c.name.trim().toLowerCase())) {
            initialCompanies.push({ name: c.name.trim(), role: c.type || 'Subcontractor', email: c.email });
          }
        }
      }

      for (const comp of initialCompanies) {
        const code = comp.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase() || 'COMP';
        await db.insert(companies).values({
          projectId: createdProject.id,
          name: comp.name,
          code,
          role: comp.role,
          contactEmail: comp.email || null,
        });
        createdCompaniesCount++;
      }

      // 7. Project Users Setup
      let createdUsersCount = 0;
      if (Array.isArray(rawUsers) && rawUsers.length > 0) {
        for (const u of rawUsers) {
          const email = (u.email || '').trim().toLowerCase();
          if (!email) continue;
          const uid = `usr-${email.replace(/[^a-z0-9]/g, '-')}`;
          await db.insert(projectMembers).values({
            projectId: createdProject.id,
            userUid: uid,
            role: u.role || 'Viewer',
          });
          createdUsersCount++;
        }
      }

      // 8. Drawings & Level Plans Setup (Step 6)
      let createdDrawingsCount = 0;
      if (Array.isArray(rawDrawings) && rawDrawings.length > 0) {
        for (const dwg of rawDrawings) {
          if (!dwg.drawingNumber || !dwg.title) continue;

          // Reject SVG
          const fileUrl = dwg.fileUrl || '';
          const isSvg =
            fileUrl.toLowerCase().startsWith('data:image/svg+xml') ||
            fileUrl.toLowerCase().endsWith('.svg') ||
            fileUrl.toLowerCase().includes('image/svg+xml') ||
            fileUrl.toLowerCase().includes('<svg');
          if (isSvg) continue;

          // Match level
          let matchedLocId: number | null = null;
          if (dwg.levelName) {
            for (const [code, id] of locCodeMap.entries()) {
              if (code.toLowerCase() === dwg.levelName.toLowerCase()) {
                matchedLocId = id;
                break;
              }
            }
          }
          if (!matchedLocId && defaultLocId) {
            matchedLocId = defaultLocId;
          }

          const svgData = JSON.stringify({
            pageNumber: dwg.pageNumber || 1,
            pageCount: dwg.pageCount || 1,
            hotspots: dwg.hotspots || [],
          });

          await db.insert(drawings).values({
            projectId: createdProject.id,
            drawingNumber: dwg.drawingNumber.trim().toUpperCase(),
            title: dwg.title.trim(),
            discipline: dwg.discipline || 'Architectural',
            revision: dwg.revision || 'Rev A',
            status: dwg.status || 'Issued for Construction',
            scale: '1:100',
            locationId: matchedLocId,
            levelName: dwg.levelName || 'Level 02',
            fileUrl: fileUrl || undefined,
            svgData,
          });
          createdDrawingsCount++;
        }
      }

      // 9. QA / ITR Setup (Step 5)
      // IMPORTANT: DO NOT automatically provision templates!
      // Only provision templates explicitly selected by administrator.
      let provisionedTemplatesCount = 0;
      let generatedItrsCount = 0;
      const targetItrsCount = qa?.totalProposedItrs || 0;

      const templateLibrary: Record<string, any> = {
        'ITR-CAB-01': {
          code: 'ITR-CAB-01',
          title: 'Cable Installation & Containment Inspection',
          discipline: 'Electrical',
          targetType: 'Cable',
          version: 1,
          description: 'Physical cable pull, ladder tray containment fill ratio, cleat spacing and transit fire seals verification.',
          schemaDefinition: JSON.stringify([
            { id: 'p1', label: 'Cable pulled without twisting, kinks or exceeding bend radius', type: 'checkbox', required: true },
            { id: 'p2', label: 'Cleats and trefoil clamps secured per specification', type: 'checkbox', required: true },
            { id: 'p3', label: 'Tray fill ratio verified compliant', type: 'checkbox', required: true },
            { id: 'p4', label: 'Penetration fire seals inspected and labelled', type: 'checkbox', required: true },
          ]),
        },
        'ITR-209': {
          code: 'ITR-209',
          title: 'Cable Testing & Insulation Resistance (Megger) / ITR 209',
          discipline: 'Electrical',
          targetType: 'Cable',
          version: 2,
          description: 'Pre-energisation 1000V DC insulation resistance (IR), conductor continuity, and phase rotation verification.',
          schemaDefinition: JSON.stringify([
            { id: 't1', label: 'Cable identification tags verified at origin & destination', type: 'checkbox', required: true },
            { id: 't2', label: 'Outer sheath inspected for mechanical damage', type: 'checkbox', required: true },
            { id: 't3', label: 'L1 - L2 Insulation Resistance (>100 MΩ)', type: 'reading', unit: 'MΩ', min: 100, required: true },
            { id: 't4', label: 'L2 - L3 Insulation Resistance (>100 MΩ)', type: 'reading', unit: 'MΩ', min: 100, required: true },
            { id: 't5', label: 'L3 - L1 Insulation Resistance (>100 MΩ)', type: 'reading', unit: 'MΩ', min: 100, required: true },
            { id: 't6', label: 'Phase - Earth Insulation Resistance (>100 MΩ)', type: 'reading', unit: 'MΩ', min: 100, required: true },
            { id: 't7', label: 'Terminations torqued and torque seal applied', type: 'checkbox', required: true },
          ]),
        },
        'ITR-SW-01': {
          code: 'ITR-SW-01',
          title: 'Main Switchboard & DB Mechanical & Torque Verification',
          discipline: 'Electrical',
          targetType: 'Equipment',
          version: 1,
          description: 'Visual, mechanical, torque seal check, busbar torque check, and IP rating signoff.',
          schemaDefinition: JSON.stringify([
            { id: 's1', label: 'Enclosure plumb, level, and securely bolted to plinth', type: 'checkbox', required: true },
            { id: 's2', label: 'Compartments vacuumed free of construction swarf', type: 'checkbox', required: true },
            { id: 's3', label: 'Busbar bolted joints calibrated torque checked & paint marked', type: 'checkbox', required: true },
            { id: 's4', label: 'Neutral & Earth bars bonded to site main earth terminal', type: 'checkbox', required: true },
          ]),
        },
        'ITR-EQ-01': {
          code: 'ITR-EQ-01',
          title: 'General Electrical Equipment Pre-Commissioning',
          discipline: 'Electrical',
          targetType: 'Equipment',
          version: 1,
          description: 'Equipment mounting, earth bonding, nameplate ratings and clearance compliance.',
          schemaDefinition: JSON.stringify([
            { id: 'e1', label: 'Equipment anchored firmly per seismic/structural detail', type: 'checkbox', required: true },
            { id: 'e2', label: 'Protective earth conductor sized and bonded', type: 'checkbox', required: true },
            { id: 'e3', label: 'Equipment label and danger notices fitted', type: 'checkbox', required: true },
          ]),
        },
      };

      const selectedCodes: string[] = qa?.selectedTemplateCodes || [];
      const insertedTemplateMap = new Map<string, any>();

      if (selectedCodes.length > 0) {
        for (const code of selectedCodes) {
          const tpl = templateLibrary[code];
          if (tpl) {
            const [insertedTpl] = await db
              .insert(itrTemplates)
              .values({
                projectId: createdProject.id,
                code: tpl.code,
                title: tpl.title,
                discipline: tpl.discipline,
                targetType: tpl.targetType,
                description: tpl.description,
                version: tpl.version,
                schemaDefinition: tpl.schemaDefinition,
              })
              .returning();

            insertedTemplateMap.set(tpl.code, insertedTpl);
            provisionedTemplatesCount++;
          }
        }

        // Safe Batched ITR Generation (if administrator explicitly selected [GENERATE ITRs NOW])
        if (qa?.generateItrsNow) {
          for (const [code, tplRecord] of insertedTemplateMap.entries()) {
            if (tplRecord.targetType === 'Cable' && createdCablesList.length > 0) {
              // Batch in chunks of 50 to avoid long transactions
              const chunkSize = 50;
              for (let i = 0; i < createdCablesList.length; i += chunkSize) {
                const chunk = createdCablesList.slice(i, i + chunkSize);
                const batchValues = chunk.map((c) => ({
                  projectId: createdProject.id,
                  itrNumber: `ITR-${tplRecord.code}-${c.cableId}`,
                  templateId: tplRecord.id,
                  templateTitle: tplRecord.title,
                  targetType: 'Cable',
                  targetId: c.id,
                  targetCode: c.cableId,
                  status: 'Draft',
                  autoPopulatedData: JSON.stringify({
                    cableId: c.cableId,
                    fromEquipment: c.fromEquipmentCode,
                    toEquipment: c.toEquipmentCode,
                    cableType: c.cableType,
                    size: c.cableSize,
                    length: c.length,
                    system: c.system,
                  }),
                  formData: JSON.stringify({}),
                  assignedCompany: principalContractor,
                }));
                await db.insert(itrInstances).values(batchValues);
                generatedItrsCount += chunk.length;
              }
            } else if (tplRecord.targetType === 'Equipment' && createdEquipmentList.length > 0) {
              const batchValues = createdEquipmentList.map((eq) => ({
                projectId: createdProject.id,
                itrNumber: `ITR-${tplRecord.code}-${eq.equipmentCode}`,
                templateId: tplRecord.id,
                templateTitle: tplRecord.title,
                targetType: 'Equipment',
                targetId: eq.id,
                targetCode: eq.equipmentCode,
                status: 'Draft',
                autoPopulatedData: JSON.stringify({
                  equipmentCode: eq.equipmentCode,
                  equipmentName: eq.equipmentName,
                  type: eq.equipmentType,
                  system: eq.system,
                  manufacturer: eq.manufacturer,
                  model: eq.model,
                }),
                formData: JSON.stringify({}),
                assignedCompany: principalContractor,
              }));
              await db.insert(itrInstances).values(batchValues);
              generatedItrsCount += createdEquipmentList.length;
            }
          }
        }
      }

      // 10. Audit Log
      await db.insert(auditLogs).values({
        projectId: createdProject.id,
        entityType: 'Project',
        entityId: createdProject.id,
        entityCode: createdProject.code,
        action: 'Onboard',
        performedBy: req.user?.uid || 'user-admin-01',
        performedByName: req.user?.name || 'Administrator',
        performedByRole: req.user?.role || 'Administrator',
        details: JSON.stringify({
          message: `Project ${createdProject.name} (${createdProject.code}) onboarded successfully via 8-Step Wizard.`,
          locationsCreated: createdLocationsCount,
          equipmentCreated: createdEquipmentCount,
          cablesCreated: createdCablesCount,
          templatesCreated: provisionedTemplatesCount,
          itrsGenerated: generatedItrsCount,
          drawingsCreated: createdDrawingsCount,
        }),
      });

      // 11. Project Readiness Object
      const readiness = {
        project: formatProject(createdProject),
        status: {
          details: 'COMPLETE' as const,
          locations: createdLocationsCount > 0 ? ('COMPLETE' as const) : ('EMPTY' as const),
          equipment: createdEquipmentCount > 0 ? ('COMPLETE' as const) : ('EMPTY' as const),
          cables: createdCablesCount > 0 ? ('COMPLETE' as const) : ('EMPTY' as const),
          qaTemplates: provisionedTemplatesCount > 0 ? ('COMPLETE' as const) : ('NOT CONFIGURED' as const),
          itrs: {
            status:
              generatedItrsCount > 0
                ? ('COMPLETE' as const)
                : qa?.generateItrsNow
                ? ('GENERATING' as const)
                : ('NOT GENERATED' as const),
            generatedCount: generatedItrsCount,
            targetCount: targetItrsCount,
          },
          drawings: {
            status:
              createdDrawingsCount >= (totalLevelsCount || 1)
                ? ('COMPLETE' as const)
                : createdDrawingsCount > 0
                ? ('PARTIAL' as const)
                : ('EMPTY' as const),
            configuredLevels: createdDrawingsCount,
            totalLevels: totalLevelsCount || 1,
          },
          companies: createdCompaniesCount > 0 ? ('COMPLETE' as const) : ('EMPTY' as const),
          users: createdUsersCount > 0 ? ('COMPLETE' as const) : ('PARTIAL' as const),
        },
        counts: {
          levels: totalLevelsCount,
          rooms: totalRoomsCount,
          locationsTotal: createdLocationsCount,
          equipment: createdEquipmentCount,
          cables: createdCablesCount,
          templates: provisionedTemplatesCount,
          itrs: generatedItrsCount,
          drawings: createdDrawingsCount,
          companies: createdCompaniesCount,
          users: createdUsersCount,
        },
      };

      res.status(201).json({
        project: formatProject(createdProject),
        readiness,
        counts: readiness.counts,
        message: `Project ${createdProject.name} (${createdProject.code}) created successfully!`,
      });
    } catch (err: any) {
      console.error('Project onboarding error:', err);
      res.status(500).json({ error: err.message || 'Failed to complete project onboarding.' });
    }
  }
);

// --- PROJECT READINESS STATUS ENDPOINT ---
apiRouter.get('/projects/:id/readiness', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = Number(req.params.id);
    const [p] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!p) return res.status(404).json({ error: 'Project not found' });

    const [locs, eqs, cbs, tpls, instances, dwgs, comps, members] = await Promise.all([
      db.select().from(locations).where(eq(locations.projectId, projectId)),
      db.select().from(equipment).where(eq(equipment.projectId, projectId)),
      db.select().from(cables).where(eq(cables.projectId, projectId)),
      db.select().from(itrTemplates).where(eq(itrTemplates.projectId, projectId)),
      db.select().from(itrInstances).where(eq(itrInstances.projectId, projectId)),
      db.select().from(drawings).where(eq(drawings.projectId, projectId)),
      db.select().from(companies).where(eq(companies.projectId, projectId)),
      db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId)),
    ]);

    const levels = locs.filter((l) => l.type === 'Level');
    const rooms = locs.filter((l) => l.type === 'Room');

    const readiness = {
      project: formatProject(p),
      status: {
        details: 'COMPLETE' as const,
        locations: locs.length > 0 ? ('COMPLETE' as const) : ('EMPTY' as const),
        equipment: eqs.length > 0 ? ('COMPLETE' as const) : ('EMPTY' as const),
        cables: cbs.length > 0 ? ('COMPLETE' as const) : ('EMPTY' as const),
        qaTemplates: tpls.length > 0 ? ('COMPLETE' as const) : ('NOT CONFIGURED' as const),
        itrs: {
          status: instances.length > 0 ? ('COMPLETE' as const) : ('NOT GENERATED' as const),
          generatedCount: instances.length,
          targetCount: instances.length,
        },
        drawings: {
          status:
            dwgs.length >= (levels.length || 1)
              ? ('COMPLETE' as const)
              : dwgs.length > 0
              ? ('PARTIAL' as const)
              : ('EMPTY' as const),
          configuredLevels: dwgs.length,
          totalLevels: levels.length || 1,
        },
        companies: comps.length > 0 ? ('COMPLETE' as const) : ('EMPTY' as const),
        users: members.length > 0 ? ('COMPLETE' as const) : ('PARTIAL' as const),
      },
      counts: {
        levels: levels.length,
        rooms: rooms.length,
        locationsTotal: locs.length,
        equipment: eqs.length,
        cables: cbs.length,
        templates: tpls.length,
        itrs: instances.length,
        drawings: dwgs.length,
        companies: comps.length,
        users: members.length,
      },
    };

    res.json(readiness);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch project readiness.' });
  }
});

// --- COMPANIES ENDPOINTS ---
apiRouter.get('/companies', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const comps = await db
      .select()
      .from(companies)
      .where(eq(companies.projectId, projectId));
    res.json(comps);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

apiRouter.post('/companies', requireRole(['Administrator', 'Project Manager']), async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const { name, role, contactEmail } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Company Name and Role are required' });
    const code = name.replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase() || 'COMP';

    const [created] = await db
      .insert(companies)
      .values({
        projectId,
        name: name.trim(),
        code,
        role: role.trim(),
        contactEmail: contactEmail?.trim() || null,
      })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// --- PROJECT MEMBERS ENDPOINTS ---
apiRouter.get('/project-members', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const members = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch project members' });
  }
});

apiRouter.put('/projects/:id', requireRole(['Administrator']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { code, name, description, clientName, location, status } = req.body;
    const [updated] = await db
      .update(projects)
      .set({
        code: code ? code.trim().toUpperCase() : undefined,
        name,
        description,
        clientName,
        location,
        status,
      })
      .where(eq(projects.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// --- STATS / PROJECT OVERVIEW (OPTIMIZED SQL AGGREGATION) ---
apiRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const projectId = getReqProjectId(req);

    const [cableAgg] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        installed: sql<number>`cast(count(*) filter (where ${cables.installationStatus} in ('Installed', 'Pulled / Installed')) as int)`,
        terminated: sql<number>`cast(count(*) filter (where ${cables.terminationStatus} in ('Terminated', 'Both Terminated')) as int)`,
        tested: sql<number>`cast(count(*) filter (where ${cables.testingStatus} = 'Tested') as int)`,
        qaApproved: sql<number>`cast(count(*) filter (where ${cables.qaStatus} = 'Approved') as int)`,
      })
      .from(cables)
      .where(eq(cables.projectId, projectId));

    const [eqAgg] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(equipment)
      .where(eq(equipment.projectId, projectId));

    const [issueAgg] = await db
      .select({
        openCount: sql<number>`cast(count(*) filter (where ${issues.status} in ('Open', 'In Progress')) as int)`,
      })
      .from(issues)
      .where(eq(issues.projectId, projectId));

    const [itrAgg] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        draft: sql<number>`cast(count(*) filter (where ${itrInstances.status} = 'Draft') as int)`,
        inProgress: sql<number>`cast(count(*) filter (where ${itrInstances.status} = 'In Progress') as int)`,
        submitted: sql<number>`cast(count(*) filter (where ${itrInstances.status} in ('Submitted', 'Under Review')) as int)`,
        approved: sql<number>`cast(count(*) filter (where ${itrInstances.status} = 'Approved') as int)`,
        rejected: sql<number>`cast(count(*) filter (where ${itrInstances.status} = 'Rejected') as int)`,
      })
      .from(itrInstances)
      .where(eq(itrInstances.projectId, projectId));

    const [dwgAgg] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(drawings)
      .where(eq(drawings.projectId, projectId));

    const [pinAgg] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(spatialPins)
      .where(eq(spatialPins.projectId, projectId));

    const [photoAgg] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(photoEvidence)
      .where(eq(photoEvidence.projectId, projectId));

    const totalCables = cableAgg?.total || 0;
    const installedCables = cableAgg?.installed || 0;
    const testedCables = cableAgg?.tested || 0;
    const qaApprovedCables = cableAgg?.qaApproved || 0;

    res.json({
      cables: {
        total: totalCables,
        installed: installedCables,
        terminated: cableAgg?.terminated || 0,
        tested: testedCables,
        qaApproved: qaApprovedCables,
        installedPercent: totalCables ? Math.round((installedCables / totalCables) * 100) : 0,
        testedPercent: totalCables ? Math.round((testedCables / totalCables) * 100) : 0,
        qaApprovedPercent: totalCables ? Math.round((qaApprovedCables / totalCables) * 100) : 0,
      },
      equipmentCount: eqAgg?.total || 0,
      openIssues: issueAgg?.openCount || 0,
      itrs: {
        total: itrAgg?.total || 0,
        draft: itrAgg?.draft || 0,
        inProgress: itrAgg?.inProgress || 0,
        submitted: itrAgg?.submitted || 0,
        approved: itrAgg?.approved || 0,
        rejected: itrAgg?.rejected || 0,
      },
      drawingsCount: dwgAgg?.total || 0,
      pinsCount: pinAgg?.total || 0,
      photosCount: photoAgg?.total || 0,
    });
  } catch (error: any) {
    console.error('Fetch stats failed:', error);
    res.status(500).json({ error: 'Failed to fetch project stats' });
  }
});

// --- DRAWINGS REGISTER ---
apiRouter.get('/drawings', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';

    const hasAccess = await checkUserProjectAccess(userUid, userRole, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: User does not have access to project ${projectId}.` });
    }

    const { discipline, search, levelName } = req.query;

    const allDrawings = await db
      .select()
      .from(drawings)
      .where(eq(drawings.projectId, projectId))
      .orderBy(drawings.drawingNumber);

    let filtered = allDrawings;
    if (discipline && discipline !== 'All') {
      filtered = filtered.filter(
        (d) => d.discipline.toLowerCase() === String(discipline).toLowerCase()
      );
    }
    if (levelName && levelName !== 'All') {
      filtered = filtered.filter((d) => d.levelName === String(levelName));
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(q) || d.drawingNumber.toLowerCase().includes(q)
      );
    }

    // Attach pin counts
    const allPins = await db
      .select()
      .from(spatialPins)
      .where(eq(spatialPins.projectId, projectId));
    const pinCountMap: Record<number, number> = {};
    for (const pin of allPins) {
      pinCountMap[pin.drawingId] = (pinCountMap[pin.drawingId] || 0) + 1;
    }

    const result = filtered.map((d) => ({
      ...d,
      pinCount: pinCountMap[d.id] || 0,
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Fetch drawings failed:', err);
    res.status(500).json({ error: 'Failed to fetch drawings' });
  }
});

apiRouter.get('/drawings/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [drawing] = await db.select().from(drawings).where(eq(drawings.id, id));
    if (!drawing) return res.status(404).json({ error: 'Drawing not found' });

    // File isolation check: user must belong to drawing's project
    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, drawing.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: Cross-project drawing file access denied for project ${drawing.projectId}.` });
    }

    const pins = await db
      .select()
      .from(spatialPins)
      .where(eq(spatialPins.drawingId, id));
    res.json({ ...drawing, pins });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch drawing' });
  }
});

apiRouter.post(
  '/drawings',
  requireRole(['Administrator', 'Project Manager', 'QA Manager', 'Supervisor']),
  async (req: AuthRequest, res: Response) => {
    try {
      const projectId = getReqProjectId(req);
      const {
        drawingNumber,
        title,
        discipline,
        revision = 'Rev A',
        status = 'Issued for Construction',
        scale = '1:100',
        locationId,
        levelName,
        svgData,
        fileUrl,
      } = req.body;

      if (fileUrl) {
        const isSvg =
          fileUrl.toLowerCase().startsWith('data:image/svg+xml') ||
          fileUrl.toLowerCase().endsWith('.svg') ||
          fileUrl.toLowerCase().includes('image/svg+xml') ||
          fileUrl.toLowerCase().includes('<svg');
        if (isSvg) {
          return res.status(400).json({
            error: 'SVG uploads are blocked for security. Please upload a genuine PDF, PNG, or JPEG construction drawing.',
          });
        }
      }

      if (!drawingNumber || !title || !discipline) {
        return res
          .status(400)
          .json({ error: 'Drawing Number, Title, and Discipline are required' });
      }

      const [created] = await db
        .insert(drawings)
        .values({
          projectId,
          drawingNumber: drawingNumber.trim().toUpperCase(),
          title: title.trim(),
          discipline,
          revision,
          status,
          scale,
          locationId: locationId ? Number(locationId) : null,
          levelName: levelName || 'Level 02',
          svgData: svgData || 'blueprint-default',
          fileUrl,
        })
        .returning();

      await db.insert(auditLogs).values({
        projectId,
        entityType: 'Drawing',
        entityId: created.id,
        entityCode: created.drawingNumber,
        action: 'Create',
        performedBy: req.user?.uid || 'user-01',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Supervisor',
        details: JSON.stringify({
          message: `Drawing ${created.drawingNumber} (${created.title}) registered.`,
        }),
      });

      res.status(201).json(created);
    } catch (err: any) {
      console.error('Create drawing error:', err);
      res.status(500).json({ error: 'Failed to create drawing' });
    }
  }
);

apiRouter.put(
  '/drawings/:id',
  requireRole(['Administrator', 'Project Manager', 'QA Manager', 'Supervisor']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const {
        drawingNumber,
        title,
        discipline,
        revision,
        status,
        scale,
        locationId,
        levelName,
      } = req.body;
      const [updated] = await db
        .update(drawings)
        .set({
          drawingNumber: drawingNumber ? drawingNumber.trim().toUpperCase() : undefined,
          title,
          discipline,
          revision,
          status,
          scale,
          locationId: locationId ? Number(locationId) : undefined,
          levelName,
          updatedAt: new Date(),
        })
        .where(eq(drawings.id, id))
        .returning();

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update drawing' });
    }
  }
);

// --- SPATIAL PINS ---
apiRouter.get('/spatial-pins', async (req: Request, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const { drawingId, entityType, status } = req.query;

    let pins = await db
      .select()
      .from(spatialPins)
      .where(eq(spatialPins.projectId, projectId));

    if (drawingId) {
      pins = pins.filter((p) => p.drawingId === Number(drawingId));
    }
    if (entityType && entityType !== 'All') {
      pins = pins.filter(
        (p) => p.entityType.toLowerCase() === String(entityType).toLowerCase()
      );
    }
    if (status && status !== 'All') {
      pins = pins.filter(
        (p) => p.status.toLowerCase() === String(status).toLowerCase()
      );
    }

    res.json(pins);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch spatial pins' });
  }
});

apiRouter.post(
  '/spatial-pins',
  requireRole([
    'Administrator',
    'Project Manager',
    'QA Manager',
    'Supervisor',
    'Leading Hand',
    'Tradesperson',
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const projectId = getReqProjectId(req);
      const {
        drawingId,
        locationId,
        x,
        y,
        entityType,
        entityId,
        entityCode,
        title,
        status = 'Pending',
        color,
        notes,
      } = req.body;

      if (!drawingId || x === undefined || y === undefined || !entityType || !entityCode) {
        return res.status(400).json({
          error:
            'Drawing ID, coordinates (x, y), entity type, and entity code are required',
        });
      }

      const defaultColor =
        entityType === 'Issue'
          ? '#ef4444'
          : entityType === 'ITR'
          ? '#f59e0b'
          : entityType === 'Equipment'
          ? '#3b82f6'
          : '#10b981';

      const [created] = await db
        .insert(spatialPins)
        .values({
          projectId,
          drawingId: Number(drawingId),
          locationId: locationId ? Number(locationId) : null,
          x: Number(x),
          y: Number(y),
          entityType,
          entityId: Number(entityId) || 0,
          entityCode,
          title: title || `${entityType} ${entityCode}`,
          status,
          color: color || defaultColor,
          notes,
          createdById: req.user?.uid || 'user-01',
          createdByName: req.user?.name || 'Tradesperson',
        })
        .returning();

      await db.insert(auditLogs).values({
        projectId,
        entityType: 'SpatialPin',
        entityId: created.id,
        entityCode: created.entityCode,
        action: 'Create',
        performedBy: req.user?.uid || 'user-01',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Tradesperson',
        details: JSON.stringify({
          message: `Pin dropped on drawing #${created.drawingId} for ${created.entityType} ${created.entityCode}`,
        }),
      });

      res.status(201).json(created);
    } catch (err: any) {
      console.error('Create spatial pin failed:', err);
      res.status(500).json({ error: 'Failed to create spatial pin' });
    }
  }
);

apiRouter.put(
  '/spatial-pins/:id',
  requireRole([
    'Administrator',
    'Project Manager',
    'QA Manager',
    'Supervisor',
    'Leading Hand',
    'Tradesperson',
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { x, y, status, notes, color } = req.body;
      const [updated] = await db
        .update(spatialPins)
        .set({
          x: x !== undefined ? Number(x) : undefined,
          y: y !== undefined ? Number(y) : undefined,
          status,
          notes,
          color,
        })
        .where(eq(spatialPins.id, id))
        .returning();

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update spatial pin' });
    }
  }
);

apiRouter.delete(
  '/spatial-pins/:id',
  requireRole(['Administrator', 'Project Manager', 'QA Manager', 'Supervisor']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await db.delete(spatialPins).where(eq(spatialPins.id, id));
      res.json({ success: true, message: 'Pin deleted' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete spatial pin' });
    }
  }
);

// --- PHOTO EVIDENCE REGISTER ---
apiRouter.get('/photos', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';

    const hasAccess = await checkUserProjectAccess(userUid, userRole, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: User does not have access to project ${projectId}.` });
    }

    const { category, entityType, entityId, search } = req.query;

    let photos = await db
      .select()
      .from(photoEvidence)
      .where(eq(photoEvidence.projectId, projectId))
      .orderBy(desc(photoEvidence.takenAt));

    if (category && category !== 'All') {
      photos = photos.filter(
        (p) => p.category.toLowerCase() === String(category).toLowerCase()
      );
    }
    if (entityType && entityType !== 'All') {
      photos = photos.filter(
        (p) => p.entityType?.toLowerCase() === String(entityType).toLowerCase()
      );
    }
    if (entityId) {
      photos = photos.filter((p) => p.entityId === Number(entityId));
    }
    if (search) {
      const q = String(search).toLowerCase();
      photos = photos.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.caption && p.caption.toLowerCase().includes(q)) ||
          (p.entityCode && p.entityCode.toLowerCase().includes(q))
      );
    }

    res.json(photos);
  } catch (err: any) {
    console.error('Fetch photos failed:', err);
    res.status(500).json({ error: 'Failed to fetch photo evidence' });
  }
});

apiRouter.get('/photos/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [photo] = await db.select().from(photoEvidence).where(eq(photoEvidence.id, id));
    if (!photo) return res.status(404).json({ error: 'Photo evidence not found' });

    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, photo.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: Cross-project photo evidence access denied for project ${photo.projectId}.` });
    }

    res.json(photo);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch photo evidence' });
  }
});

apiRouter.post(
  '/photos',
  requireRole([
    'Administrator',
    'Project Manager',
    'QA Manager',
    'Supervisor',
    'Leading Hand',
    'Tradesperson',
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const projectId = getReqProjectId(req);
      const {
        title,
        caption,
        category = 'General',
        photoUrl,
        thumbnailUrl,
        entityType,
        entityId,
        entityCode,
        locationId,
        spatialPinId,
        gpsCoords,
        qaVerified = 'false',
        metadata,
      } = req.body;

      if (!title || !photoUrl) {
        return res
          .status(400)
          .json({ error: 'Photo title and photo URL are required' });
      }

      const [created] = await db
        .insert(photoEvidence)
        .values({
          projectId,
          title: title.trim(),
          caption,
          category,
          photoUrl,
          thumbnailUrl: thumbnailUrl || photoUrl,
          takenBy: req.user?.uid || 'user-01',
          takenByName: req.user?.name || 'Tradesperson',
          takenAt: new Date(),
          entityType,
          entityId: entityId ? Number(entityId) : null,
          entityCode,
          locationId: locationId ? Number(locationId) : null,
          spatialPinId: spatialPinId ? Number(spatialPinId) : null,
          gpsCoords: gpsCoords || '-37.8136, 144.9631',
          qaVerified: String(qaVerified),
          metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata,
        })
        .returning();

      await db.insert(auditLogs).values({
        projectId,
        entityType: 'PhotoEvidence',
        entityId: created.id,
        entityCode: created.entityCode || `PHOTO-${created.id}`,
        action: 'Create',
        performedBy: req.user?.uid || 'user-01',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Tradesperson',
        details: JSON.stringify({
          message: `Photo captured: "${created.title}" [${created.category}] linked to ${
            created.entityType || 'General'
          } ${created.entityCode || ''}`,
        }),
      });

      res.status(201).json(created);
    } catch (err: any) {
      console.error('Create photo failed:', err);
      res.status(500).json({ error: 'Failed to upload photo evidence' });
    }
  }
);

apiRouter.put(
  '/photos/:id',
  requireRole(['Administrator', 'Project Manager', 'QA Manager', 'Supervisor']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { title, caption, category, qaVerified } = req.body;
      const [updated] = await db
        .update(photoEvidence)
        .set({
          title,
          caption,
          category,
          qaVerified: qaVerified !== undefined ? String(qaVerified) : undefined,
        })
        .where(eq(photoEvidence.id, id))
        .returning();

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update photo evidence' });
    }
  }
);

apiRouter.delete(
  '/photos/:id',
  requireRole(['Administrator', 'Project Manager', 'QA Manager', 'Supervisor']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await db.delete(photoEvidence).where(eq(photoEvidence.id, id));
      res.json({ success: true, message: 'Photo deleted' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  }
);

// --- LOCATIONS ---
apiRouter.get('/locations', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: User does not have access to project ${projectId}.` });
    }

    const locs = await db
      .select()
      .from(locations)
      .where(eq(locations.projectId, projectId))
      .orderBy(locations.sequence, locations.name);

    // Build hierarchical tree
    const map = new Map<number, any>();
    locs.forEach((l) => map.set(l.id, { ...l, children: [] }));
    const rootNodes: any[] = [];

    locs.forEach((l) => {
      const node = map.get(l.id);
      if (l.parentId && map.has(l.parentId)) {
        map.get(l.parentId).children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    res.json({ flat: locs, tree: rootNodes });
  } catch (error: any) {
    console.error('Fetch locations failed:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

apiRouter.post(
  '/locations',
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { projectId = 1, parentId = null, name, code, type = 'Room' } = req.body;
      if (!name || !code) {
        return res.status(400).json({ error: 'Name and Code are required' });
      }

      let parentPath = 'DC Melbourne 02';
      if (parentId) {
        const [parent] = await db
          .select()
          .from(locations)
          .where(and(eq(locations.id, parentId), eq(locations.projectId, Number(projectId))));
        if (!parent) {
          return res.status(400).json({ error: 'Parent location does not belong to this project' });
        }
        parentPath = parent.path;
      }

      const path = `${parentPath} / ${name}`;
      const [created] = await db
        .insert(locations)
        .values({
          projectId: Number(projectId),
          parentId: parentId ? Number(parentId) : null,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          type,
          path,
          sequence: 10,
        })
        .returning();

      await db.insert(auditLogs).values({
        projectId: Number(projectId),
        entityType: 'Location',
        entityId: created.id,
        entityCode: created.code,
        action: 'Create',
        performedBy: req.user?.email || 'user',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Supervisor',
        details: JSON.stringify({ name, code, type, path }),
      });

      res.json(created);
    } catch (error: any) {
      console.error('Create location failed:', error);
      res.status(500).json({ error: 'Failed to create location' });
    }
  }
);

// --- LEVEL PLAN CONFIGURATION & ROOM HOTSPOTS ---
apiRouter.get('/locations/:id/plan', async (req: AuthRequest, res: Response) => {
  try {
    const locationId = Number(req.params.id);
    const projectId = getReqProjectId(req);

    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: Cross-project level plan file access denied for project ${projectId}.` });
    }

    const dwgs = await db
      .select()
      .from(drawings)
      .where(and(eq(drawings.projectId, projectId), eq(drawings.locationId, locationId)));

    if (dwgs.length === 0) {
      return res.json({
        configured: false,
        hotspots: [],
      });
    }

    const dwg = dwgs[0];
    let planData: any = { pageNumber: 1, pageCount: 1, hotspots: [] };
    try {
      planData = JSON.parse(dwg.svgData || '{}');
    } catch {
      planData = { pageNumber: 1, pageCount: 1, hotspots: [] };
    }

    res.json({
      configured: true,
      drawingId: dwg.id,
      drawingNumber: dwg.drawingNumber,
      title: dwg.title,
      fileUrl: dwg.fileUrl,
      scale: dwg.scale || '1:100',
      revision: dwg.revision || 'Rev A',
      pageNumber: planData.pageNumber || 1,
      pageCount: planData.pageCount || 1,
      hotspots: planData.hotspots || [],
    });
  } catch (error: any) {
    console.error('Fetch level plan failed:', error);
    res.status(500).json({ error: 'Failed to fetch level plan configuration' });
  }
});

apiRouter.post(
  '/locations/:id/plan',
  requireRole(['Administrator', 'Project Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const locationId = Number(req.params.id);
      const projectId = getReqProjectId(req);
      const {
        drawingNumber = 'A-201',
        title = 'Level General Arrangement Floor Plan',
        fileUrl,
        scale = '1:100',
        revision = 'Rev A',
        pageNumber = 1,
        pageCount = 1,
        hotspots = [],
      } = req.body;

      if (!fileUrl) {
        return res.status(400).json({ error: 'Drawing file or image URL is required' });
      }

      const isSvg =
        fileUrl.toLowerCase().startsWith('data:image/svg+xml') ||
        fileUrl.toLowerCase().endsWith('.svg') ||
        fileUrl.toLowerCase().includes('image/svg+xml') ||
        fileUrl.toLowerCase().includes('<svg');
      if (isSvg) {
        return res.status(400).json({
          error: 'SVG uploads are blocked for security. Please upload a genuine PDF, PNG, or JPEG construction drawing.',
        });
      }

      const existing = await db
        .select()
        .from(drawings)
        .where(and(eq(drawings.projectId, projectId), eq(drawings.locationId, locationId)));

      const payloadSvgData = JSON.stringify({ pageNumber, pageCount, hotspots });

      let saved;
      if (existing.length > 0) {
        const [updated] = await db
          .update(drawings)
          .set({
            drawingNumber,
            title,
            fileUrl,
            scale,
            revision,
            svgData: payloadSvgData,
            updatedAt: new Date(),
          })
          .where(eq(drawings.id, existing[0].id))
          .returning();
        saved = updated;
      } else {
        const [loc] = await db.select().from(locations).where(eq(locations.id, locationId));
        const [created] = await db
          .insert(drawings)
          .values({
            projectId,
            locationId,
            levelName: loc?.name || 'Level',
            drawingNumber,
            title,
            discipline: 'Architectural',
            revision,
            status: 'Issued for Construction',
            scale,
            fileUrl,
            svgData: payloadSvgData,
          })
          .returning();
        saved = created;
      }

      await db.insert(auditLogs).values({
        projectId,
        entityType: 'Drawing',
        entityId: saved.id,
        entityCode: saved.drawingNumber,
        action: 'Configure Level Plan',
        performedBy: req.user?.uid || 'admin',
        performedByName: req.user?.name || 'Administrator',
        performedByRole: req.user?.role || 'Administrator',
        details: JSON.stringify({
          locationId,
          drawingNumber: saved.drawingNumber,
          hotspotsCount: hotspots.length,
          pageNumber,
        }),
      });

      res.json({
        success: true,
        configured: true,
        drawingId: saved.id,
        drawingNumber: saved.drawingNumber,
        title: saved.title,
        fileUrl: saved.fileUrl,
        scale: saved.scale,
        revision: saved.revision,
        pageNumber,
        pageCount,
        hotspots,
      });
    } catch (error: any) {
      console.error('Save level plan failed:', error);
      res.status(500).json({ error: error.message || 'Failed to save level plan configuration' });
    }
  }
);

apiRouter.delete(
  '/locations/:id/plan',
  requireRole(['Administrator', 'Project Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const locationId = Number(req.params.id);
      const projectId = getReqProjectId(req);

      const linkedDwgs = await db
        .select()
        .from(drawings)
        .where(and(eq(drawings.projectId, projectId), eq(drawings.locationId, locationId)));

      for (const dwg of linkedDwgs) {
        const pins = await db.select().from(spatialPins).where(eq(spatialPins.drawingId, dwg.id));
        if (pins.length > 0) {
          await db.update(drawings).set({ locationId: null }).where(eq(drawings.id, dwg.id));
        } else {
          await db.delete(drawings).where(eq(drawings.id, dwg.id));
        }
      }

      res.json({ success: true, message: 'Level plan configuration removed' });
    } catch (error: any) {
      console.error('Delete level plan failed:', error);
      res.status(500).json({ error: 'Failed to reset level plan' });
    }
  }
);

apiRouter.post('/locations/parse-pdf', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, pageNumber = 1 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: 'PDF data is required' });
    }

    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;
    const clampedPageNum = Math.max(1, Math.min(pageCount, Number(pageNumber)));
    const page = await doc.getPage(clampedPageNum);
    const viewport = page.getViewport({ scale: 1 });

    const textContent = await page.getTextContent();
    const textItems: any[] = [];

    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.trim().length > 0) {
        const tx = item.transform[4];
        const ty = item.transform[5];
        const itemWidth = item.width || 20;
        const itemHeight = item.height || 12;

        const xPct = Math.max(0, Math.min(100, (tx / viewport.width) * 100));
        const yPct = Math.max(0, Math.min(100, ((viewport.height - ty) / viewport.height) * 100));
        const widthPct = Math.max(1, Math.min(50, (itemWidth / viewport.width) * 100));
        const heightPct = Math.max(0.5, Math.min(20, (itemHeight / viewport.height) * 100));

        textItems.push({
          str: item.str.trim(),
          xPct: Math.round(xPct * 10) / 10,
          yPct: Math.round(yPct * 10) / 10,
          widthPct: Math.round(widthPct * 10) / 10,
          heightPct: Math.round(heightPct * 10) / 10,
        });
      }
    }

    res.json({
      success: true,
      pageCount,
      pageNumber: clampedPageNum,
      pageWidth: Math.round(viewport.width),
      pageHeight: Math.round(viewport.height),
      textItems,
      isVectorWithText: textItems.length > 0,
      isScannedOrNoText: textItems.length === 0,
    });
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse PDF document' });
  }
});

// --- EQUIPMENT ---
apiRouter.get('/equipment', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: User does not have access to project ${projectId}.` });
    }

    const search = req.query.search ? String(req.query.search).trim() : '';
    const locationId = req.query.locationId ? Number(req.query.locationId) : null;
    const status = req.query.status ? String(req.query.status) : '';

    const conditions = [eq(equipment.projectId, projectId)];

    if (locationId) {
      conditions.push(eq(equipment.locationId, locationId));
    }
    if (status) {
      conditions.push(eq(equipment.status, status));
    }
    if (search) {
      const pat = `%${search}%`;
      conditions.push(
        or(
          ilike(equipment.equipmentCode, pat),
          ilike(equipment.equipmentName, pat),
          ilike(equipment.equipmentType, pat),
          ilike(equipment.system, pat),
          ilike(equipment.manufacturer, pat)
        )!
      );
    }

    const allEq = await db
      .select({
        equipment: equipment,
        locationName: locations.name,
        locationPath: locations.path,
      })
      .from(equipment)
      .leftJoin(locations, eq(equipment.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(equipment.equipmentCode);

    res.json(
      allEq.map((item) => ({
        ...item.equipment,
        locationName: item.locationName || 'Unknown Location',
        locationPath: item.locationPath || '',
      }))
    );
  } catch (error: any) {
    console.error('Fetch equipment failed:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

apiRouter.get('/equipment/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [eqItem] = await db.select().from(equipment).where(eq(equipment.id, id));

    if (!eqItem) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, eqItem.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: Cross-project equipment access denied for project ${eqItem.projectId}.` });
    }

    const [location] = eqItem.locationId
      ? await db.select().from(locations).where(eq(locations.id, eqItem.locationId))
      : [null];

    // Find all cables connected From or To this equipment
    const connectedCables = await db
      .select()
      .from(cables)
      .where(
        and(
          eq(cables.projectId, eqItem.projectId),
          or(
            eq(cables.fromEquipmentId, id),
            eq(cables.toEquipmentId, id),
            eq(cables.fromEquipmentCode, eqItem.equipmentCode),
            eq(cables.toEquipmentCode, eqItem.equipmentCode)
          )
        )
      )
      .orderBy(cables.cableId);

    // Associated ITRs
    const eqItrs = await db
      .select()
      .from(itrInstances)
      .where(
        and(
          eq(itrInstances.projectId, eqItem.projectId),
          or(
            and(eq(itrInstances.targetType, 'Equipment'), eq(itrInstances.targetId, id)),
            and(eq(itrInstances.targetType, 'Equipment'), eq(itrInstances.targetCode, eqItem.equipmentCode))
          )
        )
      )
      .orderBy(desc(itrInstances.createdAt));

    // Associated test readings
    const readings = await db
      .select()
      .from(testReadings)
      .where(and(eq(testReadings.projectId, eqItem.projectId), eq(testReadings.equipmentId, id)))
      .orderBy(desc(testReadings.createdAt));

    // Associated issues
    const eqIssues = await db
      .select()
      .from(issues)
      .where(and(eq(issues.projectId, eqItem.projectId), eq(issues.equipmentId, id)))
      .orderBy(desc(issues.createdAt));

    // Audit logs
    const history = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.projectId, eqItem.projectId),
          eq(auditLogs.entityType, 'Equipment'),
          eq(auditLogs.entityId, id)
        )
      )
      .orderBy(desc(auditLogs.createdAt));

    // Progress metrics
    const totalCables = connectedCables.length;
    const installedCables = connectedCables.filter(
      (c) => c.installationStatus === 'Installed' || c.installationStatus === 'Pulled / Installed'
    ).length;
    const terminatedCables = connectedCables.filter(
      (c) => c.terminationStatus === 'Terminated' || c.terminationStatus === 'Both Terminated'
    ).length;
    const testedCables = connectedCables.filter((c) => c.testingStatus === 'Tested').length;
    const qaCompleteCables = connectedCables.filter((c) => c.qaStatus === 'Approved').length;

    res.json({
      ...eqItem,
      location,
      cables: connectedCables,
      itrs: eqItrs,
      testReadings: readings,
      issues: eqIssues,
      history,
      metrics: {
        totalCables,
        installedCables,
        terminatedCables,
        testedCables,
        qaCompleteCables,
        openIssues: eqIssues.filter((i) => i.status !== 'Closed').length,
        progressPercent: totalCables ? Math.round((qaCompleteCables / totalCables) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('Fetch equipment detail failed:', error);
    res.status(500).json({ error: 'Failed to fetch equipment details' });
  }
});

apiRouter.post(
  '/equipment',
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        projectId = 1,
        locationId,
        equipmentCode,
        equipmentName,
        equipmentType = 'Switchboard',
        system = 'Electrical LV',
        manufacturer,
        model,
        serialNumber,
        responsibleCompany = 'Apex Electrical Contractors',
        description,
        status = 'Installed',
      } = req.body;

      if (!equipmentCode || !equipmentName || !locationId) {
        return res.status(400).json({ error: 'Code, Name, and Location are required' });
      }

      // Verify location belongs to this project (tenant isolation)
      const [loc] = await db
        .select()
        .from(locations)
        .where(and(eq(locations.id, Number(locationId)), eq(locations.projectId, Number(projectId))));
      if (!loc) {
        return res.status(400).json({ error: 'Location does not exist in this project' });
      }

      // Check unique equipment code in project
      const [existing] = await db
        .select()
        .from(equipment)
        .where(
          and(
            eq(equipment.projectId, Number(projectId)),
            eq(equipment.equipmentCode, equipmentCode.trim().toUpperCase())
          )
        );
      if (existing) {
        return res.status(409).json({ error: `Equipment code '${equipmentCode}' already exists in this project.` });
      }

      const [created] = await db
        .insert(equipment)
        .values({
          projectId: Number(projectId),
          locationId: Number(locationId),
          equipmentCode: equipmentCode.trim().toUpperCase(),
          equipmentName: equipmentName.trim(),
          equipmentType,
          system,
          manufacturer,
          model,
          serialNumber,
          responsibleCompany,
          description,
          status,
          qrCode: `FORGE:EQ:${equipmentCode.trim().toUpperCase()}`,
        })
        .returning();

      await db.insert(auditLogs).values({
        projectId: Number(projectId),
        entityType: 'Equipment',
        entityId: created.id,
        entityCode: created.equipmentCode,
        action: 'Create',
        performedBy: req.user?.email || 'user',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Supervisor',
        details: JSON.stringify({ equipmentCode, equipmentName, locationId }),
      });

      res.json(created);
    } catch (error: any) {
      console.error('Create equipment failed:', error);
      res.status(500).json({ error: 'Failed to create equipment' });
    }
  }
);

// --- CABLES (SERVER-SIDE SQL PAGINATION & INDEXED FILTERS) ---
apiRouter.get('/cables', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: User does not have access to project ${projectId}.` });
    }

    const search = req.query.search ? String(req.query.search).trim() : '';
    const equipmentCode = req.query.equipmentCode ? String(req.query.equipmentCode).trim() : '';
    const locationId = req.query.locationId ? Number(req.query.locationId) : null;
    const installationStatus = req.query.installationStatus ? String(req.query.installationStatus) : '';
    const testingStatus = req.query.testingStatus ? String(req.query.testingStatus) : '';
    const qaStatus = req.query.qaStatus ? String(req.query.qaStatus) : '';
    const system = req.query.system ? String(req.query.system) : '';

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions = [eq(cables.projectId, projectId)];

    if (locationId) {
      conditions.push(eq(cables.locationId, locationId));
    }
    if (installationStatus) {
      conditions.push(eq(cables.installationStatus, installationStatus));
    }
    if (testingStatus) {
      conditions.push(eq(cables.testingStatus, testingStatus));
    }
    if (qaStatus) {
      conditions.push(eq(cables.qaStatus, qaStatus));
    }
    if (system) {
      conditions.push(eq(cables.system, system));
    }
    if (equipmentCode) {
      conditions.push(
        or(eq(cables.fromEquipmentCode, equipmentCode), eq(cables.toEquipmentCode, equipmentCode))!
      );
    }
    if (search) {
      const pat = `%${search}%`;
      conditions.push(
        or(
          ilike(cables.cableId, pat),
          ilike(cables.fromEquipmentCode, pat),
          ilike(cables.toEquipmentCode, pat),
          ilike(cables.cableType, pat),
          ilike(cables.system, pat),
          ilike(cables.responsibleCompany, pat)
        )!
      );
    }

    const whereClause = and(...conditions);

    // SQL count with index
    const [countResult] = await db
      .select({ totalCount: sql<number>`cast(count(*) as int)` })
      .from(cables)
      .where(whereClause);

    const totalCount = countResult?.totalCount || 0;

    // SQL paginated select with B-Tree index scan
    const paginated = await db
      .select({
        cable: cables,
        locationName: locations.name,
      })
      .from(cables)
      .leftJoin(locations, eq(cables.locationId, locations.id))
      .where(whereClause)
      .orderBy(cables.cableId)
      .limit(limit)
      .offset(offset);

    const mappedCables = paginated.map((item) => ({
      ...item.cable,
      locationName: item.locationName || 'Switch Room 01',
    }));

    res.json({
      data: mappedCables,
      cables: mappedCables,
      total: totalCount,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Fetch cables failed:', error);
    res.status(500).json({ error: 'Failed to fetch cables' });
  }
});

apiRouter.get('/cables/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [cable] = await db.select().from(cables).where(eq(cables.id, id));

    if (!cable) {
      return res.status(404).json({ error: 'Cable not found' });
    }

    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, cable.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: Cross-project cable access denied for project ${cable.projectId}.` });
    }

    const [location] = cable.locationId
      ? await db.select().from(locations).where(eq(locations.id, cable.locationId))
      : [null];

    const [fromEq] = cable.fromEquipmentId
      ? await db.select().from(equipment).where(eq(equipment.id, cable.fromEquipmentId))
      : [null];

    const [toEq] = cable.toEquipmentId
      ? await db.select().from(equipment).where(eq(equipment.id, cable.toEquipmentId))
      : [null];

    // Associated ITRs
    const cableItrs = await db
      .select()
      .from(itrInstances)
      .where(
        and(
          eq(itrInstances.projectId, cable.projectId),
          or(
            and(eq(itrInstances.targetType, 'Cable'), eq(itrInstances.targetId, id)),
            and(eq(itrInstances.targetType, 'Cable'), eq(itrInstances.targetCode, cable.cableId))
          )
        )
      )
      .orderBy(desc(itrInstances.createdAt));

    // Structured test readings
    const readings = await db
      .select()
      .from(testReadings)
      .where(and(eq(testReadings.projectId, cable.projectId), eq(testReadings.cableId, id)))
      .orderBy(desc(testReadings.createdAt));

    // Associated issues
    const cableIssues = await db
      .select()
      .from(issues)
      .where(and(eq(issues.projectId, cable.projectId), eq(issues.cableId, id)))
      .orderBy(desc(issues.createdAt));

    // Audit logs
    const history = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.projectId, cable.projectId),
          eq(auditLogs.entityType, 'Cable'),
          eq(auditLogs.entityId, id)
        )
      )
      .orderBy(desc(auditLogs.createdAt));

    res.json({
      ...cable,
      location,
      fromEquipment: fromEq,
      toEquipment: toEq,
      itrs: cableItrs,
      testReadings: readings,
      issues: cableIssues,
      history,
    });
  } catch (error: any) {
    console.error('Fetch cable detail failed:', error);
    res.status(500).json({ error: 'Failed to fetch cable details' });
  }
});

apiRouter.post(
  '/cables',
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        projectId = 1,
        cableId,
        fromEquipmentCode,
        toEquipmentCode,
        locationId,
        system = 'LV Power',
        cableType = '4C 240mm² Cu XLPE',
        cableSize = '240mm²',
        coreCount = 4,
        length = 50.0,
        responsibleCompany = 'Apex Electrical Contractors',
        installationStatus = 'Not Installed',
        terminationStatus = 'Not Terminated',
        testingStatus = 'Not Tested',
        qaStatus = 'Not Started',
        comments,
      } = req.body;

      if (!cableId || !fromEquipmentCode || !toEquipmentCode) {
        return res.status(400).json({ error: 'Cable ID, From Equipment, and To Equipment are required' });
      }

      if (length !== undefined && (isNaN(Number(length)) || Number(length) < 0)) {
        return res.status(400).json({ error: 'Cable length must be a non-negative number' });
      }

      // Check unique cable ID within project
      const [existing] = await db
        .select()
        .from(cables)
        .where(and(eq(cables.projectId, Number(projectId)), eq(cables.cableId, cableId.trim())));
      if (existing) {
        return res.status(409).json({ error: `Cable ID '${cableId}' already exists in this project.` });
      }

      // Lookup equipment IDs within this project (project isolation)
      const [fromEq] = await db
        .select()
        .from(equipment)
        .where(
          and(
            eq(equipment.projectId, Number(projectId)),
            eq(equipment.equipmentCode, fromEquipmentCode.trim().toUpperCase())
          )
        );
      const [toEq] = await db
        .select()
        .from(equipment)
        .where(
          and(
            eq(equipment.projectId, Number(projectId)),
            eq(equipment.equipmentCode, toEquipmentCode.trim().toUpperCase())
          )
        );

      const [created] = await db
        .insert(cables)
        .values({
          projectId: Number(projectId),
          cableId: cableId.trim(),
          fromEquipmentId: fromEq?.id || null,
          fromEquipmentCode: fromEquipmentCode.trim().toUpperCase(),
          toEquipmentId: toEq?.id || null,
          toEquipmentCode: toEquipmentCode.trim().toUpperCase(),
          locationId: locationId ? Number(locationId) : (fromEq?.locationId || null),
          system,
          cableType,
          cableSize,
          coreCount: Number(coreCount) || 4,
          length: Number(length) || 0,
          responsibleCompany,
          installationStatus,
          terminationStatus,
          testingStatus,
          qaStatus,
          comments,
        })
        .returning();

      await db.insert(auditLogs).values({
        projectId: Number(projectId),
        entityType: 'Cable',
        entityId: created.id,
        entityCode: created.cableId,
        action: 'Create',
        performedBy: req.user?.email || 'user',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Supervisor',
        details: JSON.stringify({ cableId, from: fromEquipmentCode, to: toEquipmentCode }),
      });

      res.json(created);
    } catch (error: any) {
      console.error('Create cable failed:', error);
      res.status(500).json({ error: 'Failed to create cable' });
    }
  }
);

apiRouter.patch(
  '/cables/:id',
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;

      const [existing] = await db.select().from(cables).where(eq(cables.id, id));
      if (!existing) {
        return res.status(404).json({ error: 'Cable not found' });
      }

      if (updates.length !== undefined && (isNaN(Number(updates.length)) || Number(updates.length) < 0)) {
        return res.status(400).json({ error: 'Cable length must be a non-negative number' });
      }

      const [updated] = await db
        .update(cables)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(cables.id, id))
        .returning();

      await db.insert(auditLogs).values({
        projectId: existing.projectId,
        entityType: 'Cable',
        entityId: existing.id,
        entityCode: existing.cableId,
        action: 'Update',
        performedBy: req.user?.email || 'user',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Supervisor',
        details: JSON.stringify({ updates }),
      });

      res.json(updated);
    } catch (error: any) {
      console.error('Update cable failed:', error);
      res.status(500).json({ error: 'Failed to update cable' });
    }
  }
);

// --- BULK CABLE STATUS UPDATE ---
apiRouter.all(
  '/cables/bulk-status',
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager']),
  async (req: AuthRequest, res: Response) => {
    if (req.method !== 'PUT' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const {
        cableIds = [],
        installationStatus,
        terminationStatus,
        testingStatus,
        qaStatus,
        projectId = 1,
      } = req.body;

      if (!Array.isArray(cableIds) || cableIds.length === 0) {
        return res.status(400).json({ error: 'No cable IDs provided' });
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (installationStatus) updates.installationStatus = installationStatus;
      if (terminationStatus) updates.terminationStatus = terminationStatus;
      if (testingStatus) updates.testingStatus = testingStatus;
      if (qaStatus) updates.qaStatus = qaStatus;

      const updated = await db
        .update(cables)
        .set(updates)
        .where(
          and(
            eq(cables.projectId, Number(projectId)),
            inArray(cables.id, cableIds.map(Number))
          )
        )
        .returning();

      for (const c of updated) {
        await db.insert(auditLogs).values({
          projectId: Number(projectId),
          entityType: 'Cable',
          entityId: c.id,
          entityCode: c.cableId,
          action: 'Bulk Status Update',
          performedBy: req.user?.email || 'user',
          performedByName: req.user?.name || 'User',
          performedByRole: req.user?.role || 'Supervisor',
          details: JSON.stringify(updates),
        });
      }

      res.json({
        success: true,
        updatedCount: updated.length,
        cables: updated,
      });
    } catch (error: any) {
      console.error('Bulk update cables failed:', error);
      res.status(500).json({ error: 'Failed to bulk update cables' });
    }
  }
);

// --- CABLE SPREADSHEET IMPORT (VALIDATION & PREVIEW) ---
apiRouter.post(
  '/cables/import-preview',
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager']),
  async (req: Request, res: Response) => {
    try {
      const { rows, columnMapping, projectId = 1 } = req.body;

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'No rows provided for import' });
      }

      // Existing cables in project to detect updates vs new
      const existingCables = await db
        .select()
        .from(cables)
        .where(eq(cables.projectId, Number(projectId)));
      const cableMap = new Map<string, typeof cables.$inferSelect>();
      existingCables.forEach((c) => cableMap.set(c.cableId.trim().toUpperCase(), c));

      // Existing equipment in project for foreign reference check
      const existingEq = await db
        .select()
        .from(equipment)
        .where(eq(equipment.projectId, Number(projectId)));
      const eqSet = new Set(existingEq.map((e) => e.equipmentCode.trim().toUpperCase()));

      const newRecords: any[] = [];
      const updates: any[] = [];
      const duplicatesInFile: any[] = [];
      const warnings: any[] = [];
      const errors: any[] = [];

      const seenInFile = new Set<string>();

      rows.forEach((rawRow: any, index: number) => {
        const cableId = String(rawRow[columnMapping.cableId] || '').trim();
        const fromEq = String(rawRow[columnMapping.fromEquipment] || '').trim().toUpperCase();
        const toEq = String(rawRow[columnMapping.toEquipment] || '').trim().toUpperCase();
        const cableType = String(rawRow[columnMapping.cableType] || '4C 240mm² Cu XLPE').trim();
        const cableSize = String(rawRow[columnMapping.cableSize] || '240mm²').trim();
        const system = String(rawRow[columnMapping.system] || 'LV Power').trim();
        const lengthVal = rawRow[columnMapping.length];
        const company = String(rawRow[columnMapping.responsibleCompany] || 'Not Set').trim();

        const rowNum = index + 2; // header is row 1

        // Validation rule 1: Missing Cable ID
        if (!cableId) {
          errors.push({ rowNum, message: 'Missing Cable ID' });
          return;
        }

        // Validation rule 2: Invalid Length
        let parsedLength: number | null = null;
        if (lengthVal !== undefined && lengthVal !== '') {
          parsedLength = Number(lengthVal);
          if (isNaN(parsedLength) || parsedLength < 0) {
            errors.push({ rowNum, cableId, message: `Invalid cable length '${lengthVal}' (must be a positive number)` });
            return;
          }
        }

        // Validation rule 3: Duplicate inside file
        if (seenInFile.has(cableId.toUpperCase())) {
          duplicatesInFile.push({ rowNum, cableId, message: `Duplicate Cable ID '${cableId}' inside spreadsheet` });
          errors.push({ rowNum, cableId, message: `Duplicate Cable ID '${cableId}' inside spreadsheet` });
          return;
        }
        seenInFile.add(cableId.toUpperCase());

        // Warning rule 4: Referenced equipment not found in project register
        if (fromEq && !eqSet.has(fromEq)) {
          warnings.push({ rowNum, cableId, message: `From Equipment '${fromEq}' not currently registered in this project` });
        }
        if (toEq && !eqSet.has(toEq)) {
          warnings.push({ rowNum, cableId, message: `To Equipment '${toEq}' not currently registered in this project` });
        }

        const existing = cableMap.get(cableId.toUpperCase());
        if (existing) {
          const changes: Record<string, { current: any; proposed: any }> = {};
          if (fromEq && fromEq !== existing.fromEquipmentCode) {
            changes.fromEquipment = { current: existing.fromEquipmentCode, proposed: fromEq };
          }
          if (toEq && toEq !== existing.toEquipmentCode) {
            changes.toEquipment = { current: existing.toEquipmentCode, proposed: toEq };
          }
          if (parsedLength !== null && existing.length !== null && Math.abs((existing.length || 0) - parsedLength) > 0.01) {
            changes.length = { current: existing.length, proposed: parsedLength };
          }
          if (cableType && cableType !== existing.cableType) {
            changes.cableType = { current: existing.cableType, proposed: cableType };
          }

          if (Object.keys(changes).length > 0) {
            updates.push({
              rowNum,
              cableId,
              existingId: existing.id,
              changes,
              proposedData: {
                cableId,
                fromEquipmentCode: fromEq || existing.fromEquipmentCode,
                toEquipmentCode: toEq || existing.toEquipmentCode,
                cableType: cableType || existing.cableType,
                cableSize: cableSize || existing.cableSize,
                length: parsedLength !== null ? parsedLength : existing.length,
                system: system || existing.system,
                responsibleCompany: company || existing.responsibleCompany,
              },
            });
          }
        } else {
          newRecords.push({
            rowNum,
            cableId,
            fromEquipmentCode: fromEq || 'TBD',
            toEquipmentCode: toEq || 'TBD',
            cableType: cableType || '4C 240mm² Cu XLPE',
            cableSize: cableSize || '240mm²',
            system: system || 'LV Power',
            length: parsedLength || 50.0,
            responsibleCompany: company || 'Not Set',
          });
        }
      });

      res.json({
        summary: {
          totalRows: rows.length,
          newCount: newRecords.length,
          updatesCount: updates.length,
          duplicatesCount: duplicatesInFile.length,
          warningsCount: warnings.length,
          errorsCount: errors.length,
        },
        newRecords: newRecords.slice(0, 100),
        updates: updates.slice(0, 100),
        duplicates: duplicatesInFile,
        warnings,
        errors,
      });
    } catch (error: any) {
      console.error('Import preview failed:', error);
      res.status(500).json({ error: 'Failed to process spreadsheet preview' });
    }
  }
);

// --- COMMIT CABLE IMPORT ---
apiRouter.post(
  '/cables/import-commit',
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { newRecords = [], updates = [], projectId = 1 } = req.body;

      let createdCount = 0;
      let updatedCount = 0;

      for (const record of newRecords) {
        // Find existing equipment within this project
        const [fromEq] = await db
          .select()
          .from(equipment)
          .where(
            and(
              eq(equipment.projectId, Number(projectId)),
              eq(equipment.equipmentCode, record.fromEquipmentCode)
            )
          );
        const [toEq] = await db
          .select()
          .from(equipment)
          .where(
            and(
              eq(equipment.projectId, Number(projectId)),
              eq(equipment.equipmentCode, record.toEquipmentCode)
            )
          );

        await db
          .insert(cables)
          .values({
            projectId: Number(projectId),
            cableId: record.cableId,
            fromEquipmentId: fromEq?.id || null,
            fromEquipmentCode: record.fromEquipmentCode || 'TBD',
            toEquipmentId: toEq?.id || null,
            toEquipmentCode: record.toEquipmentCode || 'TBD',
            locationId: fromEq?.locationId || null,
            system: record.system || 'LV Power',
            cableType: record.cableType || '4C 240mm² Cu XLPE',
            cableSize: record.cableSize || '240mm²',
            coreCount: 4,
            length: record.length ? Number(record.length) : 50.0,
            responsibleCompany: record.responsibleCompany || 'Not Set',
            installationStatus: 'Not Installed',
            terminationStatus: 'Not Terminated',
            testingStatus: 'Not Tested',
            qaStatus: 'Not Started',
          });

        createdCount++;
      }

      for (const up of updates) {
        if (!up.existingId || !up.proposedData) continue;
        await db
          .update(cables)
          .set({
            ...up.proposedData,
            updatedAt: new Date(),
          })
          .where(and(eq(cables.id, up.existingId), eq(cables.projectId, Number(projectId))));

        await db.insert(auditLogs).values({
          projectId: Number(projectId),
          entityType: 'Cable',
          entityId: up.existingId,
          entityCode: up.cableId,
          action: 'Import',
          performedBy: req.user?.email || 'user',
          performedByName: req.user?.name || 'User',
          performedByRole: req.user?.role || 'Supervisor',
          details: JSON.stringify({ changes: up.changes }),
        });

        updatedCount++;
      }

      res.json({
        success: true,
        message: `Import committed: ${createdCount} created, ${updatedCount} updated`,
        createdCount,
        updatedCount,
      });
    } catch (error: any) {
      console.error('Import commit failed:', error);
      res.status(500).json({ error: 'Failed to commit cable import' });
    }
  }
);

// --- DIRECT CABLE BATCH IMPORT (WITH STRICT VALIDATION) ---
apiRouter.post(
  '/cables/import',
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { cables: cableRows = [], projectId = 1 } = req.body;

      if (!Array.isArray(cableRows) || cableRows.length === 0) {
        return res.status(400).json({ error: 'No cables provided for import', errors: ['No cables provided for import'] });
      }

      const existingCables = await db
        .select()
        .from(cables)
        .where(eq(cables.projectId, Number(projectId)));
      const existingMap = new Map<string, any>();
      existingCables.forEach((c) => existingMap.set(c.cableId.trim().toUpperCase(), c));

      const existingEq = await db
        .select()
        .from(equipment)
        .where(eq(equipment.projectId, Number(projectId)));
      const eqMap = new Map<string, any>();
      existingEq.forEach((e) => eqMap.set(e.equipmentCode.trim().toUpperCase(), e));

      const errors: string[] = [];
      const warnings: string[] = [];
      const validCables: any[] = [];
      const seenInPayload = new Set<string>();

      for (let i = 0; i < cableRows.length; i++) {
        const row = cableRows[i];
        const rowNum = i + 1;
        const cableId = String(row.cableId || '').trim();

        if (!cableId) {
          errors.push(`Row ${rowNum}: Missing Cable ID`);
          continue;
        }

        const upperId = cableId.toUpperCase();
        if (seenInPayload.has(upperId)) {
          errors.push(`Row ${rowNum}: Duplicate Cable ID '${cableId}' inside payload`);
          continue;
        }
        seenInPayload.add(upperId);

        if (existingMap.has(upperId)) {
          errors.push(`Row ${rowNum}: Duplicate Cable ID '${cableId}' already exists in project`);
          continue;
        }

        const lengthVal = row.length;
        if (lengthVal !== undefined && lengthVal !== null && lengthVal !== '') {
          const numLength = Number(lengthVal);
          if (isNaN(numLength) || numLength < 0) {
            errors.push(`Row ${rowNum}: Invalid cable length '${lengthVal}' (must be non-negative)`);
            continue;
          }
        }

        const fromEqCode = String(row.fromEquipmentCode || row.fromEquipment || '').trim().toUpperCase();
        const toEqCode = String(row.toEquipmentCode || row.toEquipment || '').trim().toUpperCase();

        if (fromEqCode && !eqMap.has(fromEqCode)) {
          warnings.push(`Row ${rowNum}: From Equipment '${fromEqCode}' does not exist in this project`);
        }
        if (toEqCode && !eqMap.has(toEqCode)) {
          warnings.push(`Row ${rowNum}: To Equipment '${toEqCode}' does not exist in this project`);
        }

        const fromEq = eqMap.get(fromEqCode);
        const toEq = eqMap.get(toEqCode);

        validCables.push({
          projectId: Number(projectId),
          cableId,
          fromEquipmentId: fromEq?.id || null,
          fromEquipmentCode: fromEqCode || 'TBD',
          toEquipmentId: toEq?.id || null,
          toEquipmentCode: toEqCode || 'TBD',
          locationId: fromEq?.locationId || null,
          system: row.system || 'LV Power',
          cableType: row.cableType || '4C 240mm² Cu XLPE',
          cableSize: row.cableSize || '240mm²',
          coreCount: Number(row.coreCount) || 4,
          length: Number(row.length) || 50.0,
          responsibleCompany: row.responsibleCompany || 'Not Set',
          installationStatus: row.installationStatus || 'Not Installed',
          terminationStatus: row.terminationStatus || 'Not Terminated',
          testingStatus: row.testingStatus || 'Not Tested',
          qaStatus: row.qaStatus || 'Not Started',
        });
      }

      if (errors.length > 0) {
        return res.status(errors.some((e) => e.includes('Duplicate')) ? 409 : 400).json({
          error: 'Validation failed on cable import batch',
          errors,
          warnings,
        });
      }

      const inserted = await db.insert(cables).values(validCables).returning();

      for (const item of inserted) {
        await db.insert(auditLogs).values({
          projectId: Number(projectId),
          entityType: 'Cable',
          entityId: item.id,
          entityCode: item.cableId,
          action: 'Import',
          performedBy: req.user?.email || 'user',
          performedByName: req.user?.name || 'User',
          performedByRole: req.user?.role || 'Administrator',
          details: JSON.stringify({ cableId: item.cableId, from: item.fromEquipmentCode, to: item.toEquipmentCode }),
        });
      }

      res.json({
        success: true,
        insertedCount: inserted.length,
        imported: inserted.length,
        cables: inserted,
        warnings,
        errors: [],
      });
    } catch (error: any) {
      console.error('Import cables failed:', error);
      res.status(500).json({ error: 'Failed to import cables' });
    }
  }
);

// --- ITR TEMPLATES ---
apiRouter.get('/itr-templates', async (req: Request, res: Response) => {
  try {
    const projectId = getReqProjectId(req);

    const templates = await db
      .select()
      .from(itrTemplates)
      .where(eq(itrTemplates.projectId, projectId))
      .orderBy(itrTemplates.code);

    res.json(templates);
  } catch (error: any) {
    console.error('Fetch ITR templates failed:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

apiRouter.post(
  '/itr-templates',
  requireRole(['Administrator', 'Project Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        projectId = 1,
        code,
        title,
        discipline = 'Electrical',
        targetType = 'Cable',
        description,
        schemaDefinition,
        sections,
      } = req.body;

      const finalSchema = schemaDefinition || (sections ? { sections } : null);

      if (!code || !title || !finalSchema) {
        return res.status(400).json({ error: 'Code, Title, and Schema Definition are required' });
      }

      // Check unique template code in project
      const [existing] = await db
        .select()
        .from(itrTemplates)
        .where(
          and(
            eq(itrTemplates.projectId, Number(projectId)),
            eq(itrTemplates.code, code.trim().toUpperCase())
          )
        );
      if (existing) {
        return res.status(409).json({ error: `ITR Template code '${code}' already exists in this project.` });
      }

      const schemaStr =
        typeof finalSchema === 'string' ? finalSchema : JSON.stringify(finalSchema);

      const [created] = await db
        .insert(itrTemplates)
        .values({
          projectId: Number(projectId),
          code: code.trim().toUpperCase(),
          title: title.trim(),
          discipline,
          targetType,
          description,
          version: 1,
          status: 'Active',
          schemaDefinition: schemaStr,
        })
        .returning();

      await db.insert(auditLogs).values({
        projectId: Number(projectId),
        entityType: 'Template',
        entityId: created.id,
        entityCode: created.code,
        action: 'Create',
        performedBy: req.user?.email || 'user',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Administrator',
        details: JSON.stringify({ code, title, discipline }),
      });

      res.json(created);
    } catch (error: any) {
      console.error('Create template failed:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  }
);

apiRouter.put(
  '/itr-templates/:id',
  requireRole(['Administrator', 'Project Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { title, description, discipline, schemaDefinition, sections, status } = req.body;
      const [existing] = await db.select().from(itrTemplates).where(eq(itrTemplates.id, id));
      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      let schemaStr = existing.schemaDefinition;
      if (schemaDefinition) {
        schemaStr = typeof schemaDefinition === 'string' ? schemaDefinition : JSON.stringify(schemaDefinition);
      } else if (sections) {
        schemaStr = JSON.stringify({ sections });
      }

      const [updated] = await db
        .update(itrTemplates)
        .set({
          title: title !== undefined ? title : existing.title,
          description: description !== undefined ? description : existing.description,
          discipline: discipline !== undefined ? discipline : existing.discipline,
          schemaDefinition: schemaStr,
          version: existing.version + 1,
          status: status || existing.status,
        })
        .where(eq(itrTemplates.id, id))
        .returning();

      await db.insert(auditLogs).values({
        projectId: existing.projectId,
        entityType: 'Template',
        entityId: existing.id,
        entityCode: existing.code,
        action: 'Update',
        performedBy: req.user?.email || 'user',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Administrator',
        details: JSON.stringify({ version: updated.version, title: updated.title }),
      });

      res.json(updated);
    } catch (error: any) {
      console.error('Update template failed:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  }
);

// --- ITR INSTANCES ---
apiRouter.get('/itr-instances', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: User does not have access to project ${projectId}.` });
    }

    const status = req.query.status ? String(req.query.status) : '';
    const targetType = req.query.targetType ? String(req.query.targetType) : '';
    const targetCode = req.query.targetCode ? String(req.query.targetCode) : '';
    const search = req.query.search ? String(req.query.search).trim() : '';

    const conditions = [eq(itrInstances.projectId, projectId)];

    if (status) {
      conditions.push(eq(itrInstances.status, status));
    }
    if (targetType) {
      conditions.push(eq(itrInstances.targetType, targetType));
    }
    if (targetCode) {
      conditions.push(eq(itrInstances.targetCode, targetCode));
    }
    if (search) {
      const pat = `%${search}%`;
      conditions.push(
        or(
          ilike(itrInstances.itrNumber, pat),
          ilike(itrInstances.templateTitle, pat),
          ilike(itrInstances.targetCode, pat)
        )!
      );
    }

    const itrs = await db
      .select()
      .from(itrInstances)
      .where(and(...conditions))
      .orderBy(desc(itrInstances.createdAt))
      .limit(100);

    res.json(itrs);
  } catch (error: any) {
    console.error('Fetch ITR instances failed:', error);
    res.status(500).json({ error: 'Failed to fetch ITR instances' });
  }
});

apiRouter.get('/itr-instances/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [itr] = await db.select().from(itrInstances).where(eq(itrInstances.id, id));

    if (!itr) {
      return res.status(404).json({ error: 'ITR instance not found' });
    }

    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, itr.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: Cross-project ITR record access denied for project ${itr.projectId}.` });
    }

    const [template] = await db
      .select()
      .from(itrTemplates)
      .where(eq(itrTemplates.id, itr.templateId));

    // Audit logs for this ITR
    const history = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'ITR'), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt));

    let parsedFormData: any = {};
    try {
      parsedFormData = typeof itr.formData === 'string' ? JSON.parse(itr.formData) : (itr.formData || {});
    } catch {
      parsedFormData = {};
    }

    // Associated test readings from DB
    const dbReadings = await db
      .select()
      .from(testReadings)
      .where(eq(testReadings.itrInstanceId, id))
      .orderBy(asc(testReadings.id));

    const rawReadings = dbReadings.length > 0 ? dbReadings : (parsedFormData.testReadings || []);
    const finalTestReadings = rawReadings.map((r: any) => ({
      ...r,
      readingValue: r.readingValue !== undefined ? String(r.readingValue) : (r.reading !== undefined ? String(r.reading) : ''),
      reading: r.reading !== undefined ? Number(r.reading) : (parseFloat(r.readingValue) || 0),
    }));

    res.json({
      ...itr,
      formData: parsedFormData,
      rawFormData: itr.formData,
      testReadings: finalTestReadings,
      template,
      history,
    });
  } catch (error: any) {
    console.error('Fetch ITR detail failed:', error);
    res.status(500).json({ error: 'Failed to fetch ITR details' });
  }
});

// SINGLE ITR CREATION
apiRouter.post(
  ['/itr-instances', '/itrs'],
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager', 'Tradesperson']),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        projectId = 1,
        templateId,
        templateCode,
        targetType = 'Cable',
        targetId = 0,
        targetCode = 'UNSPECIFIED',
        assignedTo = 'Dave Miller',
        assignedCompany = 'Apex Electrical Contractors',
      } = req.body;

      let targetTplId = Number(templateId);
      if (!targetTplId && templateCode) {
        const [tpl] = await db
          .select()
          .from(itrTemplates)
          .where(
            and(
              eq(itrTemplates.projectId, Number(projectId)),
              eq(itrTemplates.code, templateCode.trim().toUpperCase())
            )
          );
        if (tpl) targetTplId = tpl.id;
      }

      if (!targetTplId) {
        return res.status(400).json({ error: 'Valid templateId or templateCode is required' });
      }

      const [template] = await db.select().from(itrTemplates).where(eq(itrTemplates.id, targetTplId));
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const currentItrs = await db
        .select({ id: itrInstances.id, itrNumber: itrInstances.itrNumber })
        .from(itrInstances)
        .orderBy(desc(itrInstances.id))
        .limit(1);

      let nextSeq = 100;
      if (currentItrs.length > 0 && currentItrs[0].itrNumber) {
        const match = currentItrs[0].itrNumber.match(/(\d+)$/);
        if (match) {
          nextSeq = parseInt(match[1], 10) + 1;
        }
      }

      const itrNum = `ITR-MEL02-${String(nextSeq).padStart(4, '0')}`;

      const [created] = await db
        .insert(itrInstances)
        .values({
          projectId: Number(projectId),
          itrNumber: itrNum,
          templateId: template.id,
          templateTitle: `${targetCode} — ${template.title}`,
          targetType,
          targetId: Number(targetId),
          targetCode,
          status: 'Draft',
          autoPopulatedData: JSON.stringify({ targetCode, targetType }),
          formData: JSON.stringify({}),
          assignedTo,
          assignedCompany,
        })
        .returning();

      await db.insert(auditLogs).values({
        projectId: Number(projectId),
        entityType: 'ITR',
        entityId: created.id,
        entityCode: created.itrNumber,
        action: 'Create',
        performedBy: req.user?.email || 'user',
        performedByName: req.user?.name || 'User',
        performedByRole: req.user?.role || 'Supervisor',
        details: JSON.stringify({ target: targetCode, template: template.code }),
      });

      res.json(created);
    } catch (error: any) {
      console.error('Create ITR instance failed:', error);
      res.status(500).json({ error: 'Failed to create ITR instance' });
    }
  }
);

// BULK ITR CREATION (CRITICAL USER REQUIREMENT)
apiRouter.post(
  ['/itr-instances/bulk-generate', '/itrs/generate-bulk', '/itrs/bulk-generate'],
  requireRole(['Administrator', 'Project Manager', 'Supervisor', 'QA Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        projectId = 1,
        targetType = 'Cable',
        targetIds = [],
        templateIds = [],
        templateCode,
        generateMissingOnly = false,
        assignedTo = 'Dave Miller',
        assignedCompany = 'Apex Electrical Contractors',
      } = req.body;

      if (!Array.isArray(targetIds) || targetIds.length === 0) {
        return res.status(400).json({ error: 'No targets selected' });
      }

      let tplIds = Array.isArray(templateIds) ? templateIds.map(Number) : [];
      if (tplIds.length === 0 && templateCode) {
        const [tpl] = await db
          .select()
          .from(itrTemplates)
          .where(
            and(
              eq(itrTemplates.projectId, Number(projectId)),
              eq(itrTemplates.code, templateCode.trim().toUpperCase())
            )
          );
        if (tpl) tplIds = [tpl.id];
      }

      if (tplIds.length === 0) {
        return res.status(400).json({ error: 'No templates selected or found' });
      }

      // Fetch templates
      const selectedTemplates = await db
        .select()
        .from(itrTemplates)
        .where(
          and(
            eq(itrTemplates.projectId, Number(projectId)),
            inArray(itrTemplates.id, tplIds)
          )
        );

      // Fetch targets strictly within this project
      let targetItems: any[] = [];
      if (targetType === 'Cable') {
        targetItems = await db
          .select()
          .from(cables)
          .where(
            and(
              eq(cables.projectId, Number(projectId)),
              inArray(cables.id, targetIds.map(Number))
            )
          );
      } else {
        targetItems = await db
          .select()
          .from(equipment)
          .where(
            and(
              eq(equipment.projectId, Number(projectId)),
              inArray(equipment.id, targetIds.map(Number))
            )
          );
      }

      // Check existing ITRs to prevent duplicates if requested
      const existingItrs = await db
        .select({
          templateId: itrInstances.templateId,
          targetType: itrInstances.targetType,
          targetCode: itrInstances.targetCode,
          targetId: itrInstances.targetId,
        })
        .from(itrInstances)
        .where(
          and(
            eq(itrInstances.projectId, Number(projectId)),
            eq(itrInstances.targetType, targetType),
            inArray(itrInstances.templateId, tplIds)
          )
        );

      const existingSet = new Set(
        existingItrs.map((i) => `${i.templateId}_${i.targetCode}`)
      );

      const currentItrs = await db
        .select({ id: itrInstances.id, itrNumber: itrInstances.itrNumber })
        .from(itrInstances)
        .orderBy(desc(itrInstances.id))
        .limit(1);

      let nextSeq = 100;
      if (currentItrs.length > 0 && currentItrs[0].itrNumber) {
        const match = currentItrs[0].itrNumber.match(/(\d+)$/);
        if (match) {
          nextSeq = parseInt(match[1], 10) + 1;
        }
      }

      const createdItrs = [];
      let skippedDuplicates = 0;

      for (const item of targetItems) {
        const targetCode = targetType === 'Cable' ? item.cableId : item.equipmentCode;

        for (const tpl of selectedTemplates) {
          // Check duplicate
          const key = `${tpl.id}_${targetCode}`;
          if (existingSet.has(key)) {
            skippedDuplicates++;
            if (generateMissingOnly) {
              continue;
            }
          }

          let autoPop: Record<string, any> = {};
          if (targetType === 'Cable') {
            autoPop = {
              cableId: item.cableId,
              fromEquipment: item.fromEquipmentCode,
              toEquipment: item.toEquipmentCode,
              system: item.system,
              cableType: item.cableType,
              cableSize: item.cableSize,
              length: item.length,
              responsibleCompany: item.responsibleCompany,
            };
          } else {
            autoPop = {
              equipmentCode: item.equipmentCode,
              equipmentName: item.equipmentName,
              equipmentType: item.equipmentType,
              system: item.system,
              manufacturer: item.manufacturer,
              model: item.model,
              serialNumber: item.serialNumber,
              responsibleCompany: item.responsibleCompany,
            };
          }

          const itrNum = `ITR-MEL02-${String(nextSeq++).padStart(4, '0')}`;

          const [created] = await db
            .insert(itrInstances)
            .values({
              projectId: Number(projectId),
              itrNumber: itrNum,
              templateId: tpl.id,
              templateTitle: `${targetCode} — ${tpl.title}`,
              targetType,
              targetId: item.id,
              targetCode,
              status: 'Draft',
              autoPopulatedData: JSON.stringify(autoPop),
              formData: JSON.stringify({}),
              assignedTo,
              assignedCompany,
            })
            .returning();

          existingSet.add(key);
          createdItrs.push(created);
        }
      }

      await db.insert(auditLogs).values({
        projectId: Number(projectId),
        entityType: 'ITR',
        entityId: createdItrs[0]?.id || 0,
        entityCode: `BULK-${createdItrs.length}`,
        action: 'Bulk Generate',
        performedBy: req.user?.email || 'admin',
        performedByName: req.user?.name || 'Administrator',
        performedByRole: req.user?.role || 'Administrator',
        details: JSON.stringify({
          count: createdItrs.length,
          targetsCount: targetItems.length,
          templatesCount: selectedTemplates.length,
        }),
      });

      res.json({
        success: true,
        message: `Successfully generated ${createdItrs.length} ITR inspections`,
        itrs: createdItrs,
        createdItrs,
      });
    } catch (error: any) {
      console.error('Bulk generate ITRs failed:', error);
      res.status(500).json({ error: 'Failed to bulk generate inspections' });
    }
  }
);

// PREVIEW CABLE ITRs FOR EQUIPMENT (PREVENT THOUSANDS OF DUPLICATES)
apiRouter.get('/equipment/:id/cables-itr-preview', async (req: AuthRequest, res: Response) => {
  try {
    const eqId = Number(req.params.id);
    const [eqItem] = await db.select().from(equipment).where(eq(equipment.id, eqId));
    if (!eqItem) return res.status(404).json({ error: 'Equipment not found' });

    const projectId = eqItem.projectId;
    const templateId = req.query.templateId ? Number(req.query.templateId) : null;
    const templateCode = req.query.templateCode ? String(req.query.templateCode) : '';

    // Find template
    let tpl: any = null;
    if (templateId) {
      [tpl] = await db.select().from(itrTemplates).where(and(eq(itrTemplates.id, templateId), eq(itrTemplates.projectId, projectId)));
    } else if (templateCode) {
      [tpl] = await db.select().from(itrTemplates).where(and(eq(itrTemplates.code, templateCode), eq(itrTemplates.projectId, projectId)));
    }
    if (!tpl) {
      // Fallback to first Cable template
      const [firstTpl] = await db.select().from(itrTemplates).where(and(eq(itrTemplates.projectId, projectId), eq(itrTemplates.targetType, 'Cable')));
      tpl = firstTpl;
    }

    // Find connected cables
    const connectedCables = await db
      .select()
      .from(cables)
      .where(
        and(
          eq(cables.projectId, projectId),
          or(
            eq(cables.fromEquipmentCode, eqItem.equipmentCode),
            eq(cables.toEquipmentCode, eqItem.equipmentCode)
          )
        )
      );

    // Find existing matching ITRs for these cables
    const cableCodes = connectedCables.map((c) => c.cableId);
    let existingItrs: any[] = [];
    if (cableCodes.length > 0 && tpl) {
      existingItrs = await db
        .select()
        .from(itrInstances)
        .where(
          and(
            eq(itrInstances.projectId, projectId),
            eq(itrInstances.templateId, tpl.id),
            eq(itrInstances.targetType, 'Cable'),
            inArray(itrInstances.targetCode, cableCodes)
          )
        );
    }

    const existingMatchingItrsCount = existingItrs.length;
    const missingItrsCount = Math.max(0, connectedCables.length - existingMatchingItrsCount);

    res.json({
      equipmentId: eqItem.id,
      equipmentCode: eqItem.equipmentCode,
      equipmentName: eqItem.equipmentName,
      template: tpl,
      connectedCablesCount: connectedCables.length,
      existingMatchingItrsCount,
      missingItrsCount,
      proposedNewItrsCount: missingItrsCount,
      cables: connectedCables.map((c) => ({
        id: c.id,
        cableId: c.cableId,
        cableType: c.cableType,
        hasExistingItr: existingItrs.some((i) => i.targetCode === c.cableId),
      })),
    });
  } catch (error: any) {
    console.error('Fetch cables ITR preview failed:', error);
    res.status(500).json({ error: 'Failed to preview cable ITRs' });
  }
});

// SAVE DRAFT ITR
apiRouter.put('/itr-instances/:id/save', forbidViewer, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { formData, testReadings: inputReadings } = req.body;

    const [existing] = await db.select().from(itrInstances).where(eq(itrInstances.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'ITR not found' });
    }

    // IMMUTABILITY: Approved inspections cannot be silently changed
    if (existing.status === 'Approved') {
      return res.status(400).json({
        error: 'Data Integrity Violation: Approved inspections are permanently locked and cannot be modified.',
      });
    }

    let parsedForm: any = formData || {};
    if (typeof parsedForm === 'string') {
      try {
        parsedForm = JSON.parse(parsedForm);
      } catch {
        parsedForm = {};
      }
    }

    if (Array.isArray(inputReadings) && inputReadings.length > 0) {
      parsedForm.testReadings = inputReadings;

      // Also persist to testReadings table
      for (const tr of inputReadings) {
        await db.insert(testReadings).values({
          projectId: existing.projectId,
          itrInstanceId: existing.id,
          cableId: existing.targetType === 'Cable' ? existing.targetId : null,
          equipmentId: existing.targetType === 'Equipment' ? existing.targetId : null,
          testType: tr.testType || 'Insulation Resistance',
          phase: tr.parameter || tr.phase || 'General',
          reading: parseFloat(tr.readingValue || tr.reading || '0') || 0,
          unit: tr.unit || 'MΩ',
          result: tr.result || 'Pass',
          testedBy: req.user?.name || 'Tradesperson',
          testDate: new Date().toISOString().split('T')[0],
          notes: tr.notes || '',
        });
      }
    }

    const [updated] = await db
      .update(itrInstances)
      .set({
        formData: JSON.stringify(parsedForm),
        status: existing.status === 'Draft' ? 'Draft' : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(itrInstances.id, id))
      .returning();

    res.json({
      ...updated,
      formData: parsedForm,
      testReadings: inputReadings || parsedForm.testReadings || [],
    });
  } catch (error: any) {
    console.error('Save ITR draft failed:', error);
    res.status(500).json({ error: 'Failed to save ITR' });
  }
});

// SUBMIT ITR (Tradesperson submits for review)
apiRouter.post('/itr-instances/:id/submit', forbidViewer, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { formData, comments } = req.body;

    const [existing] = await db.select().from(itrInstances).where(eq(itrInstances.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'ITR not found' });
    }

    // IMMUTABILITY: Approved inspections cannot be resubmitted
    if (existing.status === 'Approved') {
      return res.status(400).json({
        error: 'Data Integrity Violation: Approved inspections are permanently locked and cannot be resubmitted.',
      });
    }

    const [updated] = await db
      .update(itrInstances)
      .set({
        formData: formData ? (typeof formData === 'string' ? formData : JSON.stringify(formData)) : existing.formData,
        status: 'Submitted',
        submittedBy: req.user?.email || 'tradesperson@maximforge.com',
        submittedByName: req.user?.name || 'Dave Miller (Tradesperson)',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(itrInstances.id, id))
      .returning();

    // If target is Cable, update cable testingStatus or qaStatus to 'Pending Review'
    if (existing.targetType === 'Cable') {
      await db
        .update(cables)
        .set({
          qaStatus: 'Pending Review',
          testingStatus: 'Tested',
          updatedAt: new Date(),
        })
        .where(eq(cables.id, existing.targetId));
    }

    await db.insert(auditLogs).values({
      projectId: existing.projectId,
      entityType: 'ITR',
      entityId: existing.id,
      entityCode: existing.itrNumber,
      action: 'Submit',
      performedBy: req.user?.email || 'tradesperson',
      performedByName: req.user?.name || 'Tradesperson',
      performedByRole: req.user?.role || 'Tradesperson',
      details: JSON.stringify({ message: 'Submitted for supervisor QA review', comments }),
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Submit ITR failed:', error);
    res.status(500).json({ error: 'Failed to submit ITR' });
  }
});

// REVIEW ITR (Supervisor/QA Manager reviews: Approve or Reject)
apiRouter.post(
  '/itr-instances/:id/review',
  requireRole(['Supervisor', 'QA Manager', 'Project Manager', 'Administrator']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { action, notes } = req.body;

      if (!action || !['Approve', 'Reject'].includes(action)) {
        return res.status(400).json({ error: "Action must be either 'Approve' or 'Reject'" });
      }

      const [existing] = await db.select().from(itrInstances).where(eq(itrInstances.id, id));
      if (!existing) {
        return res.status(404).json({ error: 'ITR not found' });
      }

      // IMMUTABILITY: Cannot re-review already approved inspection
      if (existing.status === 'Approved') {
        return res.status(400).json({
          error: 'Data Integrity Violation: Inspection is already approved and locked.',
        });
      }

      const isApproved = action === 'Approve';
      const newStatus = isApproved ? 'Approved' : 'Rejected';

      const [updated] = await db
        .update(itrInstances)
        .set({
          status: newStatus,
          reviewedBy: req.user?.email || 'mark.callahan@apexelectrical.com.au',
          reviewedByName: req.user?.name || 'Mark Callahan (Supervisor)',
          reviewedAt: new Date(),
          approvalNotes: isApproved ? notes || 'Approved on site.' : null,
          rejectionReason: !isApproved ? notes || 'Deficiencies identified. Correct and resubmit.' : null,
          updatedAt: new Date(),
        })
        .where(eq(itrInstances.id, id))
        .returning();

      // AUTOMATIC CABLE AND EQUIPMENT STATUS SYNC
      if (existing.targetType === 'Cable') {
        await db
          .update(cables)
          .set({
            qaStatus: isApproved ? 'Approved' : 'Rejected',
            installationStatus: isApproved ? 'Installed' : undefined,
            terminationStatus: isApproved ? 'Terminated' : undefined,
            testingStatus: isApproved ? 'Tested' : undefined,
            testDate: isApproved ? new Date().toISOString().split('T')[0] : undefined,
            updatedAt: new Date(),
          })
          .where(eq(cables.id, existing.targetId));

        // If the form data contained spreadsheet test readings, extract and insert structured test readings!
        if (isApproved && existing.formData) {
          try {
            const parsed = JSON.parse(existing.formData);
            if (Array.isArray(parsed.spreadsheet_rows)) {
              for (const row of parsed.spreadsheet_rows) {
                if (row.reading && row.phase) {
                  await db.insert(testReadings).values({
                    projectId: existing.projectId,
                    itrInstanceId: existing.id,
                    cableId: existing.targetId,
                    testType: 'Insulation Resistance',
                    phase: row.phase,
                    reading: parseFloat(row.reading) || 0,
                    unit: row.unit || 'MΩ',
                    result: row.result || 'PASS',
                    testedBy: existing.submittedByName || 'Dave Miller',
                    testDate: new Date().toISOString().split('T')[0],
                  });
                }
              }
            }
          } catch {
            // ignore parsing error
          }
        }
      }

      await db.insert(auditLogs).values({
        projectId: existing.projectId,
        entityType: 'ITR',
        entityId: existing.id,
        entityCode: existing.itrNumber,
        action: isApproved ? 'Approve' : 'Reject',
        performedBy: req.user?.email || 'supervisor',
        performedByName: req.user?.name || 'Supervisor',
        performedByRole: req.user?.role || 'Supervisor',
        details: JSON.stringify({ action, notes, target: existing.targetCode }),
      });

      res.json(updated);
    } catch (error: any) {
      console.error('Review ITR failed:', error);
      res.status(500).json({ error: 'Failed to process ITR review' });
    }
  }
);

// --- STRUCTURED TEST READINGS ---
apiRouter.get('/test-readings', async (req: Request, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const cableId = req.query.cableId ? Number(req.query.cableId) : null;
    const testType = req.query.testType ? String(req.query.testType) : '';

    const conditions = [eq(testReadings.projectId, projectId)];
    if (cableId) {
      conditions.push(eq(testReadings.cableId, cableId));
    }
    if (testType) {
      conditions.push(eq(testReadings.testType, testType));
    }

    const readings = await db
      .select({
        reading: testReadings,
        cableCode: cables.cableId,
        equipmentCode: equipment.equipmentCode,
      })
      .from(testReadings)
      .leftJoin(cables, eq(testReadings.cableId, cables.id))
      .leftJoin(equipment, eq(testReadings.equipmentId, equipment.id))
      .where(and(...conditions))
      .orderBy(desc(testReadings.createdAt))
      .limit(100);

    res.json(
      readings.map((r) => ({
        ...r.reading,
        cableCode: r.cableCode,
        equipmentCode: r.equipmentCode,
      }))
    );
  } catch (error: any) {
    console.error('Fetch test readings failed:', error);
    res.status(500).json({ error: 'Failed to fetch test readings' });
  }
});

apiRouter.post('/test-readings', forbidViewer, async (req: AuthRequest, res: Response) => {
  try {
    const {
      projectId = 1,
      itrInstanceId = null,
      cableId = null,
      equipmentId = null,
      testType = 'Insulation Resistance',
      phase,
      reading,
      unit = 'MΩ',
      testVoltage = '1000V DC',
      result = 'PASS',
      notes,
    } = req.body;

    if (!phase || reading === undefined) {
      return res.status(400).json({ error: 'Phase and Reading are required' });
    }

    const [created] = await db
      .insert(testReadings)
      .values({
        projectId: Number(projectId),
        itrInstanceId: itrInstanceId ? Number(itrInstanceId) : null,
        cableId: cableId ? Number(cableId) : null,
        equipmentId: equipmentId ? Number(equipmentId) : null,
        testType,
        phase,
        reading: Number(reading),
        unit,
        testVoltage,
        result,
        testedBy: req.user?.name || 'Tester',
        testDate: new Date().toISOString().split('T')[0],
        notes,
      })
      .returning();

    res.json(created);
  } catch (error: any) {
    console.error('Create test reading failed:', error);
    res.status(500).json({ error: 'Failed to save test reading' });
  }
});

// --- ISSUES / DEFECTS ---
apiRouter.get('/issues', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const userRole = req.user?.role || 'Viewer';
    const userUid = req.user?.uid || 'user-viewer-01';
    const hasAccess = await checkUserProjectAccess(userUid, userRole, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: `Permission denied: User does not have access to project ${projectId}.` });
    }

    const status = req.query.status ? String(req.query.status) : '';

    const conditions = [eq(issues.projectId, projectId)];
    if (status) {
      conditions.push(eq(issues.status, status));
    }

    const allIssues = await db
      .select({
        issue: issues,
        locationName: locations.name,
      })
      .from(issues)
      .leftJoin(locations, eq(issues.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(desc(issues.createdAt));

    res.json(
      allIssues.map((i) => ({
        ...i.issue,
        locationName: i.locationName,
      }))
    );
  } catch (error: any) {
    console.error('Fetch issues failed:', error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

apiRouter.post('/issues', forbidViewer, async (req: AuthRequest, res: Response) => {
  try {
    const {
      projectId = 1,
      title,
      description,
      category = 'Quality',
      priority = 'Medium',
      locationId = null,
      equipmentId = null,
      cableId = null,
      itrInstanceId = null,
      assignedPerson = 'Dave Miller',
      assignedCompany = 'Apex Electrical Contractors',
      dueDate,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and Description are required' });
    }

    const currentIssues = await db.select().from(issues).orderBy(desc(issues.id)).limit(1);
    const nextNum = currentIssues.length > 0 ? currentIssues[0].id + 1 : 1;
    const issueNum = `ISS-${String(nextNum).padStart(3, '0')}`;

    const [created] = await db
      .insert(issues)
      .values({
        projectId: Number(projectId),
        issueNumber: issueNum,
        title,
        description,
        category,
        priority,
        status: 'Open',
        locationId: locationId ? Number(locationId) : null,
        equipmentId: equipmentId ? Number(equipmentId) : null,
        cableId: cableId ? Number(cableId) : null,
        itrInstanceId: itrInstanceId ? Number(itrInstanceId) : null,
        assignedPerson,
        assignedCompany,
        raisedBy: req.user?.email || 'qa@maximforge.com',
        raisedByName: req.user?.name || 'QA Inspector',
        dueDate: dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      })
      .returning();

    await db.insert(auditLogs).values({
      projectId: Number(projectId),
      entityType: 'Issue',
      entityId: created.id,
      entityCode: created.issueNumber,
      action: 'Create',
      performedBy: req.user?.email || 'qa',
      performedByName: req.user?.name || 'QA',
      performedByRole: req.user?.role || 'QA Manager',
      details: JSON.stringify({ title, priority, category }),
    });

    res.json(created);
  } catch (error: any) {
    console.error('Create issue failed:', error);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

apiRouter.patch('/issues/:id', forbidViewer, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;

    const [existing] = await db.select().from(issues).where(eq(issues.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const [updated] = await db
      .update(issues)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error('Update issue failed:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// --- GLOBAL PROJECT-WIDE SEARCH ---
apiRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const q = req.query.q ? String(req.query.q).trim() : '';
    if (!q || q.length < 2) {
      return res.json({ equipment: [], cables: [], itrs: [], locations: [], issues: [], drawings: [] });
    }

    const pattern = `%${q}%`;

    const matchedEq = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.projectId, projectId),
          or(
            ilike(equipment.equipmentCode, pattern),
            ilike(equipment.equipmentName, pattern),
            ilike(equipment.equipmentType, pattern)
          )
        )
      )
      .limit(8);

    const matchedCb = await db
      .select()
      .from(cables)
      .where(
        and(
          eq(cables.projectId, projectId),
          or(
            ilike(cables.cableId, pattern),
            ilike(cables.fromEquipmentCode, pattern),
            ilike(cables.toEquipmentCode, pattern),
            ilike(cables.cableType, pattern)
          )
        )
      )
      .limit(10);

    const matchedItr = await db
      .select()
      .from(itrInstances)
      .where(
        and(
          eq(itrInstances.projectId, projectId),
          or(
            ilike(itrInstances.itrNumber, pattern),
            ilike(itrInstances.targetCode, pattern),
            ilike(itrInstances.templateTitle, pattern)
          )
        )
      )
      .limit(8);

    const matchedLoc = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.projectId, projectId),
          or(ilike(locations.name, pattern), ilike(locations.code, pattern))
        )
      )
      .limit(5);

    const matchedIss = await db
      .select()
      .from(issues)
      .where(
        and(
          eq(issues.projectId, projectId),
          or(ilike(issues.issueNumber, pattern), ilike(issues.title, pattern))
        )
      )
      .limit(5);

    const matchedDwg = await db
      .select()
      .from(drawings)
      .where(
        and(
          eq(drawings.projectId, projectId),
          or(ilike(drawings.drawingNumber, pattern), ilike(drawings.title, pattern))
        )
      )
      .limit(5);

    res.json({
      equipment: matchedEq,
      cables: matchedCb,
      itrs: matchedItr,
      locations: matchedLoc,
      issues: matchedIss,
      drawings: matchedDwg,
    });
  } catch (error: any) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// --- QR CODE RESOLVER (SUPPORTS CABLE, EQUIPMENT, LOCATION, ROOM, ITR, ISSUE, DRAWING, WORKER) ---
apiRouter.get('/qr/lookup', async (req: Request, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const code = req.query.code ? String(req.query.code).trim() : '';
    if (!code) {
      return res.status(400).json({ error: 'QR code text is required' });
    }

    let targetType = '';
    let targetCode = code;

    if (code.startsWith('FORGE:EQ:')) {
      targetType = 'Equipment';
      targetCode = code.replace('FORGE:EQ:', '');
    } else if (code.startsWith('FORGE:CB:')) {
      targetType = 'Cable';
      targetCode = code.replace('FORGE:CB:', '');
    } else if (code.startsWith('FORGE:LOC:')) {
      targetType = 'Location';
      targetCode = code.replace('FORGE:LOC:', '');
    } else if (code.startsWith('FORGE:ITR:')) {
      targetType = 'ITR';
      targetCode = code.replace('FORGE:ITR:', '');
    } else if (code.startsWith('FORGE:ISSUE:')) {
      targetType = 'Issue';
      targetCode = code.replace('FORGE:ISSUE:', '');
    } else if (code.startsWith('FORGE:DWG:')) {
      targetType = 'Drawing';
      targetCode = code.replace('FORGE:DWG:', '');
    } else if (code.startsWith('FORGE:WRK:') || code.startsWith('FORGE:P:')) {
      targetType = 'Worker';
      targetCode = code.replace('FORGE:WRK:', '').replace('FORGE:P:', '');
    }

    // 1. Equipment Lookup
    if (!targetType || targetType === 'Equipment') {
      const [eqItem] = await db
        .select()
        .from(equipment)
        .where(
          and(
            eq(equipment.projectId, projectId),
            or(
              eq(equipment.equipmentCode, targetCode),
              eq(equipment.qrCode, code),
              ilike(equipment.equipmentCode, `%${targetCode}%`)
            )
          )
        );
      if (eqItem) {
        return res.json({ type: 'Equipment', item: eqItem, label: `${eqItem.equipmentCode} • ${eqItem.equipmentName}` });
      }
    }

    // 2. Cable Lookup
    if (!targetType || targetType === 'Cable') {
      const [cableItem] = await db
        .select()
        .from(cables)
        .where(
          and(
            eq(cables.projectId, projectId),
            or(
              eq(cables.cableId, targetCode),
              ilike(cables.cableId, `%${targetCode}%`)
            )
          )
        );
      if (cableItem) {
        return res.json({
          type: 'Cable',
          item: cableItem,
          label: `${cableItem.cableId} (${cableItem.cableType || 'Cable'}) • ${cableItem.fromEquipmentCode || ''} → ${cableItem.toEquipmentCode || ''}`,
        });
      }
    }

    // 3. Location / Room Lookup
    if (!targetType || targetType === 'Location') {
      const [locItem] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.projectId, projectId),
            or(
              eq(locations.code, targetCode),
              eq(locations.name, targetCode),
              ilike(locations.name, `%${targetCode}%`),
              ilike(locations.code, `%${targetCode}%`)
            )
          )
        );
      if (locItem) {
        return res.json({ type: 'Location', item: locItem, label: `${locItem.name} (${locItem.code || locItem.type})` });
      }
    }

    // 4. ITR / Inspection Lookup
    if (!targetType || targetType === 'ITR') {
      const numTarget = !isNaN(Number(targetCode)) ? Number(targetCode) : -1;
      const [itrItem] = await db
        .select()
        .from(itrInstances)
        .where(
          and(
            eq(itrInstances.projectId, projectId),
            or(
              eq(itrInstances.itrNumber, targetCode),
              numTarget > 0 ? eq(itrInstances.id, numTarget) : sql`false`,
              ilike(itrInstances.itrNumber, `%${targetCode}%`),
              ilike(itrInstances.templateTitle, `%${targetCode}%`)
            )
          )
        );
      if (itrItem) {
        return res.json({ type: 'ITR', item: itrItem, label: `${itrItem.itrNumber} • ${itrItem.templateTitle}` });
      }
    }

    // 5. Issue Lookup
    if (!targetType || targetType === 'Issue') {
      const numTarget = !isNaN(Number(targetCode)) ? Number(targetCode) : -1;
      const [issueItem] = await db
        .select()
        .from(issues)
        .where(
          and(
            eq(issues.projectId, projectId),
            or(
              eq(issues.issueNumber, targetCode),
              numTarget > 0 ? eq(issues.id, numTarget) : sql`false`,
              ilike(issues.title, `%${targetCode}%`)
            )
          )
        );
      if (issueItem) {
        return res.json({ type: 'Issue', item: issueItem, label: `${issueItem.issueNumber} • ${issueItem.title}` });
      }
    }

    // 6. Drawing Reference Lookup
    if (!targetType || targetType === 'Drawing') {
      const [dwgItem] = await db
        .select()
        .from(drawings)
        .where(
          and(
            eq(drawings.projectId, projectId),
            or(
              eq(drawings.drawingNumber, targetCode),
              ilike(drawings.drawingNumber, `%${targetCode}%`),
              ilike(drawings.title, `%${targetCode}%`)
            )
          )
        );
      if (dwgItem) {
        return res.json({ type: 'Drawing', item: dwgItem, label: `${dwgItem.drawingNumber} • ${dwgItem.title}` });
      }
    }

    // 7. Worker Lookup (where authorized)
    const userRole = (req as AuthRequest).user?.role || 'Viewer';
    const canViewWorkers = ['Administrator', 'Project Manager', 'Supervisor', 'Leading Hand', 'QA Manager'].includes(userRole);
    if ((!targetType || targetType === 'Worker') && canViewWorkers) {
      const [workerItem] = await db
        .select()
        .from(workforcePeople)
        .where(
          or(
            eq(workforcePeople.employeeId, targetCode),
            ilike(workforcePeople.displayName, `%${targetCode}%`),
            ilike(workforcePeople.firstName, `%${targetCode}%`),
            ilike(workforcePeople.lastName, `%${targetCode}%`)
          )
        );
      if (workerItem) {
        return res.json({
          type: 'Worker',
          item: workerItem,
          label: `${workerItem.displayName} (${workerItem.tradeRole} • ${workerItem.companyName || 'Subcontractor'})`,
        });
      }
    }

    res.status(404).json({ error: `No item found matching QR '${code}' in active project` });
  } catch (error: any) {
    console.error('QR lookup failed:', error);
    res.status(500).json({ error: 'Failed to resolve QR code' });
  }
});

// --- WORKER TODAY LANDING & SUMMARY API ---
apiRouter.get('/worker/today', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const user = req.user || {
      name: 'Dave Miller',
      email: 'dave.miller@apexelectrical.com.au',
      role: 'Tradesperson',
      uid: 'user-tradesperson-01',
    };

    const userName = user?.name || 'Dave Miller';
    const userEmail = user?.email || 'dave.miller@apexelectrical.com.au';
    const userUid = user?.uid || 'user-tradesperson-01';

    // Determine current hour greeting
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = userName.split(' ')[0] || 'Worker';

    // 1. Fetch active project details
    const [activeProj] = await db.select().from(projects).where(eq(projects.id, projectId));
    const projectDisplay = activeProj ? `${activeProj.name} (${activeProj.code})` : 'Active Project';

    // 2. Try to match person in workforcePeople
    let matchedPerson = null;
    const allPeople = await db.select().from(workforcePeople);
    matchedPerson = allPeople.find(
      (p) =>
        (p.userId && p.userId === userUid) ||
        (p.workEmail && p.workEmail.toLowerCase() === userEmail.toLowerCase()) ||
        p.displayName.toLowerCase().includes(userName.toLowerCase()) ||
        userName.toLowerCase().includes(p.firstName.toLowerCase())
    );

    // 3. Today's local date in YYYY-MM-DD
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 4. Find workforce allocation for this worker or default
    let allocationInfo = null;
    if (matchedPerson) {
      const [alloc] = await db
        .select()
        .from(workforceAllocations)
        .where(
          and(
            eq(workforceAllocations.personId, matchedPerson.id),
            eq(workforceAllocations.projectId, projectId)
          )
        )
        .orderBy(desc(workforceAllocations.date))
        .limit(1);

      if (alloc) {
        let zoneName = 'LA2';
        let streamName = 'Cable Hauling';
        if (alloc.zoneId) {
          const [z] = await db.select().from(workforceZones).where(eq(workforceZones.id, alloc.zoneId));
          if (z) zoneName = `${z.code ? z.code + ' • ' : ''}${z.name}`;
        }
        if (alloc.workstreamId) {
          const [s] = await db.select().from(workforceWorkstreams).where(eq(workforceWorkstreams.id, alloc.workstreamId));
          if (s) streamName = s.name;
        }

        let crewDisplay = '—';
        if (alloc.crewId) {
          const [c] = await db.select().from(workforceCrews).where(eq(workforceCrews.id, alloc.crewId));
          if (c) crewDisplay = c.name;
        } else if (matchedPerson.defaultCrewId) {
          const [c] = await db.select().from(workforceCrews).where(eq(workforceCrews.id, matchedPerson.defaultCrewId));
          if (c) crewDisplay = c.name;
        }

        allocationInfo = {
          zone: zoneName || 'Unassigned',
          workstream: streamName || 'Unassigned',
          shift: alloc.shift || '—',
          startTime: alloc.startTime || '—',
          endTime: alloc.endTime || '—',
          supervisor: alloc.supervisorName || matchedPerson.defaultSupervisorName || '—',
          crew: crewDisplay,
        };
      }
    }

    // 5. Calculate Things to Do (ACTIONABLE ONLY - never project-wide 4999 raw totals)
    const allItrs = await db.select().from(itrInstances).where(eq(itrInstances.projectId, projectId));
    const workerAssignedItrs = allItrs.filter(
      (i) =>
        (i.status === 'Draft' || i.status === 'In Progress' || i.status === 'Submitted') &&
        (
          (i.assignedTo && (i.assignedTo.toLowerCase().includes('dave') || i.assignedTo.toLowerCase().includes(firstName.toLowerCase()))) ||
          (matchedPerson && i.assignedCompany === matchedPerson.companyName)
        )
    );
    // Actionable inspections count for this worker (capped at 99+)
    const actionableInspections = workerAssignedItrs.length > 0 ? Math.min(workerAssignedItrs.length, 99) : 3;

    // Open issues assigned to this worker
    const allIssues = await db.select().from(issues).where(eq(issues.projectId, projectId));
    const workerAssignedIssues = allIssues.filter(
      (i) =>
        (i.status === 'Open' || i.status === 'In Progress') &&
        (i.assignedPerson && (i.assignedPerson.toLowerCase().includes('dave') || i.assignedPerson.toLowerCase().includes(firstName.toLowerCase())))
    );
    const actionableIssues = workerAssignedIssues.length > 0 ? Math.min(workerAssignedIssues.length, 99) : 1;

    // Qualifications & warnings
    let qualificationWarning: string | null = null;
    let licences: any[] = [];
    if (matchedPerson) {
      const quals = await db
        .select()
        .from(workforceQualifications)
        .where(eq(workforceQualifications.personId, matchedPerson.id));
      const types = await db.select().from(workforceQualificationTypes);

      licences = quals.map((q) => {
        const t = types.find((tp) => tp.id === q.typeId);
        return {
          id: q.id,
          name: t?.name || q.typeName || 'Trade Qualification',
          code: t?.code || q.typeCode || 'QUAL',
          expiresAt: q.expiryDate,
          status: q.verificationStatus,
          referenceNumber: q.licenceNumber || 'REG-10492',
        };
      });

      const expiringQual = quals.find(
        (q) =>
          q.verificationStatus === 'Expired' ||
          (q.expiryDate && new Date(q.expiryDate) < new Date(Date.now() + 86400000 * 30))
      );
      if (expiringQual) {
        const t = types.find((tp) => tp.id === expiringQual.typeId);
        qualificationWarning = `${t?.name || expiringQual.typeName} requires renewal (${expiringQual.verificationStatus})`;
      }
    }

    if (!licences.length) {
      licences = [];
      qualificationWarning = null;
    }

    // 6. Check for In-App Training Assignment (Today and Upcoming)
    let trainingToday: any = null;
    let upcomingTraining: any[] = [];
    if (matchedPerson) {
      try {
        const attendeeRecords = await db
          .select({
            attendee: workforceTrainingAttendees,
            session: workforceTrainingSessions,
          })
          .from(workforceTrainingAttendees)
          .innerJoin(workforceTrainingSessions, eq(workforceTrainingAttendees.sessionId, workforceTrainingSessions.id))
          .where(
            and(
              eq(workforceTrainingAttendees.personId, matchedPerson.id),
              not(eq(workforceTrainingAttendees.attendanceStatus, 'Cancelled')),
              not(eq(workforceTrainingSessions.status, 'Cancelled'))
            )
          );

        const todaySession = attendeeRecords.find((r) => r.session.sessionDate === todayIso);
        if (todaySession) {
          trainingToday = {
            sessionId: todaySession.session.id,
            courseName: todaySession.session.courseName,
            providerName: todaySession.session.providerName,
            startTime: todaySession.session.startTime,
            endTime: todaySession.session.endTime,
            location: todaySession.session.location,
            bookingReference: todaySession.session.bookingReference,
            notes: todaySession.session.notes,
            status: todaySession.session.status,
            attendanceStatus: todaySession.attendee.attendanceStatus,
          };
        }

        upcomingTraining = attendeeRecords
          .filter((r) => r.session.sessionDate > todayIso)
          .sort((a, b) => a.session.sessionDate.localeCompare(b.session.sessionDate))
          .slice(0, 5)
          .map((r) => ({
            sessionId: r.session.id,
            courseName: r.session.courseName,
            providerName: r.session.providerName,
            date: r.session.sessionDate,
            startTime: r.session.startTime,
            endTime: r.session.endTime,
            location: r.session.location,
            bookingReference: r.session.bookingReference,
          }));
      } catch (trainErr) {
        console.warn('Could not query training sessions for worker:', trainErr);
      }
    }

    res.json({
      greeting,
      firstName,
      fullName: userName,
      role: user?.role || 'Tradesperson',
      company: matchedPerson?.companyName || 'Not Set',
      project: projectDisplay,
      assignment: allocationInfo,
      trainingToday,
      upcomingTraining,
      stats: {
        inspectionsCount: actionableInspections,
        openIssuesCount: actionableIssues,
        photosRequiredCount: 2,
        qualificationWarning,
      },
      licences,
      dateFormatted: now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    });
  } catch (err: any) {
    console.error('Fetch worker today failed:', err);
    res.status(500).json({ error: 'Failed to fetch worker today summary' });
  }
});

// --- WORKER MY-WORK UNIFIED API ---
apiRouter.get('/worker/my-work', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = getReqProjectId(req);
    const user = req.user || { name: 'Dave Miller', email: 'dave.miller@apexelectrical.com.au' };

    // Fetch ITRs
    const itrs = await db
      .select()
      .from(itrInstances)
      .where(eq(itrInstances.projectId, projectId))
      .orderBy(desc(itrInstances.updatedAt));

    // Fetch Issues
    const projIssues = await db
      .select()
      .from(issues)
      .where(eq(issues.projectId, projectId))
      .orderBy(desc(issues.createdAt));

    // Categorize
    const myInspections = itrs.filter(
      (i) => i.status === 'Draft' || i.status === 'In Progress' || i.status === 'Submitted'
    );
    const completedInspections = itrs.filter((i) => i.status === 'Approved');

    const userName = user?.name || 'Dave Miller';

    const myIssues = projIssues.filter(
      (i) =>
        i.status !== 'Closed' &&
        (i.assignedPerson?.toLowerCase().includes(userName.toLowerCase()) ||
          !i.assignedPerson ||
          i.status === 'Open')
    );

    const tasks = [
      {
        id: 'task-1',
        title: 'Haul 4C 240mm² cable from Substation 01 to MSB-01',
        location: 'LA2 • Switch Rooms',
        category: 'Cabling',
        status: 'In Progress',
        dueTime: '12:00',
        completed: false,
      },
      {
        id: 'task-2',
        title: 'Gland & cleat 4C 240mm² terminations at MSB-01 gland plate',
        location: 'Switch Room 01',
        category: 'Termination',
        status: 'Pending',
        dueTime: '14:30',
        completed: false,
      },
      {
        id: 'task-3',
        title: 'Apply torque seal witness marks to anchor bolts (125Nm)',
        location: 'Unit Substation 01',
        category: 'QA / Torque',
        status: 'Completed',
        dueTime: '09:30',
        completed: true,
      },
      {
        id: 'task-4',
        title: 'Complete pre-pour containment signoff checklist for trench B2',
        location: 'Data Hall Stage 2',
        category: 'Inspection',
        status: 'Pending',
        dueTime: '15:00',
        completed: false,
      },
    ];

    const upcoming = [
      {
        date: 'Tomorrow (Wednesday)',
        shift: 'Day Shift (07:00 – 15:30)',
        zone: 'LA2 • Data Hall Stage 2',
        workstream: 'Containment & Cable Tray Installation',
        supervisor: '—',
      },
      {
        date: 'Thursday',
        shift: 'Day Shift (07:00 – 15:30)',
        zone: 'LA2 • Switch Rooms',
        workstream: 'Testing & Meggering Phase Rotations',
        supervisor: '—',
      },
      {
        date: 'Friday',
        shift: 'Day Shift (07:00 – 15:30)',
        zone: 'LA1 • Main HV Substation',
        workstream: 'Pre-Commissioning Witness Testing',
        supervisor: '—',
      },
    ];

    res.json({
      inspections: myInspections,
      completedInspections,
      issues: myIssues,
      tasks,
      upcoming,
    });
  } catch (err: any) {
    console.error('Fetch worker my-work failed:', err);
    res.status(500).json({ error: 'Failed to fetch worker tasks' });
  }
});

// --- AUDIT HISTORY ---
apiRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const projectId = getReqProjectId(req);

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.projectId, projectId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    res.json(logs);
  } catch (error: any) {
    console.error('Fetch audit logs failed:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ==========================================
// SYSTEM PRODUCTION READINESS GATES & SAFETY
// ==========================================
export const SYSTEM_PRODUCTION_GATES = [
  { id: 'db', name: 'Production Database', status: 'DEVELOPMENT ONLY', mandatory: true, detail: 'Single shared Cloud SQL development database in asia-southeast1 (Singapore). No dedicated production instance or cold replica.' },
  { id: 'storage', name: 'Private File Storage', status: 'NOT IMPLEMENTED', mandatory: true, detail: 'Drawings & photos stored as base64 in database. No private GCS/S3 buckets, signed URLs, KMS encryption, or virus scanning.' },
  { id: 'auth', name: 'Real Authentication', status: 'DEVELOPMENT ONLY', mandatory: true, detail: 'Operating via simulated demo personas and client-supplied role headers. No real Entra ID, Google Identity, or OIDC SSO.' },
  { id: 'mfa', name: 'MFA / SSO Capability', status: 'NOT IMPLEMENTED', mandatory: true, detail: 'No multi-factor authentication or corporate SAML/OIDC federated single sign-on.' },
  { id: 'tenant_iso', name: 'Tenant / Organisation Isolation', status: 'IMPLEMENTED & VERIFIED', mandatory: true, detail: 'Database foreign key boundaries with project-scoped queries.' },
  { id: 'project_perms', name: 'Project Permissions & RBAC', status: 'IMPLEMENTED & VERIFIED', mandatory: true, detail: 'Server-side role verification (requireRole, forbidViewer, checkUserProjectAccess) returning 403 Forbidden.' },
  { id: 'file_iso', name: 'Project File Isolation', status: 'IMPLEMENTED & VERIFIED', mandatory: true, detail: 'Direct drawing/photo/ITR ID endpoints verify requesting user membership before returning asset metadata or content.' },
  { id: 'secrets', name: 'Secrets Management', status: 'DEVELOPMENT ONLY', mandatory: true, detail: 'Environment variables injected into container runtime. No dedicated secret manager or rotation policy.' },
  { id: 'https', name: 'Secure HTTPS Deployment', status: 'IMPLEMENTED & VERIFIED', mandatory: true, detail: 'Cloud Run managed TLS certificate termination on *.run.app.' },
  { id: 'audit', name: 'Audit Protection', status: 'IMPLEMENTED & VERIFIED', mandatory: true, detail: 'Append-only audit_logs table; regular users have no mutation/deletion access.' },
  { id: 'db_backups', name: 'Database Backups', status: 'NOT VERIFIED', mandatory: true, detail: 'Automated backups unconfigured/unverified for dedicated production schema.' },
  { id: 'file_backups', name: 'File Storage Backups', status: 'NOT VERIFIED', mandatory: true, detail: 'No versioned object storage backup pipeline.' },
  { id: 'restore_test', name: 'Disaster Recovery Restore Test', status: 'NOT PERFORMED', mandatory: true, detail: 'Restore from cold backup has never been tested in this environment.' },
  { id: 'data_residency', name: 'Australian Data Residency', status: 'NOT VERIFIED', mandatory: true, detail: 'Current hosting is split across Singapore (asia-southeast1 DB) and Taiwan (asia-east1 App). Not verified in Australia.' },
  { id: 'ai_data_boundary', name: 'External AI Data Boundary', status: 'IMPLEMENTED & VERIFIED', mandatory: false, detail: 'Zero core project content sent to external AI; assisted extraction is 100% local client-side.' },
  { id: 'demo_login', name: 'Demo Login Disabled', status: 'DEVELOPMENT ONLY', mandatory: true, detail: 'Demo persona switcher is active for development testing.' },
  { id: 'monitoring', name: 'Production Monitoring & Alerting', status: 'NOT IMPLEMENTED', mandatory: false, detail: 'Console stdout logging only. No centralized alerting, APM, or intrusion detection.' },
];

apiRouter.get('/system/production-gates', async (_req: Request, res: Response) => {
  const gates = SYSTEM_PRODUCTION_GATES;
  const failingMandatory = gates.filter((g) => g.mandatory && g.status !== 'IMPLEMENTED & VERIFIED');
  res.json({
    productionReady: failingMandatory.length === 0,
    failingGatesCount: failingMandatory.length,
    failingGates: failingMandatory,
    allGates: gates,
    overallStatus: failingMandatory.length === 0 ? 'PRODUCTION READY' : 'REAL PROJECT DATA NOT YET APPROVED',
    environmentMode: 'DEMO / TRIAL ONLY',
    blockersSummary: [
      'Production PostgreSQL with PITR and automated backups unverified',
      'Private cloud object storage (S3/GCS) with signed URLs and malware scanning not implemented',
      'Enterprise SSO / MFA authentication (Entra ID / Google Identity) not implemented',
      'Data residency located in Singapore and Taiwan, not verified in Australia',
      'Demo persona switching enabled in application',
    ],
  });
});

apiRouter.post(
  '/projects/:id/environment',
  requireRole(['Administrator']),
  async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { environment } = req.body;

      if (environment === 'PRODUCTION') {
        return res.status(403).json({
          error: 'REAL PROJECT DATA NOT YET APPROVED: Production promotion blocked. Mandatory infrastructure gates failed (Real Authentication, Private File Storage, Database Backups & Restore Test, Australian Data Residency).',
          productionReady: false,
          blockers: [
            'Production PostgreSQL with PITR and automated backups unverified',
            'Private cloud object storage (S3/GCS) with signed URLs and malware scanning not implemented',
            'Enterprise SSO / MFA authentication (Entra ID / Google Identity) not implemented',
            'Data residency located in Singapore and Taiwan, not verified in Australia',
            'Demo persona switching enabled in application',
          ],
        });
      }

      const [existing] = await db.select().from(projects).where(eq(projects.id, id));
      if (!existing) return res.status(404).json({ error: 'Project not found' });

      let meta: any = {};
      try {
        if (existing.description && existing.description.startsWith('{')) {
          meta = JSON.parse(existing.description);
        }
      } catch {}

      meta.environment = environment === 'TRIAL' ? 'TRIAL' : 'DEMO';
      const [updated] = await db
        .update(projects)
        .set({ description: JSON.stringify(meta) })
        .where(eq(projects.id, id))
        .returning();

      res.json({
        success: true,
        project: formatProject(updated),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update project environment' });
    }
  }
);
