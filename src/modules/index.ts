
import { Schema, model, Document, Types } from 'mongoose';

export interface ISession{
    token: string;
    userId: Types.ObjectId;
}
export interface ISessionDocument extends ISession, Document {
    createdAt: Date;
    updatedAt: Date;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

export const SessionModel = model<ISessionDocument>('Session', SessionSchema);

export interface IUser {
  name: string;
  email: string;
  image: string;
}

export interface IUserDocument extends IUser, Document {
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true }
  },
  { timestamps: true }
);

export const UserModel = model<IUserDocument>('User', UserSchema);




export interface IPost {
  userId: Types.ObjectId;
  title: string;
  content: string;
  thumbnail: string;
  tags: string[];
  likes: Types.ObjectId[]; // Array of User IDs who liked the post
  comments: Types.ObjectId[]
}

export interface IPostDocument extends IPost, Document {
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPostDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    tags: { type: [String], default: [] },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment', default: [] }]
  },
  { timestamps: true }
);

// High-performance indexing for fast global search and filtering by tags
PostSchema.index({ tags: 1 });
PostSchema.index({ userId: 1 }); // Great for loading a user's custom wall quickly

export const PostModel = model<IPostDocument>('Post', PostSchema);



export interface IComment {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
}

export interface ICommentDocument extends IComment, Document {
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<ICommentDocument>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);



export const CommentModel = model<ICommentDocument>('Comment', CommentSchema);