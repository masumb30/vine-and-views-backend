import mongoose from "mongoose";
import config from "./index";

const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log("✅ MongoDB connected successfully");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        process.exit(1);
    }
};

export default connectDB;
