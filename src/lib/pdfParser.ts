import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for browser
if (typeof window !== 'undefined') {
  // Use worker from unpkg or cdnjs or fallback to fake worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ExtractedPdfTextItem {
  str: string;
  xPct: number; // 0 - 100 normalized
  yPct: number; // 0 - 100 normalized
  widthPct: number;
  heightPct: number;
}

export interface ParsedPdfPageResult {
  pageNumber: number;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  textItems: ExtractedPdfTextItem[];
  renderedImageDataUrl?: string;
  isVectorWithText: boolean;
  isScannedOrNoText: boolean;
}

/**
 * Genuinely parses an uploaded PDF file in the browser using pdfjs-dist.
 * Extracts:
 * - Real embedded PDF text strings
 * - Exact coordinates (xPct, yPct) for each text label
 * - Page dimensions & total page count
 * - Detects whether file is a Vector PDF (has embedded text) or Scanned/Raster PDF (no text objects)
 * - Renders the selected PDF page to a crisp PNG data URL via native HTML5 canvas
 */
export async function parsePdfDocument(
  pdfData: ArrayBuffer | Uint8Array,
  targetPageNumber = 1
): Promise<ParsedPdfPageResult> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  const clampedPageNum = Math.max(1, Math.min(pageCount, targetPageNumber));

  const page = await doc.getPage(clampedPageNum);
  const viewport = page.getViewport({ scale: 1.5 }); // High resolution for construction sheets

  // Extract genuine text objects from PDF page
  const textContent = await page.getTextContent();
  const textItems: ExtractedPdfTextItem[] = [];

  for (const item of textContent.items) {
    if ('str' in item && typeof item.str === 'string' && item.str.trim().length > 0) {
      const tx = item.transform[4];
      const ty = item.transform[5];
      const itemWidth = item.width || 20;
      const itemHeight = item.height || 12;

      // In PDF coordinate system, origin (0,0) is bottom-left.
      // Convert to top-left normalized percentages (0 - 100%):
      const xPct = Math.max(0, Math.min(100, (tx / (viewport.width / 1.5)) * 100));
      const yPct = Math.max(0, Math.min(100, (((viewport.height / 1.5) - ty) / (viewport.height / 1.5)) * 100));
      const widthPct = Math.max(1, Math.min(50, (itemWidth / (viewport.width / 1.5)) * 100));
      const heightPct = Math.max(0.5, Math.min(20, (itemHeight / (viewport.height / 1.5)) * 100));

      textItems.push({
        str: item.str.trim(),
        xPct: Math.round(xPct * 10) / 10,
        yPct: Math.round(yPct * 10) / 10,
        widthPct: Math.round(widthPct * 10) / 10,
        heightPct: Math.round(heightPct * 10) / 10,
      });
    }
  }

  // Render PDF page to HTML5 Canvas
  let renderedImageDataUrl: string | undefined;
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await (page.render as any)({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;
        renderedImageDataUrl = canvas.toDataURL('image/png');
      }
    } catch (renderErr) {
      console.warn('PDF canvas render fallback:', renderErr);
    }
  }

  const isVectorWithText = textItems.length > 0;
  const isScannedOrNoText = textItems.length === 0;

  return {
    pageNumber: clampedPageNum,
    pageCount,
    pageWidth: Math.round(viewport.width / 1.5),
    pageHeight: Math.round(viewport.height / 1.5),
    textItems,
    renderedImageDataUrl,
    isVectorWithText,
    isScannedOrNoText,
  };
}
