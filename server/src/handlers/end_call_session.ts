import { db } from '../db';
import { callSessionsTable } from '../db/schema';
import { type EndCallSessionInput, type CallSession } from '../schema';
import { eq } from 'drizzle-orm';

export const endCallSession = async (input: EndCallSessionInput): Promise<CallSession> => {
  try {
    // First, verify the call session exists and is not already ended
    const existingSessions = await db.select()
      .from(callSessionsTable)
      .where(eq(callSessionsTable.id, input.id))
      .execute();

    if (existingSessions.length === 0) {
      throw new Error(`Call session with id ${input.id} not found`);
    }

    const existingSession = existingSessions[0];
    
    // Check if the session is already ended
    if (existingSession.end_time !== null) {
      throw new Error(`Call session with id ${input.id} is already ended`);
    }

    // Update the call session with the end time
    const result = await db.update(callSessionsTable)
      .set({
        end_time: input.end_time
      })
      .where(eq(callSessionsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('End call session failed:', error);
    throw error;
  }
};