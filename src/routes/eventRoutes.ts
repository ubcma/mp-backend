import { Router } from 'express';
import {
  createEvent,
  deleteEventById,
  getAllEvents,
  getEventBySlug,
  updateEventById,
} from '../controllers/eventController';
import { asyncHandler } from '../lib/asyncHandler';

const eventRouter = Router();

eventRouter.get('/', getAllEvents);
eventRouter.get('/:slug', asyncHandler(getEventBySlug));
eventRouter.post('/create', asyncHandler(createEvent));
eventRouter.put('/update', asyncHandler(updateEventById))
eventRouter.delete('/delete', asyncHandler(deleteEventById))

export default eventRouter;