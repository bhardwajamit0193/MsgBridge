import crypto from 'crypto';
import { query } from '../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../lib/auth.js';

export async function GET({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const res = await query(
      'SELECT id, name, key, rate_limit_per_min, is_active, last_used_at, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    return new Response(JSON.stringify({ keys: res.rows }), {
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
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { name = 'Production API Key', rateLimit = 60 } = body;

    const keyId = `key_${crypto.randomBytes(6).toString('hex')}`;
    const rawKey = `mb_live_${crypto.randomBytes(16).toString('hex')}`;

    const insertRes = await query(
      `INSERT INTO api_keys (id, user_id, name, key, rate_limit_per_min)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, key, rate_limit_per_min, is_active, created_at`,
      [keyId, user.id, name.trim(), rawKey, parseInt(rateLimit, 10) || 60]
    );

    return new Response(
      JSON.stringify({ success: true, key: insertRes.rows[0] }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const url = new URL(request.url);
    const keyId = url.searchParams.get('id');

    if (!keyId) {
      return new Response(JSON.stringify({ error: 'Key ID required' }), { status: 400 });
    }

    await query('DELETE FROM api_keys WHERE id = $1 AND user_id = $2', [keyId, user.id]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
