import { query } from '../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../lib/auth.js';

export async function GET({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden. Admin privileges required.' }), { status: 403 });
    }

    const botsRes = await query(`
      SELECT 
        b.*, 
        u.email as owner_email,
        u.name as owner_name,
        (SELECT COUNT(*) FROM messages m WHERE m.bot_id = b.id) as message_count
      FROM bots b
      JOIN users u ON b.user_id = u.id
      ORDER BY b.last_active_at DESC
    `);

    const logsRes = await query(`
      SELECT l.*, b.name as bot_name, u.email as owner_email
      FROM bot_logs l
      JOIN bots b ON l.bot_id = b.id
      JOIN users u ON b.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);

    return new Response(
      JSON.stringify({
        bots: botsRes.rows,
        logs: logsRes.rows,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
