import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedSheetData {
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
}

export interface StagedLocationItem {
  code: string;
  name: string;
  type: 'Project' | 'Building' | 'Level' | 'Zone' | 'Room' | 'Area';
  parentCode: string | null;
  sequence: number;
  rowNum?: number;
  status: 'valid' | 'warning' | 'error';
  message?: string;
}

export interface StagedEquipmentItem {
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string;
  locationCode: string;
  system: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  responsibleCompany: string;
  status?: string;
  description?: string;
  rowNum?: number;
  validationStatus: 'valid' | 'warning' | 'error';
  validationMessage?: string;
}

export interface StagedCableItem {
  cableId: string;
  fromEquipmentCode: string;
  toEquipmentCode: string;
  locationCode?: string;
  system: string;
  cableType: string;
  cableSize: string;
  length?: number | null;
  responsibleCompany: string;
  rowNum?: number;
  validationStatus: 'valid' | 'warning' | 'error';
  validationMessage?: string;
  isDuplicate?: boolean;
}

/**
 * Universal file parser supporting both CSV and Excel (.xlsx, .xls) files.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSheetData> {
  const isExcel =
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls') ||
    file.type.includes('spreadsheetml') ||
    file.type.includes('excel');

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      raw: false,
    });

    if (rawRows.length === 0) {
      return { headers: [], rows: [], fileName: file.name };
    }

    const headers = Object.keys(rawRows[0] || {});
    return { headers, rows: rawRows, fileName: file.name };
  } else {
    // CSV parsing using PapaParse
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = (results.data as Record<string, any>[]).filter((r) =>
            Object.values(r).some((v) => String(v).trim().length > 0)
          );
          const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
          resolve({ headers, rows, fileName: file.name });
        },
        error: (err) => reject(new Error(err.message)),
      });
    });
  }
}

/**
 * Auto-detect column mappings for location spreadsheets.
 */
export function autoDetectLocationColumns(headers: string[]) {
  const map: Record<string, string> = {
    buildingCode: '',
    buildingName: '',
    levelCode: '',
    levelName: '',
    zoneCode: '',
    zoneName: '',
    roomCode: '',
    roomName: '',
    areaCode: '',
    areaName: '',
    // Or standard generic columns
    genericCode: '',
    genericName: '',
    genericType: '',
    genericParentCode: '',
  };

  headers.forEach((h) => {
    const lower = h.toLowerCase().trim();

    // Check generic parent-child format
    if (lower === 'code' || lower === 'location code') map.genericCode = h;
    else if (lower === 'name' || lower === 'location name') map.genericName = h;
    else if (lower === 'type' || lower === 'location type') map.genericType = h;
    else if (lower === 'parent code' || lower === 'parent' || lower === 'parent_code')
      map.genericParentCode = h;

    // Multi-tier format
    if (lower.includes('building') && (lower.includes('code') || lower.includes('id') || lower.includes('tag'))) {
      map.buildingCode = h;
    } else if (lower.includes('building') && lower.includes('name')) {
      map.buildingName = h;
    } else if (lower.includes('level') && (lower.includes('code') || lower.includes('id') || lower.includes('tag') || lower.includes('no'))) {
      map.levelCode = h;
    } else if (lower.includes('level') && lower.includes('name')) {
      map.levelName = h;
    } else if (lower.includes('zone') && (lower.includes('code') || lower.includes('id'))) {
      map.zoneCode = h;
    } else if (lower.includes('zone') && lower.includes('name')) {
      map.zoneName = h;
    } else if (lower.includes('room') && (lower.includes('code') || lower.includes('id') || lower.includes('tag'))) {
      map.roomCode = h;
    } else if (lower.includes('room') && lower.includes('name')) {
      map.roomName = h;
    } else if (lower.includes('area') && (lower.includes('code') || lower.includes('id'))) {
      map.areaCode = h;
    } else if (lower.includes('area') && lower.includes('name')) {
      map.areaName = h;
    }
  });

  return map;
}

/**
 * Parses and validates location spreadsheet rows based on mapping.
 */
