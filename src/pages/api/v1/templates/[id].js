import { query } from '../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../lib/auth.js';
import { extractVariables } from '../../../../lib/templates.js';

export async function GET({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;
    const res = await query('SELECT * FROM templates WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (res.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, template: res.rows[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function PUT({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const { name, content, category, channel = 'whatsapp', is_active = true } = body;

    const existing = await query('SELECT * FROM templates WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 });
    }

    const newName = name ? name.trim() : existing.rows[0].name;
    const newContent = content ? content.trim() : existing.rows[0].content;
    const newCategory = category || existing.rows[0].category;
    const detectedVars = extractVariables(newContent);

    const updateRes = await query(
      `UPDATE templates 
       SET name = $1, content = $2, category = $3, variables = $4, channel = $5, is_active = $6, updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [newName, newContent, newCategory, JSON.stringify(detectedVars), channel, is_active, id, user.id]
    );

    return new Response(JSON.stringify({ success: true, template: updateRes.rows[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;
    const delRes = await query('DELETE FROM templates WHERE id = $1 AND user_id = $2 RETURNING id', [id, user.id]);
    if (delRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Template deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
