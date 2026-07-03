import { readFileSync } from "fs";
import * as path from "path";
import * as ort from "onnxruntime-node";
import { ImageProcessor } from "./cty-ocv/index.js";
import { DEFAULT_PADDLE_OPTIONS } from "./constants.js";
import { DetectionService } from "./detection.service.js";
import { RecognitionService } from "./recognition.service.js";

export class PaddleOcrService {
  static instance = null;
  options;
  detectionSession = null;
  recognitionSession = null;

  constructor(options) {
    this.options = { ...DEFAULT_PADDLE_OPTIONS, ...options };
  }

  log(message) {
    if (this.options.debugging?.verbose) {
      console.log(`[PaddleOcrService] ${message}`);
    }
  }

  async initialize(overrideOptions) {
    try {
      let effectiveOptions = { ...this.options, ...overrideOptions };
      let detectionPath = effectiveOptions.model.detection;
      let recognitionPath = effectiveOptions.model.recognition;
      let charactersPath = effectiveOptions.model.charactersDictionary;

      if (typeof window !== "undefined") {
        // Browser client execution path
        this.log(`Browser: Fetching dictionary from: ${charactersPath}`);
        const dictResponse = await fetch(charactersPath);
        if (!dictResponse.ok) {
          throw new Error(`Failed to fetch characters dictionary: ${dictResponse.status} ${dictResponse.statusText}`);
        }
        const dictText = await dictResponse.text();
        const charactersDictionary = dictText.split('\n');
        this.options.recognition.charactersDictionary = charactersDictionary;
        this.log(`Character dictionary loaded with ${charactersDictionary.length} entries.`);

        this.log(`Browser: Loading Detection model from: ${detectionPath}`);
        const isDetOrt = detectionPath.toLowerCase().endsWith('.ort');
        const detOptions = isDetOrt ? { graphOptimizationLevel: 'disabled' } : {};
        this.detectionSession = await ort.InferenceSession.create(detectionPath, detOptions);

        this.log(`Browser: Loading Recognition model from: ${recognitionPath}`);
        const isRecOrt = recognitionPath.toLowerCase().endsWith('.ort');
        const recOptions = isRecOrt ? { graphOptimizationLevel: 'disabled' } : {};
        this.recognitionSession = await ort.InferenceSession.create(recognitionPath, recOptions);
      } else {
        // Node.js server execution path
        let resolvedDetectionPath = path.resolve(process.cwd(), detectionPath);
        let resolvedRecognitionPath = path.resolve(process.cwd(), recognitionPath);
        let resolvedCharactersPath = path.resolve(process.cwd(), charactersPath);

        this.log(`Node: Loading Detection ONNX model from: ${resolvedDetectionPath}`);
        let detModelBuffer = readFileSync(resolvedDetectionPath).buffer;
        const isDetOrt = detectionPath.toLowerCase().endsWith('.ort');
        const detOptions = isDetOrt ? { graphOptimizationLevel: 'disabled' } : {};
        this.detectionSession = await ort.InferenceSession.create(detModelBuffer, detOptions);
        
        await new Promise((resolve) => setImmediate(resolve));

        this.log(`Node: Loading Recognition ONNX model from: ${resolvedRecognitionPath}`);
        let recModelBuffer = readFileSync(resolvedRecognitionPath).buffer;
        const isRecOrt = recognitionPath.toLowerCase().endsWith('.ort');
        const recOptions = isRecOrt ? { graphOptimizationLevel: 'disabled' } : {};
        this.recognitionSession = await ort.InferenceSession.create(recModelBuffer, recOptions);
        
        await new Promise((resolve) => setImmediate(resolve));

        this.log(`Node: Loading character dictionary from: ${resolvedCharactersPath}`);
        let charactersDictionary = readFileSync(resolvedCharactersPath, "utf-8").split('\n');
        if (!charactersDictionary.length) {
          throw new Error(`Character dictionary at ${resolvedCharactersPath} is empty or not found.`);
        }
        this.options.recognition.charactersDictionary = charactersDictionary;
      }

      this.log(`Initialization complete. Character dictionary has ${this.options.recognition?.charactersDictionary?.length || 0} entries.`);
    } catch (error) {
      console.error("Failed to initialize PaddleOcrService:", error);
      throw error;
    }
  }

  static async getInstance(options) {
    if (!PaddleOcrService.instance) {
      PaddleOcrService.instance = new PaddleOcrService(options);
      await PaddleOcrService.instance.initialize();
    } else if (options) {
      await PaddleOcrService.instance.initialize(options);
    }
    return PaddleOcrService.instance;
  }

  isInitialized() {
    return this.detectionSession !== null && this.recognitionSession !== null;
  }

  static async changeModel(options) {
    if (!PaddleOcrService.instance) {
      PaddleOcrService.instance = new PaddleOcrService(options);
      await PaddleOcrService.instance.initialize();
    } else {
      await PaddleOcrService.instance.destroy();
      await PaddleOcrService.instance.initialize(options);
    }
    return PaddleOcrService.instance;
  }

  static async createInstance(options) {
    let instance = new PaddleOcrService(options);
    await instance.initialize();
    return instance;
  }

  async recognize(image) {
    await ImageProcessor.initRuntime();
    let detector = new DetectionService(this.detectionSession, this.options.detection, this.options.debugging);
    let recognitor = new RecognitionService(this.recognitionSession, this.options.recognition, this.options.debugging);
    let detection = await detector.run(image);
    let recognition = await recognitor.run(image, detection);
    return this.groupResult(recognition);
  }

  getEncompassingBox(words) {
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

  groupResult(recognition) {
    let result = { text: "", lines: [] };
    if (!recognition.length) {
      return result;
    }
    let currentLine = [recognition[0]];
    let fullText = recognition[0].text;
    let avgHeight = recognition[0].box.height;
    
    for (let i = 1; i < recognition.length; i++) {
      let current = recognition[i];
      let previous = recognition[i - 1];
      let verticalGap = Math.abs(current.box.y - previous.box.y);
      let threshold = avgHeight * 0.5;
      
      if (verticalGap <= threshold) {
        currentLine.push(current);
        fullText += ` ${current.text}`;
        avgHeight = currentLine.reduce((sum, r) => sum + r.box.height, 0) / currentLine.length;
      } else {
        const lineText = currentLine.map(w => w.text).join(' ');
        const lineBox = this.getEncompassingBox(currentLine);
        result.lines.push({
          text: lineText,
          box: lineBox,
          words: [...currentLine]
        });
        fullText += `\n${current.text}`;
        currentLine = [current];
        avgHeight = current.box.height;
      }
    }
    if (currentLine.length > 0) {
      const lineText = currentLine.map(w => w.text).join(' ');
      const lineBox = this.getEncompassingBox(currentLine);
      result.lines.push({
        text: lineText,
        box: lineBox,
        words: [...currentLine]
      });
    }
    result.text = fullText;
    return result;
  }

  async destroy() {
    await this.detectionSession?.release();
    await this.recognitionSession?.release();
  }
}
export default PaddleOcrService;
