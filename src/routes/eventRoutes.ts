import { Router } from 'express';
import {
  createSignup,
  getAllEvents,
  getEventDetails,
  getEventSignups,
  getUserSignups,
} from '../controllers/eventController';

const eventRouter = Router();

eventRouter.get('/events', getAllEvents);
eventRouter.get('/events/:eventId', getEventDetails);
eventRouter.get('/user/:userEmail/signups', getUserSignups);
eventRouter.get('/:eventId/signups', getEventSignups);
eventRouter.post('/events/:eventId/signup', createSignup);

export default eventRouter;