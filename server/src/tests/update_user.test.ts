import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, subscriptionPlansTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user name', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Original Name',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: user.id,
      name: 'Updated Name'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(user.id);
    expect(result.name).toEqual('Updated Name');
    expect(result.email).toEqual('test@example.com');
    expect(result.subscription_plan_id).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(user.updated_at.getTime());
  });

  it('should update user email', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'old@example.com',
        name: 'Test User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: user.id,
      email: 'new@example.com'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(user.id);
    expect(result.email).toEqual('new@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update subscription plan', async () => {
    // Create subscription plan
    const [plan] = await db.insert(subscriptionPlansTable)
      .values({
        name: 'Premium Plan',
        description: 'Premium features',
        price: '29.99',
        max_api_keys: 10,
        max_monthly_calls: 10000
      })
      .returning()
      .execute();

    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: user.id,
      subscription_plan_id: plan.id
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(user.id);
    expect(result.subscription_plan_id).toEqual(plan.id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'old@example.com',
        name: 'Old Name',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: user.id,
      email: 'new@example.com',
      name: 'New Name'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(user.id);
    expect(result.email).toEqual('new@example.com');
    expect(result.name).toEqual('New Name');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Original Name',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: user.id,
      name: 'Updated Name'
    };

    await updateUser(input);

    // Verify changes persisted in database
    const [updatedUser] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUser.name).toEqual('Updated Name');
    expect(updatedUser.updated_at.getTime()).toBeGreaterThan(user.updated_at.getTime());
  });

  it('should set subscription_plan_id to null', async () => {
    // Create subscription plan
    const [plan] = await db.insert(subscriptionPlansTable)
      .values({
        name: 'Basic Plan',
        description: 'Basic features',
        price: '9.99',
        max_api_keys: 5,
        max_monthly_calls: 1000
      })
      .returning()
      .execute();

    // Create test user with subscription
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: plan.id
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: user.id,
      subscription_plan_id: null
    };

    const result = await updateUser(input);

    expect(result.subscription_plan_id).toBeNull();
  });

  it('should throw error when user does not exist', async () => {
    const input: UpdateUserInput = {
      id: 999999, // Non-existent ID
      name: 'Test Name'
    };

    await expect(updateUser(input)).rejects.toThrow(/User with ID 999999 not found/i);
  });

  it('should throw error when email is already taken', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User 1',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User 2',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: user2.id,
      email: 'user1@example.com' // Try to use user1's email
    };

    await expect(updateUser(input)).rejects.toThrow(/Email user1@example.com is already in use/i);
  });

  it('should allow updating to same email', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    const input: UpdateUserInput = {
      id: user.id,
      email: 'test@example.com', // Same email
      name: 'Updated Name'
    };

    const result = await updateUser(input);

    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Updated Name');
  });

  it('should only update provided fields', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Original Name',
        subscription_plan_id: null
      })
      .returning()
      .execute();

    // Only update name, leave email and subscription unchanged
    const input: UpdateUserInput = {
      id: user.id,
      name: 'Updated Name'
    };

    const result = await updateUser(input);

    expect(result.name).toEqual('Updated Name');
    expect(result.email).toEqual('test@example.com'); // Unchanged
    expect(result.subscription_plan_id).toBeNull(); // Unchanged
  });
});