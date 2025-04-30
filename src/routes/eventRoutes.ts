import { Router } from 'express';
import {
  createEvent,
  getAllEvents,
  getEventBySlug,
} from '../controllers/eventController';
import { asyncHandler } from '../lib/asyncHandler';

const eventRouter = Router();

eventRouter.get('/', getAllEvents);
eventRouter.get('/:slug', asyncHandler(getEventBySlug));
eventRouter.post('/create', asyncHandler(createEvent));
export default eventRouter;