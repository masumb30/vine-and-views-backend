import app from "./app";
import config from "./config";
import connectDB from "./config/db";

const startServer = async (): Promise<void> => {
    try {
        await connectDB();

        app.listen(config.port, () => {
            console.log(`🚀 Server is running on http://localhost:${config.port}`);
            console.log(`📦 Environment: ${config.env}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
