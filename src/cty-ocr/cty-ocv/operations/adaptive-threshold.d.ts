import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        adaptiveThreshold: AdaptiveThresholdOptions;
    }
}
export interface AdaptiveThresholdOptions extends PartialOptions {
    /** Upper threshold value (0-255) */
    upper: number;
    /** Adaptive threshold method (cv.ADAPTIVE_THRESH_...) */
    method: cv.AdaptiveThresholdTypes;
    /** Type of thresholding (cv.THRESH_...) */
    type: cv.ThresholdTypes;
    /** Block size for adaptive thresholding (must be odd) */
    size: number;
    /** Constant subtracted from the mean or weighted mean */
    constant: number;
}
export declare function adaptiveThreshold(img: cv.Mat, options: AdaptiveThresholdOptions): OperationResult;
