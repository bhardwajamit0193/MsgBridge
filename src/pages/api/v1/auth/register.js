import { query } from '../../../../lib/db.js';
import { hashPassword, generateToken } from '../../../../lib/auth.js';
import crypto from 'crypto';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const check = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (check.rows.length > 0) {
      return new Response(
        JSON.stringify({ error: 'An account with this email already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hashedPassword = await hashPassword(password);
    const insertRes = await query(
      `INSERT INTO users (email, password_hash, name, role, plan, credits)
       VALUES ($1, $2, $3, 'user', 'developer', 1000)
       RETURNING id, email, name, role, plan, credits`,
      [email.toLowerCase().trim(), hashedPassword, name.trim()]
    );

    const user = insertRes.rows[0];

    // Generate initial live API key
    const initialKey = `mb_live_${crypto.randomBytes(12).toString('hex')}`;
    const keyId = `key_${crypto.randomBytes(6).toString('hex')}`;
    await query(
      `INSERT INTO api_keys (id, user_id, name, key, rate_limit_per_min)
       VALUES ($1, $2, 'Default API Key', $3, 60)`,
      [keyId, user.id, initialKey]
    );

    // Provision initial WhatsApp worker instance
    const botId = `bot_wa_${crypto.randomBytes(6).toString('hex')}`;
    await query(
      `INSERT INTO bots (id, user_id, name, platform, status, account_info, last_active_at)
       VALUES ($1, $2, 'WhatsApp Worker #1', 'whatsapp', 'offline', '{}', NOW())`,
      [botId, user.id]
    );

    const token = generateToken(user);
    const cookieHeader = `msgbridge_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`;

    return new Response(
      JSON.stringify({
        success: true,
        user,
        token,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
