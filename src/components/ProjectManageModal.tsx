import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Building2,
  X,
  Plus,
  Layers,
  Cpu,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Trash2,
  FolderTree,
  Check,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Info,
  Rocket,
  Cable,
  Map,
  Users,
  FileText,
  UserCheck,
  Eye,
  Shield,
  HelpCircle,
  ClipboardCheck,
} from 'lucide-react';
import {
  parseSpreadsheetFile,
  autoDetectLocationColumns,
  parseAndValidateLocations,
  autoDetectEquipmentColumns,
  parseAndValidateEquipment,
  autoDetectCableColumns,
  parseAndValidateCables,
  downloadCsvFile,
  LOCATION_TEMPLATE_2TIER,
  LOCATION_TEMPLATE_4TIER,
  EQUIPMENT_TEMPLATE,
  CABLE_SCHEDULE_TEMPLATE,
  generateMel04AcceptanceDataset,
  StagedLocationItem,
  StagedEquipmentItem,
  StagedCableItem,
} from '../lib/spreadsheetParser.ts';
import {
  CompanyOnboardingItem,
  UserOnboardingItem,
  StagedDrawingItem,
  ItrTemplateOption,
  ProjectOnboardingPayload,
} from '../types/index.ts';

const TIMEZONE_OPTIONS = [
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST / AEDT UTC+10/+11)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST / AEDT UTC+10/+11)' },
  { value: 'Australia/Brisbane', label: 'Australia/Brisbane (AEST UTC+10)' },
  { value: 'Australia/Perth', label: 'Australia/Perth (AWST UTC+8)' },
  { value: 'Australia/Adelaide', label: 'Australia/Adelaide (ACST / ACDT UTC+9:30)' },
  { value: 'Pacific/Auckland', label: 'New Zealand / Auckland (NZST / NZDT UTC+12/+13)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT UTC+8)' },
  { value: 'Europe/London', label: 'United Kingdom / London (GMT / BST UTC+0/+1)' },
  { value: 'America/New_York', label: 'US Eastern / New York (EST / EDT UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'US Pacific / Los Angeles (PST / PDT UTC-8/-7)' },
  { value: 'UTC', label: 'Universal Coordinated Time (UTC)' },
];

const PROJECT_STATUS_OPTIONS = [
  'Pre-Construction',
  'Active',
  'Commissioning',
  'Handover',
  'On Hold',
  'Completed',
  'Archived',
];

const COMPANY_TYPES = [
  'Principal Contractor',
  'Electrical Contractor',
  'Mechanical Contractor',
  'Fire Contractor',
  'Consultant',
  'Client',
  'Subcontractor',
  'Other',
];

const USER_ROLES = [
  'Administrator',
  'Project Manager',
  'QA Manager',
  'Supervisor',
  'Leading Hand',
  'Tradesperson',
  'Client',
  'Viewer',
];

