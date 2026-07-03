import type { OperationResult, RequiredOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        convert: ConvertOptions;
    }
}
export interface ConvertOptions extends RequiredOptions {
    /** Desired matrix type (cv.CV_...) if negative, it will be the same as input */
    rtype: number;
}
export declare function convert(img: cv.Mat, options: ConvertOptions): OperationResult;
