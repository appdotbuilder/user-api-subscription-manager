import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { voicesTable } from '../db/schema';
import { type CreateVoiceInput } from '../schema';
import { getVoices } from '../handlers/get_voices';

// Test voice inputs
const testVoice1: CreateVoiceInput = {
  name: 'Test Voice Alpha',
  identifier: 'test-voice-alpha',
  description: 'A voice for testing purposes'
};

const testVoice2: CreateVoiceInput = {
  name: 'Test Voice Beta',
  identifier: 'test-voice-beta',
  description: null
};

const testVoice3: CreateVoiceInput = {
  name: 'Another Voice',
  identifier: 'another-voice',
  description: 'Another test voice'
};

describe('getVoices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no voices exist', async () => {
    const result = await getVoices();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all voices from database', async () => {
    // Insert test voices
    await db.insert(voicesTable)
      .values([testVoice1, testVoice2, testVoice3])
      .execute();

    const result = await getVoices();

    expect(result).toHaveLength(3);
    
    // Check that all voices are returned
    const voiceNames = result.map(voice => voice.name);
    expect(voiceNames).toContain('Test Voice Alpha');
    expect(voiceNames).toContain('Test Voice Beta');
    expect(voiceNames).toContain('Another Voice');
  });

  it('should return voices ordered by name', async () => {
    // Insert voices in non-alphabetical order
    await db.insert(voicesTable)
      .values([testVoice2, testVoice3, testVoice1]) // Beta, Another, Alpha
      .execute();

    const result = await getVoices();

    expect(result).toHaveLength(3);
    
    // Check alphabetical ordering
    expect(result[0].name).toEqual('Another Voice');
    expect(result[1].name).toEqual('Test Voice Alpha');
    expect(result[2].name).toEqual('Test Voice Beta');
  });

  it('should return complete voice objects with all fields', async () => {
    await db.insert(voicesTable)
      .values([testVoice1])
      .execute();

    const result = await getVoices();

    expect(result).toHaveLength(1);
    
    const voice = result[0];
    expect(voice.id).toBeDefined();
    expect(typeof voice.id).toBe('number');
    expect(voice.name).toEqual('Test Voice Alpha');
    expect(voice.identifier).toEqual('test-voice-alpha');
    expect(voice.description).toEqual('A voice for testing purposes');
    expect(voice.created_at).toBeInstanceOf(Date);
  });

  it('should handle voices with null descriptions', async () => {
    await db.insert(voicesTable)
      .values([testVoice2])
      .execute();

    const result = await getVoices();

    expect(result).toHaveLength(1);
    
    const voice = result[0];
    expect(voice.name).toEqual('Test Voice Beta');
    expect(voice.identifier).toEqual('test-voice-beta');
    expect(voice.description).toBeNull();
  });

  it('should handle mixed voices with and without descriptions', async () => {
    await db.insert(voicesTable)
      .values([testVoice1, testVoice2])
      .execute();

    const result = await getVoices();

    expect(result).toHaveLength(2);
    
    // Find voices by identifier to check descriptions
    const alphaVoice = result.find(v => v.identifier === 'test-voice-alpha');
    const betaVoice = result.find(v => v.identifier === 'test-voice-beta');
    
    expect(alphaVoice?.description).toEqual('A voice for testing purposes');
    expect(betaVoice?.description).toBeNull();
  });
});