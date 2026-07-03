import type { OperationResult, PartialOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        border: BorderOptions;
    }
}
export interface BorderOptions extends PartialOptions {
    /** Size of the border in pixels */
    size: number;
    /** Border type (e.g., cv.BORDER_CONSTANT) */
    borderType: cv.BorderTypes;
    /** Border color in [B, G, R, A] format */
    borderColor: [cv.int, cv.int, cv.int, cv.int];
}
export declare function border(img: cv.Mat, options: BorderOptions): OperationResult;
