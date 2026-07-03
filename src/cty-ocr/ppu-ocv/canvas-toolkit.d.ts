import type { BoundingBox, SKRSContext2D } from "./index.js";
import { Canvas, cv } from "./index.js";
/**
 * Singleton class for canvas manipulation utilities
 */
export declare class CanvasToolkit {
    private static instance;
    private step;
    /**
     * Private constructor to prevent direct instantiation
     */
    private constructor();
    /**
     * Get the singleton instance of CanvasToolkit
     * @returns The singleton instance
     * @example
     * const canvasToolkit = CanvasToolkit.getInstance();
     */
    static getInstance(): CanvasToolkit;
    /**
     * Crop a part of source canvas and return a new canvas of the cropped part
     * @param options
     * @param options.bbox Bounding box of the cropped part
     * @param options.canvas Source canvas
     * @returns A new canvas of the cropped part
     * @example
     * const croppedCanvas = CanvasToolkit.getInstance().crop({
     *   bbox: { x0: 10, y0: 10, x1: 100, y1: 100 },
     *   canvas: sourceCanvas,
     * });
     */
    crop(options: {
        bbox: BoundingBox;
        canvas: Canvas;
    }): Canvas;
    /**
     * Check whether a binary canvas is dirty (full of major color either black or white) or not
     * @param options
     * @param options.canvas Source canvas
     * @param options.threshold Threshold for color detection (default: 127.5)
     * @param options.majorColorThreshold Major color threshold (default: 0.97)
     * @returns true if the canvas is dirty, false otherwise
     * @example
     * const isDirty = CanvasToolkit.getInstance().isDirty({
     *   canvas: sourceCanvas,
     *   threshold: 127.5,
     *   majorColorThreshold: 0.97,
     * });
     * console.log(isDirty); // true or false
     */
    isDirty(options: {
        canvas: Canvas;
        threshold?: number;
        majorColorThreshold?: number;
    }): boolean;
    /**
     * Save a canvas to an image file
     * @param options
     * @param options.canvas Source canvas
     * @param options.filename Filename of the image file
     * @param options.path Path to save the image file (default: "out")
     * @returns A promise that resolves when the image is saved
     * @example
     * await CanvasToolkit.getInstance().saveImage({
     *   canvas: sourceCanvas,
     *   filename: "output.png",
     * });
     */
    saveImage(options: {
        canvas: Canvas;
        filename: string;
        path: string;
    }): Promise<void>;
    /**
     * Clear the output folder
     * @param path Path to the output folder (default: "out")
     */
    clearOutput(path?: string): void;
    /**
     * Draw a non-filled rectangle on the canvas
     * @param options
     * @param options.ctx Canvas rendering context
     * @param options.x X coordinate of the top-left corner
     * @param options.y Y coordinate of the top-left corner
     * @param options.width Width of the rectangle
     * @param options.height Height of the rectangle
     * @param options.lineWidth Line width (default: 2)
     * @param options.color Color of the rectangle (default: "blue")
     */
    drawLine(options: {
        ctx: SKRSContext2D;
        x: number;
        y: number;
        width: number;
        height: number;
        lineWidth?: number;
        color?: string;
    }): void;
    /**
     * Draw a contour on the canvas
     * @param options
     * @param options.ctx Canvas rendering context
     * @param options.contour Contour to be drawn
     * @param options.strokeStyle Stroke color (default: "red")
     * @param options.lineWidth Line width (default: 2)
     */
    drawContour(options: {
        ctx: SKRSContext2D;
        contour: cv.Mat;
        strokeStyle?: string;
        lineWidth?: number;
    }): void;
}
