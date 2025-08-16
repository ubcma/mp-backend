import { Router } from 'express';
import {
  createEvent,
  deleteEventById,
  getAllEvents,
  getEventBySlug,
  updateEventById,
} from '../controllers/eventController';

import {
  getEventRegistrations,
  createRegistration,
  getRegistrationById,
  updateRegistration,
} from '../controllers/registrationController';

import { asyncHandler } from '../lib/asyncHandler';

const eventRouter = Router();

eventRouter.get('/', getAllEvents);
eventRouter.get('/:slug', asyncHandler(getEventBySlug));
eventRouter.post('/create', asyncHandler(createEvent));
eventRouter.put('/update', asyncHandler(updateEventById))
eventRouter.delete('/delete', asyncHandler(deleteEventById))

// Registration routes
eventRouter.get('/:id/registrations', asyncHandler(getEventRegistrations));
eventRouter.post('/:id/registrations/create', asyncHandler(createRegistration));
eventRouter.get('/:id/registrations/:registrationId', asyncHandler(getRegistrationById));
eventRouter.put('/:id/registrations/:registrationId', asyncHandler(updateRegistration));

export default eventRouter;