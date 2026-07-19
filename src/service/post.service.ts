import { NextFunction, Request, Response } from 'express';
import { PostModel, SessionModel } from '../modules';
import { Types } from 'mongoose';





export const createPostHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extract authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
      return;
    }

    // 2. Extract the actual token string
    const token = authHeader.split(' ')[1];

    // 3. Query the session collection to get the userId
    const session = await SessionModel.findOne({ token });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized: Invalid or expired session token' });
      return;
    }

    // 4. Attach the found userId to the incoming body content
    const postData = {
      ...req.body,
      userId: session.userId,
    };

    // 5. Create the post using your exact schema structure
    const newPost = await PostModel.create(postData);

    // 6. Return the created post document
    res.status(201).json({
      message: 'Post created successfully',
      post: newPost
    });

  } catch (error: any) {
    // Basic error handling for database failures or invalid payloads
    res.status(500).json({ 
      message: 'Internal server error while creating post', 
      error: error.message 
    });
  }
};



export const castALikeHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extract and validate authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 2. Query the session collection to get the userId
    const session = await SessionModel.findOne({ token });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized: Invalid or expired session token' });
      return;
    }

    // 3. Safely cast the string parameter into a Mongoose ObjectId
    let targetPostId: Types.ObjectId;
    try {
      targetPostId = new Types.ObjectId(req.params.postId as string);
    } catch (err) {
      res.status(400).json({ message: 'Invalid Post ID format' });
      return;
    }

    // 4. Update the post by adding the userId to the likes array if it's not already there
    // $addToSet treats the array like a Set, keeping likes unique per user
    const updatedPost = await PostModel.findByIdAndUpdate(
      targetPostId,
      { $addToSet: { likes: session.userId } },
      { new: true } // Return the updated document instead of the old one
    );

    // 5. If no post matched the ID, return a 404
    if (!updatedPost) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // 6. Return success with the updated likes count or the entire post object
    res.status(200).json({
      message: 'Post liked successfully',
      likesCount: updatedPost.likes.length
    });

  } catch (error: any) {
    res.status(500).json({ 
      message: 'Internal server error while liking post', 
      error: error.message 
    });
  }
};

export const getAllPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Destructure and sanitize query parameters
    const search = req.query.search ? String(req.query.search).trim() : '';
    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit)) || 10); // Default to 10 items per page
    const skip = (page - 1) * limit;

    // 2. Dynamically build the search/filter query object
    const query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } }, // Case-insensitive fuzzy match on title
        { tags: { $regex: search, $options: 'i' } }   // Case-insensitive match within tags array
      ];
    }

    // 3. Execute database queries concurrently for optimal server performance
    const [totalPosts, posts] = await Promise.all([
      PostModel.countDocuments(query),
      PostModel.find(query)
        .populate('authorId', 'name avatar') // Populates user relation layer with essential fields only
        .sort({ createdAt: -1 })             // Show newest botanical posts first
        .skip(skip)
        .limit(limit)
        .lean()                              // Return plain JSON objects for faster processing
    ]);

    // 4. Calculate total pages
    const totalPages = Math.ceil(totalPosts / limit) || 1;

    // 5. Send structural response block matching required envelope format
    res.status(200).json({
      totalPages,
      currentPage: page,
      data: posts
    });
  } catch (error) {
    // Pass errors down to your centralized Express error handling middleware
    next(error);
  }
};