import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { PropertyController } from "./property.controller";
import { Property, PropertyFavorite } from "./property.model";
import { ObjectId } from "mongoose";


const router = Router();

router.get("/", PropertyController.getAllProperties);
router.get("/featured", PropertyController.getAllProperties);
router.get("/foradmin", PropertyController.getAllPropertiesForAdmin);
router.get("/:id", PropertyController.getPropertyById);
router.delete("/:id", PropertyController.deleteProperty);
router.patch("/review/:id", PropertyController.addReview);
router.get("/getPropertiesByOwnerId/:ownerId", async (req, res) => {
    try {
        const { ownerId } = req.params;
        
        // Use dot notation string to target the nested property ID accurately
        const properties = await Property.find({ "ownerInfo.id": ownerId });
        
        // Note: Your frontend component expects { data: [...] } based on your response mapping!
        res.status(200).json({ data: properties });
    } catch (error) {
        console.error("Error fetching properties:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.patch("/createfavorite/:userId/:propertyId", async (req, res) => {
    try {
        const { userId, propertyId } = req.params;

        // findOneAndUpdate with upsert handles both creation and updating in one database call
        const updatedFavorite = await PropertyFavorite.findOneAndUpdate(
            { userId },
            {
                // $addToSet automatically prevents duplicate propertyIds in the array
                $addToSet: { propertyId: propertyId }
            },
            {
                new: true,      // returns the updated document
                upsert: true    // creates the document if it doesn't exist
            }
        );

        res.status(200).json({
            message: "Favorite updated successfully",
            data: updatedFavorite
        });

    } catch (error) {
        console.error("Error updating favorite:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/getfavorites/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        // Find the document by userId and only populate the propertyId array
        const favorites = await PropertyFavorite.findOne({ userId })
            .populate('propertyId'); 

        if (!favorites) {
            return res.status(404).json({ message: "No favorites found for this user" });
        }

        res.status(200).json({ 
            message: "Favorites retrieved successfully", 
            data: favorites 
        });
        
    } catch (error) {
        console.error("Error fetching favorites:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post(
    "/",
    PropertyController.addProperty
);
router.patch("/:id/approve", PropertyController.approveProperty);
router.patch("/:id/reject", PropertyController.rejectProperty);


export const PropertyRoutes = router;