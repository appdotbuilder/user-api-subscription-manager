import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // Check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with ID ${input.id} not found`);
    }

    // If email is being updated, check uniqueness
    if (input.email) {
      const emailExists = await db.select()
        .from(usersTable)
        .where(and(
          eq(usersTable.email, input.email),
          ne(usersTable.id, input.id) // Exclude current user
        ))
        .execute();

      if (emailExists.length > 0) {
        throw new Error(`Email ${input.email} is already in use`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.subscription_plan_id !== undefined) {
      updateData.subscription_plan_id = input.subscription_plan_id;
    }

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}