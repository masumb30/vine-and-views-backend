import mongoose from "mongoose";
import User, { IUser } from "./user.model";

const createUser = async (payload: Partial<IUser>): Promise<IUser> => {
    const user = await User.create(payload);
    return user;
};

const getAllUsers = async (): Promise<any[]> => {
    console.log('Fetching all users from the database...');
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not initialized.");

    // Authenticate user via token
    const userCollection = db.collection('user');

    // Fetch the property to check ownership
    const users = await userCollection.find().toArray();
    return users;
};

const getUserById = async (id: string): Promise<IUser | null> => {
    const user = await User.findById(id);
    return user;
};

const updateUser = async (
    id: string,
    payload: Partial<IUser>
): Promise<IUser | null> => {
    const user = await User.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return user;
};

const deleteUser = async (id: string): Promise<IUser | null> => {
    const user = await User.findByIdAndDelete(id);
    return user;
};

export const UserService = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
};