export function parseAndValidateLocations(
  rows: Record<string, any>[],
  mapping: Record<string, string>
): {
  stagedLocations: StagedLocationItem[];
  counts: { buildings: number; levels: number; zones: number; rooms: number; areas: number; total: number };
  duplicates: string[];
  errors: string[];
  warnings: string[];
} {
  const stagedLocations: StagedLocationItem[] = [];
  const seenCodes = new Set<string>();
  const duplicates: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let seq = 1;

  // Check if user is using generic parent-child columns
  const isGeneric = Boolean(mapping.genericCode && mapping.genericName);

  if (isGeneric) {
    rows.forEach((row, idx) => {
      const code = String(row[mapping.genericCode] || '').trim().toUpperCase();
      const name = String(row[mapping.genericName] || '').trim();
      const typeRaw = String(row[mapping.genericType] || 'Room').trim();
      const parentCode = row[mapping.genericParentCode]
        ? String(row[mapping.genericParentCode]).trim().toUpperCase()
        : null;

      if (!code && !name) return; // skip blank

      if (!code) {
        errors.push(`Row ${idx + 2}: Missing location code`);
        return;
      }
      if (!name) {
        errors.push(`Row ${idx + 2}: Location code '${code}' is missing a name`);
        return;
      }

      if (seenCodes.has(code)) {
        duplicates.push(code);
        errors.push(`Row ${idx + 2}: Duplicate location code '${code}'`);
        return;
      }
      seenCodes.add(code);

      const validTypes = ['Project', 'Building', 'Level', 'Zone', 'Room', 'Area'];
      const type = (validTypes.find((t) => t.toLowerCase() === typeRaw.toLowerCase()) ||
        'Room') as StagedLocationItem['type'];

      stagedLocations.push({
        code,
        name,
        type,
        parentCode: parentCode || null,
        sequence: seq++,
        rowNum: idx + 2,
        status: 'valid',
      });
    });
  } else {
    // Multi-tier hierarchy: Building -> Level -> Zone -> Room -> Area
    // Example: Level Code | Level Name | Room Code | Room Name
    rows.forEach((row, idx) => {
      const bldgCode = mapping.buildingCode ? String(row[mapping.buildingCode] || '').trim().toUpperCase() : '';
      const bldgName = mapping.buildingName ? String(row[mapping.buildingName] || '').trim() : '';

      const lvlCode = mapping.levelCode ? String(row[mapping.levelCode] || '').trim().toUpperCase() : '';
      const lvlName = mapping.levelName ? String(row[mapping.levelName] || '').trim() : '';

      const zoneCode = mapping.zoneCode ? String(row[mapping.zoneCode] || '').trim().toUpperCase() : '';
      const zoneName = mapping.zoneName ? String(row[mapping.zoneName] || '').trim() : '';

      const roomCode = mapping.roomCode ? String(row[mapping.roomCode] || '').trim().toUpperCase() : '';
      const roomName = mapping.roomName ? String(row[mapping.roomName] || '').trim() : '';

      const areaCode = mapping.areaCode ? String(row[mapping.areaCode] || '').trim().toUpperCase() : '';
      const areaName = mapping.areaName ? String(row[mapping.areaName] || '').trim() : '';

      let currentParentCode: string | null = null;

      // 1. Building tier
      if (bldgCode) {
        if (!seenCodes.has(bldgCode)) {
          seenCodes.add(bldgCode);
          stagedLocations.push({
            code: bldgCode,
            name: bldgName || `Building ${bldgCode}`,
            type: 'Building',
            parentCode: null,
            sequence: seq++,
            rowNum: idx + 2,
            status: 'valid',
          });
        }
        currentParentCode = bldgCode;
      }

      // 2. Level tier
      if (lvlCode) {
        if (!seenCodes.has(lvlCode)) {
          seenCodes.add(lvlCode);
          stagedLocations.push({
            code: lvlCode,
            name: lvlName || `Level ${lvlCode}`,
            type: 'Level',
            parentCode: currentParentCode,
            sequence: seq++,
            rowNum: idx + 2,
            status: 'valid',
          });
        }
        currentParentCode = lvlCode;
      }

      // 3. Zone tier
      if (zoneCode) {
        if (!seenCodes.has(zoneCode)) {
          seenCodes.add(zoneCode);
          stagedLocations.push({
            code: zoneCode,
            name: zoneName || `Zone ${zoneCode}`,
            type: 'Zone',
            parentCode: currentParentCode,
            sequence: seq++,
            rowNum: idx + 2,
            status: 'valid',
          });
        }
        currentParentCode = zoneCode;
      }

      // 4. Room tier
      if (roomCode) {
        if (!seenCodes.has(roomCode)) {
          seenCodes.add(roomCode);
          stagedLocations.push({
            code: roomCode,
            name: roomName || `Room ${roomCode}`,
            type: 'Room',
            parentCode: currentParentCode,
            sequence: seq++,
            rowNum: idx + 2,
            status: 'valid',
          });
        } else {
          // Already seen in another row
          duplicates.push(roomCode);
        }
        currentParentCode = roomCode;
      }

      // 5. Area tier
      if (areaCode) {
        if (!seenCodes.has(areaCode)) {
          seenCodes.add(areaCode);
          stagedLocations.push({
            code: areaCode,
            name: areaName || `Area ${areaCode}`,
            type: 'Area',
            parentCode: currentParentCode,
            sequence: seq++,
            rowNum: idx + 2,
            status: 'valid',
          });
        }
      }
    });
  }

  // Check parent reference integrity
  stagedLocations.forEach((loc) => {
    if (loc.parentCode && !seenCodes.has(loc.parentCode)) {
      warnings.push(`Location '${loc.code}' references parent '${loc.parentCode}' which is not defined in the sheet.`);
      loc.status = 'warning';
      loc.message = `Parent '${loc.parentCode}' not found; will link to root.`;
    }
  });

  const counts = {
    buildings: stagedLocations.filter((l) => l.type === 'Building').length,
    levels: stagedLocations.filter((l) => l.type === 'Level').length,
    zones: stagedLocations.filter((l) => l.type === 'Zone').length,
    rooms: stagedLocations.filter((l) => l.type === 'Room').length,
    areas: stagedLocations.filter((l) => l.type === 'Area').length,
    total: stagedLocations.length,
  };

  return {
    stagedLocations,
    counts,
    duplicates,
    errors,
    warnings,
  };
}

