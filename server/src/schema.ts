import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  subscription_plan_id: z.number().nullable()
});

export type User = z.infer<typeof userSchema>;

// Subscription plan schema
export const subscriptionPlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  max_api_keys: z.number().int().nullable(),
  max_monthly_calls: z.number().int().nullable(),
  created_at: z.coerce.date()
});

export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

// API key schema
export const apiKeySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  key_hash: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  last_used_at: z.coerce.date().nullable()
});

export type ApiKey = z.infer<typeof apiKeySchema>;

// Voice schema
export const voiceSchema = z.object({
  id: z.number(),
  name: z.string(),
  identifier: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Voice = z.infer<typeof voiceSchema>;

// Call session schema
export const callSessionSchema = z.object({
  id: z.number(),
  twilio_call_id: z.string(),
  user_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type CallSession = z.infer<typeof callSessionSchema>;

// Turn role enum
export const turnRoleSchema = z.enum(['user', 'assistant', 'tool']);
export type TurnRole = z.infer<typeof turnRoleSchema>;

// Turn schema
export const turnSchema = z.object({
  id: z.number(),
  call_session_id: z.number(),
  role: turnRoleSchema,
  text: z.string().nullable(),
  latency_ms: z.number().int().nullable(),
  created_at: z.coerce.date()
});

export type Turn = z.infer<typeof turnSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  subscription_plan_id: z.number().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createSubscriptionPlanInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().nonnegative(),
  max_api_keys: z.number().int().positive().nullable(),
  max_monthly_calls: z.number().int().positive().nullable()
});

export type CreateSubscriptionPlanInput = z.infer<typeof createSubscriptionPlanInputSchema>;

export const createApiKeyInputSchema = z.object({
  user_id: z.number(),
  key_hash: z.string(),
  name: z.string()
});

export type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>;

export const createVoiceInputSchema = z.object({
  name: z.string(),
  identifier: z.string(),
  description: z.string().nullable()
});

export type CreateVoiceInput = z.infer<typeof createVoiceInputSchema>;

export const createCallSessionInputSchema = z.object({
  twilio_call_id: z.string(),
  user_id: z.number(),
  start_time: z.coerce.date()
});

export type CreateCallSessionInput = z.infer<typeof createCallSessionInputSchema>;

export const createTurnInputSchema = z.object({
  call_session_id: z.number(),
  role: turnRoleSchema,
  text: z.string().nullable(),
  latency_ms: z.number().int().positive().nullable()
});

export type CreateTurnInput = z.infer<typeof createTurnInputSchema>;

// Update schemas
export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  subscription_plan_id: z.number().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const updateApiKeyInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  is_active: z.boolean().optional()
});

export type UpdateApiKeyInput = z.infer<typeof updateApiKeyInputSchema>;

export const endCallSessionInputSchema = z.object({
  id: z.number(),
  end_time: z.coerce.date()
});

export type EndCallSessionInput = z.infer<typeof endCallSessionInputSchema>;