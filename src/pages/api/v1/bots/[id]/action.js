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

    const body = await request.json();
    const { action } = body;

    let result;
    if (action === 'restart') {
      result = await botClusterManager.restartBot(id, user.id);
    } else if (action === 'disconnect') {
      result = await botClusterManager.disconnectBot(id, user.id);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
