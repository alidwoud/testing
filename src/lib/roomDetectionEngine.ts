import {
  LocationNode,
  HotspotPoint,
  RoomHotspotConfig,
  DetectedRoomCandidate,
} from '../types/index.ts';
import { ExtractedPdfTextItem } from './pdfParser.ts';

// Known non-room keywords to reject as false positives
const FALSE_POSITIVE_KEYWORDS = [
  'TITLE BLOCK',
  'ISSUED FOR CONSTRUCTION',
  'SCALE',
  'DWG NO',
  'DRAWING NO',
  'REVISION',
  'REV ',
  'CONSULTANT',
  'CLIENT',
  'NORTH',
  'LEGEND',
  'GENERAL NOTES',
  'DO NOT SCALE',
  'ALL DIMENSIONS',
  'SPECIFICATION',
  'SHEET NUMBER',
  'PROJECT NAME',
  'PROJECT NUMBER',
  'APPROVAL',
  'DATE',
  'DISCIPLINE',
  'ZONE KEY',
  'LOCATION PLAN',
  'SCHEDULE',
  'REV CLOUD',
  'CONTRACTOR',
  'ARCHITECT',
  'ENGINEER',
];

// Room classification keywords commonly found on architectural / engineering drawings
const ROOM_NAME_PATTERNS = [
  /SWITCH\s*ROOM/i,
  /UPS(\s*(&|AND)?\s*BATTERY)?(\s*ROOM)?/i,
  /BATTERY\s*ROOM/i,
  /DATA\s*HALL/i,
  /SERVER\s*ROOM/i,
  /ELECTRICAL\s*ROOM/i,
  /ELEC(TRICAL)?\s*RISER/i,
  /SERVICE\s*CORRIDOR/i,
  /CORRIDOR/i,
  /SUBSTATION/i,
  /TRANSFORMER\s*(ROOM|ENCLOSURE)/i,
  /PLANT\s*ROOM/i,
  /MECH(ANICAL)?\s*ROOM/i,
  /CHILLER\s*PLANT/i,
  /PUMP\s*ROOM/i,
  /COMMS\s*ROOM/i,
  /MDF|IDF/i,
  /SECURITY\s*ROOM/i,
  /CONTROL\s*ROOM/i,
  /OPERATIONS\s*CENTER/i,
  /LOADING\s*DOCK/i,
  /WORKSHOP/i,
  /OFFICE/i,
  /FIRE\s*COMMAND/i,
  /STAIR(WELL)?/i,
  /AIRLOCK/i,
  /HVAC\s*ROOM/i,
  /GENERATOR\s*ROOM/i,
];

// Code extraction regex, e.g. [L02-SR01], L02-UPS01, SR01, DH01, ER-04
const CODE_REGEX = /\b(L\d{1,2}-([A-Z0-9]+))|([A-Z]{2,4}[-_]?\d{1,3})\b/i;

/**
 * Normalizes text for string matching
 */
export function normalizeString(str: string): string {
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

/**
 * Computes token-based and character similarity (0 to 1)
 */
export function calculateSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeString(s1);
  const norm2 = normalizeString(s2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
  }

  // Token overlap
  const words1 = s1.toUpperCase().split(/[\s\-_]+/).filter(Boolean);
  const words2 = s2.toUpperCase().split(/[\s\-_]+/).filter(Boolean);

  let matchWords = 0;
  for (const w1 of words1) {
    if (words2.some((w2) => w2 === w1 || w2.includes(w1) || w1.includes(w2))) {
      matchWords++;
    }
  }

  const tokenScore = matchWords / Math.max(words1.length, words2.length, 1);
  return tokenScore;
}

/**
 * Checks if coordinates fall into standard title block or margin areas
 */
export function isLikelyTitleBlockOrMargin(coords: { xPct: number; yPct: number }): boolean {
  // Title blocks are standardly located at bottom right corner (x > 70%, y > 75%)
  if (coords.xPct >= 72 && coords.yPct >= 72) return true;
  // Margins / borders outside printable area
  if (coords.xPct <= 2 || coords.xPct >= 98 || coords.yPct <= 2 || coords.yPct >= 98) return true;
  return false;
}

/**
 * Converts a bounding rectangle to a 4-vertex polygon
 */
export function rectToPolygon(rect: { x: number; y: number; width: number; height: number }): HotspotPoint[] {
  return [
    { x: rect.x, y: rect.y },
    { x: Math.round((rect.x + rect.width) * 10) / 10, y: rect.y },
    { x: Math.round((rect.x + rect.width) * 10) / 10, y: Math.round((rect.y + rect.height) * 10) / 10 },
    { x: rect.x, y: Math.round((rect.y + rect.height) * 10) / 10 },
  ];
}

/**
 * Converts polygon points to bounding rectangle
 */
