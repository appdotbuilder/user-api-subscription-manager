import { db } from '../db';
import { callSessionsTable, usersTable } from '../db/schema';
import { type CallSession } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCallSessionsByUser(userId: number): Promise<CallSession[]> {
  try {
    // First validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Fetch all call sessions for the user
    const result = await db.select()
      .from(callSessionsTable)
      .where(eq(callSessionsTable.user_id, userId))
      .execute();

    // Return the call sessions (no numeric conversions needed for this table)
    return result;
  } catch (error) {
    console.error('Get call sessions by user failed:', error);
    throw error;
  }
}