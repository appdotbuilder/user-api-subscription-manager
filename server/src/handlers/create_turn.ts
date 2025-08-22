import { type CreateTurnInput, type Turn } from '../schema';

export async function createTurn(input: CreateTurnInput): Promise<Turn> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new turn within a call session and persisting it in the database.
    // Should validate that call session exists and is active (not ended).
    return Promise.resolve({
        id: 1, // Placeholder ID
        call_session_id: input.call_session_id,
        role: input.role,
        text: input.text,
        latency_ms: input.latency_ms,
        created_at: new Date()
    } as Turn);
}