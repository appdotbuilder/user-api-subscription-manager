import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { subscriptionPlansTable } from '../db/schema';
import { type CreateSubscriptionPlanInput } from '../schema';
import { getSubscriptionPlans } from '../handlers/get_subscription_plans';

// Test subscription plan inputs
const basicPlan: CreateSubscriptionPlanInput = {
  name: 'Basic Plan',
  description: 'Basic subscription plan',
  price: 9.99,
  max_api_keys: 5,
  max_monthly_calls: 1000
};

const premiumPlan: CreateSubscriptionPlanInput = {
  name: 'Premium Plan',
  description: 'Premium subscription plan with more features',
  price: 29.99,
  max_api_keys: 20,
  max_monthly_calls: 10000
};

const unlimitedPlan: CreateSubscriptionPlanInput = {
  name: 'Unlimited Plan',
  description: null,
  price: 99.99,
  max_api_keys: null,
  max_monthly_calls: null
};

describe('getSubscriptionPlans', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no plans exist', async () => {
    const result = await getSubscriptionPlans();

    expect(result).toEqual([]);
  });

  it('should return all subscription plans', async () => {
    // Create test subscription plans
    await db.insert(subscriptionPlansTable)
      .values([
        {
          name: basicPlan.name,
          description: basicPlan.description,
          price: basicPlan.price.toString(),
          max_api_keys: basicPlan.max_api_keys,
          max_monthly_calls: basicPlan.max_monthly_calls
        },
        {
          name: premiumPlan.name,
          description: premiumPlan.description,
          price: premiumPlan.price.toString(),
          max_api_keys: premiumPlan.max_api_keys,
          max_monthly_calls: premiumPlan.max_monthly_calls
        }
      ])
      .execute();

    const result = await getSubscriptionPlans();

    expect(result).toHaveLength(2);
    
    // Verify basic plan
    const basic = result.find(p => p.name === 'Basic Plan');
    expect(basic).toBeDefined();
    expect(basic!.description).toEqual('Basic subscription plan');
    expect(basic!.price).toEqual(9.99);
    expect(typeof basic!.price).toEqual('number');
    expect(basic!.max_api_keys).toEqual(5);
    expect(basic!.max_monthly_calls).toEqual(1000);
    expect(basic!.id).toBeDefined();
    expect(basic!.created_at).toBeInstanceOf(Date);

    // Verify premium plan
    const premium = result.find(p => p.name === 'Premium Plan');
    expect(premium).toBeDefined();
    expect(premium!.description).toEqual('Premium subscription plan with more features');
    expect(premium!.price).toEqual(29.99);
    expect(typeof premium!.price).toEqual('number');
    expect(premium!.max_api_keys).toEqual(20);
    expect(premium!.max_monthly_calls).toEqual(10000);
  });

  it('should handle plans with null values correctly', async () => {
    // Create unlimited plan with null values
    await db.insert(subscriptionPlansTable)
      .values({
        name: unlimitedPlan.name,
        description: unlimitedPlan.description,
        price: unlimitedPlan.price.toString(),
        max_api_keys: unlimitedPlan.max_api_keys,
        max_monthly_calls: unlimitedPlan.max_monthly_calls
      })
      .execute();

    const result = await getSubscriptionPlans();

    expect(result).toHaveLength(1);
    const unlimited = result[0];
    
    expect(unlimited.name).toEqual('Unlimited Plan');
    expect(unlimited.description).toBeNull();
    expect(unlimited.price).toEqual(99.99);
    expect(typeof unlimited.price).toEqual('number');
    expect(unlimited.max_api_keys).toBeNull();
    expect(unlimited.max_monthly_calls).toBeNull();
    expect(unlimited.id).toBeDefined();
    expect(unlimited.created_at).toBeInstanceOf(Date);
  });

  it('should return plans in order they were created', async () => {
    // Create plans in specific order
    const firstPlan = await db.insert(subscriptionPlansTable)
      .values({
        name: 'First Plan',
        description: 'First created',
        price: '10.00',
        max_api_keys: 1,
        max_monthly_calls: 100
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    const secondPlan = await db.insert(subscriptionPlansTable)
      .values({
        name: 'Second Plan',
        description: 'Second created',
        price: '20.00',
        max_api_keys: 2,
        max_monthly_calls: 200
      })
      .returning()
      .execute();

    const result = await getSubscriptionPlans();

    expect(result).toHaveLength(2);
    // Should maintain database ordering (by ID)
    expect(result[0].id).toEqual(firstPlan[0].id);
    expect(result[1].id).toEqual(secondPlan[0].id);
    expect(result[0].name).toEqual('First Plan');
    expect(result[1].name).toEqual('Second Plan');
  });

  it('should handle various price formats correctly', async () => {
    // Create plans with different price precision
    await db.insert(subscriptionPlansTable)
      .values([
        {
          name: 'Whole Number',
          description: 'Price with no decimals',
          price: '50',
          max_api_keys: 10,
          max_monthly_calls: 5000
        },
        {
          name: 'One Decimal',
          description: 'Price with one decimal',
          price: '25.5',
          max_api_keys: 8,
          max_monthly_calls: 2500
        },
        {
          name: 'Two Decimals',
          description: 'Price with two decimals',
          price: '15.99',
          max_api_keys: 5,
          max_monthly_calls: 1500
        }
      ])
      .execute();

    const result = await getSubscriptionPlans();

    expect(result).toHaveLength(3);
    
    const wholeNumber = result.find(p => p.name === 'Whole Number');
    expect(wholeNumber!.price).toEqual(50);
    expect(typeof wholeNumber!.price).toEqual('number');

    const oneDecimal = result.find(p => p.name === 'One Decimal');
    expect(oneDecimal!.price).toEqual(25.5);
    expect(typeof oneDecimal!.price).toEqual('number');

    const twoDecimals = result.find(p => p.name === 'Two Decimals');
    expect(twoDecimals!.price).toEqual(15.99);
    expect(typeof twoDecimals!.price).toEqual('number');
  });
});