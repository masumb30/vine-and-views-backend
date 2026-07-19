import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiResponse } from "../types";

const sendResponse = <T>(
    res: Response,
    data: {
        statusCode: number;
        success: boolean;
        message: string;
        data?: T;
    }
): void => {
    const response: ApiResponse<T> = {
        success: data.success,
        statusCode: data.statusCode,
        message: data.message,
        data: data.data,
    };

    res.status(data.statusCode).json(response);
};

export default sendResponse;
