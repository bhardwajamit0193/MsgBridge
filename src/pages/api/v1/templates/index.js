import crypto from 'crypto';
import { query } from '../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../lib/auth.js';
import { checkUserTemplateQuota, extractVariables } from '../../../../lib/templates.js';

export async function GET({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const quota = await checkUserTemplateQuota(user.id);
    const templatesRes = await query(
      `SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );

    return new Response(
      JSON.stringify({
        success: true,
        templates: templatesRes.rows,
        quota
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

export async function POST({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const { name, content, category = 'otp', channel = 'whatsapp' } = body;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Template name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: 'Template content payload is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Enforce subscription plan limits
    const quota = await checkUserTemplateQuota(user.id);
    if (!quota.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Template quota reached for your ${quota.planLabel} (${quota.currentCount}/${quota.maxTemplates} templates). Please upgrade your subscription plan to add more templates.`,
          code: 'PLAN_LIMIT_REACHED',
          quota
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const templateId = `tpl_${category}_${crypto.randomBytes(6).toString('hex')}`;
    const detectedVars = extractVariables(content);

    const insertRes = await query(
      `INSERT INTO templates (id, user_id, name, category, content, variables, channel)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [templateId, user.id, name.trim(), category, content.trim(), JSON.stringify(detectedVars), channel]
    );

    return new Response(
      JSON.stringify({
        success: true,
        template: insertRes.rows[0],
        quota: {
          ...quota,
          currentCount: quota.currentCount + 1,
          remaining: Math.max(0, quota.remaining - 1)
        }
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
