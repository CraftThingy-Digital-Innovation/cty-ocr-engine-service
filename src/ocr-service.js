import { PaddleOcrService } from 'ppu-paddle-ocr';

let ocrServiceInstance = null;
let isInitializing = false;
let initPromise = null;

/**
 * Initializes and warms up the singleton PaddleOCR Service.
 * Downloads the models automatically on first execution and caches them.
 */
export async function initOcrService() {
  if (ocrServiceInstance) return ocrServiceInstance;

  if (isInitializing) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    console.log('Initializing PaddleOCR Service (downloading models if not cached)...');
    try {
      const service = new PaddleOcrService();
      await service.initialize();
      ocrServiceInstance = service;
      console.log('PaddleOCR Service successfully initialized and warmed up.');
      return ocrServiceInstance;
    } catch (error) {
      console.error('Failed to initialize PaddleOCR Service:', error);
      isInitializing = false;
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Helper to calculate encompassing bounding box for a set of words.
 */
function getEncompassingBox(words) {
  if (!words || words.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const word of words) {
    const box = word.box;
    if (box) {
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }
  }

  return {
    x: minX === Infinity ? 0 : minX,
    y: minY === Infinity ? 0 : minY,
    width: maxX === -Infinity ? 0 : (maxX - minX),
    height: maxY === -Infinity ? 0 : (maxY - minY)
  };
}

/**
 * Executes OCR text and layout detection on an image.
 * @param {string|Buffer|ArrayBuffer} imageInput File path or buffer of the target image
 */
export async function performOcr(imageInput) {
  const service = await initOcrService();
  try {
    const result = await service.recognize(imageInput);
    
    const lines = (result.lines || []).map(wordArray => {
      const lineText = wordArray.map(w => w.text).join(' ');
      const lineBox = getEncompassingBox(wordArray);
      return {
        text: lineText,
        box: lineBox,
        words: wordArray.map(w => ({
          text: w.text || '',
          box: w.box || { x: 0, y: 0, width: 0, height: 0 }
        }))
      };
    });

    return {
      text: result.text || '',
      lines
    };
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw error;
  }
}
