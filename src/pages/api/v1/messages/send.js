import { getAuthenticatedUser } from '../../../../lib/auth.js';
import { botClusterManager } from '../../../../lib/bot-engine.js';

export async function POST({ request }) {
  try {
    // Authenticate via Bearer API Key or session cookie
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized. Provide a valid API key (Bearer mb_live_...) or session token.',
          code: 'UNAUTHORIZED'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { recipient, message, content, type = 'otp', botId = null, channel = 'whatsapp' } = body;
    const messageContent = message || content;

    if (!recipient || !messageContent) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: recipient and message (or content) are required.',
          code: 'INVALID_PARAMETERS'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Dispatch message via Bot Cluster Manager
    const result = await botClusterManager.sendMessage({
      userId: user.id,
      botId,
      recipient: recipient.trim(),
      content: messageContent.trim(),
      type,
      channel
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        remainingCredits: Math.max(0, user.credits - 1),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const status = err.message.includes('Insufficient credits') ? 402 : 500;
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        code: status === 402 ? 'INSUFFICIENT_CREDITS' : 'DISPATCH_ERROR'
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
