import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { turnsTable, usersTable, callSessionsTable } from '../db/schema';
import { type CreateTurnInput } from '../schema';
import { createTurn } from '../handlers/create_turn';
import { eq } from 'drizzle-orm';

// Test input
const testTurnInput: CreateTurnInput = {
  call_session_id: 1,
  role: 'user',
  text: 'Hello, this is a test message',
  latency_ms: 150
};

const testTurnInputMinimal: CreateTurnInput = {
  call_session_id: 1,
  role: 'assistant',
  text: null,
  latency_ms: null
};

describe('createTurn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a turn with all fields', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .execute();

    // Create prerequisite call session
    await db.insert(callSessionsTable)
      .values({
        id: 1,
        twilio_call_id: 'test-call-123',
        user_id: 1,
        start_time: new Date()
      })
      .execute();

    const result = await createTurn(testTurnInput);

    // Basic field validation
    expect(result.call_session_id).toEqual(1);
    expect(result.role).toEqual('user');
    expect(result.text).toEqual('Hello, this is a test message');
    expect(result.latency_ms).toEqual(150);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a turn with minimal fields', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .execute();

    // Create prerequisite call session
    await db.insert(callSessionsTable)
      .values({
        id: 1,
        twilio_call_id: 'test-call-123',
        user_id: 1,
        start_time: new Date()
      })
      .execute();

    const result = await createTurn(testTurnInputMinimal);

    // Basic field validation
    expect(result.call_session_id).toEqual(1);
    expect(result.role).toEqual('assistant');
    expect(result.text).toBeNull();
    expect(result.latency_ms).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save turn to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .execute();

    // Create prerequisite call session
    await db.insert(callSessionsTable)
      .values({
        id: 1,
        twilio_call_id: 'test-call-123',
        user_id: 1,
        start_time: new Date()
      })
      .execute();

    const result = await createTurn(testTurnInput);

    // Query the database to verify the turn was saved
    const turns = await db.select()
      .from(turnsTable)
      .where(eq(turnsTable.id, result.id))
      .execute();

    expect(turns).toHaveLength(1);
    expect(turns[0].call_session_id).toEqual(1);
    expect(turns[0].role).toEqual('user');
    expect(turns[0].text).toEqual('Hello, this is a test message');
    expect(turns[0].latency_ms).toEqual(150);
    expect(turns[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent call session', async () => {
    const invalidInput: CreateTurnInput = {
      ...testTurnInput,
      call_session_id: 999
    };

    await expect(createTurn(invalidInput))
      .rejects
      .toThrow(/call session not found/i);
  });

  it('should throw error for ended call session', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .execute();

    // Create ended call session
    await db.insert(callSessionsTable)
      .values({
        id: 1,
        twilio_call_id: 'test-call-123',
        user_id: 1,
        start_time: new Date(),
        end_time: new Date() // Session is ended
      })
      .execute();

    await expect(createTurn(testTurnInput))
      .rejects
      .toThrow(/cannot add turn to ended call session/i);
  });

  it('should create multiple turns for same call session', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .execute();

    // Create prerequisite call session
    await db.insert(callSessionsTable)
      .values({
        id: 1,
        twilio_call_id: 'test-call-123',
        user_id: 1,
        start_time: new Date()
      })
      .execute();

    // Create first turn
    const turn1 = await createTurn({
      call_session_id: 1,
      role: 'user',
      text: 'First message',
      latency_ms: 100
    });

    // Create second turn
    const turn2 = await createTurn({
      call_session_id: 1,
      role: 'assistant',
      text: 'Response message',
      latency_ms: 200
    });

    expect(turn1.id).not.toEqual(turn2.id);
    expect(turn1.call_session_id).toEqual(turn2.call_session_id);

    // Verify both turns exist in database
    const allTurns = await db.select()
      .from(turnsTable)
      .where(eq(turnsTable.call_session_id, 1))
      .execute();

    expect(allTurns).toHaveLength(2);
  });
});