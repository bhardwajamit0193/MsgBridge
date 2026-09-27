import { query } from '../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../lib/auth.js';

export async function GET({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden. Admin privileges required.' }), { status: 403 });
    }

    const res = await query(`
      SELECT 
        u.id, u.email, u.name, u.role, u.plan, u.credits, u.created_at,
        (SELECT COUNT(*) FROM api_keys k WHERE k.user_id = u.id) as key_count,
        (SELECT COUNT(*) FROM bots b WHERE b.user_id = u.id) as bot_count,
        (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id) as message_count
      FROM users u
      ORDER BY u.created_at DESC
    `);

    return new Response(JSON.stringify({ users: res.rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden. Admin privileges required.' }), { status: 403 });
    }

    const body = await request.json();
    const { userId, plan, credits, role } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
    }

    const updates = [];
    const params = [userId];

    if (plan !== undefined) {
      params.push(plan);
      updates.push(`plan = $${params.length}`);
    }
    if (credits !== undefined) {
      params.push(parseInt(credits, 10));
      updates.push(`credits = $${params.length}`);
    }
    if (role !== undefined) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }

    if (updates.length > 0) {
      await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1`, params);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
