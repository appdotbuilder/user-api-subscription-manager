import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { callSessionsTable, usersTable, subscriptionPlansTable } from '../db/schema';
import { type EndCallSessionInput } from '../schema';
import { endCallSession } from '../handlers/end_call_session';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async () => {
  // Create subscription plan first
  const planResult = await db.insert(subscriptionPlansTable)
    .values({
      name: 'Test Plan',
      description: 'Test subscription plan',
      price: '29.99',
      max_api_keys: 5,
      max_monthly_calls: 1000
    })
    .returning()
    .execute();

  // Create user
  const userResult = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      name: 'Test User',
      subscription_plan_id: planResult[0].id
    })
    .returning()
    .execute();

  return userResult[0];
};

const createTestCallSession = async (userId: number, endTime?: Date, callIdSuffix?: string) => {
  const twilioCallId = `test_call_${callIdSuffix || Math.random().toString(36).substr(2, 9)}`;
  const result = await db.insert(callSessionsTable)
    .values({
      twilio_call_id: twilioCallId,
      user_id: userId,
      start_time: new Date('2023-01-01T10:00:00Z'),
      end_time: endTime || null
    })
    .returning()
    .execute();

  return result[0];
};

describe('endCallSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should end an active call session', async () => {
    // Setup test data
    const user = await createTestUser();
    const callSession = await createTestCallSession(user.id, undefined, '123');
    
    const endTime = new Date('2023-01-01T10:30:00Z');
    const input: EndCallSessionInput = {
      id: callSession.id,
      end_time: endTime
    };

    // Execute handler
    const result = await endCallSession(input);

    // Verify response
    expect(result.id).toBe(callSession.id);
    expect(result.twilio_call_id).toBe('test_call_123');
    expect(result.user_id).toBe(user.id);
    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.end_time).toBeInstanceOf(Date);
    expect(result.end_time).toEqual(endTime);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update call session in database', async () => {
    // Setup test data
    const user = await createTestUser();
    const callSession = await createTestCallSession(user.id, undefined, '456');
    
    const endTime = new Date('2023-01-01T10:45:00Z');
    const input: EndCallSessionInput = {
      id: callSession.id,
      end_time: endTime
    };

    // Execute handler
    await endCallSession(input);

    // Verify database was updated
    const updatedSessions = await db.select()
      .from(callSessionsTable)
      .where(eq(callSessionsTable.id, callSession.id))
      .execute();

    expect(updatedSessions).toHaveLength(1);
    const updatedSession = updatedSessions[0];
    expect(updatedSession.end_time).toBeInstanceOf(Date);
    expect(updatedSession.end_time).toEqual(endTime);
    expect(updatedSession.twilio_call_id).toBe('test_call_456');
    expect(updatedSession.user_id).toBe(user.id);
  });

  it('should throw error for non-existent call session', async () => {
    const input: EndCallSessionInput = {
      id: 999999, // Non-existent ID
      end_time: new Date()
    };

    await expect(endCallSession(input)).rejects.toThrow(/call session with id 999999 not found/i);
  });

  it('should throw error for already ended call session', async () => {
    // Setup test data with already ended session
    const user = await createTestUser();
    const existingEndTime = new Date('2023-01-01T10:15:00Z');
    const callSession = await createTestCallSession(user.id, existingEndTime, '789');
    
    const input: EndCallSessionInput = {
      id: callSession.id,
      end_time: new Date('2023-01-01T10:30:00Z')
    };

    await expect(endCallSession(input)).rejects.toThrow(/call session with id .+ is already ended/i);
  });

  it('should handle different end times correctly', async () => {
    // Setup multiple test sessions
    const user = await createTestUser();
    const callSession1 = await createTestCallSession(user.id, undefined, 'multi1');
    const callSession2 = await createTestCallSession(user.id, undefined, 'multi2');

    const endTime1 = new Date('2023-01-01T11:00:00Z');
    const endTime2 = new Date('2023-01-01T12:00:00Z');

    // End first session
    const result1 = await endCallSession({
      id: callSession1.id,
      end_time: endTime1
    });

    // End second session
    const result2 = await endCallSession({
      id: callSession2.id,
      end_time: endTime2
    });

    // Verify both sessions ended with correct times
    expect(result1.end_time).toEqual(endTime1);
    expect(result2.end_time).toEqual(endTime2);
    
    // Verify in database
    const sessions = await db.select()
      .from(callSessionsTable)
      .where(eq(callSessionsTable.user_id, user.id))
      .execute();

    expect(sessions).toHaveLength(2);
    sessions.forEach(session => {
      expect(session.end_time).toBeInstanceOf(Date);
      expect(session.end_time).not.toBeNull();
    });
  });

  it('should preserve all other call session data when ending', async () => {
    // Setup test data
    const user = await createTestUser();
    const originalStartTime = new Date('2023-01-01T09:30:00Z');
    
    const callSession = await db.insert(callSessionsTable)
      .values({
        twilio_call_id: 'preserve_test_call_456',
        user_id: user.id,
        start_time: originalStartTime,
        end_time: null
      })
      .returning()
      .execute();

    const endTime = new Date('2023-01-01T10:15:00Z');
    const input: EndCallSessionInput = {
      id: callSession[0].id,
      end_time: endTime
    };

    // Execute handler
    const result = await endCallSession(input);

    // Verify all original data is preserved
    expect(result.twilio_call_id).toBe('preserve_test_call_456');
    expect(result.user_id).toBe(user.id);
    expect(result.start_time).toEqual(originalStartTime);
    expect(result.end_time).toEqual(endTime);
    expect(result.created_at).toBeInstanceOf(Date);
  });
});