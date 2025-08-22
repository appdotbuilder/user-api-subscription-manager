import { db } from '../db';
import { apiKeysTable, usersTable, subscriptionPlansTable } from '../db/schema';
import { type CreateApiKeyInput, type ApiKey } from '../schema';
import { eq } from 'drizzle-orm';

export const createApiKey = async (input: CreateApiKeyInput): Promise<ApiKey> => {
  try {
    // First, verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // If user has a subscription plan, check API key limits
    const userWithPlan = user[0];
    if (userWithPlan.subscription_plan_id) {
      // Get subscription plan details
      const subscriptionPlan = await db.select()
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.id, userWithPlan.subscription_plan_id))
        .execute();

      if (subscriptionPlan.length > 0 && subscriptionPlan[0].max_api_keys !== null) {
        // Count existing active API keys for the user
        const existingApiKeys = await db.select()
          .from(apiKeysTable)
          .where(eq(apiKeysTable.user_id, input.user_id))
          .execute();

        const activeApiKeysCount = existingApiKeys.filter(key => key.is_active).length;

        if (activeApiKeysCount >= subscriptionPlan[0].max_api_keys) {
          throw new Error(`API key limit reached. Maximum allowed: ${subscriptionPlan[0].max_api_keys}`);
        }
      }
    }

    // Insert the new API key
    const result = await db.insert(apiKeysTable)
      .values({
        user_id: input.user_id,
        key_hash: input.key_hash,
        name: input.name,
        is_active: true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('API key creation failed:', error);
    throw error;
  }
};