/**
 * Auto-detect column mappings for equipment spreadsheets.
 */
export function autoDetectEquipmentColumns(headers: string[]) {
  const map: Record<string, string> = {
    equipmentCode: '',
    equipmentName: '',
    equipmentType: '',
    locationCode: '',
    system: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    responsibleCompany: '',
    status: '',
    description: '',
  };

  headers.forEach((h) => {
    const lower = h.toLowerCase().trim();
    if (lower.includes('code') && (lower.includes('equip') || lower.includes('asset') || lower.includes('tag') || lower.includes('id'))) {
      map.equipmentCode = h;
    } else if (lower === 'tag' || lower === 'asset tag' || lower === 'equipment id' || lower === 'equipment code') {
      map.equipmentCode = h;
    } else if (lower.includes('name') && (lower.includes('equip') || lower.includes('asset') || lower.includes('desc'))) {
      map.equipmentName = h;
    } else if (lower === 'equipment' || lower === 'item' || lower === 'description') {
      if (!map.equipmentName) map.equipmentName = h;
    } else if (lower.includes('type') || lower.includes('category') || lower.includes('class')) {
      map.equipmentType = h;
    } else if (lower.includes('loc') || lower.includes('room') || lower.includes('space')) {
      map.locationCode = h;
    } else if (lower.includes('system') || lower.includes('discipline')) {
      map.system = h;
    } else if (lower.includes('manuf') || lower.includes('vendor') || lower.includes('make')) {
      map.manufacturer = h;
    } else if (lower.includes('model') || lower.includes('part')) {
      map.model = h;
    } else if (lower.includes('serial') || lower.includes('sn')) {
      map.serialNumber = h;
    } else if (lower.includes('company') || lower.includes('contractor') || lower.includes('subcontractor')) {
      map.responsibleCompany = h;
    } else if (lower.includes('status') || lower.includes('state')) {
      map.status = h;
    }
  });

  return map;
}

/**
 * Parses and validates equipment spreadsheet rows against staged/known location codes.
 */
