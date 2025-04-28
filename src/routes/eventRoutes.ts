import { Router } from 'express';
import {
  getAllEvents,
} from '../controllers/eventController';

const eventRouter = Router();

eventRouter.get('/events', getAllEvents);

export default eventRouter;