import type { OperationResult, RequiredOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        resize: ResizeOptions;
    }
}
export interface ResizeOptions extends RequiredOptions {
    /** Width of the resized image */
    width: number;
    /** Height of the resized image */
    height: number;
}
export declare function resize(img: cv.Mat, options: ResizeOptions): OperationResult;
