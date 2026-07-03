import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        threshold: ThresholdOptions;
    }
}
export interface ThresholdOptions extends PartialOptions {
    /** Lower threshold value (0-255) */
    lower: number;
    /** Upper threshold value (0-255) */
    upper: number;
    /** Type of thresholding (cv.THRESH_...) */
    type: cv.ThresholdTypes;
}
export declare function threshold(img: cv.Mat, options: ThresholdOptions): OperationResult;
