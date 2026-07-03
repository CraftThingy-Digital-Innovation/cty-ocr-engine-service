import { pdfToImg } from 'pdftoimg-js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

/**
 * Gets the total number of pages in a PDF file.
 * @param {string} pdfPath Path to the PDF file
 * @returns {Promise<number>} Total page count
 */
export async function getPdfPageCount(pdfPath) {
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Error listing PDF pages:', error);
    throw new Error('Failed to parse PDF pages: ' + error.message);
  }
}

/**
 * Renders a specific PDF page to a PNG Buffer in-memory.
 * @param {string} pdfPath Path to the PDF file
 * @param {number} pageNum 1-based page number to convert
 * @returns {Promise<Buffer>} Path to the generated image file
 */
export async function convertPdfPageToImage(pdfPath, pageNum) {
  try {
    // Render single page to base64 Data URL
    const dataUrl = await pdfToImg(pdfPath, {
      pages: pageNum,
      scale: 1.5 // 1.5 scale is high-quality enough for OCR
    });

    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error(`Failed to render page ${pageNum} to data URL`);
    }

    // Convert data URL to Node.js Buffer
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error(`Error rendering PDF page ${pageNum} to buffer:`, error);
    throw error;
  }
}

