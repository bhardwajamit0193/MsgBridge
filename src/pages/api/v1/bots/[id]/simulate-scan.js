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
    const nickname = body.nickname || `MsgBridge Bot (${user.name})`;
    const wechatId = body.wechatId || `wxid_${Math.random().toString(36).substring(2, 8)}`;

    const loginResult = await botClusterManager.confirmLogin(id, user.id, {
      nickname,
      wechatId,
    });

    return new Response(
      JSON.stringify(loginResult),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