export const ProjectManageModal: React.FC = () => {
  const {
    isProjectManageModalOpen,
    setIsProjectManageModalOpen,
    fetchProjects,
    switchProject,
    setActiveTab,
    setProjectReadinessData,
    addToast,
    apiFetch,
    currentUser,
  } = useApp();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);

  // ==========================================
  // STEP 1: PROJECT DETAILS STATE
  // ==========================================
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [client, setClient] = useState('');
  const [principalContractor, setPrincipalContractor] = useState('');
  const [status, setStatus] = useState('Active');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState('Australia/Melbourne');
  const [startDate, setStartDate] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // ==========================================
  // STEP 2: LOCATION STRUCTURE STATE
  // ==========================================
  const [locationTab, setLocationTab] = useState<'import' | 'manual'>('import');
  const [stagedLocations, setStagedLocations] = useState<StagedLocationItem[]>([]);
  const [locRawRows, setLocRawRows] = useState<Record<string, any>[]>([]);
  const [locHeaders, setLocHeaders] = useState<string[]>([]);
  const [locMapping, setLocMapping] = useState<Record<string, string>>({
    levelCode: '',
    levelName: '',
    roomCode: '',
    roomName: '',
    buildingCode: '',
    buildingName: '',
    zoneCode: '',
    zoneName: '',
    areaCode: '',
    areaName: '',
  });
  const [locCounts, setLocCounts] = useState({ buildings: 0, levels: 0, zones: 0, rooms: 0, areas: 0, total: 0 });
  const [locErrors, setLocErrors] = useState<string[]>([]);
  const [locWarnings, setLocWarnings] = useState<string[]>([]);
  const [locDuplicates, setLocDuplicates] = useState<string[]>([]);

  // Manual location node form
  const [manualLocType, setManualLocType] = useState<StagedLocationItem['type']>('Level');
  const [manualLocCode, setManualLocCode] = useState('');
  const [manualLocName, setManualLocName] = useState('');
  const [manualLocParent, setManualLocParent] = useState('');

  // ==========================================
  // STEP 3: EQUIPMENT STATE
  // ==========================================
  const [equipmentTab, setEquipmentTab] = useState<'import' | 'manual'>('import');
  const [stagedEquipment, setStagedEquipment] = useState<StagedEquipmentItem[]>([]);
  const [eqRawRows, setEqRawRows] = useState<Record<string, any>[]>([]);
  const [eqHeaders, setEqHeaders] = useState<string[]>([]);
  const [eqMapping, setEqMapping] = useState<Record<string, string>>({});
  const [eqSummary, setEqSummary] = useState({ total: 0, valid: 0, warningsCount: 0, errorsCount: 0, duplicatesCount: 0 });
  const [eqErrors, setEqErrors] = useState<string[]>([]);
  const [eqWarnings, setEqWarnings] = useState<string[]>([]);
  const [eqDuplicates, setEqDuplicates] = useState<string[]>([]);

  // Manual equipment form
  const [manualEqCode, setManualEqCode] = useState('');
  const [manualEqName, setManualEqName] = useState('');
  const [manualEqType, setManualEqType] = useState('Switchboard');
  const [manualEqLoc, setManualEqLoc] = useState('');
  const [manualEqSys, setManualEqSys] = useState('LV Power');
  const [manualEqMfr, setManualEqMfr] = useState('');
  const [manualEqModel, setManualEqModel] = useState('');
  const [manualEqCompany, setManualEqCompany] = useState('');

  // ==========================================
  // STEP 4: CABLE SCHEDULE STATE
  // ==========================================
  const [cableTab, setCableTab] = useState<'import' | 'manual'>('import');
  const [stagedCables, setStagedCables] = useState<StagedCableItem[]>([]);
  const [cableRawRows, setCableRawRows] = useState<Record<string, any>[]>([]);
  const [cableHeaders, setCableHeaders] = useState<string[]>([]);
  const [cableMapping, setCableMapping] = useState<Record<string, string>>({});
  const [cableSummary, setCableSummary] = useState({ total: 0, valid: 0, warningsCount: 0, errorsCount: 0, duplicatesCount: 0 });
  const [cableErrors, setCableErrors] = useState<string[]>([]);
  const [cableWarnings, setCableWarnings] = useState<string[]>([]);
  const [cableDuplicates, setCableDuplicates] = useState<string[]>([]);

  // Manual cable form
  const [manualCableId, setManualCableId] = useState('');
  const [manualFromEq, setManualFromEq] = useState('');
  const [manualToEq, setManualToEq] = useState('');
  const [manualCableLoc, setManualCableLoc] = useState('');
  const [manualCableSys, setManualCableSys] = useState('LV Power');
  const [manualCableType, setManualCableType] = useState('4C 240mm² Cu XLPE');
  const [manualCableSize, setManualCableSize] = useState('240mm²');
  const [manualCableLength, setManualCableLength] = useState<number | ''>(45);
  const [manualCableCompany, setManualCableCompany] = useState('');

  // ==========================================
  // STEP 5: QA / ITR SETUP STATE
  // ==========================================
  const [qaTemplates, setQaTemplates] = useState<ItrTemplateOption[]>([
    {
      code: 'ITR-CAB-01',
      title: 'Cable Installation & Containment Inspection',
      version: '1.0',
      discipline: 'Electrical',
      targetType: 'Cable',
      description: 'Physical cable pull, ladder tray containment fill ratio, cleat spacing, and transit fire penetration seals verification.',
      selected: false,
      matchingCount: 0,
      proposedCount: 0,
    },
    {
      code: 'ITR-209',
      title: 'Cable Testing & Insulation Resistance (Megger) / ITR 209',
      version: '2.1',
      discipline: 'Electrical',
      targetType: 'Cable',
      description: 'Pre-energisation 1000V DC insulation resistance (IR), conductor continuity, phase rotation, and gland torque inspection.',
      selected: false,
      matchingCount: 0,
      proposedCount: 0,
    },
    {
      code: 'ITR-SW-01',
      title: 'Main Switchboard & DB Mechanical & Torque Verification',
      version: '1.2',
      discipline: 'Electrical',
      targetType: 'Equipment',
      description: 'Plinth mounting, internal swarf cleanup, busbar bolted joint torque calibration marks, and IP rating signoff.',
      selected: false,
      matchingCount: 0,
      proposedCount: 0,
    },
    {
      code: 'ITR-EQ-01',
      title: 'General Electrical Equipment Pre-Commissioning',
      version: '1.0',
      discipline: 'Electrical',
      targetType: 'Equipment',
      description: 'Equipment anchoring, protective earth bonding sizing, clearance compliance, and nameplate rating verification.',
      selected: false,
      matchingCount: 0,
      proposedCount: 0,
    },
  ]);
  const [qaExecutionOption, setQaExecutionOption] = useState<'GENERATE_NOW' | 'CONFIGURE_ONLY'>('GENERATE_NOW');

  // Update QA matching counts whenever staged equipment or cables change
  useEffect(() => {
    setQaTemplates((prev) =>
      prev.map((tpl) => {
        const matchingCount =
          tpl.targetType === 'Cable'
            ? stagedCables.length
            : tpl.targetType === 'Equipment'
            ? stagedEquipment.length
            : 0;
        return {
          ...tpl,
          matchingCount,
          proposedCount: tpl.selected ? matchingCount : 0,
        };
      })
    );
  }, [stagedCables.length, stagedEquipment.length]);

  // ==========================================
  // STEP 6: DRAWINGS & LEVEL PLANS STATE
  // ==========================================
  const [drawingsMode, setDrawingsMode] = useState<'SKIP' | 'UPLOAD'>('UPLOAD');
  const [stagedDrawings, setStagedDrawings] = useState<StagedDrawingItem[]>([]);
  const [newDwgNumber, setNewDwgNumber] = useState('A-201');
  const [newDwgTitle, setNewDwgTitle] = useState('Level 02 General Arrangement Plan');
  const [newDwgRevision, setNewDwgRevision] = useState('Rev A');
  const [newDwgDiscipline, setNewDwgDiscipline] = useState('Architectural');
  const [newDwgBuilding, setNewDwgBuilding] = useState('');
  const [newDwgLevel, setNewDwgLevel] = useState('Level 02');
  const [newDwgStatus, setNewDwgStatus] = useState('Issued for Construction');
  const [newDwgFileUrl, setNewDwgFileUrl] = useState('');
  const [newDwgFileName, setNewDwgFileName] = useState('');
  const [newDwgPageNumber, setNewDwgPageNumber] = useState(1);
  const [newDwgPageCount, setNewDwgPageCount] = useState(1);
  const [newDwgHotspots, setNewDwgHotspots] = useState<any[]>([]);

  // Room mapping quick drawer in Step 6
  const [selectedRoomToMap, setSelectedRoomToMap] = useState('');

  // ==========================================
  // STEP 7: PEOPLE & COMPANIES STATE
  // ==========================================
  const [stagedCompanies, setStagedCompanies] = useState<CompanyOnboardingItem[]>([]);
  const [stagedUsers, setStagedUsers] = useState<UserOnboardingItem[]>([]);

  // Company addition form
  const [newCompName, setNewCompName] = useState('');
  const [newCompType, setNewCompType] = useState('Electrical Contractor');
  const [newCompAbn, setNewCompAbn] = useState('');
  const [newCompContact, setNewCompContact] = useState('');
  const [newCompEmail, setNewCompEmail] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');

  // User addition form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Administrator' | 'Project Manager' | 'QA Manager' | 'Supervisor' | 'Leading Hand' | 'Tradesperson' | 'Client' | 'Viewer'>('Tradesperson');

  // Sync initial companies with Step 1 entries when reaching Step 7
  useEffect(() => {
    if (stagedCompanies.length === 0 && (principalContractor || client || organisation)) {
      const initial: CompanyOnboardingItem[] = [];
      if (principalContractor) {
        initial.push({ name: principalContractor, type: 'Principal Contractor', status: 'Active' });
      }
      if (client && !initial.some((c) => c.name.toLowerCase() === client.toLowerCase())) {
        initial.push({ name: client, type: 'Client', status: 'Active' });
      }
      if (organisation && !initial.some((c) => c.name.toLowerCase() === organisation.toLowerCase())) {
        initial.push({ name: organisation, type: 'Consultant', status: 'Active' });
      }
      setStagedCompanies(initial);
      if (initial[0] && !newUserCompany) {
        setNewUserCompany(initial[0].name);
      }
    }
  }, [principalContractor, client, organisation, currentStep]);

  // Initial user default (current user as Administrator)
  useEffect(() => {
    if (stagedUsers.length === 0 && currentUser) {
      setStagedUsers([
        {
          name: currentUser.name,
          email: currentUser.email,
          companyName: principalContractor || currentUser.companyName || 'Principal Contractor',
          role: 'Administrator',
          status: 'Pending / Not Invited',
        },
      ]);
    }
  }, [currentUser, principalContractor]);

  // ==========================================
  // SUBMISSION & PROGRESS
  // ==========================================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState('');

  // Set of available location codes
  const availableLocationCodes = new Set(stagedLocations.map((l) => l.code));
  const availableEquipmentCodes = new Set(stagedEquipment.map((e) => e.equipmentCode));

  // Available levels for drawings dropdown
  const stagedLevels = stagedLocations.filter((l) => l.type === 'Level');
  const stagedRooms = stagedLocations.filter((l) => l.type === 'Room');

  // Pre-populate level select if available
  useEffect(() => {
    if (stagedLevels.length > 0 && !newDwgLevel) {
      setNewDwgLevel(stagedLevels[0].name || stagedLevels[0].code);
    }
  }, [stagedLevels]);

  // ==========================================
  // ACCEPTANCE TEST QUICK LOAD PRESET (MEL04)
  // ==========================================
  const handleLoadAcceptanceTestDataset = () => {
    // Step 1
    setName('DC Melbourne 04');
    setCode('MEL04');
    setOrganisation('Example Construction Group');
    setClient('Example Data Centres');
    setPrincipalContractor('Example Construction Group');
    setStatus('Active');
    setLocation('Melbourne, Victoria');
    setTimezone('Australia/Melbourne');
    setStartDate('2026-11-01');
    setExpectedCompletionDate('2027-12-31');
    setDescription('Hyperscale Data Centre Build - Stage 4 Electrical & Containment Delivery');

    // Load generated dataset (3 Levels, 12 Rooms, 10 Equipment, 150 Cables, Companies, Users)
    const dataset = generateMel04AcceptanceDataset();

    setStagedLocations(dataset.locations);
    setLocCounts({
      buildings: 0,
      levels: 3,
      zones: 0,
      rooms: 12,
      areas: 0,
      total: 15,
    });
    setLocErrors([]);
    setLocWarnings([]);
    setLocDuplicates([]);

    setStagedEquipment(dataset.equipment);
    setEqSummary({
      total: 10,
      valid: 10,
      warningsCount: 0,
      errorsCount: 0,
      duplicatesCount: 0,
    });
    setEqErrors([]);
    setEqWarnings([]);

    setStagedCables(dataset.cables);
    setCableSummary({
      total: 150,
      valid: 150,
      warningsCount: 0,
      errorsCount: 0,
      duplicatesCount: 0,
    });
    setCableErrors([]);
    setCableWarnings([]);
    setCableDuplicates([]);

    // Step 5 QA Templates: Select Cable Installation ITR & Cable Testing ITR explicitly
    setQaTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.code === 'ITR-CAB-01' || tpl.code === 'ITR-209') {
          return { ...tpl, selected: true, matchingCount: 150, proposedCount: 150 };
        }
        return { ...tpl, selected: false, matchingCount: tpl.targetType === 'Equipment' ? 10 : 0, proposedCount: 0 };
      })
    );
    setQaExecutionOption('GENERATE_NOW');

    // Step 6 Drawing: 1 Fictional PDF Drawing assigned to Level 02 with 2 mapped rooms
    const sampleDrawing: StagedDrawingItem = {
      drawingNumber: 'A-201',
      title: 'Level 02 General Arrangement Plan',
      revision: 'Rev A',
      discipline: 'Architectural',
      building: 'Main Facility',
      levelName: 'Level 02',
      status: 'Issued for Construction',
      fileName: 'MEL04_L02_Architectural_FloorPlan.pdf',
      fileUrl: 'data:application/pdf;base64,JVBERi0xLjQKJUZpY3Rpb25hbF9QREZfRHJhd2luZ19GT1JfVEVTVElOR19PTkxZ',
      pageNumber: 1,
      pageCount: 1,
      hotspots: [
        {
          id: 'hp-l02-sr01',
          locationId: 0,
          locationCode: 'L02-SR01',
          locationName: 'Switch Room 02',
          type: 'polygon',
          polygon: [
            { x: 12.5, y: 15.0 },
            { x: 34.0, y: 15.0 },
            { x: 34.0, y: 48.0 },
            { x: 12.5, y: 48.0 },
          ],
        },
        {
          id: 'hp-l02-ups01',
          locationId: 0,
          locationCode: 'L02-UPS01',
          locationName: 'UPS & Battery Room 02',
          type: 'polygon',
          polygon: [
            { x: 38.0, y: 15.0 },
            { x: 62.0, y: 15.0 },
            { x: 62.0, y: 48.0 },
            { x: 38.0, y: 48.0 },
          ],
        },
      ],
    };
    setStagedDrawings([sampleDrawing]);
    setDrawingsMode('UPLOAD');

    // Step 7: Companies & Users
    setStagedCompanies(dataset.companies);
    setStagedUsers(dataset.users);

    addToast(
      'success',
      'Acceptance Dataset Loaded',
      'Configured DC Melbourne 04 (MEL04): 3 Levels, 12 Rooms, 10 Equipment, 150 Cables, 2 ITRs, 1 PDF Drawing (Level 02, 2 mapped rooms), 5 Companies, 4 Users.'
    );
  };

  // ==========================================
  // STEP 1 HANDLERS
  // ==========================================
  const handleStep1Next = () => {
    if (!name.trim()) {
      addToast('error', 'Project Name Required', 'Please enter a valid construction project name.');
      return;
    }
    if (!code.trim()) {
      addToast('error', 'Project Code Required', 'Please enter a project code (e.g., MEL04).');
      return;
    }
    if (!organisation.trim()) {
      addToast('error', 'Organisation Required', 'Organisation is a required separate field.');
      return;
    }
    if (!client.trim()) {
      addToast('error', 'Client Required', 'Client is a required separate field.');
      return;
    }
    if (!principalContractor.trim()) {
      addToast('error', 'Principal Contractor Required', 'Principal Contractor is a required separate field.');
      return;
    }
    setCurrentStep(2);
  };

  // ==========================================
  // STEP 2 HANDLERS (LOCATIONS)
  // ==========================================
  const handleLocationFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseSpreadsheetFile(file);
      setLocHeaders(data.headers);
      setLocRawRows(data.rows);

      const autoMap = autoDetectLocationColumns(data.headers);
      setLocMapping(autoMap);

      const parsed = parseAndValidateLocations(data.rows, autoMap);
      setStagedLocations(parsed.stagedLocations);
      setLocCounts(parsed.counts);
      setLocErrors(parsed.errors);
      setLocWarnings(parsed.warnings);
      setLocDuplicates(parsed.duplicates);

      addToast(
        'success',
        'File Processed',
        `Parsed ${parsed.stagedLocations.length} locations (${parsed.counts.levels} levels, ${parsed.counts.rooms} rooms) from ${file.name}`
      );
    } catch (err: any) {
      addToast('error', 'Parse Failed', err.message || 'Failed to read file');
    }
  };

  const handleApplyLocationMapping = () => {
    if (locRawRows.length === 0) return;
    const parsed = parseAndValidateLocations(locRawRows, locMapping);
    setStagedLocations(parsed.stagedLocations);
    setLocCounts(parsed.counts);
    setLocErrors(parsed.errors);
    setLocWarnings(parsed.warnings);
    setLocDuplicates(parsed.duplicates);
    addToast('info', 'Mapping Updated', `Re-evaluated ${parsed.stagedLocations.length} locations.`);
  };

  const handleAddManualLocation = () => {
    if (!manualLocCode.trim() || !manualLocName.trim()) {
      addToast('error', 'Missing Information', 'Location code and name are required.');
      return;
    }
    const cleanCode = manualLocCode.trim().toUpperCase();
    if (availableLocationCodes.has(cleanCode)) {
      addToast('error', 'Duplicate Code', `Location code '${cleanCode}' already exists.`);
      return;
    }

    const newItem: StagedLocationItem = {
      code: cleanCode,
      name: manualLocName.trim(),
      type: manualLocType,
      parentCode: manualLocParent.trim() ? manualLocParent.trim().toUpperCase() : null,
      sequence: stagedLocations.length + 1,
      status: 'valid',
    };

    const updated = [...stagedLocations, newItem];
    setStagedLocations(updated);
    setLocCounts({
      buildings: updated.filter((l) => l.type === 'Building').length,
      levels: updated.filter((l) => l.type === 'Level').length,
      zones: updated.filter((l) => l.type === 'Zone').length,
      rooms: updated.filter((l) => l.type === 'Room').length,
      areas: updated.filter((l) => l.type === 'Area').length,
      total: updated.length,
    });

    setManualLocCode('');
    setManualLocName('');
    addToast('success', 'Location Added', `Added ${newItem.name} (${newItem.code})`);
  };

  const handleRemoveStagedLocation = (codeToRemove: string) => {
    const updated = stagedLocations.filter((l) => l.code !== codeToRemove);
    setStagedLocations(updated);
    setLocCounts({
      buildings: updated.filter((l) => l.type === 'Building').length,
      levels: updated.filter((l) => l.type === 'Level').length,
      zones: updated.filter((l) => l.type === 'Zone').length,
      rooms: updated.filter((l) => l.type === 'Room').length,
      areas: updated.filter((l) => l.type === 'Area').length,
      total: updated.length,
    });
  };

  // ==========================================
  // STEP 3 HANDLERS (EQUIPMENT)
  // ==========================================
  const handleEquipmentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseSpreadsheetFile(file);
      setEqHeaders(data.headers);
      setEqRawRows(data.rows);

      const autoMap = autoDetectEquipmentColumns(data.headers);
      setEqMapping(autoMap);

      const parsed = parseAndValidateEquipment(data.rows, autoMap, availableLocationCodes);
      setStagedEquipment(parsed.stagedEquipment);
      setEqSummary({ ...parsed.summary, duplicatesCount: parsed.duplicates.length });
      setEqErrors(parsed.errors);
      setEqWarnings(parsed.warnings);
      setEqDuplicates(parsed.duplicates);

      addToast(
        'success',
        'Equipment File Processed',
        `Parsed ${parsed.stagedEquipment.length} equipment items from ${file.name}`
      );
    } catch (err: any) {
      addToast('error', 'Parse Failed', err.message || 'Failed to read file');
    }
  };

  const handleApplyEquipmentMapping = () => {
    if (eqRawRows.length === 0) return;
    const parsed = parseAndValidateEquipment(eqRawRows, eqMapping, availableLocationCodes);
    setStagedEquipment(parsed.stagedEquipment);
    setEqSummary({ ...parsed.summary, duplicatesCount: parsed.duplicates.length });
    setEqErrors(parsed.errors);
    setEqWarnings(parsed.warnings);
    setEqDuplicates(parsed.duplicates);
    addToast('info', 'Mapping Updated', `Re-evaluated ${parsed.stagedEquipment.length} equipment items.`);
  };

  const handleAddManualEquipment = () => {
    if (!manualEqCode.trim() || !manualEqName.trim() || !manualEqLoc.trim()) {
      addToast('error', 'Missing Information', 'Equipment code, name, and location code are required.');
      return;
    }
    const cleanCode = manualEqCode.trim().toUpperCase();
    const cleanLoc = manualEqLoc.trim().toUpperCase();

    if (availableEquipmentCodes.has(cleanCode)) {
      addToast('error', 'Duplicate Code', `Equipment code '${cleanCode}' already exists.`);
      return;
    }

    const locValid = availableLocationCodes.size === 0 || availableLocationCodes.has(cleanLoc);
    const newItem: StagedEquipmentItem = {
      equipmentCode: cleanCode,
      equipmentName: manualEqName.trim(),
      equipmentType: manualEqType,
      locationCode: cleanLoc,
      system: manualEqSys,
      manufacturer: manualEqMfr.trim() || undefined,
      model: manualEqModel.trim() || undefined,
      responsibleCompany: manualEqCompany.trim() || principalContractor || 'Not Set',
      validationStatus: locValid ? 'valid' : 'warning',
      validationMessage: locValid ? undefined : `Location '${cleanLoc}' not found in location list`,
    };

    const updated = [...stagedEquipment, newItem];
    setStagedEquipment(updated);
    setEqSummary({
      total: updated.length,
      valid: updated.filter((e) => e.validationStatus === 'valid').length,
      warningsCount: updated.filter((e) => e.validationStatus === 'warning').length,
      errorsCount: updated.filter((e) => e.validationStatus === 'error').length,
      duplicatesCount: 0,
    });

    setManualEqCode('');
    setManualEqName('');
    addToast('success', 'Equipment Added', `Added ${newItem.equipmentName} (${newItem.equipmentCode})`);
  };

  const handleRemoveStagedEquipment = (codeToRemove: string) => {
    const updated = stagedEquipment.filter((e) => e.equipmentCode !== codeToRemove);
    setStagedEquipment(updated);
    setEqSummary({
      total: updated.length,
      valid: updated.filter((e) => e.validationStatus === 'valid').length,
      warningsCount: updated.filter((e) => e.validationStatus === 'warning').length,
      errorsCount: updated.filter((e) => e.validationStatus === 'error').length,
      duplicatesCount: 0,
    });
  };

  // ==========================================
  // STEP 4 HANDLERS (CABLES)
  // ==========================================
  const handleCableFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseSpreadsheetFile(file);
      setCableHeaders(data.headers);
      setCableRawRows(data.rows);

      const autoMap = autoDetectCableColumns(data.headers);
      setCableMapping(autoMap);

      const parsed = parseAndValidateCables(data.rows, autoMap, availableEquipmentCodes);
      setStagedCables(parsed.stagedCables);
      setCableSummary(parsed.summary);
      setCableErrors(parsed.errors);
      setCableWarnings(parsed.warnings);
      setCableDuplicates(parsed.duplicates);

      addToast(
        'success',
        'Cable File Processed',
        `Parsed ${parsed.stagedCables.length} cables from ${file.name}`
      );
    } catch (err: any) {
      addToast('error', 'Parse Failed', err.message || 'Failed to read file');
    }
  };

  const handleApplyCableMapping = () => {
    if (cableRawRows.length === 0) return;
    const parsed = parseAndValidateCables(cableRawRows, cableMapping, availableEquipmentCodes);
    setStagedCables(parsed.stagedCables);
    setCableSummary(parsed.summary);
    setCableErrors(parsed.errors);
    setCableWarnings(parsed.warnings);
    setCableDuplicates(parsed.duplicates);
    addToast('info', 'Mapping Updated', `Re-evaluated ${parsed.stagedCables.length} cables.`);
  };

  const handleAddManualCable = () => {
    if (!manualCableId.trim() || !manualFromEq.trim() || !manualToEq.trim()) {
      addToast('error', 'Missing Fields', 'Cable ID, From Equipment, and To Equipment are required.');
      return;
    }
    const cleanId = manualCableId.trim().toUpperCase();
    if (stagedCables.some((c) => c.cableId === cleanId)) {
      addToast('error', 'Duplicate ID', `Cable ID '${cleanId}' is already registered.`);
      return;
    }

    const newItem: StagedCableItem = {
      cableId: cleanId,
      fromEquipmentCode: manualFromEq.trim().toUpperCase(),
      toEquipmentCode: manualToEq.trim().toUpperCase(),
      locationCode: manualCableLoc.trim() ? manualCableLoc.trim().toUpperCase() : undefined,
      system: manualCableSys,
      cableType: manualCableType,
      cableSize: manualCableSize,
      length: typeof manualCableLength === 'number' ? manualCableLength : null,
      responsibleCompany: manualCableCompany || principalContractor || 'Not Set',
      validationStatus: 'valid',
    };

    const updated = [...stagedCables, newItem];
    setStagedCables(updated);
    setCableSummary({
      total: updated.length,
      valid: updated.filter((c) => c.validationStatus === 'valid').length,
      warningsCount: updated.filter((c) => c.validationStatus === 'warning').length,
      errorsCount: updated.filter((c) => c.validationStatus === 'error').length,
      duplicatesCount: 0,
    });

    setManualCableId('');
    addToast('success', 'Cable Added', `Added Cable ${newItem.cableId}`);
  };

  const handleRemoveStagedCable = (idToRemove: string) => {
    const updated = stagedCables.filter((c) => c.cableId !== idToRemove);
    setStagedCables(updated);
    setCableSummary({
      total: updated.length,
      valid: updated.filter((c) => c.validationStatus === 'valid').length,
      warningsCount: updated.filter((c) => c.validationStatus === 'warning').length,
      errorsCount: updated.filter((c) => c.validationStatus === 'error').length,
      duplicatesCount: 0,
    });
  };

  // ==========================================
  // STEP 5 HANDLERS (QA / ITR SETUP)
  // ==========================================
  const handleToggleTemplate = (codeToToggle: string) => {
    setQaTemplates((prev) =>
      prev.map((t) => {
        if (t.code === codeToToggle) {
          const nextSelected = !t.selected;
          return {
            ...t,
            selected: nextSelected,
            proposedCount: nextSelected ? t.matchingCount : 0,
          };
        }
        return t;
      })
    );
  };

  const totalSelectedTemplates = qaTemplates.filter((t) => t.selected).length;
  const totalProposedItrs = qaTemplates
    .filter((t) => t.selected)
    .reduce((acc, t) => acc + t.proposedCount, 0);

  // ==========================================
  // STEP 6 HANDLERS (DRAWINGS & PLANS)
  // ==========================================
  const handleDrawingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security check: block SVG
    if (file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg')) {
      addToast(
        'error',
        'SVG Blocked',
        'SVG files are blocked for security. Please upload a genuine PDF, PNG, or JPEG construction drawing.'
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setNewDwgFileUrl(dataUrl);
      setNewDwgFileName(file.name);
      addToast('success', 'Drawing Loaded', `Loaded ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleAddStagedDrawing = () => {
    if (!newDwgNumber.trim() || !newDwgTitle.trim()) {
      addToast('error', 'Missing Information', 'Drawing number and title are required.');
      return;
    }

    const newDrawing: StagedDrawingItem = {
      drawingNumber: newDwgNumber.trim().toUpperCase(),
      title: newDwgTitle.trim(),
      revision: newDwgRevision.trim() || 'Rev A',
      discipline: newDwgDiscipline,
      building: newDwgBuilding.trim() || undefined,
      levelName: newDwgLevel.trim() || 'Level 02',
      status: newDwgStatus,
      fileUrl: newDwgFileUrl || 'data:application/pdf;base64,JVBERi0xLjQKJUZpY3Rpb25hbF9QREY=',
      fileName: newDwgFileName || `${newDwgNumber}.pdf`,
      pageNumber: newDwgPageNumber,
      pageCount: newDwgPageCount,
      hotspots: newDwgHotspots,
    };

    setStagedDrawings([...stagedDrawings, newDrawing]);
    setNewDwgNumber(`A-${stagedDrawings.length + 202}`);
    setNewDwgTitle('');
    setNewDwgFileUrl('');
    setNewDwgFileName('');
    setNewDwgHotspots([]);
    addToast('success', 'Drawing Registered', `Added ${newDrawing.drawingNumber} (${newDrawing.levelName})`);
  };

  const handleQuickMapRoom = () => {
    if (!selectedRoomToMap) {
      addToast('error', 'Select Room', 'Choose a room to map to this drawing.');
      return;
    }
    const roomNode = stagedRooms.find((r) => r.code === selectedRoomToMap);
    if (!roomNode) return;

    const newHp = {
      id: `hp-${roomNode.code.toLowerCase()}-${Date.now()}`,
      locationId: 0,
      locationCode: roomNode.code,
      locationName: roomNode.name,
      type: 'polygon',
      polygon: [
        { x: 15 + newDwgHotspots.length * 20, y: 20.0 },
        { x: 30 + newDwgHotspots.length * 20, y: 20.0 },
        { x: 30 + newDwgHotspots.length * 20, y: 50.0 },
        { x: 15 + newDwgHotspots.length * 20, y: 50.0 },
      ],
    };

    setNewDwgHotspots([...newDwgHotspots, newHp]);
    setSelectedRoomToMap('');
    addToast('success', 'Room Hotspot Added', `Mapped polygon for ${roomNode.name} (${roomNode.code})`);
  };

  // ==========================================
  // STEP 7 HANDLERS (PEOPLE & COMPANIES)
  // ==========================================
  const handleAddCompany = () => {
    if (!newCompName.trim()) {
      addToast('error', 'Company Name Required', 'Please enter a company name.');
      return;
    }
    if (stagedCompanies.some((c) => c.name.toLowerCase() === newCompName.trim().toLowerCase())) {
      addToast('error', 'Duplicate Company', 'A company with this name already exists.');
      return;
    }

    const comp: CompanyOnboardingItem = {
      name: newCompName.trim(),
      type: newCompType,
      abn: newCompAbn.trim() || undefined,
      contactName: newCompContact.trim() || undefined,
      email: newCompEmail.trim() || undefined,
      phone: newCompPhone.trim() || undefined,
      status: 'Active',
    };

    setStagedCompanies([...stagedCompanies, comp]);
    setNewCompName('');
    setNewCompAbn('');
    setNewCompContact('');
    setNewCompEmail('');
    setNewCompPhone('');
    addToast('success', 'Company Added', `Registered ${comp.name} (${comp.type})`);
  };

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      addToast('error', 'Missing User Details', 'User name and email are required.');
      return;
    }
    const cleanEmail = newUserEmail.trim().toLowerCase();
    if (stagedUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      addToast('error', 'Duplicate Email', 'A user with this email is already registered.');
      return;
    }

    const newUser: UserOnboardingItem = {
      name: newUserName.trim(),
      email: cleanEmail,
      companyName: newUserCompany || stagedCompanies[0]?.name || principalContractor || 'Not Set',
      role: newUserRole,
      status: 'Pending / Not Invited',
    };

    setStagedUsers([...stagedUsers, newUser]);
    setNewUserName('');
    setNewUserEmail('');
    addToast('success', 'User Registered', `Added ${newUser.name} as ${newUser.role} (Pending / Not Invited)`);
  };

  // ==========================================
  // STEP 8: FINAL LAUNCH COMMIT HANDLER
  // ==========================================
  const handleLaunchProject = async () => {
    if (!name.trim() || !code.trim() || !organisation.trim() || !client.trim() || !principalContractor.trim()) {
      addToast('error', 'Step 1 Incomplete', 'Project Name, Code, Organisation, Client, and Principal Contractor are required.');
      setCurrentStep(1);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitProgress('Provisioning isolated project workspace...');

      const payload: ProjectOnboardingPayload = {
        project: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          organisation: organisation.trim(),
          client: client.trim(),
          principalContractor: principalContractor.trim(),
          status,
          location: location.trim() || undefined,
          timezone,
          startDate: startDate || undefined,
          expectedCompletionDate: expectedCompletionDate || undefined,
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        },
        locations: stagedLocations.map((l) => ({
          code: l.code,
          name: l.name,
          type: l.type,
          parentCode: l.parentCode,
          sequence: l.sequence,
        })),
        equipment: stagedEquipment.map((e) => ({
          equipmentCode: e.equipmentCode,
          equipmentName: e.equipmentName,
          equipmentType: e.equipmentType,
          locationCode: e.locationCode,
          system: e.system,
          manufacturer: e.manufacturer,
          model: e.model,
          serialNumber: e.serialNumber,
          responsibleCompany: e.responsibleCompany,
          status: e.status || 'Installed',
          description: e.description,
        })),
        cables: stagedCables.map((c) => ({
          cableId: c.cableId,
          fromEquipmentCode: c.fromEquipmentCode,
          toEquipmentCode: c.toEquipmentCode,
          locationCode: c.locationCode,
          system: c.system,
          cableType: c.cableType,
          cableSize: c.cableSize,
          length: c.length,
          responsibleCompany: c.responsibleCompany,
        })),
        qa: {
          selectedTemplateCodes: qaTemplates.filter((t) => t.selected).map((t) => t.code),
          generateItrsNow: qaExecutionOption === 'GENERATE_NOW',
          configuredTemplatesOnly: qaExecutionOption === 'CONFIGURE_ONLY',
          totalProposedItrs,
        },
        drawings: stagedDrawings,
        companies: stagedCompanies,
        users: stagedUsers,
      };

      setSubmitProgress('Saving locations, registers, drawings, and memberships...');
      const res = await apiFetch('/api/projects/onboard-full', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to complete project onboarding.');
      }

      const result = await res.json();

      addToast(
        'success',
        'Project Onboarded Successfully!',
        `Initialised ${result.project.name} (${result.project.code}). Routing to Project Readiness page.`
      );

      // Close modal and set readiness data
      setIsProjectManageModalOpen(false);
      await fetchProjects();

      // Switch to newly created project
      switchProject(result.project);

      // Route directly to Project Readiness view
      setProjectReadinessData(result.readiness);
      setActiveTab('readiness');
    } catch (err: any) {
      addToast('error', 'Onboarding Failed', err.message || 'Error creating project');
    } finally {
      setIsSubmitting(false);
      setSubmitProgress('');
    }
  };

  if (!isProjectManageModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header with Title and Wizard Steps */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-black text-sm">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-white tracking-tight">Project Onboarding Wizard</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Step {currentStep} of 8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Setup project details, locations, equipment, cable schedule, QA templates, drawings, and companies
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Acceptance Test Quick-Fill button */}
            <button
              type="button"
              onClick={handleLoadAcceptanceTestDataset}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Load full test dataset for DC Melbourne 04 (MEL04)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load MEL04 Acceptance Data</span>
            </button>

            <button
              onClick={() => setIsProjectManageModalOpen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close Wizard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 8-Step Stepper Header */}
        <div className="bg-slate-950/70 border-b border-slate-800/80 px-4 sm:px-6 py-2.5 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-max">
            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'Locations' },
              { num: 3, label: 'Equipment' },
              { num: 4, label: 'Cables' },
              { num: 5, label: 'QA / ITR' },
              { num: 6, label: 'Drawings' },
              { num: 7, label: 'People' },
              { num: 8, label: 'Review' },
            ].map((stepItem, idx) => {
              const isCurrent = currentStep === stepItem.num;
              const isPast = currentStep > stepItem.num;
              return (
                <React.Fragment key={stepItem.num}>
                  <button
                    type="button"
                    onClick={() => {
                      if (stepItem.num === 1 || code.trim()) {
                        setCurrentStep(stepItem.num as any);
                      }
                    }}
                    className={`flex items-center space-x-1.5 text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'text-amber-400'
                        : isPast
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-slate-500'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : isPast
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isPast ? <Check className="w-3 h-3 stroke-[3]" /> : stepItem.num}
                    </div>
                    <span>{stepItem.label}</span>
                  </button>
                  {idx < 7 && (
                    <div
                      className={`h-0.5 w-3 sm:w-5 ${
                        currentStep > stepItem.num ? 'bg-emerald-500/50' : 'bg-slate-800'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================= */}
          {/* STEP 1: PROJECT DETAILS                                   */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Step 1 — Project Details</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Establish primary metadata, project code, and separate organisation stakeholders.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Project Name *</span>
                    <span className="text-[10px] text-slate-500">e.g. DC Melbourne 04</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full project name..."
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Project Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Project Code *</span>
                    <span className="text-[10px] text-amber-400 font-mono">Unique Key (e.g. MEL04)</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="e.g. MEL04"
                    maxLength={12}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-amber-400 font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Organisation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                    <span>Organisation *</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Owner / Entity)</span>
                  </label>
                  <input
                    type="text"
                    value={organisation}
                    onChange={(e) => setOrganisation(e.target.value)}
                    placeholder="e.g. Example Construction Group"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Client */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                    <span>Client *</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Customer / Tenant)</span>
                  </label>
                  <input
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="e.g. Example Data Centres"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Principal Contractor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                    <span>Principal Contractor *</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Head Builder)</span>
                  </label>
                  <input
                    type="text"
                    value={principalContractor}
                    onChange={(e) => setPrincipalContractor(e.target.value)}
                    placeholder="e.g. Example Construction Group"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Project Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Project Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  >
                    {PROJECT_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Address / Site Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Address / Site Location</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. 100 Innovation Way, Melbourne VIC 3000"
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9.5 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Timezone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer font-mono"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  />
                </div>

                {/* Expected Completion Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Expected Completion Date</label>
                  <input
                    type="date"
                    value={expectedCompletionDate}
                    onChange={(e) => setExpectedCompletionDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Description / Scope of Works</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide scope overview, substation specifications, stage boundary..."
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Optional Project Image */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Optional Project Image (URL)</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://.../site-overview.png"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: LOCATION STRUCTURE                                */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Step 2 — Location Structure</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define Buildings, Levels, Zones, Rooms, and Areas via CSV/Excel import or manual creation.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => downloadCsvFile(LOCATION_TEMPLATE_2TIER, 'maxim_locations_2tier.csv')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>2-Tier CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCsvFile(LOCATION_TEMPLATE_4TIER, 'maxim_locations_4tier.csv')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>4-Tier CSV</span>
                  </button>
                </div>
              </div>

              {/* Import vs Manual Tabs */}
              <div className="flex border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setLocationTab('import')}
                  className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                    locationTab === 'import'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Spreadsheet Import (.csv / .xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => setLocationTab('manual')}
                  className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                    locationTab === 'manual'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Node Entry
                </button>
              </div>

              {locationTab === 'import' ? (
                <div className="space-y-4">
                  {/* Upload Box */}
                  <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-6 text-center transition-colors bg-slate-950/40">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    <p className="text-xs font-bold text-slate-200">
                      Upload Location Schedule (CSV or Excel)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports: Level Code | Level Name | Room Code | Room Name
                    </p>
                    <label className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shadow-md transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select Spreadsheet File</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleLocationFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Summary Pills */}
                  {stagedLocations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
                      <span className="font-bold text-slate-300">Staged Locations:</span>
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 font-bold font-mono">
                        {locCounts.levels} Levels
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-bold font-mono">
                        {locCounts.rooms} Rooms
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold font-mono">
                        {stagedLocations.length} Total Nodes
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Manual Location Entry */
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Type</label>
                      <select
                        value={manualLocType}
                        onChange={(e) => setManualLocType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Building">Building</option>
                        <option value="Level">Level</option>
                        <option value="Zone">Zone</option>
                        <option value="Room">Room</option>
                        <option value="Area">Area</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Location Code *</label>
                      <input
                        type="text"
                        value={manualLocCode}
                        onChange={(e) => setManualLocCode(e.target.value.toUpperCase())}
                        placeholder="e.g. L01 or L01-SR01"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Location Name *</label>
                      <input
                        type="text"
                        value={manualLocName}
                        onChange={(e) => setManualLocName(e.target.value)}
                        placeholder="e.g. Switch Room 01"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Parent Code</label>
                      <input
                        type="text"
                        value={manualLocParent}
                        onChange={(e) => setManualLocParent(e.target.value.toUpperCase())}
                        placeholder="e.g. L01 (blank if root)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddManualLocation}
                      className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Location Node</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {stagedLocations.length > 0 && (
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                  <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Staged Location Tree Preview ({stagedLocations.length})</span>
                    <button
                      type="button"
                      onClick={() => setStagedLocations([])}
                      className="text-rose-400 hover:text-rose-300 text-[11px] cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 text-xs">
                    {stagedLocations.slice(0, 50).map((loc) => (
                      <div key={loc.code} className="px-4 py-2 flex items-center justify-between hover:bg-slate-900/50">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                              loc.type === 'Level'
                                ? 'bg-blue-500/15 text-blue-400'
                                : loc.type === 'Room'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {loc.type}
                          </span>
                          <span className="font-mono font-bold text-amber-400">{loc.code}</span>
                          <span className="text-white">{loc.name}</span>
                          {loc.parentCode && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              (Parent: {loc.parentCode})
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedLocation(loc.code)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {stagedLocations.length > 50 && (
                      <div className="p-2 text-center text-[11px] text-slate-500">
                        ... and {stagedLocations.length - 50} more locations
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: EQUIPMENT REGISTER                                */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>Step 3 — Equipment Register</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Register project assets linked to validated locations from Step 2.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadCsvFile(EQUIPMENT_TEMPLATE, 'maxim_equipment_template.csv')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Equipment Template</span>
                </button>
              </div>

              {/* Import vs Manual */}
              <div className="flex border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setEquipmentTab('import')}
                  className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                    equipmentTab === 'import'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Spreadsheet Import (.csv / .xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => setEquipmentTab('manual')}
                  className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                    equipmentTab === 'manual'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Equipment Entry
                </button>
              </div>

              {equipmentTab === 'import' ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-6 text-center transition-colors bg-slate-950/40">
                    <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    <p className="text-xs font-bold text-slate-200">
                      Upload Equipment Register (CSV or Excel)
                    </p>
                    <label className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shadow-md transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select Equipment File</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleEquipmentFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                /* Manual Equipment Entry */
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Equipment Code *</label>
                      <input
                        type="text"
                        value={manualEqCode}
                        onChange={(e) => setManualEqCode(e.target.value.toUpperCase())}
                        placeholder="e.g. MSB-01"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Equipment Name *</label>
                      <input
                        type="text"
                        value={manualEqName}
                        onChange={(e) => setManualEqName(e.target.value)}
                        placeholder="e.g. Main Switchboard 4000A"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Location Code *</label>
                      <input
                        type="text"
                        value={manualEqLoc}
                        onChange={(e) => setManualEqLoc(e.target.value.toUpperCase())}
                        placeholder="e.g. L01-SR01"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddManualEquipment}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Equipment Item</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {stagedEquipment.length > 0 && (
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                  <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Staged Equipment Assets ({stagedEquipment.length})</span>
                    <button
                      type="button"
                      onClick={() => setStagedEquipment([])}
                      className="text-rose-400 hover:text-rose-300 text-[11px] cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 text-xs">
                    {stagedEquipment.slice(0, 50).map((eq) => (
                      <div key={eq.equipmentCode} className="px-4 py-2 flex items-center justify-between hover:bg-slate-900/50">
                        <div className="flex items-center space-x-2.5">
                          <span className="font-mono font-bold text-emerald-400">{eq.equipmentCode}</span>
                          <span className="text-white">{eq.equipmentName}</span>
                          <span className="text-slate-400 font-mono text-[11px]">📍 {eq.locationCode}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedEquipment(eq.equipmentCode)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: CABLE SCHEDULE                                    */}
          {/* ========================================================= */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                    <Cable className="w-4 h-4 text-amber-400" />
                    <span>Step 4 — Cable Schedule</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Import feeders validating From/To equipment, sizes, systems, and lengths.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadCsvFile(CABLE_SCHEDULE_TEMPLATE, 'maxim_cables_template.csv')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Cable Template</span>
                </button>
              </div>

              {/* Import vs Manual */}
              <div className="flex border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setCableTab('import')}
                  className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                    cableTab === 'import'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Spreadsheet Import (.csv / .xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => setCableTab('manual')}
                  className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                    cableTab === 'manual'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Cable Entry
                </button>
              </div>

              {cableTab === 'import' ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-6 text-center transition-colors bg-slate-950/40">
                    <Cable className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    <p className="text-xs font-bold text-slate-200">
                      Upload Cable Schedule (CSV or Excel)
                    </p>
                    <label className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shadow-md transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select Cable Schedule File</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleCableFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                /* Manual Cable Entry */
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Cable ID *</label>
                      <input
                        type="text"
                        value={manualCableId}
                        onChange={(e) => setManualCableId(e.target.value.toUpperCase())}
                        placeholder="e.g. CB-TX01-MSB01"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">From Equipment *</label>
                      <input
                        type="text"
                        value={manualFromEq}
                        onChange={(e) => setManualFromEq(e.target.value.toUpperCase())}
                        placeholder="e.g. TX-01"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">To Equipment *</label>
                      <input
                        type="text"
                        value={manualToEq}
                        onChange={(e) => setManualToEq(e.target.value.toUpperCase())}
                        placeholder="e.g. MSB-01"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Length (m)</label>
                      <input
                        type="number"
                        value={manualCableLength}
                        onChange={(e) => setManualCableLength(e.target.value ? Number(e.target.value) : '')}
                        placeholder="45"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddManualCable}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Cable Item</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {stagedCables.length > 0 && (
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                  <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Staged Cable Feeders ({stagedCables.length})</span>
                    <button
                      type="button"
                      onClick={() => setStagedCables([])}
                      className="text-rose-400 hover:text-rose-300 text-[11px] cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 text-xs">
                    {stagedCables.slice(0, 50).map((cb) => (
                      <div key={cb.cableId} className="px-4 py-2 flex items-center justify-between hover:bg-slate-900/50">
                        <div className="flex items-center space-x-2.5">
                          <span className="font-mono font-bold text-amber-400">{cb.cableId}</span>
                          <span className="text-white text-[11px]">
                            {cb.fromEquipmentCode} → {cb.toEquipmentCode}
                          </span>
                          <span className="text-slate-400 text-[11px]">{cb.cableType}</span>
                          {cb.length && <span className="font-mono text-slate-400 text-[10px]">({cb.length}m)</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedCable(cb.cableId)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {stagedCables.length > 50 && (
                      <div className="p-2 text-center text-[11px] text-slate-500">
                        ... and {stagedCables.length - 50} more cables
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 5: QA / ITR SETUP (NEW STEP)                         */}
          {/* ========================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <ClipboardCheck className="w-4 h-4 text-purple-400" />
                  <span>Step 5 — QA / ITR Setup</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select Inspection & Test Record (ITR) templates for your project. The system will NOT automatically provision templates without administrator selection.
                </p>
              </div>

              {/* Template Selection Cards */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300">Available QA Templates:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {qaTemplates.map((tpl) => (
                    <div
                      key={tpl.code}
                      onClick={() => handleToggleTemplate(tpl.code)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        tpl.selected
                          ? 'bg-purple-950/25 border-purple-500/60 shadow-md shadow-purple-900/20'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={tpl.selected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-purple-500 focus:ring-purple-400 cursor-pointer"
                            />
                            <h4 className="text-xs font-bold text-white">{tpl.title}</h4>
                          </div>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            v{tpl.version}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 pl-6">{tpl.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs pl-6">
                        <span className="text-slate-400">
                          Matching {tpl.targetType}s: <strong className="text-white font-mono">{tpl.matchingCount}</strong>
                        </span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            tpl.selected
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          Proposed ITRs: {tpl.proposedCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposed ITRs Quantity Preview */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200">
                    Selected Templates: <span className="text-purple-400 font-mono">{totalSelectedTemplates}</span> of {qaTemplates.length}
                  </div>
                  <div className="text-xs text-slate-400">
                    Matching registered cables and equipment from Steps 3 & 4.
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                    Total Proposed ITRs:
                  </div>
                  <div className="text-xl font-mono font-black text-purple-300">
                    {totalProposedItrs.toLocaleString()} ITRs
                  </div>
                </div>
              </div>

              {/* Two Explicit Admin Execution Options */}
              <div className="space-y-2.5 pt-2">
                <div className="text-xs font-bold text-slate-300">Execution Strategy:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setQaExecutionOption('GENERATE_NOW')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      qaExecutionOption === 'GENERATE_NOW'
                        ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                      <Rocket className="w-4 h-4" />
                      <span>[GENERATE ITRs NOW]</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1.5">
                      Instantiate all {totalProposedItrs.toLocaleString()} draft checklist records linked to registered cables and equipment immediately.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQaExecutionOption('CONFIGURE_ONLY')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      qaExecutionOption === 'CONFIGURE_ONLY'
                        ? 'bg-blue-500/10 border-blue-500/60 ring-1 ring-blue-500/40'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-xs font-black text-blue-400 uppercase tracking-wider">
                      <FolderTree className="w-4 h-4" />
                      <span>[CONFIGURE TEMPLATES ONLY]</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1.5">
                      Provision template definitions in the project library. 0 ITR instances will be generated now; QA manager can generate them on demand.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 6: DRAWINGS & LEVEL PLANS (NEW STEP)                 */}
          {/* ========================================================= */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                    <Map className="w-4 h-4 text-rose-400" />
                    <span>Step 6 — Drawings & Level Plans</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assign construction plans to project levels. Normal uploads accept PDF, PNG, and JPEG. SVG uploads are strictly blocked.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setDrawingsMode('SKIP')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      drawingsMode === 'SKIP'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    [SKIP FOR NOW]
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawingsMode('UPLOAD')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      drawingsMode === 'UPLOAD'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    [UPLOAD DRAWINGS]
                  </button>
                </div>
              </div>

              {drawingsMode === 'SKIP' ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-2xl">
                  <Map className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs font-bold text-slate-300">Drawings will be skipped for initial onboarding.</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                    You can configure interactive level drawings at any time from the Drawings & Maps module using the Configure Level Plan workflow.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Drawing Form */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Drawing Number *</label>
                        <input
                          type="text"
                          value={newDwgNumber}
                          onChange={(e) => setNewDwgNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. A-201"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Drawing Title *</label>
                        <input
                          type="text"
                          value={newDwgTitle}
                          onChange={(e) => setNewDwgTitle(e.target.value)}
                          placeholder="e.g. Level 02 General Arrangement"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Discipline</label>
                        <select
                          value={newDwgDiscipline}
                          onChange={(e) => setNewDwgDiscipline(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="Architectural">Architectural</option>
                          <option value="Electrical">Electrical</option>
                          <option value="Mechanical">Mechanical</option>
                          <option value="Containment">Containment</option>
                          <option value="Security">Security</option>
                          <option value="Fire">Fire</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Revision</label>
                        <input
                          type="text"
                          value={newDwgRevision}
                          onChange={(e) => setNewDwgRevision(e.target.value)}
                          placeholder="Rev A"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Assign to Level</label>
                        <select
                          value={newDwgLevel}
                          onChange={(e) => setNewDwgLevel(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        >
                          {stagedLevels.map((lvl) => (
                            <option key={lvl.code} value={lvl.name || lvl.code}>
                              {lvl.name} ({lvl.code})
                            </option>
                          ))}
                          {stagedLevels.length === 0 && <option value="Level 02">Level 02</option>}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Status</label>
                        <select
                          value={newDwgStatus}
                          onChange={(e) => setNewDwgStatus(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="Issued for Construction">Issued for Construction</option>
                          <option value="As-Built">As-Built</option>
                          <option value="For Review">For Review</option>
                          <option value="Superseded">Superseded</option>
                        </select>
                      </div>
                    </div>

                    {/* Upload File Input */}
                    <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl cursor-pointer border border-slate-700 transition-colors">
                          <Upload className="w-3.5 h-3.5 text-rose-400" />
                          <span>Attach Drawing (PDF, PNG, JPEG)</span>
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg"
                            onChange={handleDrawingFileUpload}
                            className="hidden"
                          />
                        </label>
                        {newDwgFileName && (
                          <span className="text-xs text-emerald-400 ml-2 font-mono">
                            ✓ {newDwgFileName}
                          </span>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">SVG uploads are rejected.</p>
                      </div>

                      {/* Map Existing Rooms quick tool */}
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedRoomToMap}
                          onChange={(e) => setSelectedRoomToMap(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white max-w-[160px]"
                        >
                          <option value="">Select Room to Map...</option>
                          {stagedRooms.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.code} - {r.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleQuickMapRoom}
                          disabled={!selectedRoomToMap}
                          className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold hover:bg-rose-500/30 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          + Map Room Hotspot
                        </button>
                      </div>
                    </div>

                    {newDwgHotspots.length > 0 && (
                      <div className="text-xs text-slate-400 flex items-center space-x-2">
                        <span>Mapped Hotspots:</span>
                        {newDwgHotspots.map((hp) => (
                          <span key={hp.id} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                            {hp.locationCode}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleAddStagedDrawing}
                        className="px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register Drawing</span>
                      </button>
                    </div>
                  </div>

                  {/* Registered Drawings List */}
                  {stagedDrawings.length > 0 && (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                      <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-slate-300">
                        Configured Level Drawings ({stagedDrawings.length})
                      </div>
                      <div className="divide-y divide-slate-800/60 text-xs">
                        {stagedDrawings.map((dwg, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-900/40">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-rose-400">{dwg.drawingNumber}</span>
                                <span className="text-white font-bold">{dwg.title}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                  {dwg.levelName}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Hotspots: {dwg.hotspots?.length || 0} rooms mapped • {dwg.discipline}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setStagedDrawings(stagedDrawings.filter((_, i) => i !== idx))}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 7: PEOPLE & COMPANIES (NEW STEP)                     */}
          {/* ========================================================= */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Step 7 — People & Companies</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure project companies and assign users with per-project roles. Uninvited users will be labelled "Pending / Not Invited".
                </p>
              </div>

              {/* Companies Section */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300">1. Project Companies:</div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Company Name *</label>
                      <input
                        type="text"
                        value={newCompName}
                        onChange={(e) => setNewCompName(e.target.value)}
                        placeholder="e.g. Example Electrical"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Company Type *</label>
                      <select
                        value={newCompType}
                        onChange={(e) => setNewCompType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      >
                        {COMPANY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Contact Email (optional)</label>
                      <input
                        type="email"
                        value={newCompEmail}
                        onChange={(e) => setNewCompEmail(e.target.value)}
                        placeholder="contact@company.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddCompany}
                      className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Company</span>
                    </button>
                  </div>
                </div>

                {/* Staged Companies list */}
                <div className="flex flex-wrap gap-2">
                  {stagedCompanies.map((c, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center space-x-2"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-bold text-white">{c.name}</span>
                      <span className="text-[10px] text-slate-400">({c.type})</span>
                      <button
                        type="button"
                        onClick={() => setStagedCompanies(stagedCompanies.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-rose-400 ml-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Users Section */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-300">2. Project Users & Per-Project Roles:</div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">User Name *</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. Mark Callahan"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Email *</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="m.callahan@example.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Company</label>
                      <select
                        value={newUserCompany}
                        onChange={(e) => setNewUserCompany(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      >
                        {stagedCompanies.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Project Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      >
                        {USER_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddUser}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Project User</span>
                    </button>
                  </div>
                </div>

                {/* Staged Users List */}
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                  <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-slate-300">
                    Project Members ({stagedUsers.length})
                  </div>
                  <div className="divide-y divide-slate-800/60 text-xs">
                    {stagedUsers.map((u, i) => (
                      <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-900/40">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">{u.name}</span>
                            <span className="text-slate-400 font-mono text-[11px]">({u.email})</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {u.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                            <span>{u.companyName}</span>
                            <span>•</span>
                            <span className="text-amber-300/80 font-medium">Status: Pending / Not Invited</span>
                          </div>
                        </div>
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => setStagedUsers(stagedUsers.filter((_, idx) => idx !== i))}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 8: REVIEW & CREATE PROJECT (FINAL STEP)              */}
          {/* ========================================================= */}
          {currentStep === 8 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <Rocket className="w-4 h-4 text-amber-400" />
                  <span>Step 8 — Review & Create Project</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-flight validation summary. Verify all parameters before committing project activation.
                </p>
              </div>

              {/* Review Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. PROJECT */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center space-x-1.5 text-amber-400 uppercase tracking-wider">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Project Details</span>
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{code || 'N/A'}</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-slate-800/80">
                    <div>Name: <strong className="text-white">{name}</strong></div>
                    <div>Organisation: <strong className="text-white">{organisation}</strong></div>
                    <div>Client: <strong className="text-white">{client}</strong></div>
                    <div>Principal Contractor: <strong className="text-white">{principalContractor}</strong></div>
                    <div>Status: <span className="text-emerald-400 font-semibold">{status}</span> • Timezone: {timezone}</div>
                  </div>
                </div>

                {/* 2. LOCATIONS */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center space-x-1.5 text-blue-400 uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Locations</span>
                    </span>
                    <span className="font-mono text-blue-400 font-bold">{stagedLocations.length} Nodes</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-slate-800/80">
                    <div>Levels: <strong className="text-white">{locCounts.levels}</strong> • Rooms: <strong className="text-white">{locCounts.rooms}</strong></div>
                    <div>Zones: {locCounts.zones} • Buildings: {locCounts.buildings} • Areas: {locCounts.areas}</div>
                    <div className="text-slate-400">Hierarchy: Parent-child topological references verified</div>
                  </div>
                </div>

                {/* 3. EQUIPMENT */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center space-x-1.5 text-emerald-400 uppercase tracking-wider">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Equipment Register</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{stagedEquipment.length} Assets</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-slate-800/80">
                    <div>Valid Assets: <strong className="text-emerald-400">{stagedEquipment.length}</strong></div>
                    <div>Unresolved Location References: <strong className="text-slate-400">0</strong></div>
                  </div>
                </div>

                {/* 4. CABLES */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center space-x-1.5 text-amber-400 uppercase tracking-wider">
                      <Cable className="w-3.5 h-3.5" />
                      <span>Cable Schedule</span>
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{stagedCables.length} Feeders</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-slate-800/80">
                    <div>Valid Cables: <strong className="text-white">{stagedCables.length}</strong></div>
                    <div>Warnings: <strong className="text-slate-400">{cableSummary.warningsCount}</strong> • Errors: <strong className="text-slate-400">{cableSummary.errorsCount}</strong></div>
                  </div>
                </div>

                {/* 5. QA / ITR */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center space-x-1.5 text-purple-400 uppercase tracking-wider">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>QA / ITR Setup</span>
                    </span>
                    <span className="font-mono text-purple-400 font-bold">{totalSelectedTemplates} Templates</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-slate-800/80">
                    <div>
                      Selected: <strong className="text-white">{qaTemplates.filter((t) => t.selected).map((t) => t.code).join(', ') || 'None'}</strong>
                    </div>
                    <div>
                      Mode:{' '}
                      <strong className="text-purple-300">
                        {qaExecutionOption === 'GENERATE_NOW'
                          ? `Generate ${totalProposedItrs} ITRs Now`
                          : 'Configure Templates Only'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 6. DRAWINGS */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center space-x-1.5 text-rose-400 uppercase tracking-wider">
                      <Map className="w-3.5 h-3.5" />
                      <span>Drawings & Level Plans</span>
                    </span>
                    <span className="font-mono text-rose-400 font-bold">{stagedDrawings.length} Drawings</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-slate-800/80">
                    <div>Configured Levels: <strong className="text-white">{stagedDrawings.length} of {locCounts.levels || 1}</strong></div>
                    <div>Mapped Room Hotspots: <strong className="text-emerald-400">{stagedDrawings.reduce((acc, d) => acc + (d.hotspots?.length || 0), 0)}</strong></div>
                  </div>
                </div>

                {/* 7. COMPANIES & USERS */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5 md:col-span-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center space-x-1.5 text-indigo-400 uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5" />
                      <span>Companies & Project Members</span>
                    </span>
                    <span className="font-mono text-indigo-400 font-bold">
                      {stagedCompanies.length} Companies • {stagedUsers.length} Users
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-300 pt-1 border-t border-slate-800/80">
                    <div>Companies: {stagedCompanies.map((c) => c.name).join(', ')}</div>
                    <div>
                      Roles: {stagedUsers.map((u) => `${u.name} (${u.role})`).join(' • ')}
                    </div>
                    <div className="text-amber-400 text-[11px]">
                      User Invitation Status: Pending / Not Invited (Local project role configured)
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety & Isolation Notice */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Safe Project Creation & Isolation Guarantee</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Records created will be assigned uniquely to this project code. Fictional demo projects remain strictly isolated. Large batch imports are executed without monolithic table locking.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Step navigation */}
            {currentStep < 8 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) handleStep1Next();
                  else setCurrentStep((prev) => (prev + 1) as any);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-2 transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunchProject}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-sm font-black flex items-center space-x-2 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
              >
                <Rocket className="w-4 h-4" />
                <span>{isSubmitting ? submitProgress || 'Launching...' : '[LAUNCH PROJECT]'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
