import mongoose from 'mongoose';
import { GoogleGenAI, Type } from "@google/genai";
import { NextFunction, Request, Response } from 'express';
import { CommentModel, PostModel, SessionModel, UserModel } from '../modules';
import { Types } from 'mongoose';



const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


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

    const session = await SessionModel.findOne({ token });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized: Invalid or expired session token' });
      return;
    }
    // ... inside createPostHandler after step 3 (Session validation) ...

    // 3.5. Generate a brief 1-2 line summary of the post content using Gemini
    let summary = '';
    try {
      const summaryResponse = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Provide a concise 1 to 2 line summary of the following blog post content. Do not include introductory filler like "Here is a summary:".

Content:
${req.body.content || req.body.title || ''}`,
      });
      summary = summaryResponse.text?.trim() || '';
    } catch (aiError) {
      console.error('Failed to generate summary:', aiError);
      // Fallback or handle gracefully so post creation isn't blocked if AI fails
    }

    // 4. Attach the found userId and summary to the incoming body content
    const postData = {
      ...req.body,
      userId: session.userId,
      summary, // Attached to post data
    };

    // 5. Create the post using your exact schema structure
    const newPost = await PostModel.create(postData);

    // ... rest of the handler ...



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


export const getDashboardDataHandler = async (req: Request, res: Response): Promise<void> => {
  console.log('dashboard data has been hit')
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

    const userId = session.userId;

    // 4. Fetch User details
    const user = await UserModel.findById(userId).select('-__v');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // 5. Fetch User's posts for metrics and recent posts list
    const userPosts = await PostModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // 6. Calculate aggregate metrics
    const totalPosts = userPosts.length;
    let totalLikesReceived = 0;
    let totalCommentsReceived = 0;

    userPosts.forEach((post) => {
      totalLikesReceived += post.likes?.length || 0;
      totalCommentsReceived += post.comments?.length || 0;
    });

    // Format recent posts (top 5) with calculated counts
    const recentPosts = userPosts.map((post) => ({
      _id: post._id,
      title: post.title,
      content: post.content,
      thumbnail: post.thumbnail,
      tags: post.tags,
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }));

    // 7. Fetch recent comments made by the user
    const recentActivity = await CommentModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('postId', 'title')
      .select('postId content createdAt')
      .lean();

    // 8. Return formatted dashboard response
    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      metrics: {
        totalPosts,
        totalLikesReceived,
        totalCommentsReceived,
      },
      recentPosts,
      recentActivity,
    });

  } catch (error: any) {
    res.status(500).json({
      message: 'Internal server error while fetching dashboard data',
      error: error.message,
    });
  }
};

// export const deletePostHandler = async (req: Request, res: Response): Promise<void> => {
//   try {
//     // 1. Extract authorization header
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
//       return;
//     }

//     // 2. Extract the actual token string
//     const token = authHeader.split(' ')[1];

//     // 3. Query the session collection to get the userId
//     const session = await SessionModel.findOne({ token });
//     if (!session) {
//       res.status(401).json({ message: 'Unauthorized: Invalid or expired session token' });
//       return;
//     }

//     // 4. Extract post ID from route parameters (e.g., DELETE /api/posts/:id)
//     const { id } = req.params;

//     // 5. Find the target post
//     const post = await PostModel.findById(id);
//     if (!post) {
//       res.status(404).json({ message: 'Post not found' });
//       return;
//     }

//     // 6. Check ownership (Ensure the logged-in user created this post)
//     if (post.userId.toString() !== session.userId.toString()) {
//       res.status(403).json({ message: 'Forbidden: You can only delete your own posts' });
//       return;
//     }

//     // 7. Delete the post document
//     await PostModel.findByIdAndDelete(id);

//     // 8. Return success response
//     res.status(200).json({
//       message: 'Post deleted successfully',
//       deletedPostId: id
//     });

//   } catch (error: any) {
//     res.status(500).json({
//       message: 'Internal server error while deleting post',
//       error: error.message
//     });
//   }
// };








// export const generateAIPostHandler = async (req: Request, res: Response) => {
//   try {
//     const { title } = req.body;

//     if (!title || !title.trim()) {
//       return res.status(400).json({ message: "Title is required for AI generation." });
//     }

//     // JSON Schema that forces the AI to evaluate topic relevance first
//     const responseSchema = {
//       type: Type.OBJECT,
//       properties: {
//         isGardeningRelated: {
//           type: Type.BOOLEAN,
//           description: "Set to true IF AND ONLY IF the title is genuinely related to gardening, farming, plants, soil, botany, or organic cultivation. Set to false for gibberish, spam, off-topic subjects (e.g. crypto, politics, car repair), or inappropriate content.",
//         },
//         errorMessage: {
//           type: Type.STRING,
//           description: "If isGardeningRelated is false, explain politely why the post cannot be generated. Leave empty if isGardeningRelated is true.",
//         },
//         content: {
//           type: Type.STRING,
//           description: "Detailed 2-3 paragraph post content. Required if isGardeningRelated is true; empty string if false.",
//         },
//         tags: {
//           type: Type.ARRAY,
//           items: { type: Type.STRING },
//           description: "3 to 5 relevant lowercase tags. Required if isGardeningRelated is true; empty array if false.",
//         },
//         thumbnail: {
//           type: Type.STRING,
//           description: "A valid Unsplash image URL relevant to the topic. Required if isGardeningRelated is true; empty string if false.",
//         },
//       },
//       required: ["isGardeningRelated", "errorMessage", "content", "tags", "thumbnail"],
//     };

//     const response = await ai.models.generateContent({
//       model: "gemini-3.6-flash",
//       contents: `You are an expert editor for an organic gardening and plant blog platform.
// Evaluate this user title: "${title}".

// Check if the title is related to gardening, agriculture, houseplants, soil, pest control, composting, or nature.
// - If it is irrelevant, gibberish (e.g. "asdfghjk"), off-topic (e.g. "How to trade Bitcoin"), or inappropriate, set isGardeningRelated = false and give an error reason in errorMessage.
// - If it IS relevant, set isGardeningRelated = true and generate rich blog content, tags, and a matching Unsplash image URL.`,
//       config: {
//         responseMimeType: "application/json",
//         responseSchema: responseSchema,
//         temperature: 0.2, // Lower temperature keeps validation strict
//       },
//     });

//     const result = JSON.parse(response.text as string);

//     // Reject off-topic / gibberish titles
//     if (!result.isGardeningRelated) {
//       return res.status(400).json({
//         message: result.errorMessage || "Please provide a title related to gardening, plants, or organic farming.",
//       });
//     }

//     // Success response
//     return res.status(200).json({
//       success: true,
//       data: {
//         content: result.content,
//         tags: result.tags,
//         thumbnail: result.thumbnail,
//       },
//     });
//   } catch (error: any) {
//     console.error("AI Generation Error:", error);
//     return res.status(500).json({
//       message: error.message || "Failed to process AI post request.",
//     });
//   }
// };




export const deletePostHandler = async (req: Request, res: Response): Promise<void> => {
  // 1. Initialize a Mongoose transaction session for atomic cleanup
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // 2. Extract authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await dbSession.endSession();
      res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
      return;
    }

    // 3. Extract session token
    const token = authHeader.split(' ')[1];

    // 4. Query session collection
    const userSession = await SessionModel.findOne({ token }).session(dbSession);
    if (!userSession) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      res.status(401).json({ message: 'Unauthorized: Invalid or expired session token' });
      return;
    }

    // 5. Extract post ID from route params
    const { id } = req.params;

    // Validate ObjectId format before querying
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      res.status(400).json({ message: 'Invalid post ID format' });
      return;
    }

    // 6. Find target post
    const post = await PostModel.findById(id).session(dbSession);
    if (!post) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // 7. Ownership check
    if (post.userId.toString() !== userSession.userId.toString()) {
      await dbSession.abortTransaction();
      await dbSession.endSession();
      res.status(403).json({ message: 'Forbidden: You can only delete your own posts' });
      return;
    }

    // 8. Delete all associated comments matching this postId
    const commentDeleteResult = await CommentModel.deleteMany({ postId: id }).session(dbSession);

    // 9. Delete the post document itself
    await PostModel.findByIdAndDelete(id).session(dbSession);

    // 10. Commit the transaction
    await dbSession.commitTransaction();
    await dbSession.endSession();

    // 11. Return success response
    res.status(200).json({
      message: 'Post and associated comments deleted successfully',
      deletedPostId: id,
      deletedCommentsCount: commentDeleteResult.deletedCount || 0
    });

  } catch (error: any) {
    // Rollback changes if any operation fails
    await dbSession.abortTransaction();
    await dbSession.endSession();

    res.status(500).json({
      message: 'Internal server error while deleting post',
      error: error.message
    });
  }
};


