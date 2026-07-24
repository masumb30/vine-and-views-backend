import { NextFunction, Request, Response } from 'express';
import { PostModel, SessionModel } from '../modules';
import { Types } from 'mongoose';





export const createPostHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('running create post handler')
    // 1. Extract authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
      return;
    }

    // 2. Extract the actual token string
    const token = authHeader.split(' ')[1];
    console.log('token:', token);

    // 3. Query the session collection to get the userId
    const all = await SessionModel.find();
    console.log('all sessions:', all);
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
    const type = req.params.type; // 'like' or 'unlike'
    // 1. Extract and validate authorization header
    console.log('hitting like with type: ', type)
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
    let updatedPost;
    if (type === 'like') {
    updatedPost = await PostModel.findByIdAndUpdate(
      targetPostId,
      { $addToSet: { likes: session.userId } },
      { new: true } // Return the updated document instead of the old one
    );
  } else if (type === 'unlike') {
    updatedPost = await PostModel.findByIdAndUpdate(
      targetPostId,
      { $pull: { likes: session.userId } },
      { new: true } // Return the updated document instead of the old one
    );
  }

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
        .populate('userId', 'name image') // Populates user relation layer with essential fields only
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

export const getPostById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Query post by ID and populate related documents
    const post = await PostModel.findById(id)
      // Populate author details (excluding sensitive data)
      .populate('userId', 'name email image')
      // Populate users who liked the post
      .populate('likes', 'name image')
      // Populate comments and deeply populate the author of each comment
      .populate({
        path: 'comments',
        options: { sort: { createdAt: -1 } }, // Newest comments first
        populate: {
          path: 'userId',
          select: 'name image _id',
        },
      })
      .lean(); // Returns plain JS object for performance

    // 2. Handle non-existent post ID
    if (!post) {
      res.status(404).json({
        message: 'Post not found',
      });
      return;
    }

    // 3. Return full populated post details
    res.status(200).json({
      data: post,
    });
  } catch (error) {
    // Pass errors down to centralized middleware
    next(error);
  }
};