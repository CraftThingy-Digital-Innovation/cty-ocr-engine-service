import { PaddleOcrService } from './cty-ocr/index.js';
import path from 'path';

let ocrServiceV3 = null;
let ocrServiceV6 = null;
let isInitializingV3 = false;
let isInitializingV6 = false;
let initPromiseV3 = null;
let initPromiseV6 = null;

/**
 * Initializes and warms up the singleton PaddleOCR Service for the selected model.
 * @param {string} model 'v3' | 'v6'
 */
export async function initOcrService(model = 'v3') {
  if (model === 'v6') {
    if (ocrServiceV6) return ocrServiceV6;
    if (isInitializingV6) return initPromiseV6;

    isInitializingV6 = true;
    initPromiseV6 = (async () => {
      console.log('Initializing PaddleOCR Service for PP-OCRv6...');
      try {
        const modelsPath = path.resolve('../php-ocr-application-test/public/models');
        const service = new PaddleOcrService({
          model: {
            detection: path.join(modelsPath, 'PP-OCRv6_medium_det.onnx'),
            recognition: path.join(modelsPath, 'PP-OCRv6_medium_rec.onnx'),
            charactersDictionary: path.join(modelsPath, 'ppocrv6_dict.txt')
          },
          detection: {
            maxSideLength: 2000
          }
        });
        await service.initialize();
        ocrServiceV6 = service;
        console.log('PaddleOCR Service V6 successfully initialized and warmed up.');
        return ocrServiceV6;
      } catch (error) {
        console.error('Failed to initialize PaddleOCR Service V6:', error);
        isInitializingV6 = false;
        initPromiseV6 = null;
        throw error;
      }
    })();
    return initPromiseV6;
  } else {
    // PP-OCRv3 Default
    if (ocrServiceV3) return ocrServiceV3;
    if (isInitializingV3) return initPromiseV3;

    isInitializingV3 = true;
    initPromiseV3 = (async () => {
      console.log('Initializing PaddleOCR Service for PP-OCRv3...');
      try {
        const modelsPath = path.resolve('../php-ocr-application-test/public/models');
        const service = new PaddleOcrService({
          model: {
            detection: path.join(modelsPath, 'en_PP-OCRv3_det_infer.onnx'),
            recognition: path.join(modelsPath, 'en_PP-OCRv3_rec_infer.onnx'),
            charactersDictionary: path.join(modelsPath, 'en_dict.txt')
          },
          detection: {
            maxSideLength: 2000
          }
        });
        await service.initialize();
        ocrServiceV3 = service;
        console.log('PaddleOCR Service V3 successfully initialized and warmed up.');
        return ocrServiceV3;
      } catch (error) {
        console.error('Failed to initialize PaddleOCR Service V3:', error);
        isInitializingV3 = false;
        initPromiseV3 = null;
        throw error;
      }
    })();
    return initPromiseV3;
  }
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
 * @param {string} model 'v3' | 'v6'
 */
export async function performOcr(imageInput, model = 'v3') {
  const service = await initOcrService(model);
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
    console.error(`OCR processing failed using model ${model}:`, error);
    throw error;
  }
}
