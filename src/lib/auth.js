import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'msgbridge_fallback_secret_key_2026';

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });

  return list;
}

export async function getAuthenticatedUser(request) {
  // 1. Try Bearer token in Authorization header
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    
    // Check if it's an API Key (starts with mb_live_)
    if (token.startsWith('mb_live_')) {
      const res = await query(
        `SELECT u.id, u.email, u.name, u.role, u.plan, u.credits, k.id as key_id, k.rate_limit_per_min
         FROM api_keys k
         JOIN users u ON k.user_id = u.id
         WHERE k.key = $1 AND k.is_active = TRUE`,
        [token]
      );
      if (res.rows.length > 0) {
        // Update last_used_at
        await query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [res.rows[0].key_id]);
        return { ...res.rows[0], authType: 'api_key' };
      }
      return null;
    }

    // Otherwise treat as JWT token
    const decoded = verifyToken(token);
    if (decoded) {
      const res = await query(
        'SELECT id, email, name, role, plan, credits FROM users WHERE id = $1',
        [decoded.id]
      );
      if (res.rows.length > 0) {
        return { ...res.rows[0], authType: 'jwt' };
      }
    }
  }

  // 2. Try Cookie
  const cookieHeader = request.headers.get('cookie') || request.headers.get('Cookie');
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies['msgbridge_token'];

  if (sessionToken) {
    const decoded = verifyToken(sessionToken);
    if (decoded) {
      const res = await query(
        'SELECT id, email, name, role, plan, credits FROM users WHERE id = $1',
        [decoded.id]
      );
      if (res.rows.length > 0) {
        return { ...res.rows[0], authType: 'cookie' };
      }
    }
  }

  return null;
}
