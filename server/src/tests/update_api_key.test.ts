import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, apiKeysTable } from '../db/schema';
import { type UpdateApiKeyInput } from '../schema';
import { updateApiKey } from '../handlers/update_api_key';
import { eq } from 'drizzle-orm';

describe('updateApiKey', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testApiKeyId: number;

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: null
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create test API key
    const apiKeyResult = await db.insert(apiKeysTable)
      .values({
        user_id: testUserId,
        key_hash: 'test_hash_123',
        name: 'Original API Key',
        is_active: true
      })
      .returning()
      .execute();
    
    testApiKeyId = apiKeyResult[0].id;
  });

  it('should update API key name', async () => {
    const input: UpdateApiKeyInput = {
      id: testApiKeyId,
      name: 'Updated API Key Name'
    };

    const result = await updateApiKey(input);

    expect(result.id).toEqual(testApiKeyId);
    expect(result.name).toEqual('Updated API Key Name');
    expect(result.is_active).toEqual(true); // Should remain unchanged
    expect(result.user_id).toEqual(testUserId);
    expect(result.key_hash).toEqual('test_hash_123');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update API key active status', async () => {
    const input: UpdateApiKeyInput = {
      id: testApiKeyId,
      is_active: false
    };

    const result = await updateApiKey(input);

    expect(result.id).toEqual(testApiKeyId);
    expect(result.name).toEqual('Original API Key'); // Should remain unchanged
    expect(result.is_active).toEqual(false);
    expect(result.user_id).toEqual(testUserId);
    expect(result.key_hash).toEqual('test_hash_123');
  });

  it('should update both name and active status', async () => {
    const input: UpdateApiKeyInput = {
      id: testApiKeyId,
      name: 'Completely Updated Key',
      is_active: false
    };

    const result = await updateApiKey(input);

    expect(result.id).toEqual(testApiKeyId);
    expect(result.name).toEqual('Completely Updated Key');
    expect(result.is_active).toEqual(false);
    expect(result.user_id).toEqual(testUserId);
    expect(result.key_hash).toEqual('test_hash_123');
  });

  it('should save updates to database', async () => {
    const input: UpdateApiKeyInput = {
      id: testApiKeyId,
      name: 'Database Test Key',
      is_active: false
    };

    await updateApiKey(input);

    // Verify the changes were persisted
    const apiKeys = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, testApiKeyId))
      .execute();

    expect(apiKeys).toHaveLength(1);
    expect(apiKeys[0].name).toEqual('Database Test Key');
    expect(apiKeys[0].is_active).toEqual(false);
    expect(apiKeys[0].user_id).toEqual(testUserId);
  });

  it('should handle partial updates correctly', async () => {
    // Update only the name
    const nameOnlyInput: UpdateApiKeyInput = {
      id: testApiKeyId,
      name: 'Name Only Update'
    };

    const result1 = await updateApiKey(nameOnlyInput);
    expect(result1.name).toEqual('Name Only Update');
    expect(result1.is_active).toEqual(true); // Should remain unchanged

    // Update only the active status
    const statusOnlyInput: UpdateApiKeyInput = {
      id: testApiKeyId,
      is_active: false
    };

    const result2 = await updateApiKey(statusOnlyInput);
    expect(result2.name).toEqual('Name Only Update'); // Should remain from previous update
    expect(result2.is_active).toEqual(false);
  });

  it('should throw error for non-existent API key', async () => {
    const input: UpdateApiKeyInput = {
      id: 99999, // Non-existent ID
      name: 'Should Fail'
    };

    expect(updateApiKey(input)).rejects.toThrow(/API key with id 99999 not found/i);
  });

  it('should preserve other fields when updating', async () => {
    // First, update the last_used_at field directly in database
    await db.update(apiKeysTable)
      .set({ last_used_at: new Date('2023-01-01') })
      .where(eq(apiKeysTable.id, testApiKeyId))
      .execute();

    const input: UpdateApiKeyInput = {
      id: testApiKeyId,
      name: 'Preserve Other Fields'
    };

    const result = await updateApiKey(input);

    expect(result.name).toEqual('Preserve Other Fields');
    expect(result.last_used_at).toBeInstanceOf(Date);
    expect(result.user_id).toEqual(testUserId);
    expect(result.key_hash).toEqual('test_hash_123');
    expect(result.created_at).toBeInstanceOf(Date);
  });
});