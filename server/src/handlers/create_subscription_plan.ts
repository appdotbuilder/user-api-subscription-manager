import { db } from '../db';
import { subscriptionPlansTable } from '../db/schema';
import { type CreateSubscriptionPlanInput, type SubscriptionPlan } from '../schema';
import { eq } from 'drizzle-orm';

export const createSubscriptionPlan = async (input: CreateSubscriptionPlanInput): Promise<SubscriptionPlan> => {
  try {
    // Check if a plan with the same name already exists
    const existingPlan = await db.select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.name, input.name))
      .execute();

    if (existingPlan.length > 0) {
      throw new Error(`Subscription plan with name '${input.name}' already exists`);
    }

    // Insert the new subscription plan
    const result = await db.insert(subscriptionPlansTable)
      .values({
        name: input.name,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        max_api_keys: input.max_api_keys, // Integer column - no conversion needed
        max_monthly_calls: input.max_monthly_calls // Integer column - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const subscriptionPlan = result[0];
    return {
      ...subscriptionPlan,
      price: parseFloat(subscriptionPlan.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Subscription plan creation failed:', error);
    throw error;
  }
};