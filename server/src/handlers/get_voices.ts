import { db } from '../db';
import { voicesTable } from '../db/schema';
import { type Voice } from '../schema';

export const getVoices = async (): Promise<Voice[]> => {
  try {
    // Fetch all voices from the database, ordered by name for consistency
    const results = await db.select()
      .from(voicesTable)
      .orderBy(voicesTable.name)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch voices:', error);
    throw error;
  }
};