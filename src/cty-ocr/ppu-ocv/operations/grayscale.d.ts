import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        grayscale: GrayscaleOptions;
    }
}
export interface GrayscaleOptions extends PartialOptions {
}
export declare function grayscale(img: cv.Mat, options: GrayscaleOptions): OperationResult;
