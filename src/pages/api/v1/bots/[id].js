import { query } from '../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../lib/auth.js';
import { botClusterManager } from '../../../../lib/bot-engine.js';

export async function GET({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;
    const botRes = await query(
      'SELECT * FROM bots WHERE id = $1 AND (user_id = $2 OR $3 = \'admin\')',
      [id, user.id, user.role]
    );

    if (botRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Bot not found' }), { status: 404 });
    }

    const logsRes = await query(
      'SELECT * FROM bot_logs WHERE bot_id = $1 ORDER BY created_at DESC LIMIT 50',
      [id]
    );

    return new Response(
      JSON.stringify({ bot: botRes.rows[0], logs: logsRes.rows }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;
    try {
      await botClusterManager.disconnectBot(id, user.id);
    } catch (e) {}

    await query('DELETE FROM bots WHERE id = $1 AND user_id = $2', [id, user.id]);

    return new Response(JSON.stringify({ success: true, message: 'Worker deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