export function parseAndValidateEquipment(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  availableLocationCodes: Set<string>
): {
  stagedEquipment: StagedEquipmentItem[];
  duplicates: string[];
  errors: string[];
  warnings: string[];
  summary: { total: number; valid: number; warningsCount: number; errorsCount: number };
} {
  const stagedEquipment: StagedEquipmentItem[] = [];
  const seenCodes = new Set<string>();
  const duplicates: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  rows.forEach((row, idx) => {
    const equipmentCode = String(row[mapping.equipmentCode] || '').trim().toUpperCase();
    const equipmentName = String(row[mapping.equipmentName] || '').trim();
    const equipmentType = String(row[mapping.equipmentType] || 'Switchboard').trim();
    const locationCode = String(row[mapping.locationCode] || '').trim().toUpperCase();
    const system = String(row[mapping.system] || 'LV Power').trim();
    const manufacturer = row[mapping.manufacturer] ? String(row[mapping.manufacturer]).trim() : undefined;
    const model = row[mapping.model] ? String(row[mapping.model]).trim() : undefined;
    const serialNumber = row[mapping.serialNumber] ? String(row[mapping.serialNumber]).trim() : undefined;
    const responsibleCompany = String(row[mapping.responsibleCompany] || 'Not Set').trim();
    const status = String(row[mapping.status] || 'Installed').trim();
    const description = row[mapping.description] ? String(row[mapping.description]).trim() : undefined;

    if (!equipmentCode && !equipmentName) return; // Skip blank row

    let validationStatus: 'valid' | 'warning' | 'error' = 'valid';
    let validationMessage = '';

    if (!equipmentCode) {
      errors.push(`Row ${idx + 2}: Missing Equipment Code`);
      validationStatus = 'error';
      validationMessage = 'Missing Equipment Code';
    } else if (seenCodes.has(equipmentCode)) {
      duplicates.push(equipmentCode);
      errors.push(`Row ${idx + 2}: Duplicate Equipment Code '${equipmentCode}'`);
      validationStatus = 'error';
      validationMessage = `Duplicate Code '${equipmentCode}'`;
    } else {
      seenCodes.add(equipmentCode);
    }

    if (!equipmentName && validationStatus !== 'error') {
      errors.push(`Row ${idx + 2}: Equipment '${equipmentCode}' is missing an Equipment Name`);
      validationStatus = 'error';
      validationMessage = 'Missing Equipment Name';
    }

    // Validate location reference
    if (locationCode && availableLocationCodes.size > 0 && !availableLocationCodes.has(locationCode)) {
      warnings.push(`Row ${idx + 2} (${equipmentCode}): Location Code '${locationCode}' was not found in location structure.`);
      if (validationStatus === 'valid') {
        validationStatus = 'warning';
        validationMessage = `Unregistered Location '${locationCode}'`;
      }
    } else if (!locationCode) {
      warnings.push(`Row ${idx + 2} (${equipmentCode}): No Location Code assigned; will attach to project root.`);
      if (validationStatus === 'valid') {
        validationStatus = 'warning';
        validationMessage = 'No Location assigned';
      }
    }

    stagedEquipment.push({
      equipmentCode: equipmentCode || `EQ-${idx + 1}`,
      equipmentName: equipmentName || `Equipment ${equipmentCode}`,
      equipmentType,
      locationCode,
      system,
      manufacturer,
      model,
      serialNumber,
      responsibleCompany,
      status,
      description,
      rowNum: idx + 2,
      validationStatus,
      validationMessage,
    });
  });

  return {
    stagedEquipment,
    duplicates,
    errors,
    warnings,
    summary: {
      total: stagedEquipment.length,
      valid: stagedEquipment.filter((e) => e.validationStatus === 'valid').length,
      warningsCount: stagedEquipment.filter((e) => e.validationStatus === 'warning').length,
      errorsCount: stagedEquipment.filter((e) => e.validationStatus === 'error').length,
    },
  };
}

/**
 * Auto-detect column mappings for cable spreadsheets.
 */
export function autoDetectCableColumns(headers: string[]) {
  const map: Record<string, string> = {
    cableId: '',
    fromEquipment: '',
    toEquipment: '',
    location: '',
    system: '',
    cableType: '',
    cableSize: '',
    length: '',
    responsibleCompany: '',
  };

  headers.forEach((h) => {
    const lower = h.toLowerCase().trim();
    if (lower.includes('cable') && (lower.includes('id') || lower.includes('ref') || lower.includes('tag') || lower.includes('no'))) {
      map.cableId = h;
    } else if (lower === 'cable' || lower === 'cable id' || lower === 'cable ref' || lower === 'cable tag') {
      map.cableId = h;
    } else if (lower.startsWith('from') || lower.includes('origin') || lower.includes('source')) {
      map.fromEquipment = h;
    } else if (lower.startsWith('to') || lower.includes('dest') || lower.includes('target')) {
      map.toEquipment = h;
    } else if (lower.includes('loc') || lower.includes('room') || lower.includes('area')) {
      map.location = h;
    } else if (lower.includes('type') || lower.includes('spec')) {
      map.cableType = h;
    } else if (lower.includes('size') || lower.includes('csa') || lower.includes('cross')) {
      map.cableSize = h;
    } else if (lower.includes('length') || lower.includes('len') || lower.includes('metres') || lower.includes('meters')) {
      map.length = h;
    } else if (lower.includes('system') || lower.includes('discipline')) {
      map.system = h;
    } else if (lower.includes('company') || lower.includes('contractor') || lower.includes('installer')) {
      map.responsibleCompany = h;
    }
  });

  return map;
}

/**
 * Parses and validates cable spreadsheet rows against staged equipment and location codes.
 */
