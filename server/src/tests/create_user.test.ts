import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, subscriptionPlansTable } from '../db/schema';
import { type CreateUserInput, type CreateSubscriptionPlanInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  subscription_plan_id: null
};

const testPlanInput: CreateSubscriptionPlanInput = {
  name: 'Basic Plan',
  description: 'Basic subscription plan',
  price: 9.99,
  max_api_keys: 5,
  max_monthly_calls: 1000
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user without subscription plan', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.subscription_plan_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].subscription_plan_id).toBeNull();
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with valid subscription plan', async () => {
    // First create a subscription plan
    const planResult = await db.insert(subscriptionPlansTable)
      .values({
        name: testPlanInput.name,
        description: testPlanInput.description,
        price: testPlanInput.price.toString(),
        max_api_keys: testPlanInput.max_api_keys,
        max_monthly_calls: testPlanInput.max_monthly_calls
      })
      .returning()
      .execute();

    const plan = planResult[0];

    // Create user with subscription plan
    const userInput: CreateUserInput = {
      email: 'user@example.com',
      name: 'Plan User',
      subscription_plan_id: plan.id
    };

    const result = await createUser(userInput);

    expect(result.email).toEqual('user@example.com');
    expect(result.name).toEqual('Plan User');
    expect(result.subscription_plan_id).toEqual(plan.id);
    expect(result.id).toBeDefined();
  });

  it('should enforce email uniqueness', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      name: 'Another User',
      subscription_plan_id: null
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should validate subscription plan exists', async () => {
    const inputWithInvalidPlan: CreateUserInput = {
      email: 'test@example.com',
      name: 'Test User',
      subscription_plan_id: 999 // Non-existent plan
    };

    await expect(createUser(inputWithInvalidPlan)).rejects.toThrow(/Subscription plan with id 999 does not exist/i);
  });

  it('should handle subscription_plan_id as undefined', async () => {
    const inputWithUndefinedPlan: CreateUserInput = {
      email: 'test@example.com',
      name: 'Test User',
      subscription_plan_id: undefined as any // Explicitly undefined
    };

    const result = await createUser(inputWithUndefinedPlan);

    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.subscription_plan_id).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should create multiple users with different emails', async () => {
    // Create first user
    const user1 = await createUser({
      email: 'user1@example.com',
      name: 'User One',
      subscription_plan_id: null
    });

    // Create second user with different email
    const user2 = await createUser({
      email: 'user2@example.com',
      name: 'User Two',
      subscription_plan_id: null
    });

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('user1@example.com');
    expect(user2.email).toEqual('user2@example.com');

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});