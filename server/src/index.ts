import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createSubscriptionPlanInputSchema,
  createApiKeyInputSchema,
  updateApiKeyInputSchema,
  createVoiceInputSchema,
  createCallSessionInputSchema,
  endCallSessionInputSchema,
  createTurnInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createSubscriptionPlan } from './handlers/create_subscription_plan';
import { getSubscriptionPlans } from './handlers/get_subscription_plans';
import { createApiKey } from './handlers/create_api_key';
import { getApiKeysByUser } from './handlers/get_api_keys_by_user';
import { updateApiKey } from './handlers/update_api_key';
import { createVoice } from './handlers/create_voice';
import { getVoices } from './handlers/get_voices';
import { createCallSession } from './handlers/create_call_session';
import { endCallSession } from './handlers/end_call_session';
import { getCallSessionsByUser } from './handlers/get_call_sessions_by_user';
import { createTurn } from './handlers/create_turn';
import { getTurnsByCallSession } from './handlers/get_turns_by_call_session';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Subscription plan management
  createSubscriptionPlan: publicProcedure
    .input(createSubscriptionPlanInputSchema)
    .mutation(({ input }) => createSubscriptionPlan(input)),
  
  getSubscriptionPlans: publicProcedure
    .query(() => getSubscriptionPlans()),

  // API key management
  createApiKey: publicProcedure
    .input(createApiKeyInputSchema)
    .mutation(({ input }) => createApiKey(input)),
  
  getApiKeysByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getApiKeysByUser(input.userId)),
  
  updateApiKey: publicProcedure
    .input(updateApiKeyInputSchema)
    .mutation(({ input }) => updateApiKey(input)),

  // Voice management
  createVoice: publicProcedure
    .input(createVoiceInputSchema)
    .mutation(({ input }) => createVoice(input)),
  
  getVoices: publicProcedure
    .query(() => getVoices()),

  // Call session management
  createCallSession: publicProcedure
    .input(createCallSessionInputSchema)
    .mutation(({ input }) => createCallSession(input)),
  
  endCallSession: publicProcedure
    .input(endCallSessionInputSchema)
    .mutation(({ input }) => endCallSession(input)),
  
  getCallSessionsByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCallSessionsByUser(input.userId)),

  // Turn management
  createTurn: publicProcedure
    .input(createTurnInputSchema)
    .mutation(({ input }) => createTurn(input)),
  
  getTurnsByCallSession: publicProcedure
    .input(z.object({ callSessionId: z.number() }))
    .query(({ input }) => getTurnsByCallSession(input.callSessionId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();