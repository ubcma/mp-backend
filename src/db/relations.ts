import { relations } from "drizzle-orm/relations";
import { user, userProfile, session, account, eventRegistration, eventRegistrationResponse, question, event, eventTag, tag } from "./schema";

export const userProfileRelations = relations(userProfile, ({one}) => ({
	user: one(user, {
		fields: [userProfile.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	userProfiles: many(userProfile),
	sessions: many(session),
	accounts: many(account),
	eventRegistrations: many(eventRegistration),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const eventRegistrationResponseRelations = relations(eventRegistrationResponse, ({one}) => ({
	eventRegistration: one(eventRegistration, {
		fields: [eventRegistrationResponse.signupId],
		references: [eventRegistration.id]
	}),
	question: one(question, {
		fields: [eventRegistrationResponse.questionId],
		references: [question.id]
	}),
}));

export const eventRegistrationRelations = relations(eventRegistration, ({one, many}) => ({
	eventRegistrationResponses: many(eventRegistrationResponse),
	user: one(user, {
		fields: [eventRegistration.userId],
		references: [user.id]
	}),
	event: one(event, {
		fields: [eventRegistration.eventId],
		references: [event.id]
	}),
}));

export const questionRelations = relations(question, ({one, many}) => ({
	eventRegistrationResponses: many(eventRegistrationResponse),
	event: one(event, {
		fields: [question.eventId],
		references: [event.id]
	}),
}));

export const eventRelations = relations(event, ({many}) => ({
	questions: many(question),
	eventRegistrations: many(eventRegistration),
	eventTags: many(eventTag),
}));

export const eventTagRelations = relations(eventTag, ({one}) => ({
	event: one(event, {
		fields: [eventTag.eventId],
		references: [event.id]
	}),
	tag: one(tag, {
		fields: [eventTag.tagId],
		references: [tag.id]
	}),
}));

export const tagRelations = relations(tag, ({many}) => ({
	eventTags: many(eventTag),
}));