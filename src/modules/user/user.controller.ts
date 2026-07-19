import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserService } from "./user.service";
import { AppError } from "../../utils/AppError";
import mongoose from "mongoose";

const createUser = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.createUser(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "User created successfully",
        data: result,
    });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getAllUsers();

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Users retrieved successfully",
        data: result,
    });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await UserService.getUserById(id);

    if (!result) {
        throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User retrieved successfully",
        data: result,
    });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await UserService.updateUser(id, req.body);

    if (!result) {
        throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User updated successfully",
        data: result,
    });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await UserService.deleteUser(id);

    if (!result) {
        throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User deleted successfully",
        data: result,
    });
});

const updateUserRole = async (req: Request, res: Response): Promise<void> => {
    console.log("hitting update role: ", req.params)
    try {
        const { userId, newRole } = req.params;

        // 1. Validate that the role being requested is supported
        if (newRole !== 'owner' && newRole !== 'tenant') {
            res.status(400).json({
                success: false,
                message: "Invalid role assignment requested. Must be 'Owner' or 'Tenant'."
            });
            return;
        }
        const db = mongoose.connection.db;
        if (!db) throw new Error("Database connection not initialized.");

        // Authenticate user via token
        const session = await db.collection('session').findOne({ token: req.headers.authorization?.split(' ')[1] });
        if (!session) throw new Error("Session not found.");

        // Fetch the property to check ownership
        const userCollection = db.collection('user');
        const UpdatedUser = await userCollection.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(userId as string) }, { $set: { role: newRole } });
        
        

        // 3. Fail fast if the user ID wasn't found in the database system
        if (!UpdatedUser) {
            res.status(404).json({
                success: false,
                message: 'User record not found.'
            });
            return;
        }

        // 4. Send successful updated response payload back to your client component
        res.status(200).json({
            success: true,
            message: `User role modified successfully to ${newRole}`,
            data: UpdatedUser
        });

    } catch (error: any) {
        console.error("❌ Error updating user role:", error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error encountered while updating user role.',
            error: error.message
        });
    }
}


export const UserController = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    updateUserRole
};
