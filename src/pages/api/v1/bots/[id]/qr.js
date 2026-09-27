import { query } from '../../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../../lib/auth.js';
import { botClusterManager } from '../../../../../lib/bot-engine.js';

export async function GET({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;
    const botRes = await query('SELECT * FROM bots WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (botRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Bot not found' }), { status: 404 });
    }

    const bot = botRes.rows[0];
    const worker = botClusterManager.getWorker(id);

    return new Response(
      JSON.stringify({
        success: true,
        status: worker.status || bot.status,
        qrDataUrl: worker.qrDataUrl || bot.qr_data,
        platform: bot.platform
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function POST({ params, request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;
    const botRes = await query('SELECT * FROM bots WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (botRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Bot not found' }), { status: 404 });
    }

    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const requestedPlatform = body.platform || null;
    const forceRefresh = body.force === true || url.searchParams.get('force') === 'true';

    const qrResult = await botClusterManager.generateLinkingQR(id, user.id, requestedPlatform, forceRefresh);

    return new Response(
      JSON.stringify({
        success: true,
        ...qrResult,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
