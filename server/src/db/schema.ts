import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Subscription plans table
export const subscriptionPlansTable = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  max_api_keys: integer('max_api_keys'), // Nullable - unlimited if null
  max_monthly_calls: integer('max_monthly_calls'), // Nullable - unlimited if null
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  subscription_plan_id: integer('subscription_plan_id'), // Nullable - can exist without subscription
});

// API keys table
export const apiKeysTable = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  key_hash: text('key_hash').notNull(),
  name: text('name').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  last_used_at: timestamp('last_used_at'), // Nullable - not used yet
});

// Voices table
export const voicesTable = pgTable('voices', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  identifier: text('identifier').notNull().unique(),
  description: text('description'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Call sessions table
export const callSessionsTable = pgTable('call_sessions', {
  id: serial('id').primaryKey(),
  twilio_call_id: text('twilio_call_id').notNull().unique(),
  user_id: integer('user_id').notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time'), // Nullable - ongoing calls
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Turn role enum
export const turnRoleEnum = pgEnum('turn_role', ['user', 'assistant', 'tool']);

// Turns table
export const turnsTable = pgTable('turns', {
  id: serial('id').primaryKey(),
  call_session_id: integer('call_session_id').notNull(),
  role: turnRoleEnum('role').notNull(),
  text: text('text'), // Nullable - some turns might not have text
  latency_ms: integer('latency_ms'), // Nullable - not all turns have latency data
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  subscriptionPlan: one(subscriptionPlansTable, {
    fields: [usersTable.subscription_plan_id],
    references: [subscriptionPlansTable.id],
  }),
  apiKeys: many(apiKeysTable),
  callSessions: many(callSessionsTable),
}));

export const subscriptionPlansRelations = relations(subscriptionPlansTable, ({ many }) => ({
  users: many(usersTable),
}));

export const apiKeysRelations = relations(apiKeysTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [apiKeysTable.user_id],
    references: [usersTable.id],
  }),
}));

export const callSessionsRelations = relations(callSessionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [callSessionsTable.user_id],
    references: [usersTable.id],
  }),
  turns: many(turnsTable),
}));

export const turnsRelations = relations(turnsTable, ({ one }) => ({
  callSession: one(callSessionsTable, {
    fields: [turnsTable.call_session_id],
    references: [callSessionsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlansTable.$inferInsert;

export type ApiKey = typeof apiKeysTable.$inferSelect;
export type NewApiKey = typeof apiKeysTable.$inferInsert;

export type Voice = typeof voicesTable.$inferSelect;
export type NewVoice = typeof voicesTable.$inferInsert;

export type CallSession = typeof callSessionsTable.$inferSelect;
export type NewCallSession = typeof callSessionsTable.$inferInsert;

export type Turn = typeof turnsTable.$inferSelect;
export type NewTurn = typeof turnsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  subscriptionPlans: subscriptionPlansTable,
  apiKeys: apiKeysTable,
  voices: voicesTable,
  callSessions: callSessionsTable,
  turns: turnsTable,
};