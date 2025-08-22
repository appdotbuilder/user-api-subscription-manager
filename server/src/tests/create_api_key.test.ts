import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { apiKeysTable, usersTable, subscriptionPlansTable } from '../db/schema';
import { type CreateApiKeyInput } from '../schema';
import { createApiKey } from '../handlers/create_api_key';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateApiKeyInput = {
  user_id: 1,
  key_hash: 'test_key_hash_123',
  name: 'Test API Key'
};

describe('createApiKey', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an API key for a valid user', async () => {
    // Create a user first
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User'
    }).execute();

    const result = await createApiKey(testInput);

    // Validate all fields
    expect(result.user_id).toEqual(1);
    expect(result.key_hash).toEqual('test_key_hash_123');
    expect(result.name).toEqual('Test API Key');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.last_used_at).toBeNull();
  });

  it('should save API key to database', async () => {
    // Create a user first
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User'
    }).execute();

    const result = await createApiKey(testInput);

    // Verify it's saved in the database
    const apiKeys = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, result.id))
      .execute();

    expect(apiKeys).toHaveLength(1);
    expect(apiKeys[0].user_id).toEqual(1);
    expect(apiKeys[0].key_hash).toEqual('test_key_hash_123');
    expect(apiKeys[0].name).toEqual('Test API Key');
    expect(apiKeys[0].is_active).toBe(true);
    expect(apiKeys[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    await expect(createApiKey(testInput)).rejects.toThrow(/user with id 1 not found/i);
  });

  it('should enforce API key limits for users with subscription plans', async () => {
    // Create subscription plan with max 2 API keys
    await db.insert(subscriptionPlansTable).values({
      name: 'Basic Plan',
      description: 'Basic subscription',
      price: '9.99',
      max_api_keys: 2,
      max_monthly_calls: 1000
    }).execute();

    // Create user with subscription plan
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      subscription_plan_id: 1
    }).execute();

    // Create first API key
    await createApiKey(testInput);

    // Create second API key
    const secondInput: CreateApiKeyInput = {
      user_id: 1,
      key_hash: 'test_key_hash_456',
      name: 'Second API Key'
    };
    await createApiKey(secondInput);

    // Third API key should fail
    const thirdInput: CreateApiKeyInput = {
      user_id: 1,
      key_hash: 'test_key_hash_789',
      name: 'Third API Key'
    };
    await expect(createApiKey(thirdInput)).rejects.toThrow(/api key limit reached.*maximum allowed: 2/i);
  });

  it('should allow unlimited API keys when subscription plan has no limit', async () => {
    // Create subscription plan with no API key limit (null)
    await db.insert(subscriptionPlansTable).values({
      name: 'Unlimited Plan',
      description: 'Unlimited subscription',
      price: '99.99',
      max_api_keys: null, // No limit
      max_monthly_calls: null
    }).execute();

    // Create user with subscription plan
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      subscription_plan_id: 1
    }).execute();

    // Should be able to create multiple API keys
    await createApiKey(testInput);

    const secondInput: CreateApiKeyInput = {
      user_id: 1,
      key_hash: 'test_key_hash_456',
      name: 'Second API Key'
    };
    const result = await createApiKey(secondInput);

    expect(result.name).toEqual('Second API Key');
  });

  it('should allow unlimited API keys for users without subscription plans', async () => {
    // Create user without subscription plan
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User'
      // subscription_plan_id is null
    }).execute();

    // Should be able to create API key
    const result = await createApiKey(testInput);
    expect(result.name).toEqual('Test API Key');

    // Should be able to create another API key
    const secondInput: CreateApiKeyInput = {
      user_id: 1,
      key_hash: 'test_key_hash_456',
      name: 'Second API Key'
    };
    const secondResult = await createApiKey(secondInput);
    expect(secondResult.name).toEqual('Second API Key');
  });

  it('should only count active API keys towards the limit', async () => {
    // Create subscription plan with max 2 API keys
    await db.insert(subscriptionPlansTable).values({
      name: 'Basic Plan',
      description: 'Basic subscription',
      price: '9.99',
      max_api_keys: 2,
      max_monthly_calls: 1000
    }).execute();

    // Create user with subscription plan
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      subscription_plan_id: 1
    }).execute();

    // Create first API key
    await createApiKey(testInput);

    // Create second API key
    const secondInput: CreateApiKeyInput = {
      user_id: 1,
      key_hash: 'test_key_hash_456',
      name: 'Second API Key'
    };
    await createApiKey(secondInput);

    // Deactivate the first API key
    await db.update(apiKeysTable)
      .set({ is_active: false })
      .where(eq(apiKeysTable.user_id, 1))
      .execute();

    // Should now be able to create a third API key since one is inactive
    const thirdInput: CreateApiKeyInput = {
      user_id: 1,
      key_hash: 'test_key_hash_789',
      name: 'Third API Key'
    };
    const result = await createApiKey(thirdInput);
    expect(result.name).toEqual('Third API Key');
  });

  it('should handle subscription plan that does not exist', async () => {
    // Create user with non-existent subscription plan ID
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      subscription_plan_id: 999 // Non-existent plan
    }).execute();

    // Should still allow API key creation (treats as no limit)
    const result = await createApiKey(testInput);
    expect(result.name).toEqual('Test API Key');
  });
});