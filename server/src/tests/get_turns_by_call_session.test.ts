import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, callSessionsTable, turnsTable, subscriptionPlansTable } from '../db/schema';
import { type CreateUserInput, type CreateCallSessionInput, type CreateTurnInput } from '../schema';
import { getTurnsByCallSession } from '../handlers/get_turns_by_call_session';
import { eq } from 'drizzle-orm';

describe('getTurnsByCallSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return turns ordered by created_at for valid call session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test call session
    const callSessionResult = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'call_123',
        user_id: userId,
        start_time: new Date()
      })
      .returning()
      .execute();

    const callSessionId = callSessionResult[0].id;

    // Create test turns with different timestamps
    const baseTime = new Date('2023-01-01T10:00:00Z');
    const turn1Time = new Date(baseTime.getTime() + 1000); // +1 second
    const turn2Time = new Date(baseTime.getTime() + 2000); // +2 seconds
    const turn3Time = new Date(baseTime.getTime() + 3000); // +3 seconds

    await db.insert(turnsTable)
      .values([
        {
          call_session_id: callSessionId,
          role: 'user',
          text: 'Third turn',
          latency_ms: 300,
          created_at: turn3Time
        },
        {
          call_session_id: callSessionId,
          role: 'assistant',
          text: 'First turn',
          latency_ms: 100,
          created_at: turn1Time
        },
        {
          call_session_id: callSessionId,
          role: 'tool',
          text: 'Second turn',
          latency_ms: 200,
          created_at: turn2Time
        }
      ])
      .execute();

    const result = await getTurnsByCallSession(callSessionId);

    // Should return 3 turns
    expect(result).toHaveLength(3);

    // Should be ordered by created_at (ascending)
    expect(result[0].text).toEqual('First turn');
    expect(result[0].role).toEqual('assistant');
    expect(result[0].latency_ms).toEqual(100);
    expect(result[0].created_at).toEqual(turn1Time);

    expect(result[1].text).toEqual('Second turn');
    expect(result[1].role).toEqual('tool');
    expect(result[1].latency_ms).toEqual(200);
    expect(result[1].created_at).toEqual(turn2Time);

    expect(result[2].text).toEqual('Third turn');
    expect(result[2].role).toEqual('user');
    expect(result[2].latency_ms).toEqual(300);
    expect(result[2].created_at).toEqual(turn3Time);

    // Verify all turns have the correct call_session_id
    result.forEach(turn => {
      expect(turn.call_session_id).toEqual(callSessionId);
      expect(turn.id).toBeDefined();
    });
  });

  it('should return empty array for call session with no turns', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test call session without turns
    const callSessionResult = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'call_123',
        user_id: userId,
        start_time: new Date()
      })
      .returning()
      .execute();

    const callSessionId = callSessionResult[0].id;

    const result = await getTurnsByCallSession(callSessionId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle turns with nullable fields correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test call session
    const callSessionResult = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'call_123',
        user_id: userId,
        start_time: new Date()
      })
      .returning()
      .execute();

    const callSessionId = callSessionResult[0].id;

    // Create turns with null text and latency_ms
    await db.insert(turnsTable)
      .values([
        {
          call_session_id: callSessionId,
          role: 'user',
          text: null,
          latency_ms: null
        },
        {
          call_session_id: callSessionId,
          role: 'assistant',
          text: 'Valid text',
          latency_ms: 250
        }
      ])
      .execute();

    const result = await getTurnsByCallSession(callSessionId);

    expect(result).toHaveLength(2);

    // First turn should have null values
    expect(result[0].text).toBeNull();
    expect(result[0].latency_ms).toBeNull();
    expect(result[0].role).toEqual('user');

    // Second turn should have valid values
    expect(result[1].text).toEqual('Valid text');
    expect(result[1].latency_ms).toEqual(250);
    expect(result[1].role).toEqual('assistant');
  });

  it('should throw error for non-existent call session', async () => {
    const nonExistentId = 99999;

    await expect(getTurnsByCallSession(nonExistentId))
      .rejects
      .toThrow(/Call session with id 99999 not found/i);
  });

  it('should only return turns for the specified call session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create two call sessions
    const callSession1Result = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'call_123',
        user_id: userId,
        start_time: new Date()
      })
      .returning()
      .execute();

    const callSession2Result = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'call_456',
        user_id: userId,
        start_time: new Date()
      })
      .returning()
      .execute();

    const callSession1Id = callSession1Result[0].id;
    const callSession2Id = callSession2Result[0].id;

    // Create turns for both call sessions
    await db.insert(turnsTable)
      .values([
        {
          call_session_id: callSession1Id,
          role: 'user',
          text: 'Turn for session 1',
          latency_ms: 100
        },
        {
          call_session_id: callSession1Id,
          role: 'assistant',
          text: 'Another turn for session 1',
          latency_ms: 150
        },
        {
          call_session_id: callSession2Id,
          role: 'user',
          text: 'Turn for session 2',
          latency_ms: 200
        }
      ])
      .execute();

    // Get turns for call session 1
    const result1 = await getTurnsByCallSession(callSession1Id);

    expect(result1).toHaveLength(2);
    result1.forEach(turn => {
      expect(turn.call_session_id).toEqual(callSession1Id);
      expect(turn.text).toMatch(/session 1/);
    });

    // Get turns for call session 2
    const result2 = await getTurnsByCallSession(callSession2Id);

    expect(result2).toHaveLength(1);
    expect(result2[0].call_session_id).toEqual(callSession2Id);
    expect(result2[0].text).toEqual('Turn for session 2');
  });

  it('should verify call session exists in database', async () => {
    // Create test user and call session
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const callSessionResult = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'call_123',
        user_id: userResult[0].id,
        start_time: new Date()
      })
      .returning()
      .execute();

    const callSessionId = callSessionResult[0].id;

    // Add a turn
    await db.insert(turnsTable)
      .values({
        call_session_id: callSessionId,
        role: 'user',
        text: 'Test turn',
        latency_ms: 100
      })
      .execute();

    // This should work without throwing
    const result = await getTurnsByCallSession(callSessionId);
    expect(result).toHaveLength(1);

    // Verify the call session actually exists in database
    const callSessions = await db.select()
      .from(callSessionsTable)
      .where(eq(callSessionsTable.id, callSessionId))
      .execute();

    expect(callSessions).toHaveLength(1);
    expect(callSessions[0].twilio_call_id).toEqual('call_123');
  });
});