import { Request, Response } from 'express';
import { bookingService } from './booking.service';

export const bookingController = {
  createBooking: async (req: Request, res: Response): Promise<any> => {
    try {
        console.log('booking record: ', req.body)
        const booking = await bookingService.creatingBooking(req.body);
      
        res.status(200).json({ data: "Booking created successfully" });
    } catch (error: any) {
      console.error("Error in getProperties controller:", error);
      res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  },
  getBookingsForUser: async (req: Request, res: Response): Promise<any> => {
    try {
      const bookings = await bookingService.getBookingforUser((req as any).params.userId);
      res.status(200).json({ data: bookings });
    } catch (error: any) {
      console.error("Error in getBookingsForUser controller:", error);
      res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  },

}