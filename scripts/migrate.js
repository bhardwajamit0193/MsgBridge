import bcrypt from 'bcryptjs';
import { pool, query } from '../src/lib/db.js';

async function migrate() {
  console.log('🔄 Starting database schema migration on Supabase PostgreSQL...');

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      plan VARCHAR(50) DEFAULT 'developer',
      credits INTEGER DEFAULT 1000,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id VARCHAR(64) PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      key VARCHAR(255) UNIQUE NOT NULL,
      rate_limit_per_min INTEGER DEFAULT 60,
      is_active BOOLEAN DEFAULT TRUE,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bots (
      id VARCHAR(64) PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      platform VARCHAR(50) DEFAULT 'wechat',
      status VARCHAR(50) DEFAULT 'offline',
      qr_data TEXT,
      account_info JSONB DEFAULT '{}',
      last_active_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bot_logs (
      id SERIAL PRIMARY KEY,
      bot_id VARCHAR(64) REFERENCES bots(id) ON DELETE CASCADE,
      level VARCHAR(20) DEFAULT 'info',
      message TEXT NOT NULL,
      details JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(64) PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      bot_id VARCHAR(64) REFERENCES bots(id) ON DELETE SET NULL,
      type VARCHAR(50) DEFAULT 'otp',
      recipient VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'delivered',
      direction VARCHAR(20) DEFAULT 'outbound',
      channel VARCHAR(50) DEFAULT 'wechat',
      cost_credits INTEGER DEFAULT 1,
      error_message TEXT,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS billing_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      amount_usd NUMERIC(10,2) NOT NULL,
      credits_added INTEGER NOT NULL,
      description VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bot_sessions (
      bot_id VARCHAR(64) NOT NULL,
      key_id VARCHAR(255) NOT NULL,
      data TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (bot_id, key_id)
    );

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
    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
    CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
    CREATE INDEX IF NOT EXISTS idx_bots_user ON bots(user_id);
    CREATE INDEX IF NOT EXISTS idx_bot_sessions_bot_id ON bot_sessions(bot_id);
  `);

  console.log('✅ Tables created successfully.');

  // Seed default Admin & User if not already present
  const adminCheck = await query('SELECT id FROM users WHERE email = $1', ['admin@msgbridge.io']);
  let adminId;
  if (adminCheck.rows.length === 0) {
    const adminPass = await bcrypt.hash('admin123456', 10);
    const res = await query(
      `INSERT INTO users (email, password_hash, name, role, plan, credits)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['admin@msgbridge.io', adminPass, 'System Administrator', 'admin', 'enterprise', 99999]
    );
    adminId = res.rows[0].id;
    console.log('👤 Created Admin account: admin@msgbridge.io / admin123456');
  } else {
    adminId = adminCheck.rows[0].id;
  }

  const userCheck = await query('SELECT id FROM users WHERE email = $1', ['developer@company.com']);
  let devUserId;
  if (userCheck.rows.length === 0) {
    const userPass = await bcrypt.hash('developer123', 10);
    const res = await query(
      `INSERT INTO users (email, password_hash, name, role, plan, credits)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['developer@company.com', userPass, 'Alex Rivers (Tech Lead)', 'user', 'developer', 2500]
    );
    devUserId = res.rows[0].id;
    console.log('👤 Created Developer account: developer@company.com / developer123');

    // Create default API key
    await query(
      `INSERT INTO api_keys (id, user_id, name, key, rate_limit_per_min)
       VALUES ($1, $2, $3, $4, $5)`,
      ['key_live_default_demo', devUserId, 'Production Webhook & OTP Key', 'mb_live_948f2b71c890e44a1b02d6', 120]
    );

    // Create default bot instance for Alex
    const botId = 'bot_wx_dev_cluster_01';
    await query(
      `INSERT INTO bots (id, user_id, name, platform, status, account_info, last_active_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        botId,
        devUserId,
        'WeChat OTP Dispatcher #1',
        'wechat',
        'online',
        JSON.stringify({
          nickname: 'MsgBridge AuthBot',
          wechatId: 'wxid_auth_gateway_99',
          region: 'SG Cluster 01',
          puppet: 'wechaty-puppet-service'
        })
      ]
    );

    // Add bot logs
    await query(
      `INSERT INTO bot_logs (bot_id, level, message, details) VALUES
       ($1, 'info', 'Bot worker initialized in Docker pool container wechaty-pod-01', '{"ip": "10.0.4.12"}'),
       ($1, 'info', 'QR code generated and scanned by operator', '{"session": "sess_88a7b"}'),
       ($1, 'info', 'Session linked: wxid_auth_gateway_99 (MsgBridge AuthBot)', '{"status": "READY"}'),
       ($1, 'info', 'Health check ping OK: latency 42ms', '{"uptime": "48h 12m"}')`,
      [botId]
    );

    // Add sample messages
    await query(
      `INSERT INTO messages (id, user_id, bot_id, type, recipient, content, status, direction, channel, cost_credits, delivered_at) VALUES
       ('msg_otp_9001', $1, $2, 'otp', '+1 650 555 0192', 'Your MsgBridge verification code is 482910. Valid for 5 minutes.', 'delivered', 'outbound', 'wechat', 1, NOW() - INTERVAL '4 minutes'),
       ('msg_otp_9002', $1, $2, 'otp', '+86 138 0013 8000', '您的安全验证码为 719304，5分钟内有效，切勿泄露给他人。', 'delivered', 'outbound', 'wechat', 1, NOW() - INTERVAL '15 minutes'),
       ('msg_alert_9003', $1, $2, 'alert', 'DevOps OpsChat Group', '🚨 Alert: Payment webhook latency spike detected (>450ms). System auto-mitigated.', 'delivered', 'outbound', 'wechat', 1, NOW() - INTERVAL '42 minutes'),
       ('msg_trans_9004', $1, $2, 'transactional', '+65 9123 4567', 'Invoice #INV-2026-0819 has been processed successfully ($149.00).', 'delivered', 'outbound', 'wechat', 1, NOW() - INTERVAL '1 hour'),
       ('msg_otp_9005', $1, $2, 'otp', '+44 7700 900077', 'Your one-time login passkey is 884129.', 'delivered', 'outbound', 'wechat', 1, NOW() - INTERVAL '2 hours')`,
      [devUserId, botId]
    );

    // Add sample billing record
    await query(
      `INSERT INTO billing_transactions (user_id, amount_usd, credits_added, description) VALUES
       ($1, 29.00, 2500, 'Developer Tier Monthly Subscription (2,500 Credits)')`,
      [devUserId]
    );

    // Seed sample templates
    await query(
      `INSERT INTO templates (id, user_id, name, category, content, variables, channel) VALUES
       ('tpl_otp_default', $1, 'Standard Security OTP', 'otp', 'Your verification code is {{code}}. Valid for {{expiry}} minutes. Please do not share this passcode with anyone.', '["code", "expiry"]', 'whatsapp'),
       ('tpl_order_alert', $1, 'Order Confirmation Alert', 'transactional', 'Hi {{name}}, your order #{{order_id}} has been confirmed! Total: {{amount}}. Track updates here: {{tracking_link}}', '["name", "order_id", "amount", "tracking_link"]', 'whatsapp'),
       ('tpl_security_alert', $1, 'Suspicious Login Notice', 'alert', '🚨 Security Alert: New login detected for account {{account_email}} from {{device_info}} at {{time}}. If this was not you, tap {{lock_link}}.', '["account_email", "device_info", "time", "lock_link"]', 'whatsapp')`,
      [devUserId]
    );
    console.log('📋 Seeded sample message templates.');
  }

  console.log('🎉 Database migration & seed complete!');
  await pool.end();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
