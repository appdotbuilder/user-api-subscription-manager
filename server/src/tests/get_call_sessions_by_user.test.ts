import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, callSessionsTable, subscriptionPlansTable } from '../db/schema';
import { type CreateUserInput, type CreateCallSessionInput } from '../schema';
import { getCallSessionsByUser } from '../handlers/get_call_sessions_by_user';

describe('getCallSessionsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return call sessions for a valid user', async () => {
    // Create a test subscription plan first
    const subscriptionPlan = await db.insert(subscriptionPlansTable)
      .values({
        name: 'Test Plan',
        description: 'Test subscription plan',
        price: '29.99',
        max_api_keys: 10,
        max_monthly_calls: 1000
      })
      .returning()
      .execute();

    // Create a test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: subscriptionPlan[0].id
      })
      .returning()
      .execute();

    // Create test call sessions
    const callSession1 = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'call_123',
        user_id: testUser[0].id,
        start_time: new Date('2024-01-01T10:00:00Z')
      })
      .returning()
      .execute();

    const callSession2 = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'call_456',
        user_id: testUser[0].id,
        start_time: new Date('2024-01-02T15:30:00Z'),
        end_time: new Date('2024-01-02T15:45:00Z')
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getCallSessionsByUser(testUser[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(testUser[0].id);
    expect(result[1].user_id).toEqual(testUser[0].id);
    
    // Verify all call sessions are returned
    const callIds = result.map(session => session.twilio_call_id).sort();
    expect(callIds).toEqual(['call_123', 'call_456']);
    
    // Verify timestamps are properly handled
    expect(result[0].start_time).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for user with no call sessions', async () => {
    // Create a test user with no call sessions
    const testUser = await db.insert(usersTable)
      .values({
        email: 'lonely@example.com',
        name: 'Lonely User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const result = await getCallSessionsByUser(testUser[0].id);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 999999;

    await expect(getCallSessionsByUser(nonExistentUserId))
      .rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should only return call sessions for the specified user', async () => {
    // Create two test users
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User One',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    // Create call sessions for both users
    await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'user1_call_1',
        user_id: user1[0].id,
        start_time: new Date('2024-01-01T10:00:00Z')
      })
      .execute();

    await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'user1_call_2',
        user_id: user1[0].id,
        start_time: new Date('2024-01-02T10:00:00Z')
      })
      .execute();

    await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'user2_call_1',
        user_id: user2[0].id,
        start_time: new Date('2024-01-03T10:00:00Z')
      })
      .execute();

    // Test that we only get user1's call sessions
    const result = await getCallSessionsByUser(user1[0].id);

    expect(result).toHaveLength(2);
    result.forEach(session => {
      expect(session.user_id).toEqual(user1[0].id);
      expect(session.twilio_call_id).toMatch(/^user1_call_/);
    });
  });

  it('should handle call sessions with and without end_time', async () => {
    // Create a test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'timing@example.com',
        name: 'Timing User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    // Create ongoing call session (no end_time)
    await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'ongoing_call',
        user_id: testUser[0].id,
        start_time: new Date('2024-01-01T10:00:00Z')
        // end_time is null
      })
      .execute();

    // Create completed call session (with end_time)
    await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'completed_call',
        user_id: testUser[0].id,
        start_time: new Date('2024-01-02T10:00:00Z'),
        end_time: new Date('2024-01-02T10:30:00Z')
      })
      .execute();

    const result = await getCallSessionsByUser(testUser[0].id);

    expect(result).toHaveLength(2);

    const ongoingCall = result.find(session => session.twilio_call_id === 'ongoing_call');
    const completedCall = result.find(session => session.twilio_call_id === 'completed_call');

    expect(ongoingCall).toBeDefined();
    expect(ongoingCall!.end_time).toBeNull();
    expect(ongoingCall!.start_time).toBeInstanceOf(Date);

    expect(completedCall).toBeDefined();
    expect(completedCall!.end_time).toBeInstanceOf(Date);
    expect(completedCall!.start_time).toBeInstanceOf(Date);
  });
});