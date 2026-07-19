import { Request, Response } from 'express';
import { PropertyService } from './property.service';

export const PropertyController = {
  getAllProperties: async (req: Request, res: Response): Promise<any> => {
    try {
      // 1. Extract and sanitize query parameters
      const search = (req.query.search as string) || '';
      const type = (req.query.type as string) || 'All';
      const sortBy = (req.query.sortBy as string) || 'Newest';

      // 2. Parse page string to base-10 integer, default to page 1
      const page = parseInt(req.query.page as string, 10) || 1;

      // 3. Delegate business and DB logic to the service layer
      const result = await PropertyService.getAllProperties({
        search,
        type,
        sortBy,
        page
      });

      // 4. Return structural response exactly matching your required format
      res.status(200).json({
        data: result.data,
        pageInfo: result.pageInfo
      });
    } catch (error: any) {
      console.error("Error in getProperties controller:", error);
      res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  },
  addReview: async (req: Request, res: Response): Promise<any> => {
    console.log(req.body, req.params.id);
    const review = await PropertyService.addReview(req.params.id as string, req.body);
    res.status(200).json({data:review, message: "Review added successfully" });
  },
  getFeaturedProperties: async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await PropertyService.getFeaturedProperties();
      res.status(200).json({ data });
    } catch (error: any) {
      console.error("Error in getFeaturedProperties controller:", error);
      res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  },
  getPropertyById: async (req: Request, res: Response): Promise<any> => {
    try {
      const propertyId = req.params.id;
      const data = await PropertyService.getPropertyById(propertyId as string);
      res.status(200).json({ data });
    } catch (error: any) {
      console.error("Error in getPropertyById controller:", error);
      res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  },


  getAllPropertiesForAdmin: async (req: Request, res: Response): Promise<any> => {
    try {
      // 1. Extract and sanitize query parameters
      

      // 2. Parse page string to base-10 integer, default to page 1
      const page = parseInt(req.query.page as string, 10) || 1;

      // 3. Delegate business and DB logic to the service layer
      const result = await PropertyService.getAllPropertiesForAdmin();

      // 4. Return structural response exactly matching your required format
      res.status(200).json({
        data: result
      });
    } catch (error: any) {
      console.error("Error in getProperties controller:", error);
      res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  },
  addProperty: async (req: Request, res: Response): Promise<void> => {
    try {
      console.log(req.headers);

      const token = req.headers.authorization?.split(' ')[1];


      if (!token) {
        res.status(401).json({ success: false, message: "Unauthorized access" });
        return;
      }

      const newProperty = await PropertyService.createProperty(req.body, token);

      // Respond with success
      res.status(201).json({
        success: true,
        message: 'Property listed successfully and pending review.',
        data: newProperty
      });

    } catch (error: any) {
      console.error("❌ Controller error:", error);
      res.status(500).json({
        success: false,
        message: error.message || 'An internal server error occurred.'
      });
    }
  },
  deleteProperty: async (req: Request, res: Response): Promise<void> => {
    try {
      const propertyId = req.params.id;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        res.status(401).json({ success: false, message: "Unauthorized access" });
        return;
      }

      const deletedProperty = await PropertyService.deleteProperty(propertyId as string, token);

      // Respond with success
      res.status(200).json({
        success: true,
        message: 'Property deleted successfully.',
        data: deletedProperty
      });

    } catch (error: any) {
      console.error("❌ Controller error:", error);
      res.status(500).json({
        success: false,
        message: error.message || 'An internal server error occurred.'
      });
    }
  },
  approveProperty: async (req: Request, res: Response): Promise<void> => {
    try {
      const propertyId = req.params.id;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        res.status(401).json({ success: false, message: "Unauthorized access" });
        return;
      }

      const approvedProperty = await PropertyService.approveProperty(propertyId as string, token);

      // Respond with success
      res.status(200).json({
        success: true,
        message: 'Property approved successfully.',
        data: approvedProperty
      });

    } catch (error: any) {
      console.error("❌ Controller error:", error);
      res.status(500).json({
        success: false,
        message: error.message || 'An internal server error occurred.'
      });
    }
  },
  rejectProperty: async (req: Request, res: Response): Promise<void> => {
    try {
      const rejectionReason = req.body.rejectionReason;
      if (!rejectionReason) {
        res.status(400).json({ success: false, message: "Rejection reason is required." });
        return;
      }
      const propertyId = req.params.id;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        res.status(401).json({ success: false, message: "Unauthorized access" });
        return;
      }

      const rejectedProperty = await PropertyService.rejectProperty(propertyId as string, token, rejectionReason);

      // Respond with success
      res.status(200).json({
        success: true,
        message: 'Property rejected successfully.',
        data: rejectedProperty
      });

    } catch (error: any) {
      console.error("❌ Controller error:", error);
      res.status(500).json({
        success: false,
        message: error.message || 'An internal server error occurred.'
      });
    }
  }
};