export const generateAIPostHandler = async (req: Request, res: Response) => {
  try {
    const { title, length = 300, retryCount = 0 } = req.body;

    // 1. Title validation
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required for AI generation." });
    }

    // 2. Word count bounds checking (200 - 500 words)
    const targetWordCount = Math.min(Math.max(Number(length) || 300, 200), 500);

    // 3. Dynamic schema to enforce length constraint
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        isGardeningRelated: {
          type: Type.BOOLEAN,
          description:
            "Set to true IF AND ONLY IF the title is genuinely related to gardening, farming, plants, soil, botany, or organic cultivation. Set to false for gibberish, spam, off-topic subjects, or inappropriate content.",
        },
        errorMessage: {
          type: Type.STRING,
          description:
            "If isGardeningRelated is false, explain politely why the post cannot be generated. Leave empty if isGardeningRelated is true.",
        },
        content: {
          type: Type.STRING,
          description: `Detailed post content strictly around ${targetWordCount} words long. Required if isGardeningRelated is true; empty string if false.`,
        },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "3 to 5 relevant lowercase tags. Required if isGardeningRelated is true; empty array if false.",
        },
        thumbnail: {
          type: Type.STRING,
          description:
            "A valid Unsplash image URL relevant to the topic. Required if isGardeningRelated is true; empty string if false.",
        },
      },
      required: ["isGardeningRelated", "errorMessage", "content", "tags", "thumbnail"],
    };

    // 4. Adjust temperature and prompt based on retry count
    // Increasing temperature slightly on retries encourages higher stylistic variation.
    const baseTemperature = 0.2;
    const adjustedTemperature = Math.min(baseTemperature + retryCount * 0.15, 0.7);

    const retryPromptNote = retryCount > 0
      ? `\nNote: This is attempt #${retryCount + 1}. Please provide a completely fresh perspective, unique angle, or different sub-topics than standard responses.`
      : '';

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `You are an expert editor for an organic gardening and plant blog platform.
Evaluate this user title: "${title}".

Check if the title is related to gardening, agriculture, houseplants, soil, pest control, composting, or nature.
- If it is irrelevant, gibberish (e.g. "asdfghjk"), off-topic, or inappropriate, set isGardeningRelated = false and give an error reason in errorMessage.
- If it IS relevant:
  1. Set isGardeningRelated = true.
  2. Generate rich blog content aiming for approximately ${targetWordCount} words.
  3. Generate tags and an Unsplash image URL.${retryPromptNote}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: adjustedTemperature,
      },
    });

    const result = JSON.parse(response.text as string);

    if (!result.isGardeningRelated) {
      return res.status(400).json({
        message:
          result.errorMessage ||
          "Please provide a title related to gardening, plants, or organic farming.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        content: result.content,
        tags: result.tags,
        thumbnail: result.thumbnail,
        wordCount: result.content.split(/\s+/).filter(Boolean).length,
      },
    });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to process AI post request.",
    });
  }
};



export const getAIAccountOverviewHandler = async (req: Request, res: Response) => {
  try {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
      return;
    }

    // 2. Extract the actual token string
    const token = authHeader.split(' ')[1];
    console.log('token:', token);

    // 3. Query the session collection to get the userId

    const session = await SessionModel.findOne({ token });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized: Invalid or expired session token' });
      return;
    }
    const userId = session.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. User ID missing." });
    }

    // 1. Fetch User details
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 2. Aggregate Post Analytics for this User
    const posts = await PostModel.find({ userId }).select('title tags likes comments createdAt summary').lean();

    const totalPosts = posts.length;
    let totalLikesReceived = 0;
    let totalCommentsReceived = 0;
    const writtenTitles: string[] = [];
    const usedTagsSet = new Set<string>();

    posts.forEach(post => {
      totalLikesReceived += post.likes?.length || 0;
      totalCommentsReceived += post.comments?.length || 0;
      writtenTitles.push(post.title);
      post.tags?.forEach(tag => usedTagsSet.add(tag.toLowerCase()));
    });

    // 3. Gather user activity metrics (comments given by user, recent sessions)
    const [commentsGivenCount, activeSessionsCount] = await Promise.all([
      CommentModel.countDocuments({ userId }),
      SessionModel.countDocuments({ userId })
    ]);

    // Compute activity recency
    const latestPost = posts.length > 0
      ? posts.reduce((latest, post) => post.createdAt > latest.createdAt ? post : latest, posts[0])
      : null;

    const daysSinceLastPost = latestPost
      ? Math.floor((Date.now() - new Date(latestPost.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // 4. Structured Schema for the AI output
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        accountSummary: {
          type: Type.STRING,
          description: "An encouraging, friendly, and comprehensive summary of the user's gardening profile, writing style, and overall community standing.",
        },
        activityAnalysis: {
          type: Type.STRING,
          description: "Analysis of how active the user is, posting consistency, and engagement giving vs. receiving.",
        },
        engagementBreakdown: {
          type: Type.STRING,
          description: "An evaluation of how their posts perform (likes, comments) and what topics seem to resonate best.",
        },
        areasForImprovement: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "3 to 4 actionable, specific tips to increase reach, engagement, or quality in the gardening community.",
        },
        recommendedPostIdeas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A catchy, fresh gardening post title." },
              rationale: { type: Type.STRING, description: "Why this fits their profile or fills a gap in their content." },
              suggestedTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2 to 4 relevant gardening tags."
              }
            },
            required: ["title", "rationale", "suggestedTags"]
          },
          description: "Exactly 10 unique, relevant gardening post ideas that the user HAS NOT written about yet."
        }
      },
      required: [
        "accountSummary",
        "activityAnalysis",
        "engagementBreakdown",
        "areasForImprovement",
        "recommendedPostIdeas"
      ],
    };

    // 5. Construct Contextual AI Prompt
    const promptData = {
      userName: user.name,
      totalPosts,
      totalLikesReceived,
      totalCommentsReceived,
      commentsGivenCount,
      activeSessionsCount,
      daysSinceLastPost: daysSinceLastPost !== null ? `${daysSinceLastPost} days ago` : "No posts yet",
      frequentTags: Array.from(usedTagsSet),
      existingTitles: writtenTitles.slice(0, 30) // Cap list to avoid context bloat
    };

    const prompt = `You are an expert community strategist and gardening editor for an organic gardening blogging platform.
