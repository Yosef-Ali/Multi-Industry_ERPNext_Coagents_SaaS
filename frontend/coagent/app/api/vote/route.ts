/**
 * Vote API endpoint for chat message feedback
 */

import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    // For now, return a simple response
    // In production, this would interact with a database
    return new Response(
        JSON.stringify({
            chatId,
            votes: { up: 0, down: 0 },
            userVote: null,
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const body = await req.json();
    const { vote } = body; // 'up' or 'down'

    // For now, return a simple response
    // In production, this would store the vote in a database
    return new Response(
        JSON.stringify({
            chatId,
            vote,
            success: true,
            message: 'Vote recorded',
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}