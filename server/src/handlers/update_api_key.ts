import { db } from '../db';
import { apiKeysTable } from '../db/schema';
import { type UpdateApiKeyInput, type ApiKey } from '../schema';
import { eq } from 'drizzle-orm';

export const updateApiKey = async (input: UpdateApiKeyInput): Promise<ApiKey> => {
  try {
    // First, check if the API key exists
    const existingApiKeys = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, input.id))
      .execute();

    if (existingApiKeys.length === 0) {
      throw new Error(`API key with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof apiKeysTable.$inferInsert> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Update the API key
    const result = await db.update(apiKeysTable)
      .set(updateData)
      .where(eq(apiKeysTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('API key update failed:', error);
    throw error;
  }
};