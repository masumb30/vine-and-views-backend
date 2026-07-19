import mongoose from 'mongoose';
import Booking from './booking.model';


export const bookingService = {
    creatingBooking: async (booking: any) => {
        try {
            const savedBooking = await Booking.create(booking); // Directly creates and saves the document in one step      
            return savedBooking;
        } catch (error) {
            console.error("❌ Database save error:", error);
            throw new Error("Failed to save booking to the database.");
        }
    },
    getBookingsForAdmin: async () => {
        const data = await Booking.find() // Fetch all bookings for admin view
        return data;
    },
    getBookingforUser: async (userId: string) => {
        const data = await Booking.find({ userId: userId });
        return data;
    },

}