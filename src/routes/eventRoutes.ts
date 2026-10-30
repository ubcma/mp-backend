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

import {
  createWorkshop,
  deleteWorkshop,
  getEventWorkshops,
  setWorkshopSelection,
  updateWorkshop,
} from '../controllers/workshopController';

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

// Workshop routes
eventRouter.get('/:id/workshops', asyncHandler(getEventWorkshops));
eventRouter.put('/:id/workshops/selection', asyncHandler(setWorkshopSelection));
eventRouter.post('/:id/workshops', asyncHandler(createWorkshop));
eventRouter.put('/:id/workshops/:workshopId', asyncHandler(updateWorkshop));
eventRouter.delete('/:id/workshops/:workshopId', asyncHandler(deleteWorkshop));

export default eventRouter;