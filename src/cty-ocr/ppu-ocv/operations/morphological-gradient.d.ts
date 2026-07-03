import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        morphologicalGradient: MorphologicalGradientOptions;
    }
}
export interface MorphologicalGradientOptions extends PartialOptions {
    /** Kernel size for the morphological gradient operation [x, y] */
    size: [number, number];
}
export declare function morphologicalGradient(img: cv.Mat, options: MorphologicalGradientOptions): OperationResult;
