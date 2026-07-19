import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProperty extends Document {
  title: string;
  description: string;
  location: string;
  type: 'Apartment' | 'House' | 'Villa' | 'Commercial' | 'Other'; // Expanded for flexibility
  price: number;
  rentCycle: 'Monthly' | 'Weekly' | 'Daily';
  beds: number;
  baths: number;
  size: number;
  amenities: string[]; // Added
  images: string[];
  extraFeatures: string[]; // Added (Can also be String if it's a text block)
  status: 'pending' | 'approved' | 'rejected'; // Added
  
  ownerInfo?: { // Added optional embedded owner info override
    name?: string;
    id?: string;
  };
}

const PropertySchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      required: true, 
    },
    price: { type: Number, required: true, min: 0 },
    rentCycle: { type: String, required: true, enum: ['Monthly', 'Weekly', 'Daily'] },
    beds: { type: Number, required: true, min: 0 },
    baths: { type: Number, required: true, min: 0 },
    size: { type: Number, required: true, min: 0 }, // Represents Property Size
    amenities: { type: [String], default: [] }, // Added
    images: { type: [String], default: [] },
    extraFeatures: { type: [String], default: [] }, // Added
    status: { 
      type: String, 
      required: true, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' // Automatically sets to Pending on creation
    },
    ownerInfo: { // Optional: If you need data beyond just the Better Auth userId
      name: { type: String, trim: true },
      id: {type: String}, // Optional: If you want to store the Better Auth userId here as well for quick access
    },
    rejectionReason: { type: String, trim: true }, // Optional: Reason for rejection if status is Rejected
    reviews: [
      {
        userId: { type: String, required: true },
        user: { type: String, required: true },
        email: { type: String, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        review: { type: String, trim: true },
        date: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true } 
);

export const Property = mongoose.model<IProperty>('Property', PropertySchema);

export interface IPropertyFavorite extends Document {
  userId: string; // 'any' or a User interface if populated
  propertyId: Types.ObjectId[] | any[]; // Array of ObjectIds or populated Property objects
}

// 2. Update the Schema with 'type: Schema.Types.ObjectId' and 'ref'
const PropertyFavoriteSchema = new Schema(
  {
    userId: { 
      type:String, // Must match the exact name of your User model
      required: true 
    },
    propertyId: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Property', // Must match the exact name of your Property model
      required: true 
    }],
  },
  { timestamps: true }
);

export const PropertyFavorite = mongoose.model<IPropertyFavorite>('PropertyFavorite', PropertyFavoriteSchema);