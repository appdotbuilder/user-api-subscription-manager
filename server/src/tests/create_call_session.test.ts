import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { callSessionsTable, usersTable } from '../db/schema';
import { type CreateCallSessionInput } from '../schema';
import { createCallSession } from '../handlers/create_call_session';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  subscription_plan_id: null
};

const testInput: CreateCallSessionInput = {
  twilio_call_id: 'CA1234567890abcdef',
  user_id: 1, // Will be set to actual user ID after creation
  start_time: new Date('2024-01-01T10:00:00Z')
};

describe('createCallSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a call session', async () => {
    // Create test user first
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input = { ...testInput, user_id: user[0].id };
    const result = await createCallSession(input);

    // Basic field validation
    expect(result.twilio_call_id).toEqual('CA1234567890abcdef');
    expect(result.user_id).toEqual(user[0].id);
    expect(result.start_time).toEqual(new Date('2024-01-01T10:00:00Z'));
    expect(result.end_time).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save call session to database', async () => {
    // Create test user first
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input = { ...testInput, user_id: user[0].id };
    const result = await createCallSession(input);

    // Query using proper drizzle syntax
    const callSessions = await db.select()
      .from(callSessionsTable)
      .where(eq(callSessionsTable.id, result.id))
      .execute();

    expect(callSessions).toHaveLength(1);
    expect(callSessions[0].twilio_call_id).toEqual('CA1234567890abcdef');
    expect(callSessions[0].user_id).toEqual(user[0].id);
    expect(callSessions[0].start_time).toEqual(new Date('2024-01-01T10:00:00Z'));
    expect(callSessions[0].end_time).toBeNull();
    expect(callSessions[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject call session for non-existent user', async () => {
    const input = { ...testInput, user_id: 999 }; // Non-existent user ID

    await expect(createCallSession(input)).rejects.toThrow(/user with id 999 does not exist/i);
  });

  it('should handle duplicate twilio_call_id', async () => {
    // Create test user first
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input = { ...testInput, user_id: user[0].id };

    // Create first call session
    await createCallSession(input);

    // Try to create duplicate - should fail due to unique constraint
    await expect(createCallSession(input)).rejects.toThrow();
  });

  it('should create multiple call sessions for same user', async () => {
    // Create test user first
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create first call session
    const input1 = { ...testInput, user_id: user[0].id, twilio_call_id: 'CA1111111111111111' };
    const result1 = await createCallSession(input1);

    // Create second call session for same user
    const input2 = { ...testInput, user_id: user[0].id, twilio_call_id: 'CA2222222222222222' };
    const result2 = await createCallSession(input2);

    expect(result1.user_id).toEqual(result2.user_id);
    expect(result1.twilio_call_id).not.toEqual(result2.twilio_call_id);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both exist in database
    const callSessions = await db.select()
      .from(callSessionsTable)
      .where(eq(callSessionsTable.user_id, user[0].id))
      .execute();

    expect(callSessions).toHaveLength(2);
  });

  it('should preserve start_time accurately', async () => {
    // Create test user first
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const specificTime = new Date('2024-03-15T14:30:25.123Z');
    const input = { 
      ...testInput, 
      user_id: user[0].id, 
      start_time: specificTime 
    };

    const result = await createCallSession(input);

    expect(result.start_time).toEqual(specificTime);
    expect(result.start_time.getTime()).toEqual(specificTime.getTime());
  });
});