import { db } from '../db';
import { turnsTable, callSessionsTable } from '../db/schema';
import { type Turn } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getTurnsByCallSession = async (callSessionId: number): Promise<Turn[]> => {
  try {
    // First verify that the call session exists
    const callSession = await db.select()
      .from(callSessionsTable)
      .where(eq(callSessionsTable.id, callSessionId))
      .execute();

    if (callSession.length === 0) {
      throw new Error(`Call session with id ${callSessionId} not found`);
    }

    // Fetch all turns for the call session, ordered by created_at
    const turns = await db.select()
      .from(turnsTable)
      .where(eq(turnsTable.call_session_id, callSessionId))
      .orderBy(asc(turnsTable.created_at))
      .execute();

    return turns;
  } catch (error) {
    console.error('Failed to get turns by call session:', error);
    throw error;
  }
};