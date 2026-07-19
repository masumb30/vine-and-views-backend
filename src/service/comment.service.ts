import { Request, Response } from 'express';
import { Types } from 'mongoose'; 
import { PostModel, SessionModel, CommentModel } from '../modules';

export const createCommentHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const session = await SessionModel.findOne({ token });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized: Invalid or expired session token' });
      return;
    }

    // 1. Safely cast the string parameter into a Mongoose ObjectId
    let targetPostId: Types.ObjectId;
    try {
      targetPostId = new Types.ObjectId(req.params.postId as string);
    } catch (err) {
      res.status(400).json({ message: 'Invalid Post ID format' });
      return;
    }

    // 2. Use the casted object ID for verification
    const postExists = await PostModel.exists({ _id: targetPostId });
    if (!postExists) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // 3. Pass the casted targetPostId here to satisfy TypeScript
    const newComment = await CommentModel.create({
      postId: targetPostId, 
      userId: session.userId,
      content: req.body.content
    });

    // 4. Update the parent post tracking array
    await PostModel.findByIdAndUpdate(targetPostId, {
      $push: { comments: newComment._id }
    });

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error: any) {
    res.status(500).json({ 
      message: 'Internal server error while creating comment', 
      error: error.message 
    });
  }
};