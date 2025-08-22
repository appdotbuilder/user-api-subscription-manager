import { db } from '../db';
import { voicesTable } from '../db/schema';
import { type CreateVoiceInput, type Voice } from '../schema';

export const createVoice = async (input: CreateVoiceInput): Promise<Voice> => {
  try {
    // Insert voice record
    const result = await db.insert(voicesTable)
      .values({
        name: input.name,
        identifier: input.identifier,
        description: input.description
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Voice creation failed:', error);
    throw error;
  }
};