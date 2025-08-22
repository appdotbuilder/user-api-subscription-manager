import { db } from '../db';
import { usersTable, subscriptionPlansTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // If subscription_plan_id is provided, validate it exists
    if (input.subscription_plan_id !== null && input.subscription_plan_id !== undefined) {
      const existingPlan = await db.select()
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.id, input.subscription_plan_id))
        .execute();
      
      if (existingPlan.length === 0) {
        throw new Error(`Subscription plan with id ${input.subscription_plan_id} does not exist`);
      }
    }

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        name: input.name,
        subscription_plan_id: input.subscription_plan_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};