import type { BoundingBox, OperationResult, Points, RequiredOptions } from "../index.js";
import { cv } from "../index.js";
declare module "../index" {
    interface RegisteredOperations {
        warp: WarpOptions;
    }
}
export interface WarpOptions extends RequiredOptions {
    /** Four points of the source image containing x and y point in
     * topLeft, topRight, bottomLeft and BottomRight.
     * Use Contours class instance to get the points
     */
    points: Points;
    /** A destination canvas bounding box for cropping the original canvas */
    bbox: BoundingBox;
}
export declare function warp(img: cv.Mat, options: WarpOptions): OperationResult;
