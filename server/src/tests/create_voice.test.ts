import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { voicesTable } from '../db/schema';
import { type CreateVoiceInput } from '../schema';
import { createVoice } from '../handlers/create_voice';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateVoiceInput = {
  name: 'Test Voice',
  identifier: 'test-voice-001',
  description: 'A voice for testing purposes'
};

describe('createVoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a voice with all fields', async () => {
    const result = await createVoice(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Voice');
    expect(result.identifier).toEqual('test-voice-001');
    expect(result.description).toEqual('A voice for testing purposes');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a voice with null description', async () => {
    const inputWithNullDescription: CreateVoiceInput = {
      name: 'Voice Without Description',
      identifier: 'voice-no-desc',
      description: null
    };

    const result = await createVoice(inputWithNullDescription);

    expect(result.name).toEqual('Voice Without Description');
    expect(result.identifier).toEqual('voice-no-desc');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save voice to database', async () => {
    const result = await createVoice(testInput);

    // Query using proper drizzle syntax
    const voices = await db.select()
      .from(voicesTable)
      .where(eq(voicesTable.id, result.id))
      .execute();

    expect(voices).toHaveLength(1);
    expect(voices[0].name).toEqual('Test Voice');
    expect(voices[0].identifier).toEqual('test-voice-001');
    expect(voices[0].description).toEqual('A voice for testing purposes');
    expect(voices[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when identifier is duplicate', async () => {
    // Create first voice
    await createVoice(testInput);

    // Try to create another voice with same identifier
    const duplicateInput: CreateVoiceInput = {
      name: 'Duplicate Voice',
      identifier: 'test-voice-001', // Same identifier
      description: 'This should fail'
    };

    await expect(createVoice(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should query voices by identifier correctly', async () => {
    // Create test voice
    await createVoice(testInput);

    // Create another voice for comparison
    const secondVoice: CreateVoiceInput = {
      name: 'Another Voice',
      identifier: 'another-voice',
      description: 'Different voice'
    };
    await createVoice(secondVoice);

    // Query by specific identifier
    const voices = await db.select()
      .from(voicesTable)
      .where(eq(voicesTable.identifier, 'test-voice-001'))
      .execute();

    expect(voices).toHaveLength(1);
    expect(voices[0].name).toEqual('Test Voice');
    expect(voices[0].identifier).toEqual('test-voice-001');
  });

  it('should generate unique IDs for multiple voices', async () => {
    const firstVoice: CreateVoiceInput = {
      name: 'First Voice',
      identifier: 'voice-001',
      description: 'First test voice'
    };

    const secondVoice: CreateVoiceInput = {
      name: 'Second Voice',
      identifier: 'voice-002',
      description: 'Second test voice'
    };

    const result1 = await createVoice(firstVoice);
    const result2 = await createVoice(secondVoice);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.identifier).toEqual('voice-001');
    expect(result2.identifier).toEqual('voice-002');
  });
});