export function parseAndValidateCables(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  availableEquipmentCodes: Set<string>
): {
  stagedCables: StagedCableItem[];
  duplicates: string[];
  errors: string[];
  warnings: string[];
  summary: { total: number; valid: number; warningsCount: number; errorsCount: number; duplicatesCount: number };
} {
  const stagedCables: StagedCableItem[] = [];
  const seenCableIds = new Set<string>();
  const duplicates: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  rows.forEach((row, idx) => {
    const cableId = String(row[mapping.cableId] || '').trim().toUpperCase();
    const fromEq = String(row[mapping.fromEquipment] || '').trim().toUpperCase();
    const toEq = String(row[mapping.toEquipment] || '').trim().toUpperCase();
    const locationCode = row[mapping.location] ? String(row[mapping.location]).trim().toUpperCase() : undefined;
    const system = String(row[mapping.system] || 'LV Power').trim();
    const cableType = String(row[mapping.cableType] || '4C 240mm² Cu XLPE').trim();
    const cableSize = String(row[mapping.cableSize] || '240mm²').trim();
    const rawLength = row[mapping.length];
    const company = String(row[mapping.responsibleCompany] || 'Not Set').trim();

    if (!cableId && !fromEq && !toEq) return; // Skip blank

    let validationStatus: 'valid' | 'warning' | 'error' = 'valid';
    let validationMessage = '';

    if (!cableId) {
      errors.push(`Row ${idx + 2}: Missing Cable ID`);
      validationStatus = 'error';
      validationMessage = 'Missing Cable ID';
    } else if (seenCableIds.has(cableId)) {
      duplicates.push(cableId);
      errors.push(`Row ${idx + 2}: Duplicate Cable ID '${cableId}'`);
      validationStatus = 'error';
      validationMessage = `Duplicate ID '${cableId}'`;
    } else {
      seenCableIds.add(cableId);
    }

    let parsedLength: number | null = null;
    if (rawLength !== undefined && rawLength !== '') {
      parsedLength = Number(rawLength);
      if (isNaN(parsedLength) || parsedLength < 0) {
        errors.push(`Row ${idx + 2} (${cableId}): Invalid cable length '${rawLength}' (must be a positive number)`);
        validationStatus = 'error';
        validationMessage = `Invalid length: ${rawLength}`;
      }
    }

    // Equipment validation
    if (fromEq && availableEquipmentCodes.size > 0 && !availableEquipmentCodes.has(fromEq)) {
      warnings.push(`Row ${idx + 2} (${cableId}): Origin equipment '${fromEq}' is not registered in equipment list.`);
      if (validationStatus === 'valid') {
        validationStatus = 'warning';
        validationMessage = `Unregistered 'From' equipment: ${fromEq}`;
      }
    }
    if (toEq && availableEquipmentCodes.size > 0 && !availableEquipmentCodes.has(toEq)) {
      warnings.push(`Row ${idx + 2} (${cableId}): Destination equipment '${toEq}' is not registered in equipment list.`);
      if (validationStatus === 'valid') {
        validationStatus = 'warning';
        validationMessage = `Unregistered 'To' equipment: ${toEq}`;
      }
    }

    stagedCables.push({
      cableId: cableId || `CB-${idx + 1}`,
      fromEquipmentCode: fromEq || 'TBD',
      toEquipmentCode: toEq || 'TBD',
      locationCode,
      system,
      cableType,
      cableSize,
      length: parsedLength,
      responsibleCompany: company,
      rowNum: idx + 2,
      validationStatus,
      validationMessage,
      isDuplicate: duplicates.includes(cableId),
    });
  });

  return {
    stagedCables,
    duplicates,
    errors,
    warnings,
    summary: {
      total: stagedCables.length,
      valid: stagedCables.filter((c) => c.validationStatus === 'valid').length,
      warningsCount: stagedCables.filter((c) => c.validationStatus === 'warning').length,
      errorsCount: stagedCables.filter((c) => c.validationStatus === 'error').length,
      duplicatesCount: duplicates.length,
    },
  };
}

/**
 * Helper to download CSV templates to client machine.
 */
export function downloadCsvFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Standard CSV templates.
 */
export const LOCATION_TEMPLATE_2TIER = `Level Code,Level Name,Room Code,Room Name
L01,Level 01,L01-SR01,Switch Room 01
L01,Level 01,L01-DH01,Data Hall 01
L01,Level 01,L01-UPS01,UPS & Battery Room 01
L02,Level 02,L02-SR01,Switch Room 02
L02,Level 02,L02-DH01,Data Hall 02
L02,Level 02,L02-CORR,Service Corridor 02`;

export const LOCATION_TEMPLATE_4TIER = `Building Code,Building Name,Level Code,Level Name,Zone Code,Zone Name,Room Code,Room Name
BLD-A,Building A,L01,Level 01,Z01,Zone A High Density,L01-SR01,Switch Room 01
BLD-A,Building A,L01,Level 01,Z01,Zone A High Density,L01-DH01,Data Hall 01
BLD-A,Building A,L01,Level 01,Z02,Zone B Power Block,L01-UPS01,UPS Room 01
BLD-A,Building A,L02,Level 02,Z01,Zone A High Density,L02-SR01,Switch Room 02
BLD-B,Building B,L01,Level 01,Z01,Central Plant,L01-CHILL,Chiller Plant Room`;

