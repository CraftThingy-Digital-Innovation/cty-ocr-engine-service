import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        blur: BlurOptions;
    }
}
export interface BlurOptions extends PartialOptions {
    /** Size of the blur [x, y] */
    size: [number, number];
    /** Gaussian kernel standard deviation on x axis */
    sigma: number;
}
export declare function blur(img: cv.Mat, options: BlurOptions): OperationResult;
