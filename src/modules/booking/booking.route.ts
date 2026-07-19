import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { bookingController } from "./booking.controller";
import Booking from "./booking.model";


const router = Router();

router.post("/createbooking", bookingController.createBooking);
router.get("/getbookingforuser/:userId", bookingController.getBookingsForUser);
router.get("/allbooking", async (req, res) => {
    try {
        const bookings = await Booking.find();
        console.log(bookings);
        res.status(200).json(bookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/getbookingbyownnerid/:ownerId", async (req, res) => {
    try {
        const { ownerId } = req.params;

        // 1. Find all bookings matching the owner's ID
        // Sorting by 'createdAt: -1' ensures new incoming requests appear at the top
        const incomingRequests = await Booking.find({ propertyOwnerId: ownerId })
            .sort({ createdAt: -1 });

        // 2. Return the data wrapped inside an object matching your frontend structure
        res.status(200).json({ 
            success: true,
            message: "Incoming booking inquiries retrieved successfully",
            data: incomingRequests 
        });

    } catch (error) {
        console.error("Error fetching booking inquiries:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error occurred while pulling system inquiries" 
        });
    }
});

router.patch("/updatebooking/:id/:status", async (req, res) => {
    try {
        const { id, status } = req.params;

        // 1. Sanitize and validate the status input
        const normalizedStatus = status.toLowerCase();
        const validStatuses = ["pending", "approved", "rejected"];

        if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ 
                message: "Invalid status value. Expected 'pending', 'confirmed', or 'cancelled'." 
            });
        }

        // 2. Find the booking by ID and update its status field
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            { status: normalizedStatus },
            { new: true } // Returns the modified document instead of the old one
        );

        // 3. If no booking matches that ID, return a 404 error
        if (!updatedBooking) {
            return res.status(404).json({ message: "Booking record not found" });
        }

        res.status(200).json({
            message: `Booking status updated to ${normalizedStatus} successfully`,
            data: updatedBooking
        });

    } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});



export const bookingRoutes = router;