import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        invert: InvertOptions;
    }
}
export interface InvertOptions extends PartialOptions {
}
export declare function invert(img: cv.Mat, options: InvertOptions): OperationResult;
