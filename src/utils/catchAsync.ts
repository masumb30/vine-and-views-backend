import { Request, Response, NextFunction } from "express";
import { AsyncHandler } from "../types";

/**
 * Wraps an async route handler to automatically catch errors
 * and forward them to the Express error handler.
 */
const catchAsync = (fn: AsyncHandler) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default catchAsync;
