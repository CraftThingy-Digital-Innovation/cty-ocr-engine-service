import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        erode: ErodeOptions;
    }
}
export interface ErodeOptions extends PartialOptions {
    /** Size of the block [x, y] */
    size: [number, number];
    /** Number of iterations for the erosion operation */
    iter: number;
}
export declare function erode(img: cv.Mat, options: ErodeOptions): OperationResult;
