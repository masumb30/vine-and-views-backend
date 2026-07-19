import app from "../src/app";
import config from "../src/config";
import connectDB from "../src/config/db";

// Connect to DB on cold start
let isConnected = false;

const handler = async (req: any, res: any) => {
    if (!isConnected) {
        await connectDB();
        isConnected = true;
    }
    return app(req, res);
};

export default handler;
