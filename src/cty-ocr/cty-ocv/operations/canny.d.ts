import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        canny: CannyOptions;
    }
}
export interface CannyOptions extends PartialOptions {
    /** Lower threshold for the hysteresis procedure (0-255) */
    lower: number;
    /** Upper threshold for the hysteresis procedure (0-255) */
    upper: number;
}
export declare function canny(img: cv.Mat, options: CannyOptions): OperationResult;
