import { db } from '../db';
import { turnsTable, callSessionsTable } from '../db/schema';
import { type CreateTurnInput, type Turn } from '../schema';
import { eq, isNull } from 'drizzle-orm';

export async function createTurn(input: CreateTurnInput): Promise<Turn> {
  try {
    // First validate that the call session exists and is active (not ended)
    const callSession = await db.select()
      .from(callSessionsTable)
      .where(eq(callSessionsTable.id, input.call_session_id))
      .execute();

    if (callSession.length === 0) {
      throw new Error('Call session not found');
    }

    if (callSession[0].end_time !== null) {
      throw new Error('Cannot add turn to ended call session');
    }

    // Insert the new turn
    const result = await db.insert(turnsTable)
      .values({
        call_session_id: input.call_session_id,
        role: input.role,
        text: input.text,
        latency_ms: input.latency_ms
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Turn creation failed:', error);
    throw error;
  }
}