import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, subscriptionPlansTable } from '../db/schema';
import { type CreateUserInput, type CreateSubscriptionPlanInput } from '../schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users', async () => {
    // Create test users
    const user1Input: CreateUserInput = {
      email: 'user1@test.com',
      name: 'Test User 1',
      subscription_plan_id: null
    };

    const user2Input: CreateUserInput = {
      email: 'user2@test.com',
      name: 'Test User 2', 
      subscription_plan_id: null
    };

    await db.insert(usersTable).values([
      user1Input,
      user2Input
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify first user
    const user1 = result.find(u => u.email === 'user1@test.com');
    expect(user1).toBeDefined();
    expect(user1!.name).toEqual('Test User 1');
    expect(user1!.subscription_plan_id).toBeNull();
    expect(user1!.id).toBeDefined();
    expect(user1!.created_at).toBeInstanceOf(Date);
    expect(user1!.updated_at).toBeInstanceOf(Date);

    // Verify second user
    const user2 = result.find(u => u.email === 'user2@test.com');
    expect(user2).toBeDefined();
    expect(user2!.name).toEqual('Test User 2');
    expect(user2!.subscription_plan_id).toBeNull();
  });

  it('should return users with subscription plan references', async () => {
    // Create subscription plan first
    const planInput: CreateSubscriptionPlanInput = {
      name: 'Premium Plan',
      description: 'Premium subscription',
      price: 29.99,
      max_api_keys: 5,
      max_monthly_calls: 10000
    };

    const planResult = await db.insert(subscriptionPlansTable)
      .values({
        ...planInput,
        price: planInput.price.toString() // Convert to string for numeric column
      })
      .returning()
      .execute();

    const planId = planResult[0].id;

    // Create users with and without subscription plans
    const userWithPlan: CreateUserInput = {
      email: 'premium@test.com',
      name: 'Premium User',
      subscription_plan_id: planId
    };

    const userWithoutPlan: CreateUserInput = {
      email: 'basic@test.com',
      name: 'Basic User',
      subscription_plan_id: null
    };

    await db.insert(usersTable).values([
      userWithPlan,
      userWithoutPlan
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);

    // Find premium user
    const premiumUser = result.find(u => u.email === 'premium@test.com');
    expect(premiumUser).toBeDefined();
    expect(premiumUser!.subscription_plan_id).toEqual(planId);
    expect(premiumUser!.name).toEqual('Premium User');

    // Find basic user
    const basicUser = result.find(u => u.email === 'basic@test.com');
    expect(basicUser).toBeDefined();
    expect(basicUser!.subscription_plan_id).toBeNull();
    expect(basicUser!.name).toEqual('Basic User');
  });

  it('should maintain consistent user data structure', async () => {
    // Create test user
    const userInput: CreateUserInput = {
      email: 'structure@test.com',
      name: 'Structure Test User',
      subscription_plan_id: null
    };

    await db.insert(usersTable).values(userInput).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify all required fields exist and have correct types
    expect(typeof user.id).toBe('number');
    expect(typeof user.email).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
    expect(user.subscription_plan_id).toBeNull();

    // Verify email format
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('should handle multiple users with different subscription plan associations', async () => {
    // Create multiple subscription plans
    const plan1Input: CreateSubscriptionPlanInput = {
      name: 'Basic Plan',
      description: 'Basic subscription',
      price: 9.99,
      max_api_keys: 1,
      max_monthly_calls: 1000
    };

    const plan2Input: CreateSubscriptionPlanInput = {
      name: 'Pro Plan', 
      description: 'Professional subscription',
      price: 49.99,
      max_api_keys: 10,
      max_monthly_calls: 50000
    };

    const planResults = await db.insert(subscriptionPlansTable)
      .values([
        {
          ...plan1Input,
          price: plan1Input.price.toString()
        },
        {
          ...plan2Input,
          price: plan2Input.price.toString()
        }
      ])
      .returning()
      .execute();

    const plan1Id = planResults[0].id;
    const plan2Id = planResults[1].id;

    // Create users with different plan associations
    const users: CreateUserInput[] = [
      {
        email: 'basic@test.com',
        name: 'Basic User',
        subscription_plan_id: plan1Id
      },
      {
        email: 'pro@test.com',
        name: 'Pro User',
        subscription_plan_id: plan2Id
      },
      {
        email: 'free@test.com',
        name: 'Free User',
        subscription_plan_id: null
      }
    ];

    await db.insert(usersTable).values(users).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);

    // Verify each user has correct subscription plan association
    const basicUser = result.find(u => u.email === 'basic@test.com');
    expect(basicUser!.subscription_plan_id).toEqual(plan1Id);

    const proUser = result.find(u => u.email === 'pro@test.com');
    expect(proUser!.subscription_plan_id).toEqual(plan2Id);

    const freeUser = result.find(u => u.email === 'free@test.com');
    expect(freeUser!.subscription_plan_id).toBeNull();
  });
});