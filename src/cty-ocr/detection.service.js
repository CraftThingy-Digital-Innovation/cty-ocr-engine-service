import * as ort from "onnxruntime-node";
import { Canvas, CanvasToolkit, Contours, createCanvas, cv, ImageProcessor } from "./cty-ocv/index.js";
import { DEFAULT_DEBUGGING_OPTIONS, DEFAULT_DETECTION_OPTIONS } from "./constants.js";

export class DetectionService {
  options;
  debugging;
  session;
  static NUM_CHANNELS = 3;

  constructor(session, options = {}, debugging = {}) {
    this.session = session;
    this.options = { ...DEFAULT_DETECTION_OPTIONS, ...options };
    this.debugging = { ...DEFAULT_DEBUGGING_OPTIONS, ...debugging };
  }

  log(message) {
    if (this.debugging.verbose) {
      console.log(`[DetectionService] ${message}`);
    }
  }

  async run(image) {
    this.log("Starting text detection process");
    try {
      let input = await this.preprocessDetection(image);
      let detection = await this.runInference(input.tensor, input.width, input.height);
      if (!detection) {
        console.error("Text detection failed (output tensor is null)");
        return [];
      }
      let detectedBoxes = this.postprocessDetection(detection, input);
      if (this.debugging.debug) {
        await this.debugDetectionCanvas(detection, input.width, input.height);
        await this.debugDetectedBoxes(image, detectedBoxes);
      }
      this.log(`Detected ${detectedBoxes.length} text boxes in image`);
      return detectedBoxes;
    } catch (error) {
      console.error("Error during text detection:", error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  async preprocessDetection(image) {
    let initialCanvas = image instanceof Canvas ? image : await ImageProcessor.prepareCanvas(image);
    const { width: originalWidth, height: originalHeight } = initialCanvas;
    const { width: resizeW, height: resizeH, ratio: resizeRatio } = this.calculateResizeDimensions(originalWidth, originalHeight);
    
    let processor = new ImageProcessor(initialCanvas);
    let resizedCanvas = processor.resize({ width: resizeW, height: resizeH }).toCanvas();
    processor.destroy();
    
    let width = Math.ceil(resizeW / 32) * 32;
    let height = Math.ceil(resizeH / 32) * 32;
    let paddedCanvas = this.createPaddedCanvas(resizedCanvas, resizeW, resizeH, width, height);
    let tensor = this.imageToTensor(paddedCanvas, width, height);
    
    this.log(`Detection preprocessed: original(${originalWidth}x${originalHeight}), ` +
      `model_input(${width}x${height}), resize_ratio: ${resizeRatio.toFixed(4)}`);
    
    return { tensor, width, height, resizeRatio, originalWidth, originalHeight };
  }

  calculateResizeDimensions(originalWidth, originalHeight) {
    let MAX_SIDE_LEN = this.options.maxSideLength;
    let resizeW = originalWidth;
    let resizeH = originalHeight;
    let ratio = 1;
    if (Math.max(resizeH, resizeW) > MAX_SIDE_LEN) {
      ratio = MAX_SIDE_LEN / (resizeH > resizeW ? resizeH : resizeW);
      resizeW = Math.round(resizeW * ratio);
      resizeH = Math.round(resizeH * ratio);
    }
    return { width: resizeW, height: resizeH, ratio };
  }

  createPaddedCanvas(resizedCanvas, resizeW, resizeH, targetWidth, targetHeight) {
    let paddedCanvas = createCanvas(targetWidth, targetHeight);
    let paddedCtx = paddedCanvas.getContext("2d");
    paddedCtx.drawImage(resizedCanvas, 0, 0, resizeW, resizeH);
    return paddedCanvas;
  }

  imageToTensor(canvas, width, height) {
    let ctx = canvas.getContext("2d");
    let imageData = ctx.getImageData(0, 0, width, height);
    let rgbaData = imageData.data;
    let tensor = new Float32Array(DetectionService.NUM_CHANNELS * height * width);
    const { mean, stdDeviation } = this.options;
    
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        let rgbaIdx = (h * width + w) * 4;
        let tensorBaseIdx = h * width + w;
        for (let c = 0; c < DetectionService.NUM_CHANNELS; c++) {
          let pixelValue = rgbaData[rgbaIdx + c] / 255;
          let normalizedValue = (pixelValue - mean[c]) / stdDeviation[c];
          tensor[c * height * width + tensorBaseIdx] = normalizedValue;
        }
      }
    }
    return tensor;
  }

  async runInference(tensor, width, height) {
    try {
      this.log("Running detection inference...");
      let inputTensor = new ort.Tensor("float32", tensor, [1, 3, height, width]);
      let feeds = { x: inputTensor };
      let results = await this.session.run(feeds);
      let outputTensor = results[this.session.outputNames[0] || "sigmoid_0.tmp_0"];
      this.log("Detection inference complete!");
      if (!outputTensor) {
        console.error(`Output tensor ${this.session.outputNames[0]} not found in detection results`);
        return null;
      }
      return outputTensor.data;
    } catch (error) {
      console.error("Error during model inference:", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  tensorToCanvas(tensor, width, height) {
    let canvas = createCanvas(width, height);
    let ctx = canvas.getContext("2d");
    let imageData = ctx.createImageData(width, height);
    let data = imageData.data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let mapIndex = y * width + x;
        let probability = tensor[mapIndex] || 0;
        let grayValue = Math.round(probability * 255);
        let pixelIdx = (y * width + x) * 4;
        data[pixelIdx] = grayValue;
        data[pixelIdx + 1] = grayValue;
        data[pixelIdx + 2] = grayValue;
        data[pixelIdx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  postprocessDetection(detection, input, minBoxAreaOnPadded = this.options.minimumAreaThreshold || 20, paddingVertical = this.options.paddingVertical || 0.4, paddingHorizontal = this.options.paddingHorizontal || 0.6) {
    this.log("Post-processing detection results...");
    const { width, height, resizeRatio, originalWidth, originalHeight } = input;
    let canvas = this.tensorToCanvas(detection, width, height);
    let processor = new ImageProcessor(canvas);
    processor.grayscale().convert({ rtype: cv.CV_8UC1 });
    
    let contours = new Contours(processor.toMat(), { mode: cv.RETR_LIST, method: cv.CHAIN_APPROX_SIMPLE });
    let boxes = this.extractBoxesFromContours(contours, width, height, resizeRatio, originalWidth, originalHeight, minBoxAreaOnPadded, paddingVertical, paddingHorizontal);
    
    processor.destroy();
    contours.destroy();
    
    this.log(`Found ${boxes.length} potential text boxes`);
    return boxes;
  }

  extractBoxesFromContours(contours, width, height, resizeRatio, originalWidth, originalHeight, minBoxArea, paddingVertical, paddingHorizontal) {
    let boxes = [];
    contours.iterate((contour) => {
      let rect = contours.getRect(contour);
      if (rect.width * rect.height <= minBoxArea) {
        return;
      }
      let paddedRect = this.applyPaddingToRect(rect, width, height, paddingVertical, paddingHorizontal);
      let finalBox = this.convertToOriginalCoordinates(paddedRect, resizeRatio, originalWidth, originalHeight);
      if (finalBox.width > 5 && finalBox.height > 5) {
        boxes.push(finalBox);
      }
    });
    return boxes;
  }

  applyPaddingToRect(rect, maxWidth, maxHeight, paddingVertical, paddingHorizontal) {
    let verticalPadding = Math.round(rect.height * paddingVertical);
    let horizontalPadding = Math.round(rect.height * paddingHorizontal);
    let x = rect.x - horizontalPadding;
    let y = rect.y - verticalPadding;
    let width = rect.width + 2 * horizontalPadding;
    let height = rect.height + 2 * verticalPadding;
    x = Math.max(0, x);
    y = Math.max(0, y);
    let rightEdge = Math.min(maxWidth, rect.x + rect.width + horizontalPadding);
    let bottomEdge = Math.min(maxHeight, rect.y + rect.height + verticalPadding);
    width = rightEdge - x;
    height = bottomEdge - y;
    return { x, y, width, height };
  }

  convertToOriginalCoordinates(rect, resizeRatio, originalWidth, originalHeight) {
    let scaledX = rect.x / resizeRatio;
    let scaledY = rect.y / resizeRatio;
    let scaledWidth = rect.width / resizeRatio;
    let scaledHeight = rect.height / resizeRatio;
    let x = Math.max(0, Math.round(scaledX));
    let y = Math.max(0, Math.round(scaledY));
    let width = Math.min(originalWidth - x, Math.round(scaledWidth));
    let height = Math.min(originalHeight - y, Math.round(scaledHeight));
    return { x, y, width, height };
  }

  async debugDetectionCanvas(detection, width, height) {
    let canvas = this.tensorToCanvas(detection, width, height);
    let dir = this.debugging.debugFolder;
    await CanvasToolkit.getInstance().saveImage({ canvas, filename: "detection-debug", path: dir });
    this.log(`Probability map visualized and saved to: ${dir}`);
  }

  async debugDetectedBoxes(image, boxes) {
    let canvas = image instanceof Canvas ? image : await ImageProcessor.prepareCanvas(image);
    let ctx = canvas.getContext("2d");
    let toolkit = CanvasToolkit.getInstance();
    for (let box of boxes) {
      const { x, y, width, height } = box;
      toolkit.drawLine({ ctx, x, y, width, height });
    }
    let dir = this.debugging.debugFolder;
    await CanvasToolkit.getInstance().saveImage({ canvas, filename: "boxes-debug", path: dir });
    this.log(`Boxes visualized and saved to: ${dir}`);
  }
}
