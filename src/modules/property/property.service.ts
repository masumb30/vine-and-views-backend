import mongoose from 'mongoose';
import { Property, IProperty } from './property.model';
interface FilterDTO {
  search: string;
  type: string;
  sortBy: string;
  page: number;
}

export const PropertyService = {
  getAllProperties: async ({ search, type, sortBy, page }: FilterDTO) => {
    const LIMIT = 6; // Fixed 6 items per page

    // 1. Build the filter object (always enforce status: 'approved')
    const filterQuery: any = { status: 'approved' };

    if (type && type !== 'All') {
      filterQuery.type = type;
    }

    if (search) {
      // Regex search matching title OR location case-insensitively
      filterQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // 2. Define the sorting strategy
    let sortQuery: any = { createdAt: -1 }; // Default Newest
    if (sortBy === 'Price: Low to High') sortQuery = { price: 1 };
    if (sortBy === 'Price: High to Low') sortQuery = { price: -1 };
    if (sortBy === 'Rating') sortQuery = { rating: -1 };

    // 3. Execute count and data fetch in parallel for performance optimization
    const skipAmount = (page - 1) * LIMIT;

    const [totalDocuments, data] = await Promise.all([
      Property.countDocuments(filterQuery),
      Property.find(filterQuery)
        .sort(sortQuery)
        .skip(skipAmount)
        .limit(LIMIT)
        .lean() // Plain JavaScript objects perform faster
    ]);

    // 4. Calculate pagination bounds
    const totalPages = Math.ceil(totalDocuments / LIMIT) || 1;

    return {
      data,
      pageInfo: {
        totalPages,
        currentPage: page
      }
    };
  },
  addReview: async (propertyId: string, reviewData: any) => {
    const property = await Property.findByIdAndUpdate(propertyId, { $push: { reviews: reviewData } }, { new: true });
    return (property as any)?.reviews;
  },
  getPropertyById: async (propertyId: string) => {
    const data = await Property.findById(propertyId);
    return data;
  },
  getAllPropertiesForAdmin: async () => {
    const data = await Property.find() // Fetch all properties for admin view
    return data;
  },
  getFeaturedProperties: async () => {
    const data = await Property.find().limit(6); // Fetch all properties for admin view
    return data;
  },


  // Async function to create and save a property to MongoDB
  createProperty: async (propertyData: Partial<IProperty>, token: string) => {
    console.log("token from service: ", token)
    // get the userid from the token by fetching a session that matches the token from a 'session' collection
    const db = mongoose.connection.db;
    if (!db) {
      console.error("❌ Database connection not initialized");
      throw new Error("Database connection not initialized.");
    }
    const session = await db.collection('session').findOne({ token });
    if (!session) {
      console.error("❌ Session not found");
      throw new Error("Session not found.");
    }
    const user = await db.collection('user').findOne({ _id: session.userId });
    if (!user) {
      console.error("❌ User not found");
      throw new Error("User not found.");
    }
    const userInfo = {
      name: user.name,
      id: user._id.toString()
    };
    propertyData.ownerInfo = userInfo;


    try {
      // Directly creates and saves the document in one step
      const savedProperty = await Property.create({
        ...propertyData,
      });

      return savedProperty;
    } catch (error) {
      console.error("❌ Database save error:", error);
      throw new Error("Failed to save property to the database.");
    }
  },
  updateProperty: async (propertyId: string, updateData: Partial<IProperty>, token: string) => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not initialized.");

    // Authenticate user via token
    const session = await db.collection('session').findOne({ token });
    if (!session) throw new Error("Session not found.");

    // Fetch the property to check ownership
    const property = await Property.findById(propertyId);
    if (!property) throw new Error("Property not found.");

    // Authorization Guard: Check if the session's userId matches the property owner's id
    if (property.ownerInfo?.id !== session.userId.toString()) {
      throw new Error("Unauthorized: You do not own this property listing.");
    }

    try {
      // Update and return the newly modified document
      const updatedProperty = await Property.findByIdAndUpdate(
        propertyId,
        { $set: updateData },
        { new: true, runValidators: true } // 'new: true' returns the updated document, 'runValidators' enforces schema checks
      );
      return updatedProperty;
    } catch (error) {
      console.error("❌ Database update error:", error);
      throw new Error("Failed to update property in the database.");
    }
  },

  // 3. Delete Property (DELETE)
  deleteProperty: async (propertyId: string, token: string) => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not initialized.");

    // Authenticate user via token
    const session = await db.collection('session').findOne({ token });
    if (!session) throw new Error("Session not found.");

    const user = await db.collection('user').findOne({ _id: session.userId });
    if (!user) throw new Error("User not found.");

    if (user.role == 'tenant ') {
      throw new Error("Unauthorized: Only owners and admins can delete property listings.");
    }

    // Fetch the property to check ownership
    const property = await Property.findById(propertyId);
    if (!property) throw new Error("Property not found.");


    try {
      // Remove the document from the collection
      await Property.findByIdAndDelete(propertyId);
      return { success: true, message: "Property successfully deleted." };
    } catch (error) {
      console.error("❌ Database delete error:", error);
      throw new Error("Failed to delete property from the database.");
    }
  },
  approveProperty: async (propertyId: string, token: string) => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not initialized.");

    // Authenticate user via token
    const session = await db.collection('session').findOne({ token });
    if (!session) throw new Error("Session not found.");

    const user = await db.collection('user').findOne({ _id: session.userId });
    if (!user) throw new Error("User not found.");
    console.log("user role: d", user)

    if (user.role.toLowerCase() !== 'admin') {
      throw new Error("Unauthorized: Only admins can approve property listings.");
    }

    try {
      // Remove the document from the collection
      const property = await Property.findOneAndUpdate({ _id: propertyId }, { $set: { status: 'approved' } }, { new: true });
      return { success: true, message: "Property successfully approved." };
    } catch (error) {
      console.error("❌ Database approve error:", error);
      throw new Error("Failed to approve property in the database.");
    }
  },
  rejectProperty: async (propertyId: string, token: string, rejectionReason: string) => {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not initialized.");

    // Authenticate user via token
    const session = await db.collection('session').findOne({ token });
    if (!session) throw new Error("Session not found.");

    const user = await db.collection('user').findOne({ _id: session.userId });
    if (!user) throw new Error("User not found.");

    if (user.role.toLowerCase() !== 'admin') {
      throw new Error("Unauthorized: Only admins can approve property listings.");
    }

    // Fetch the property to check ownership



    try {
      // Remove the document from the collection
      const property = await Property.findOneAndUpdate({ _id: propertyId }, { $set: { status: 'rejected', rejectionReason } }, { new: true });
      return { success: true, message: "Property successfully rejected." };
    } catch (error) {
      console.error("❌ Database reject error:", error);
      throw new Error("Failed to reject property in the database.");
    }
  },
};