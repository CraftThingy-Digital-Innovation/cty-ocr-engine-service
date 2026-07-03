import { Canvas, cv } from "./index.js";
import type { AdaptiveThresholdOptions, BlurOptions, BorderOptions, CannyOptions, DilateOptions, ErodeOptions, GrayscaleOptions, InvertOptions, MorphologicalGradientOptions, OperationName, OperationOptions, RequiredOptions, ResizeOptions, RotateOptions, ThresholdOptions, WarpOptions } from "./index.js";
import type { ConvertOptions } from "./pipeline/index.js";
type NameWithRequiredOptions = {
    [N in OperationName]: OperationOptions<N> extends RequiredOptions ? N : never;
}[OperationName];
type NameWithOptionalOptions = Exclude<OperationName, NameWithRequiredOptions>;
export declare class ImageProcessor {
    img: cv.Mat;
    width: number;
    height: number;
    /**
     * Create an ImageProcessor instance from a Canvas or cv.Mat
     * @param source Source image as Canvas or cv.Mat
     */
    constructor(source: Canvas | cv.Mat);
    /**
     * Convert array buffer to canvas
     */
    static prepareCanvas(file: ArrayBuffer): Promise<Canvas>;
    /**
     * Convert canvas to array buffer
     */
    static prepareBuffer(canvas: Canvas): Promise<ArrayBuffer>;
    /**
     * Initialize OpenCV runtime, this is recommended to be called before any image processing
     */
    static initRuntime(): Promise<void>;
    /**
     * Execute a registered pipeline operation that requires options.
     * @param operationName Name of the operation (e.g., "resize")
     * @param options Required options for the operation
     */
    execute<Name extends NameWithRequiredOptions>(operationName: Name, options: OperationOptions<Name>): this;
    /**
     * Execute a registered pipeline operation where options are optional or have defaults.
     * @param operationName Name of the operation (e.g., "blur", "grayscale")
     * @param options Optional or partial options for the operation
     */
    execute<Name extends NameWithOptionalOptions>(operationName: Name, options?: Partial<OperationOptions<Name>>): this;
    /**
     * Convert image to grayscale
     * @description Usage order: independent
     * @param options Optional configuration for grayscale conversion
     */
    grayscale(options?: Partial<GrayscaleOptions>): this;
    /**
     * Invert image colors
     * @description Usage order: ideally (after) threshold or adaptiveThreshold
     * @param options Optional configuration for inversion
     */
    invert(options?: Partial<InvertOptions>): this;
    /**
     * Add border to image
     * @description Usage order: independent
     * @param options Border configuration options
     */
    border(options?: Partial<BorderOptions>): this;
    /**
     * Bluring image to reduce noise using Gaussian Blur
     * @description Usage order: (ideally after) grayscale
     * @param options Blur configuration options
     */
    blur(options?: Partial<BlurOptions>): this;
    /** Thresholding to convert image to binary
     * @description Usage order: (after) grayscale (and optionally blur)
     * @param options Thresholding configuration options
     */
    threshold(options?: Partial<ThresholdOptions>): this;
    /** Adaptive thresholding to convert image to binary
     * @description Usage order: (after) grayscale (and optionally blur)
     * @param options Adaptive thresholding configuration options
     */
    adaptiveThreshold(options?: Partial<AdaptiveThresholdOptions>): this;
    /**
     * Canny edge detection to detect edges in the image
     * @description Usage order: (after) grayscale + blur
     * @param options Canny edge detection configuration options
     */
    canny(options?: Partial<CannyOptions>): this;
    /**
     * Morphological gradient to highlight the edges in the image
     * @description Usage order: (after) dilation + erosion (or threshold)
     * @param options Morphological gradient configuration options
     */
    morphologicalGradient(options?: Partial<MorphologicalGradientOptions>): this;
    /**
     * Erode image to reduce noise
     * @description Usage order: (after) threshold or edge detection
     * @param options Erosion configuration options
     */
    erode(options?: Partial<ErodeOptions>): this;
    /**
     * Dilate image to increase the size of the foreground object
     * @description Usage order: (after) threshold or edge detection
     * @param options Dilation configuration options
     */
    dilate(options?: Partial<DilateOptions>): this;
    /**
     * Resize image to a new width and height
     * @description Usage order: independent
     *  @param options Resize configuration options
     */
    resize(options: ResizeOptions): this;
    /**
     * Warp image to a new perspective
     * @description Usage order: independent
     * @param options Warp configuration options
     */
    warp(options: WarpOptions): this;
    /**
     * Rotate image by a given angle
     * @description Usage order: independent
     * @param options Rotate configuration options
     */
    rotate(options: RotateOptions): this;
    /**
     * Convert image matrix into new matrix type
     * @description Usage order: independent
     * @param options Convert configuration options
     */
    convert(options: ConvertOptions): this;
    /**
     * Destroy the image (cv.Mat) stored in image processor state
     * @kind non-chainable
     * @returns void
     */
    destroy(): void;
    /**
     * Convert image to cv.Mat
     * @kind non-chainable
     * @returns cv.Mat
     */
    toMat(): cv.Mat;
    /**
     * Convert image (cv.Mat) to Canvas
     * @kind non-chainable
     * @returns Canvas
     */
    toCanvas(): Canvas;
}
export {};
