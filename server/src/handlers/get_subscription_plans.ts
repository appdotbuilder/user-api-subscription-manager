import { db } from '../db';
import { subscriptionPlansTable } from '../db/schema';
import { type SubscriptionPlan } from '../schema';

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const results = await db.select()
      .from(subscriptionPlansTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(plan => ({
      ...plan,
      price: parseFloat(plan.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch subscription plans:', error);
    throw error;
  }
};