export function polygonToRect(points: HotspotPoint[]): { x: number; y: number; width: number; height: number } {
  if (!points || points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: Math.round(minX * 10) / 10,
    y: Math.round(minY * 10) / 10,
    width: Math.round((maxX - minX) * 10) / 10,
    height: Math.round((maxY - minY) * 10) / 10,
  };
}

/**
 * GENUINE ASSISTED ROOM DETECTION & MATCHING ENGINE
 *
 * Analyses genuine extracted text objects from an uploaded drawing.
 * NO simulated or hardcoded room names/coordinates.
 *
 * Rules:
 * 1. Rejects false positives (title blocks, legends, general notes, schedules, revision tables).
 * 2. Cross-Project & Cross-Level Protection: ONLY matches against childLocations belonging strictly
 *    to the selected Project and Level.
 * 3. Coordinates originate from the actual spatial location of the text label in the uploaded PDF.
 * 4. Genuine confidence calculation:
 *    - HIGH: exact code or name match against existing level location record.
 *    - MEDIUM: strong fuzzy name match against existing level location record.
 *    - LOW / UNMATCHED: text found on drawing without corresponding DB record on this level.
 * 5. If drawing has no embedded text (scanned / raster drawing), returns empty list with
 *    isScannedOrNoText: true and informs administrator to use manual mapping.
 */