export const EQUIPMENT_TEMPLATE = `Equipment Code,Equipment Name,Equipment Type,Location Code,System,Manufacturer,Model,Responsible Company
TX-01,11kV / 415V 2500kVA Cast Resin Transformer,Transformer,L01-SR01,HV Power,Schneider Electric,Trihal 2500,Stark Power Systems
MSB-01,Main Switchboard MSB-01 4000A,Switchboard,L01-SR01,LV Power,Schneider Electric,Okken 4000A,Apex Electrical Contractors
UPS-01,500kVA Double Conversion UPS Unit 01,UPS,L01-UPS01,UPS & Essential,Eaton,Power Xpert 9395P,Apex Electrical Contractors
GEN-01,2250kVA Standby Diesel Generator 01,Generator,L01-SR01,Essential Power,Cummins,QSK60-G4,Stark Power Systems
PDU-01A,Power Distribution Unit PDU-01A 300kVA,PDU,L01-DH01,Critical IT Power,Schneider Electric,EcoStruxure PDU,Apex Electrical Contractors
DB-L01-01,Distribution Board DB-L01-01,Distribution Board,L01-SR01,LV Power,Schneider Electric,Acti9,Apex Electrical Contractors`;

export const CABLE_SCHEDULE_TEMPLATE = `Cable ID,From Equipment,To Equipment,Location,System,Cable Type,Cable Size,Length,Company
CB-TX01-MSB01-01,TX-01,MSB-01,L01-SR01,LV Power,4C 240mm² Cu XLPE,240mm²,45.5,Apex Electrical Contractors
CB-TX01-MSB01-02,TX-01,MSB-01,L01-SR01,LV Power,4C 240mm² Cu XLPE,240mm²,45.5,Apex Electrical Contractors
CB-MSB01-UPS01,MSB-01,UPS-01,L01-SR01,Essential Power,4C 185mm² Cu XLPE,185mm²,32.0,Apex Electrical Contractors
CB-UPS01-PDU01,UPS-01,PDU-01A,L01-DH01,Critical IT Power,4C 150mm² Cu XLPE,150mm²,68.0,Apex Electrical Contractors
CB-MSB01-DB01,MSB-01,DB-L01-01,L01-SR01,LV Power,4C 35mm² Cu XLPE,35mm²,18.5,Apex Electrical Contractors`;

/**
 * Standard acceptance test dataset generator for MEL04
 * Generates:
 * - 3 Levels, 12 Rooms
 * - 10 Equipment Items
 * - 150 Cables
 * - Companies & Users
 */
