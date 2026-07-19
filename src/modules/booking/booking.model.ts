import { Schema, model, models, Document, Types } from 'mongoose';

// 1. Define the TypeScript Interface representing the document structure
export interface IBooking {
  userId: Types.ObjectId;
  userName: string;
  propertyOwner: string;
  propertyOwnerId: Types.ObjectId;
  propertyId: Types.ObjectId;
  propertyTitle: string;
  moveInDate: string; // Stored as YYYY-MM-DD string as per your object format
  contactNumber: string;
  notes: string;
  stripePaymentId: string;
  amountPaid: number;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Combine your interface with Mongoose's Document interface for typing query results
export interface IBookingDocument extends IBooking, Document {}

// 2. Define the Mongoose Schema matching your object layout
const BookingSchema = new Schema<IBookingDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Matches your user model name for potential population
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    propertyOwner: {
      type: String,
      required: true,
      trim: true,
    },
    propertyOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property', // Matches your property model name for potential population
      required: true,
    },
    propertyTitle: {
      type: String,
      required: true,
      trim: true,
    },
    moveInDate: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    stripePaymentId: {
      type: String,
      required: true,
      unique: true, // Guarantees that a single checkout process isn't saved twice
      trim: true,
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
    }
  },
  {
    // Automatically adds and manages createdAt and updatedAt ISO timestamp tracks
    timestamps: true, 
  }
);

// 3. Export the Model compilation, taking care of Next.js Hot Module Replacement models caching
const Booking = models.Booking || model<IBookingDocument>('Booking', BookingSchema);

export default Booking;