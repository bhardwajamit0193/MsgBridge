import { query } from '../../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../../lib/auth.js';
import { botClusterManager } from '../../../../../lib/bot-engine.js';

export async function POST({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;
    const botRes = await query('SELECT * FROM bots WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (botRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Bot not found' }), { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Please provide your phone number with country code (e.g. +1 650 555 0192)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await botClusterManager.requestPairingCode(id, user.id, phoneNumber);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
