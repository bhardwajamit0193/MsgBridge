import { query } from '../../../../lib/db.js';
import { getAuthenticatedUser } from '../../../../lib/auth.js';

export async function POST({ request }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { action, credits = 1000, amount = 10, plan = null } = body;

    if (action === 'upgrade_plan' && plan) {
      await query('UPDATE users SET plan = $1 WHERE id = $2', [plan, user.id]);
      await query(
        `INSERT INTO billing_transactions (user_id, amount_usd, credits_added, description)
         VALUES ($1, $2, 0, $3)`,
        [user.id, amount, `Subscription Plan Changed to ${plan.toUpperCase()}`]
      );
      return new Response(
        JSON.stringify({ success: true, message: `Upgraded to ${plan} tier` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Top up credits
    const addedCredits = parseInt(credits, 10);
    const chargedUsd = parseFloat(amount);

    await query('UPDATE users SET credits = credits + $1 WHERE id = $2', [addedCredits, user.id]);
    await query(
      `INSERT INTO billing_transactions (user_id, amount_usd, credits_added, description)
       VALUES ($1, $2, $3, $4)`,
      [user.id, chargedUsd, addedCredits, `Added ${addedCredits.toLocaleString()} MsgBridge Credits`]
    );

    const updated = await query('SELECT credits FROM users WHERE id = $1', [user.id]);

    return new Response(
      JSON.stringify({
        success: true,
        credits: updated.rows[0].credits,
        added: addedCredits,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
