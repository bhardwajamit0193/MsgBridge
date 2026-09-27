import { getAuthenticatedUser } from '../../../../lib/auth.js';
import { botClusterManager } from '../../../../lib/bot-engine.js';

export async function GET({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden. Admin privileges required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clusterMetrics = await botClusterManager.getClusterMetrics();

    return new Response(JSON.stringify(clusterMetrics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
