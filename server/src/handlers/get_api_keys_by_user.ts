import { db } from '../db';
import { apiKeysTable, usersTable } from '../db/schema';
import { type ApiKey } from '../schema';
import { eq } from 'drizzle-orm';

export async function getApiKeysByUser(userId: number): Promise<ApiKey[]> {
  try {
    // First validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Fetch all API keys for the user
    const results = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.user_id, userId))
      .execute();

    // Return the API keys (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch API keys by user:', error);
    throw error;
  }
}