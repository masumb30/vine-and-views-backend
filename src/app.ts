import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import notFoundHandler from "./middlewares/notFoundHandler";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import { castALikeHandler, createPostHandler, getAllPosts, getPostById } from "./service/post.service";
import { createCommentHandler, deleteCommentHandler } from "./service/comment.service";

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
        message: "🚀 vines API is running",
        timestamp: new Date().toISOString(),
    });
});


app.post('/posts', createPostHandler);
app.post('/comments/:postId', createCommentHandler); 
app.patch('/posts/like/:postId/:type', castALikeHandler);
app.get('/posts', getAllPosts);
app.get('/posts/:id', getPostById);
app.delete('/comments/:id', deleteCommentHandler); 


// --------------- Error Handling ---------------
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
