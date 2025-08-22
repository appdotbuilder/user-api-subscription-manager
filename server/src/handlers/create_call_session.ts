import { db } from '../db';
import { callSessionsTable, usersTable } from '../db/schema';
import { type CreateCallSessionInput, type CallSession } from '../schema';
import { eq } from 'drizzle-orm';

export const createCallSession = async (input: CreateCallSessionInput): Promise<CallSession> => {
  try {
    // Validate that the user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Insert call session record
    const result = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: input.twilio_call_id,
        user_id: input.user_id,
        start_time: input.start_time
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Call session creation failed:', error);
    throw error;
  }
};