Analyze this user's profile and engagement statistics to generate an insightful account overview and tailored strategy.

User Profile Data:
- Name: ${promptData.userName}
- Total Posts Written: ${promptData.totalPosts}
- Total Likes Received: ${promptData.totalLikesReceived}
- Total Comments Received on Posts: ${promptData.totalCommentsReceived}
- Comments Written by User on Other Posts: ${promptData.commentsGivenCount}
- Active Sessions: ${promptData.activeSessionsCount}
- Last Post Activity: ${promptData.daysSinceLastPost}
- Tags Frequently Used: ${promptData.frequentTags.length > 0 ? promptData.frequentTags.join(", ") : "None yet"}
- Existing Post Titles (DO NOT REPEAT THESE):
${promptData.existingTitles.length > 0 ? promptData.existingTitles.map(t => `  * "${t}"`).join("\n") : "  * (No posts written yet)"}

Instructions:
1. Provide a warm, analytical overview of the account.
2. Evaluate engagement, activity, and community involvement.
3. Suggest 3-4 constructive improvements (e.g., using better tags, interacting more in comments, post frequency).
4. Generate EXACTLY 10 brand-new, organic gardening/botany post titles tailored to their profile that they have NOT written about yet. Each idea must include a short rationale and 2-4 tags.`;

    // 6. Call Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.4, // Low enough for structured adherence, warm enough for creative suggestions
      },
    });

    const overviewResult = JSON.parse(response.text as string);

    // 7. Return combined stats + AI generated report
    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalPosts,
          totalLikesReceived,
          totalCommentsReceived,
          commentsGivenCount,
          daysSinceLastPost
        },
        aiReport: overviewResult
      }
    });

  } catch (error: any) {
    console.error("AI Account Overview Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to generate account overview.",
    });
  }
};