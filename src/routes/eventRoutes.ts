import { Router } from 'express';
import {
  createEvent,
  getAllEvents,
} from '../controllers/eventController';
import { asyncHandler } from '../lib/asyncHandler';

const eventRouter = Router();

eventRouter.get('/events', getAllEvents);
eventRouter.post('/events/create', asyncHandler(createEvent));

export default eventRouter;