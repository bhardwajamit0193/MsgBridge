import { query } from './db.js';

export const PLAN_LIMITS = {
  free: { maxTemplates: 3, label: 'Free Tier' },
  developer: { maxTemplates: 5, label: 'Developer Tier' },
  pro: { maxTemplates: 25, label: 'Pro Cluster' },
  enterprise: { maxTemplates: 9999, label: 'Enterprise Tier' }
};

/**
 * Ensures templates table exists
 */
export async function ensureTemplatesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS templates (
      id VARCHAR(64) PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(50) DEFAULT 'otp',
      content TEXT NOT NULL,
      variables JSONB DEFAULT '[]',
      channel VARCHAR(50) DEFAULT 'whatsapp',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
  `);
}

/**
 * Extracts {{variable_name}} tokens from template content string
 */
export function extractVariables(content = '') {
  const matches = content.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
  const uniqueVars = [...new Set(matches.map(m => m.replace(/[\{\}]/g, '').trim()))];
  return uniqueVars;
}

/**
 * Checks if user is within their subscription plan's template limit
 */
export async function checkUserTemplateQuota(userId) {
  await ensureTemplatesTable();

  const userRes = await query('SELECT plan FROM users WHERE id = $1', [userId]);
  const plan = userRes.rows[0]?.plan || 'developer';
  const planConfig = PLAN_LIMITS[plan] || PLAN_LIMITS.developer;
  const maxTemplates = planConfig.maxTemplates;

  const countRes = await query('SELECT COUNT(*) as count FROM templates WHERE user_id = $1', [userId]);
  const currentCount = parseInt(countRes.rows[0]?.count || '0', 10);

  return {
    plan,
    planLabel: planConfig.label,
    currentCount,
    maxTemplates,
    isUnlimited: maxTemplates >= 9999,
    allowed: currentCount < maxTemplates,
    remaining: Math.max(0, maxTemplates - currentCount)
  };
}
