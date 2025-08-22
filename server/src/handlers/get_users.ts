import { db } from '../db';
import { usersTable, subscriptionPlansTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export async function getUsers(): Promise<User[]> {
  try {
    // Query users with left join to subscription plans to include related information
    const results = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at,
      subscription_plan_id: usersTable.subscription_plan_id
    })
    .from(usersTable)
    .leftJoin(subscriptionPlansTable, eq(usersTable.subscription_plan_id, subscriptionPlansTable.id))
    .execute();

    // Return users (no numeric columns to convert in this case)
    return results.map(result => ({
      id: result.id,
      email: result.email,
      name: result.name,
      created_at: result.created_at,
      updated_at: result.updated_at,
      subscription_plan_id: result.subscription_plan_id
    }));
  } catch (error) {
    console.error('Getting users failed:', error);
    throw error;
  }
}