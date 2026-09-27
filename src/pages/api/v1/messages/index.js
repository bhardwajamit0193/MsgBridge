import { query } from '../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../lib/auth.js';

export async function GET({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    let sql = 'SELECT * FROM messages WHERE user_id = $1';
    const params = [user.id];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (type && type !== 'all') {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (recipient ILIKE $${params.length} OR content ILIKE $${params.length} OR id ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const res = await query(sql, params);

    return new Response(
      JSON.stringify({
        messages: res.rows,
        count: res.rows.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