export function generateMel04AcceptanceDataset() {
  const levels = [
    { code: 'L01', name: 'Level 01' },
    { code: 'L02', name: 'Level 02' },
    { code: 'L03', name: 'Level 03' },
  ];

  const locations: StagedLocationItem[] = [];
  let seq = 1;

  // 3 Levels
  for (const lvl of levels) {
    locations.push({
      code: lvl.code,
      name: lvl.name,
      type: 'Level',
      parentCode: null,
      sequence: seq++,
      status: 'valid',
    });
  }

  // 12 Rooms (4 rooms per level)
  const roomDefs = [
    { level: 'L01', code: 'L01-SR01', name: 'Switch Room 01' },
    { level: 'L01', code: 'L01-UPS01', name: 'UPS & Battery Room 01' },
    { level: 'L01', code: 'L01-DH01', name: 'Data Hall 01' },
    { level: 'L01', code: 'L01-GEN01', name: 'Generator Plant Room 01' },

    { level: 'L02', code: 'L02-SR01', name: 'Switch Room 02' },
    { level: 'L02', code: 'L02-UPS01', name: 'UPS & Battery Room 02' },
    { level: 'L02', code: 'L02-DH01', name: 'Data Hall 02' },
    { level: 'L02', code: 'L02-CHILL', name: 'Chiller Plant Room 02' },

    { level: 'L03', code: 'L03-SR01', name: 'Switch Room 03' },
    { level: 'L03', code: 'L03-BESS', name: 'Battery Energy Storage Room 03' },
    { level: 'L03', code: 'L03-DH01', name: 'Data Hall 03' },
    { level: 'L03', code: 'L03-POP', name: 'Network Point of Presence Room' },
  ];

  for (const rm of roomDefs) {
    locations.push({
      code: rm.code,
      name: rm.name,
      type: 'Room',
      parentCode: rm.level,
      sequence: seq++,
      status: 'valid',
    });
  }

  // 10 Equipment Items
  const equipment: StagedEquipmentItem[] = [
    { equipmentCode: 'TX-01', equipmentName: '11kV / 415V 2500kVA Cast Resin Transformer 01', equipmentType: 'Transformer', locationCode: 'L01-SR01', system: 'HV Power', manufacturer: 'Schneider Electric', model: 'Trihal 2500', responsibleCompany: 'Example Electrical', validationStatus: 'valid' },
    { equipmentCode: 'MSB-01', equipmentName: 'Main Switchboard MSB-01 4000A', equipmentType: 'Switchboard', locationCode: 'L01-SR01', system: 'LV Power', manufacturer: 'Schneider Electric', model: 'Okken 4000', responsibleCompany: 'Example Electrical', validationStatus: 'valid' },
    { equipmentCode: 'UPS-01', equipmentName: '500kVA Double Conversion UPS Unit 01', equipmentType: 'UPS', locationCode: 'L01-UPS01', system: 'Essential Power', manufacturer: 'Eaton', model: '9395P', responsibleCompany: 'Example Electrical', validationStatus: 'valid' },
    { equipmentCode: 'GEN-01', equipmentName: '2250kVA Standby Diesel Generator 01', equipmentType: 'Generator', locationCode: 'L01-GEN01', system: 'Emergency Power', manufacturer: 'Cummins', model: 'QSK60-G4', responsibleCompany: 'Example Mechanical', validationStatus: 'valid' },
    { equipmentCode: 'PDU-01', equipmentName: 'Power Distribution Unit PDU-01 300kVA', equipmentType: 'PDU', locationCode: 'L01-DH01', system: 'Critical IT Power', manufacturer: 'Schneider Electric', model: 'EcoStruxure', responsibleCompany: 'Example Electrical', validationStatus: 'valid' },
    { equipmentCode: 'TX-02', equipmentName: '11kV / 415V 2500kVA Cast Resin Transformer 02', equipmentType: 'Transformer', locationCode: 'L02-SR01', system: 'HV Power', manufacturer: 'Schneider Electric', model: 'Trihal 2500', responsibleCompany: 'Example Electrical', validationStatus: 'valid' },
    { equipmentCode: 'MSB-02', equipmentName: 'Main Switchboard MSB-02 4000A', equipmentType: 'Switchboard', locationCode: 'L02-SR01', system: 'LV Power', manufacturer: 'Schneider Electric', model: 'Okken 4000', responsibleCompany: 'Example Electrical', validationStatus: 'valid' },
    { equipmentCode: 'UPS-02', equipmentName: '500kVA Double Conversion UPS Unit 02', equipmentType: 'UPS', locationCode: 'L02-UPS01', system: 'Essential Power', manufacturer: 'Eaton', model: '9395P', responsibleCompany: 'Example Electrical', validationStatus: 'valid' },
    { equipmentCode: 'CHILL-01', equipmentName: 'Centrifugal Water Cooled Chiller 1200kWr', equipmentType: 'Chiller', locationCode: 'L02-CHILL', system: 'Mechanical Cooling', manufacturer: 'York', model: 'YK-1200', responsibleCompany: 'Example Mechanical', validationStatus: 'valid' },
    { equipmentCode: 'PDU-02', equipmentName: 'Power Distribution Unit PDU-02 300kVA', equipmentType: 'PDU', locationCode: 'L02-DH01', system: 'Critical IT Power', manufacturer: 'Schneider Electric', model: 'EcoStruxure', responsibleCompany: 'Example Electrical', validationStatus: 'valid' },
  ];

  // 150 Cables exactly
  const cables: StagedCableItem[] = [];
  const cablePrefixes = [
    { prefix: 'CB-TX01-MSB01', from: 'TX-01', to: 'MSB-01', loc: 'L01-SR01', sys: 'LV Power', type: '4C 240mm² Cu XLPE', size: '240mm²', len: 45.0, count: 12 },
    { prefix: 'CB-MSB01-UPS01', from: 'MSB-01', to: 'UPS-01', loc: 'L01-SR01', sys: 'Essential Power', type: '4C 185mm² Cu XLPE', size: '185mm²', len: 32.5, count: 8 },
    { prefix: 'CB-GEN01-MSB01', from: 'GEN-01', to: 'MSB-01', loc: 'L01-GEN01', sys: 'Emergency Power', type: '4C 240mm² Cu XLPE', size: '240mm²', len: 55.0, count: 8 },
    { prefix: 'CB-UPS01-PDU01', from: 'UPS-01', to: 'PDU-01', loc: 'L01-DH01', sys: 'Critical IT Power', type: '4C 150mm² Cu XLPE', size: '150mm²', len: 62.0, count: 12 },
    { prefix: 'CB-TX02-MSB02', from: 'TX-02', to: 'MSB-02', loc: 'L02-SR01', sys: 'LV Power', type: '4C 240mm² Cu XLPE', size: '240mm²', len: 48.0, count: 12 },
    { prefix: 'CB-MSB02-UPS02', from: 'MSB-02', to: 'UPS-02', loc: 'L02-SR01', sys: 'Essential Power', type: '4C 185mm² Cu XLPE', size: '185mm²', len: 35.0, count: 8 },
    { prefix: 'CB-MSB02-CHILL', from: 'MSB-02', to: 'CHILL-01', loc: 'L02-CHILL', sys: 'Mechanical Power', type: '4C 240mm² Cu XLPE', size: '240mm²', len: 74.0, count: 10 },
    { prefix: 'CB-UPS02-PDU02', from: 'UPS-02', to: 'PDU-02', loc: 'L02-DH01', sys: 'Critical IT Power', type: '4C 150mm² Cu XLPE', size: '150mm²', len: 68.0, count: 12 },
  ];

  let cableIndex = 1;
  for (const group of cablePrefixes) {
    for (let i = 1; i <= group.count; i++) {
      cables.push({
        cableId: `${group.prefix}-${String(i).padStart(2, '0')}`,
        fromEquipmentCode: group.from,
        toEquipmentCode: group.to,
        locationCode: group.loc,
        system: group.sys,
        cableType: group.type,
        cableSize: group.size,
        length: group.len + (i * 0.5),
        responsibleCompany: 'Example Electrical',
        validationStatus: 'valid',
        rowNum: cableIndex + 1,
      });
      cableIndex++;
    }
  }

  // Fill up to exactly 150 cables with distribution sub-circuits across the 12 rooms
  const remainingCount = 150 - cables.length; // 150 - 82 = 68
  const roomsPool = roomDefs.map((r) => r.code);
  const eqPool = ['MSB-01', 'MSB-02', 'PDU-01', 'PDU-02', 'UPS-01', 'UPS-02'];

  for (let j = 1; j <= remainingCount; j++) {
    const from = eqPool[j % eqPool.length];
    const to = eqPool[(j + 1) % eqPool.length];
    const loc = roomsPool[j % roomsPool.length];
    cables.push({
      cableId: `CB-SUB-${String(j).padStart(3, '0')}`,
      fromEquipmentCode: from,
      toEquipmentCode: to,
      locationCode: loc,
      system: j % 2 === 0 ? 'LV Distribution' : 'Critical Sub-feed',
      cableType: j % 2 === 0 ? '4C 35mm² Cu XLPE' : '4C 70mm² Cu XLPE',
      cableSize: j % 2 === 0 ? '35mm²' : '70mm²',
      length: 22.0 + (j * 0.4),
      responsibleCompany: 'Example Electrical',
      validationStatus: 'valid',
      rowNum: cableIndex + 1,
    });
    cableIndex++;
  }

  return {
    locations,
    equipment,
    cables,
    companies: [
      { name: 'Example Construction Group', type: 'Principal Contractor', status: 'Active' as const, contactName: 'David Evans', email: 'd.evans@examplegroup.com.au' },
      { name: 'Example Data Centres', type: 'Client', status: 'Active' as const, contactName: 'Sarah Jenkins', email: 's.jenkins@exampledc.com.au' },
      { name: 'Example Electrical', type: 'Electrical Contractor', status: 'Active' as const, contactName: 'Mark Callahan', email: 'm.callahan@exampleelec.com.au' },
      { name: 'Example Mechanical', type: 'Mechanical Contractor', status: 'Active' as const, contactName: 'Chris Taylor', email: 'c.taylor@examplemech.com.au' },
      { name: 'Example Client', type: 'Client', status: 'Active' as const, contactName: 'Robert Vance', email: 'r.vance@exampleclient.com.au' },
    ],
    users: [
      { name: 'Alex Vance', email: 'alex.vance@maximforge.com', companyName: 'Example Construction Group', role: 'Administrator' as const, status: 'Pending / Not Invited' as const },
      { name: 'Mark Callahan', email: 'mark.callahan@exampleelec.com.au', companyName: 'Example Electrical', role: 'Supervisor' as const, status: 'Pending / Not Invited' as const },
      { name: 'Dave Miller', email: 'dave.miller@exampleelec.com.au', companyName: 'Example Electrical', role: 'Tradesperson' as const, status: 'Pending / Not Invited' as const },
      { name: 'Jane Smith', email: 'jane.smith@exampleclient.com.au', companyName: 'Example Client', role: 'Viewer' as const, status: 'Pending / Not Invited' as const },
    ],
  };
}