export function analyzeDrawingForRooms(params: {
  textItems?: ExtractedPdfTextItem[];
  levelLocation: LocationNode;
  childLocations: LocationNode[];
  previousRevisionHotspots?: RoomHotspotConfig[];
}): {
  candidates: DetectedRoomCandidate[];
  isScannedOrNoText: boolean;
  totalTextItemsScanned: number;
} {
  const { textItems = [], levelLocation, childLocations, previousRevisionHotspots = [] } = params;

  if (!textItems || textItems.length === 0) {
    // Genuine result: no embedded vector text found on drawing (scanned or pure raster)
    return {
      candidates: [],
      isScannedOrNoText: true,
      totalTextItemsScanned: 0,
    };
  }

  const rawCandidates: Array<{
    rawText: string;
    extractedCode?: string;
    extractedName?: string;
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
  }> = [];

  for (const item of textItems) {
    const rawContent = item.str.trim();
    if (!rawContent || rawContent.length < 3) continue;

    // Filter out title block and edge margin text
    if (isLikelyTitleBlockOrMargin(item)) continue;

    // Filter out known false positive keywords
    const isFalsePositive = FALSE_POSITIVE_KEYWORDS.some((kw) =>
      rawContent.toUpperCase().includes(kw)
    );
    if (isFalsePositive) continue;

    // Check if matches known room pattern, or code pattern, or matches any existing location on this level
    const matchesPattern = ROOM_NAME_PATTERNS.some((p) => p.test(rawContent));
    const codeMatch = rawContent.match(CODE_REGEX);
    const matchesExistingLocation = childLocations.some(
      (l) =>
        normalizeString(l.name) === normalizeString(rawContent) ||
        normalizeString(l.code) === normalizeString(rawContent) ||
        calculateSimilarity(l.name, rawContent) >= 0.7
    );

    if (matchesPattern || codeMatch || matchesExistingLocation) {
      let extractedCode = codeMatch ? codeMatch[0] : undefined;
      let extractedName = rawContent
        .replace(/\[.*?\]/g, '')
        .replace(/\bL\d{1,2}-[A-Z0-9]+\b/gi, '')
        .trim();

      if (!extractedName && extractedCode) {
        extractedName = extractedCode;
      }

      rawCandidates.push({
        rawText: rawContent,
        extractedCode,
        extractedName,
        xPct: item.xPct,
        yPct: item.yPct,
        widthPct: item.widthPct,
        heightPct: item.heightPct,
      });
    }
  }

  // Deduplicate candidates spatially close to each other with same or substring text
  const uniqueCandidates: typeof rawCandidates = [];
  rawCandidates.forEach((c) => {
    const existing = uniqueCandidates.find(
      (u) =>
        Math.abs(u.xPct - c.xPct) < 3.5 &&
        Math.abs(u.yPct - c.yPct) < 3.5 &&
        (normalizeString(u.rawText) === normalizeString(c.rawText) ||
          u.extractedCode === c.extractedCode)
    );
    if (!existing) {
      uniqueCandidates.push(c);
    }
  });

  // Now perform genuine matching strictly against childLocations belonging to this Project & Level!
  const results: DetectedRoomCandidate[] = uniqueCandidates.map((cand, idx) => {
    const id = `cand-${idx + 1}-${Date.now().toString(36)}`;

    // Geometry originates genuinely from the text item position on the uploaded drawing
    const rect = {
      x: Math.max(1, Math.min(85, Math.round((cand.xPct - 2) * 10) / 10)),
      y: Math.max(1, Math.min(85, Math.round((cand.yPct - 2) * 10) / 10)),
      width: Math.max(12, Math.min(32, Math.round((cand.widthPct * 2.2 + 8) * 10) / 10)),
      height: Math.max(8, Math.min(26, Math.round((cand.heightPct * 3.0 + 8) * 10) / 10)),
    };
    const polygon = rectToPolygon(rect);

    // CROSS-LEVEL SAFETY CHECK:
    // If drawing label explicitly specifies a level (e.g. L02, Level 02, L01) that differs
    // from the selected level, do NOT match against rooms on a different level!
    const candLevelMatch = cand.rawText.match(/\bL(0?[1-9]|[1-9][0-9])\b/i) || cand.rawText.match(/LEVEL\s*(0?[1-9]|[1-9][0-9])/i);
    if (candLevelMatch) {
      const extractedLevelNum = candLevelMatch[1].replace(/^0+/, '');
      const currentLevelNum =
        levelLocation.code.replace(/[^0-9]/g, '').replace(/^0+/, '') ||
        levelLocation.name.replace(/[^0-9]/g, '').replace(/^0+/, '');

      if (currentLevelNum && extractedLevelNum && extractedLevelNum !== currentLevelNum) {
        return {
          id,
          rawText: cand.rawText,
          extractedCode: cand.extractedCode,
          extractedName: cand.extractedName,
          rect,
          polygon,
          confidence: 'LOW' as const,
          confidenceScore: 0,
          suggestedLocationId: null,
          suggestedLocationCode: undefined,
          suggestedLocationName: undefined,
          matchType: 'UNMATCHED' as const,
          detectionMethod: 'vector_text' as const,
          status: 'pending' as const,
        };
      }
    }

    let bestMatch: LocationNode | null = null;
    let matchType: 'EXACT_CODE' | 'EXACT_NAME' | 'FUZZY_NAME' | 'UNMATCHED' = 'UNMATCHED';
    let confidenceScore = 0;

    // 1. Check exact code match against childLocations on this level
    if (cand.extractedCode) {
      const normCandCode = normalizeString(cand.extractedCode);
      const codeMatch = childLocations.find((l) => {
        const normLocCode = normalizeString(l.code);
        return normLocCode === normCandCode || normLocCode.endsWith(normCandCode) || normCandCode.endsWith(normLocCode);
      });

      if (codeMatch) {
        bestMatch = codeMatch;
        matchType = 'EXACT_CODE';
        confidenceScore = 95;
      }
    }

    // 2. Check exact or strong name match if no code match yet
    if (!bestMatch && cand.extractedName) {
      const normCandName = normalizeString(cand.extractedName);
      const exactNameMatch = childLocations.find((l) => normalizeString(l.name) === normCandName);

      if (exactNameMatch) {
        bestMatch = exactNameMatch;
        matchType = 'EXACT_NAME';
        confidenceScore = 90;
      } else {
        // Calculate similarity scores strictly across childLocations on this level
        let highestSim = 0;
        let highestLoc: LocationNode | null = null;

        for (const loc of childLocations) {
          const sim = calculateSimilarity(cand.extractedName, loc.name);
          if (sim > highestSim) {
            highestSim = sim;
            highestLoc = loc;
          }
        }

        if (highestLoc && highestSim >= 0.55) {
          bestMatch = highestLoc;
          matchType = 'FUZZY_NAME';
          confidenceScore = Math.round(highestSim * 85);
        }
      }
    }

    // Compute genuine confidence level
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (confidenceScore >= 85) {
      confidence = 'HIGH';
    } else if (confidenceScore >= 55) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    // Check revision alignment: does this correspond with a previous revision hotspot?
    let hasPreviousRevisionMatch = false;
    let previousRevisionCode: string | undefined = undefined;

    if (previousRevisionHotspots && previousRevisionHotspots.length > 0) {
      const prevMatch = previousRevisionHotspots.find((prev) => {
        const codeMatches =
          (cand.extractedCode && normalizeString(prev.locationCode) === normalizeString(cand.extractedCode)) ||
          (bestMatch && prev.locationId === bestMatch.id);

        const spatialOverlap =
          Math.abs(prev.rect.x - rect.x) < 8 && Math.abs(prev.rect.y - rect.y) < 8;

        return codeMatches || spatialOverlap;
      });

      if (prevMatch) {
        hasPreviousRevisionMatch = true;
        previousRevisionCode = prevMatch.locationCode;
      }
    }

    return {
      id,
      rawText: cand.rawText,
      extractedCode: cand.extractedCode,
      extractedName: cand.extractedName,
      rect,
      polygon,
      confidence,
      confidenceScore,
      suggestedLocationId: bestMatch ? bestMatch.id : null,
      suggestedLocationCode: bestMatch ? bestMatch.code : undefined,
      suggestedLocationName: bestMatch ? bestMatch.name : undefined,
      matchType,
      detectionMethod: 'vector_text',
      status: 'pending',
      hasPreviousRevisionMatch,
      previousRevisionCode,
    };
  });

  return {
    candidates: results,
    isScannedOrNoText: false,
    totalTextItemsScanned: textItems.length,
  };
}
