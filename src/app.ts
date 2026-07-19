import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import router from "./routes";
import notFoundHandler from "./middlewares/notFoundHandler";
import globalErrorHandler from "./middlewares/globalErrorHandler";

const app = express();

// --------------- Global Middlewares ---------------
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --------------- Health Check ---------------
app.get("/", (req: Request, res: Response) => {
    res.json({
        success: true,
        message: "🚀 Chronova API is running",
        timestamp: new Date().toISOString(),
    });
});

// --------------- API Routes ---------------
app.use("/", router);


// --------------- Error Handling ---------------
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
