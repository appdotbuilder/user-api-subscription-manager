import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { subscriptionPlansTable } from '../db/schema';
import { type CreateSubscriptionPlanInput } from '../schema';
import { createSubscriptionPlan } from '../handlers/create_subscription_plan';
import { eq } from 'drizzle-orm';

// Test input with all fields
const basicPlanInput: CreateSubscriptionPlanInput = {
  name: 'Basic Plan',
  description: 'A basic subscription plan',
  price: 9.99,
  max_api_keys: 5,
  max_monthly_calls: 1000
};

// Test input with nullable fields
const unlimitedPlanInput: CreateSubscriptionPlanInput = {
  name: 'Unlimited Plan',
  description: null,
  price: 99.99,
  max_api_keys: null,
  max_monthly_calls: null
};

describe('createSubscriptionPlan', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a subscription plan with all fields', async () => {
    const result = await createSubscriptionPlan(basicPlanInput);

    // Basic field validation
    expect(result.name).toEqual('Basic Plan');
    expect(result.description).toEqual('A basic subscription plan');
    expect(result.price).toEqual(9.99);
    expect(typeof result.price).toEqual('number');
    expect(result.max_api_keys).toEqual(5);
    expect(result.max_monthly_calls).toEqual(1000);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a subscription plan with nullable fields', async () => {
    const result = await createSubscriptionPlan(unlimitedPlanInput);

    expect(result.name).toEqual('Unlimited Plan');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(99.99);
    expect(typeof result.price).toEqual('number');
    expect(result.max_api_keys).toBeNull();
    expect(result.max_monthly_calls).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save subscription plan to database', async () => {
    const result = await createSubscriptionPlan(basicPlanInput);

    // Query using proper drizzle syntax
    const plans = await db.select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, result.id))
      .execute();

    expect(plans).toHaveLength(1);
    expect(plans[0].name).toEqual('Basic Plan');
    expect(plans[0].description).toEqual('A basic subscription plan');
    expect(parseFloat(plans[0].price)).toEqual(9.99);
    expect(plans[0].max_api_keys).toEqual(5);
    expect(plans[0].max_monthly_calls).toEqual(1000);
    expect(plans[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle zero price correctly', async () => {
    const freePlanInput: CreateSubscriptionPlanInput = {
      name: 'Free Plan',
      description: 'Free tier plan',
      price: 0,
      max_api_keys: 1,
      max_monthly_calls: 100
    };

    const result = await createSubscriptionPlan(freePlanInput);

    expect(result.price).toEqual(0);
    expect(typeof result.price).toEqual('number');
  });

  it('should throw error for duplicate plan names', async () => {
    // Create first plan
    await createSubscriptionPlan(basicPlanInput);

    // Attempt to create plan with same name
    const duplicateInput: CreateSubscriptionPlanInput = {
      name: 'Basic Plan', // Same name as first plan
      description: 'Another basic plan',
      price: 19.99,
      max_api_keys: 10,
      max_monthly_calls: 2000
    };

    await expect(createSubscriptionPlan(duplicateInput))
      .rejects.toThrow(/already exists/i);
  });

  it('should allow plans with different names', async () => {
    // Create first plan
    const firstPlan = await createSubscriptionPlan(basicPlanInput);

    // Create second plan with different name
    const secondPlanInput: CreateSubscriptionPlanInput = {
      name: 'Premium Plan',
      description: 'A premium subscription plan',
      price: 19.99,
      max_api_keys: 20,
      max_monthly_calls: 5000
    };

    const secondPlan = await createSubscriptionPlan(secondPlanInput);

    expect(firstPlan.id).not.toEqual(secondPlan.id);
    expect(firstPlan.name).toEqual('Basic Plan');
    expect(secondPlan.name).toEqual('Premium Plan');

    // Verify both plans exist in database
    const allPlans = await db.select().from(subscriptionPlansTable).execute();
    expect(allPlans).toHaveLength(2);
  });

  it('should handle large price values correctly', async () => {
    const enterprisePlanInput: CreateSubscriptionPlanInput = {
      name: 'Enterprise Plan',
      description: 'Enterprise subscription plan',
      price: 999.99,
      max_api_keys: 1000,
      max_monthly_calls: 100000
    };

    const result = await createSubscriptionPlan(enterprisePlanInput);

    expect(result.price).toEqual(999.99);
    expect(typeof result.price).toEqual('number');
    expect(result.max_api_keys).toEqual(1000);
    expect(result.max_monthly_calls).toEqual(100000);
  });
});