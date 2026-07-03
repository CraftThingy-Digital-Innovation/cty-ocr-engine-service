import * as ort from "onnxruntime-node";
import { Canvas, CanvasToolkit, ImageProcessor } from "./cty-ocv/index.js";
import { DEFAULT_DEBUGGING_OPTIONS, DEFAULT_RECOGNITION_OPTIONS } from "./constants.js";

export class RecognitionService {
  options;
  debugging;
  session;
  toolkit;
  static BLANK_INDEX = 0;
  static UNK_TOKEN = "<unk>";
  static MIN_CROP_WIDTH = 8;

  constructor(session, options = {}, debugging = {}) {
    this.session = session;
    this.toolkit = CanvasToolkit.getInstance();
    this.options = { ...DEFAULT_RECOGNITION_OPTIONS, ...options };
    this.debugging = { ...DEFAULT_DEBUGGING_OPTIONS, ...debugging };
  }

  log(message) {
    if (this.debugging.verbose) {
      console.log(`[RecognitionService] ${message}`);
    }
  }

  async run(image, detection) {
    this.log("Starting text recognition process");
    try {
      let sourceCanvasForCrop = image instanceof Canvas ? image : await ImageProcessor.prepareCanvas(image);
      let validBoxes = this.filterValidBoxes(detection);
      let results = await this.processBoxesInParallel(sourceCanvasForCrop, validBoxes);
      return this.sortResultsByReadingOrder(results);
    } catch (error) {
      console.error("Error during text recognition:", error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  filterValidBoxes(boxes) {
    return boxes.map((box, index) => ({ box, index })).filter(({ box, index }) => this.isValidBox(box, index));
  }

  async processBoxesInParallel(sourceCanvas, boxData) {
    let cropsDebugPath = this.debugging.debugFolder + "/crops";
    if (this.debugging.debug) {
      this.toolkit.clearOutput(cropsDebugPath);
    }

    // Isomorphic check: run sequentially in browser, concurrently in Node
    if (typeof window !== "undefined") {
      const results = [];
      for (let i = 0; i < boxData.length; i++) {
        const { box, index } = boxData[i];
        
        // Yield to the browser main thread to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 10));
        
        try {
          const result = await this.processBox(sourceCanvas, box, index, boxData.length, cropsDebugPath);
          if (result !== null) {
            results.push(result);
          }
        } catch (err) {
          console.error(`Error in sequential processBox ${index}:`, err);
        }
      }
      return results;
    } else {
      let processingTasks = boxData.map(({ box, index }) => this.processBox(sourceCanvas, box, index, boxData.length, cropsDebugPath));
      let results = await Promise.all(processingTasks);
      return results.filter((result) => result !== null);
    }
  }

  async processBox(sourceCanvas, box, index, totalBoxes, debugPath) {
    let start = Date.now();
    try {
      let cropCanvas = this.cropRegion(sourceCanvas, box);
      let recognizedText = await this.recognizeText(cropCanvas);
      if (this.debugging.debug) {
        await this.saveDebugCrop(cropCanvas, index, debugPath);
        this.logProcessingDetails(box, index, totalBoxes, recognizedText, start);
      }
      return { text: recognizedText, box };
    } catch (e) {
      console.error(`Error processing box ${index + 1}: ${e.message}`, e.stack);
      return null;
    }
  }

  sortResultsByReadingOrder(results) {
    return [...results].sort((a, b) => {
      let boxA = a.box;
      let boxB = b.box;
      if (Math.abs(boxA.y - boxB.y) < (boxA.height + boxB.height) / 4) {
        return boxA.x - boxB.x;
      }
      return boxA.y - boxB.y;
    });
  }

  isValidBox(box, index) {
    if (box.width <= 0 || box.height <= 0) {
      console.warn(`Skipping invalid box ${index + 1}: w=${box.width}, h=${box.height}`);
      return false;
    }
    return true;
  }

  cropRegion(sourceCanvas, box) {
    return this.toolkit.crop({
      bbox: { x0: box.x, y0: box.y, x1: box.x + box.width, y1: box.y + box.height },
      canvas: sourceCanvas
    });
  }

  async saveDebugCrop(cropCanvas, index, outputPath) {
    await this.toolkit.saveImage({ canvas: cropCanvas, filename: `crop_${String(index).padStart(3, "0")}.png`, path: outputPath });
  }

  logProcessingDetails(box, index, totalBoxes, text, startTime) {
    let processingTime = Date.now() - startTime;
    this.log(`Box ${index + 1}/${totalBoxes}: [x:${box.x}, y:${box.y}, w:${box.width}, h:${box.height}]` +
      ` → "${text}" (processed in ${processingTime}ms)`);
  }

  async recognizeText(cropCanvas) {
    const { imageTensor, tensorWidth, tensorHeight } = await this.preprocessImage(cropCanvas);
    let inputTensor = new ort.Tensor("float32", imageTensor, [1, 3, tensorHeight, tensorWidth]);
    let results = await this.runInference(inputTensor);
    return this.decodeResults(results);
  }

  async preprocessImage(cropCanvas) {
    let processor = new ImageProcessor(cropCanvas);
    let targetHeight = this.options.imageHeight;
    let originalWidth = processor.width;
    let originalHeight = processor.height;
    if (originalHeight === 0 || originalWidth === 0) {
      throw new Error(`Crop dimensions are zero: ${originalWidth}x${originalHeight}`);
    }
    let aspectRatio = originalWidth / originalHeight;
    let resizedWidth = Math.max(RecognitionService.MIN_CROP_WIDTH, Math.round(targetHeight * aspectRatio));
    processor.resize({ width: resizedWidth, height: targetHeight });
    let imageTensor = this.createImageTensor(processor, resizedWidth, targetHeight);
    processor.destroy();
    return { imageTensor, tensorWidth: resizedWidth, tensorHeight: targetHeight };
  }

  createImageTensor(processor, width, height) {
    let canvas = processor.toCanvas();
    let ctx = canvas.getContext("2d");
    let imageData = ctx.getImageData(0, 0, width, height);
    let pixelData = imageData.data;
    let numChannels = 3;
    let imageTensor = new Float32Array(numChannels * height * width);
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        let pixelIndex = (h * width + w) * 4;
        let grayValue = pixelData[pixelIndex];
        let normalizedValue = (grayValue / 255 - 0.5) / 0.5;
        for (let c = 0; c < numChannels; c++) {
          let tensorIndex = c * height * width + h * width + w;
          imageTensor[tensorIndex] = normalizedValue;
        }
      }
    }
    return imageTensor;
  }

  async runInference(inputTensor) {
    let feeds = { x: inputTensor };
    let results = await this.session.run(feeds);
    let outputNodeName = Object.keys(results)[0];
    let outputTensor = results[outputNodeName];
    if (!outputTensor) {
      throw new Error(`Recognition output tensor '${outputNodeName}' not found. Available keys: ${Object.keys(results)}`);
    }
    return outputTensor;
  }

  decodeResults(outputTensor) {
    let outputData = outputTensor.data;
    let outputShape = outputTensor.dims;
    let sequenceLength = outputShape[1];
    let numClasses = outputShape[2];
    if (numClasses !== this.options.charactersDictionary.length) {
      console.warn(`Warning: Model output classes (${numClasses}) does not match dictionary length (${this.options.charactersDictionary.length})`);
    }
    return this.ctcGreedyDecode(outputData, sequenceLength, numClasses, this.options.charactersDictionary);
  }

  ctcGreedyDecode(logits, sequenceLength, numClasses, charDict) {
    let decodedText = "";
    let lastCharIndex = -1;
    for (let t = 0; t < sequenceLength; t++) {
      const { index: predictedClassIndex } = this.findMaxProbabilityClass(logits, t, numClasses);
      if (predictedClassIndex === RecognitionService.BLANK_INDEX || predictedClassIndex === lastCharIndex) {
        lastCharIndex = predictedClassIndex;
        continue;
      }
      if (this.isValidDictionaryIndex(predictedClassIndex, charDict)) {
        this.appendCharacterToText(predictedClassIndex, charDict, (char) => {
          decodedText += char;
        });
      } else {
        console.warn(`Decoded index ${predictedClassIndex} out of bounds for charDict (length ${charDict.length}) at t=${t}`);
      }
      lastCharIndex = predictedClassIndex;
    }
    return decodedText;
  }

  appendCharacterToText(index, charDict, appendFn) {
    let char = charDict[index];
    if (index === charDict.length - 1) {
      if (char === RecognitionService.UNK_TOKEN) {
        return;
      } else {
        appendFn(" ");
        return;
      }
    }
    appendFn(char);
  }

  findMaxProbabilityClass(logits, timestep, numClasses) {
    let maxProb = -1 / 0;
    let maxIndex = 0;
    for (let c = 0; c < numClasses; c++) {
      let prob = logits[timestep * numClasses + c];
      if (prob > maxProb) {
        maxProb = prob;
        maxIndex = c;
      }
    }
    return { value: maxProb, index: maxIndex };
  }

  isValidDictionaryIndex(index, charDict) {
    return index >= 0 && index < charDict.length;
  }
}
