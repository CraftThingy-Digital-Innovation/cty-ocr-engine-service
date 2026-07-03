import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        dilate: DilateOptions;
    }
}
export interface DilateOptions extends PartialOptions {
    /** Size of the block [x, y] */
    size: [number, number];
    /** Number of iterations for the dilation operation */
    iter: number;
}
export declare function dilate(img: cv.Mat, options: DilateOptions): OperationResult;
