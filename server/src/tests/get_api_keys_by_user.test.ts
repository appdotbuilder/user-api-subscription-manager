import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, apiKeysTable } from '../db/schema';
import { getApiKeysByUser } from '../handlers/get_api_keys_by_user';

describe('getApiKeysByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch API keys for a user', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create API keys for the user
    const apiKeyResults = await db.insert(apiKeysTable)
      .values([
        {
          user_id: userId,
          key_hash: 'hash1',
          name: 'Test Key 1',
          is_active: true
        },
        {
          user_id: userId,
          key_hash: 'hash2',
          name: 'Test Key 2',
          is_active: false
        }
      ])
      .returning()
      .execute();

    const result = await getApiKeysByUser(userId);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].name).toEqual('Test Key 1');
    expect(result[0].key_hash).toEqual('hash1');
    expect(result[0].is_active).toBe(true);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].last_used_at).toBeNull();

    expect(result[1].user_id).toEqual(userId);
    expect(result[1].name).toEqual('Test Key 2');
    expect(result[1].key_hash).toEqual('hash2');
    expect(result[1].is_active).toBe(false);
  });

  it('should return empty array when user has no API keys', async () => {
    // Create a user without API keys
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getApiKeysByUser(userId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return API keys for the specified user', async () => {
    // Create two users
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          name: 'User 1'
        },
        {
          email: 'user2@example.com',
          name: 'User 2'
        }
      ])
      .returning()
      .execute();

    const user1Id = userResults[0].id;
    const user2Id = userResults[1].id;

    // Create API keys for both users
    await db.insert(apiKeysTable)
      .values([
        {
          user_id: user1Id,
          key_hash: 'hash1',
          name: 'User 1 Key'
        },
        {
          user_id: user2Id,
          key_hash: 'hash2',
          name: 'User 2 Key'
        }
      ])
      .execute();

    const result = await getApiKeysByUser(user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1Id);
    expect(result[0].name).toEqual('User 1 Key');
    expect(result[0].key_hash).toEqual('hash1');
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 999;

    await expect(getApiKeysByUser(nonExistentUserId))
      .rejects.toThrow(/user with id 999 not found/i);
  });

  it('should handle API keys with last_used_at timestamp', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const lastUsedDate = new Date('2024-01-15T10:30:00Z');

    // Create an API key with last_used_at
    await db.insert(apiKeysTable)
      .values({
        user_id: userId,
        key_hash: 'hash_with_usage',
        name: 'Used Key',
        last_used_at: lastUsedDate
      })
      .execute();

    const result = await getApiKeysByUser(userId);

    expect(result).toHaveLength(1);
    expect(result[0].last_used_at).toBeInstanceOf(Date);
    expect(result[0].last_used_at).toEqual(lastUsedDate);
  });
});