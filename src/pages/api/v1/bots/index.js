import crypto from 'crypto';
import { query } from '../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../lib/auth.js';
import { botClusterManager } from '../../../../lib/bot-engine.js';

export async function GET({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const res = await query(
      `SELECT b.*, 
        (SELECT COUNT(*) FROM messages m WHERE m.bot_id = b.id) as total_messages,
        (SELECT COUNT(*) FROM bot_logs l WHERE l.bot_id = b.id) as total_logs
       FROM bots b 
       WHERE b.user_id = $1 
       ORDER BY b.created_at DESC`,
      [user.id]
    );

    return new Response(
      JSON.stringify({ bots: res.rows }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { name, platform = 'whatsapp' } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Bot name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const botId = `bot_${platform}_${crypto.randomBytes(6).toString('hex')}`;
    const insertRes = await query(
      `INSERT INTO bots (id, user_id, name, platform, status, account_info, last_active_at)
       VALUES ($1, $2, $3, $4, 'offline', '{}', NOW())
       RETURNING *`,
      [botId, user.id, name.trim(), platform]
    );

    await botClusterManager.log(botId, 'info', `Bot worker instance initialized for tenant #${user.id}`);

    return new Response(
      JSON.stringify({ success: true, bot: insertRes.rows[0] }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
