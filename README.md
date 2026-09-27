<div align="center">
  <br />
  <img src="img/hero.png" alt="MsgBridge Hero Banner" width="100%">
  <br />
  <div>
    <img src="https://img.shields.io/badge/Astro-5.0-BC52EE?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/WhatsApp_Web.js-1.34-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp Web.js" />
    <img src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  </div>

  <h1 align="center">MsgBridge — Multi-Tenant WhatsApp & ChatOTP Dispatch Gateway</h1>
</div>

**MsgBridge** is a developer-first multi-tenant SaaS platform providing a unified REST API to trigger transactional alerts, OTP passcodes, and chat notifications via real WhatsApp Web automation, database-persisted session pooling, dynamic message templates with plan quotas, and real-time delivery tracking.

> [!WARNING]
> **Disclaimer**: This project is an independent automation tool built with [whatsapp-web.js](https://github.com/wwebjs/whatsapp-web.js). It is **not** affiliated, endorsed, authorized, or in any way officially connected with **WhatsApp LLC**, **Meta Platforms, Inc.**, or any of their subsidiaries. Please use responsibly and in compliance with WhatsApp's Terms of Service.  Also it is not guaranteed you will not be blocked by using this method. WhatsApp does not allow bots or unofficial clients on their platform, so this shouldn't be considered totally safe.

---

## ✨ Features

- **⚡ Developer-First Unified REST API**: Sub-second dispatch via `POST /api/v1/messages/send` supporting Bearer API keys (`mb_live_...`), custom rate limits, and per-tenant credit balances.
- **📱 WhatsApp Web Automation**: Headless Chromium engine powered by [`whatsapp-web.js`](https://github.com/wwebjs/whatsapp-web.js) with real-time pairing QR code rendering (`qrcode`).
- **🗄️ Database Session Persistence (`bot_sessions`)**: Custom PostgreSQL session store using `RemoteAuth` that eliminates local filesystem reliance and prevents session disconnects on server restarts.
- **📝 Dynamic Message Templates & Plan Quotas**:
  - Reusable template engine supporting dynamic variable tags like `{{code}}`, `{{expiry}}`, `{{name}}`, `{{amount}}`, and `{{link}}`.
  - Subscription plan quota enforcement: **Developer** (5 templates), **Pro** (25 templates), and **Enterprise** (Unlimited).
  - Built-in live variable detector chips and variable cheat sheet in the UI.
- **🚀 Interactive Dispatch Console (`/dashboard/send`)**:
  - One-click template selector with automatic OTP passcode generation.
  - Live pre-configured code snippets generated in **cURL**, **Node.js**, and **Python**.
- **📊 Real-Time Metrics & Live Logs**: Comprehensive audit log stream with delivery receipts, status filters (`delivered`, `failed`, `queued`), latency tracking, and full JSON payloads.
- **🛡️ Multi-Tenant Auth & Role Separation**: Encrypted JWT authentication with role-based routing for **Developer Tenants** (`/dashboard`) and **Cluster Supervisors** (`/admin`).
- **💳 Credit Refill & Billing System**: Integrated tiered plans (`Developer`, `Pro`, `Enterprise`) and credit balance top-up checkout modal.

---

## 📁 Project Structure

```text
MsgBridge/
├── img/
│   └── hero.png                    # README banner presentation graphic
├── scripts/
│   └── migrate.js                  # Database schema migration & seed runner
├── src/
│   ├── layouts/
│   │   ├── AdminLayout.astro       # Supervisor cluster admin dashboard layout
│   │   ├── DashboardLayout.astro   # Tenant workspace dashboard with live status
│   │   └── MainLayout.astro        # Base HTML layout with typography & toasts
│   ├── lib/
│   │   ├── auth.js                 # JWT cookie/header verification & user helpers
│   │   ├── bot-engine.js           # WhatsApp Web client manager & Postgres RemoteAuth store
│   │   ├── db.js                   # Supabase PostgreSQL connection pool
│   │   └── templates.js            # Plan quotas, variable parser, and table schema
│   ├── pages/
│   │   ├── admin/                  # Supervisor control panel (fleet, users, metrics)
│   │   │   ├── bots.astro
│   │   │   ├── index.astro
│   │   │   └── users.astro
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── bots/           # Bot management & QR session endpoints
│   │   │       ├── messages/       # Message dispatch & delivery status endpoints
│   │   │       └── templates/      # Template CRUD endpoints with quota checks
│   │   ├── dashboard/              # Tenant dashboard views
│   │   │   ├── api-keys.astro      # Secret API key provisioning & revocation
│   │   │   ├── billing.astro       # Subscription plans & credit refilling
│   │   │   ├── bots.astro          # WhatsApp worker instances & QR scanner
│   │   │   ├── docs.astro          # Interactive REST API reference documentation
│   │   │   ├── index.astro         # Overview metrics & quick dispatch actions
│   │   │   ├── logs.astro          # Inbound/outbound message delivery audit log
│   │   │   ├── send.astro          # Message & OTP dispatch playground
│   │   │   └── templates.astro     # Message templates management & quota tracker
│   │   ├── index.astro             # Public landing page with live interactive demo
│   │   ├── login.astro             # Sign-in portal with quick demo credentials
│   │   └── register.astro          # New tenant registration portal
│   └── styles/
│       └── global.css              # Dark glassmorphic design system & animations
├── astro.config.mjs                # Astro configuration with Node SSR adapter
├── tailwind.config.mjs             # Tailwind CSS theme extensions
└── package.json
```

---

## 🛠️ Tech Stack & Database Architecture

- **SSR Framework:** [Astro 5](https://astro.build/) with `@astrojs/node` standalone server adapter.
- **Styling & Design:** TailwindCSS with dark glassmorphic styling, Google Fonts (`Inter` + `JetBrains Mono`).
- **Database:** Supabase PostgreSQL (`pg` connection pool with SSL resilience).
- **Authentication:** `bcryptjs` password encryption and `jsonwebtoken` session cookies.
- **Bot Engine:** [`whatsapp-web.js`](https://github.com/wwebjs/whatsapp-web.js) Chromium automation with PostgreSQL session storage and `qrcode` generation.

### Database Tables:
- `users`: Multi-tenant user accounts with role, plan (`developer`, `pro`, `enterprise`), and credits.
- `api_keys`: Secret tokens (`mb_live_...`) with per-minute rate limits.
- `bots`: WhatsApp worker instances, status, and account metadata.
- `bot_sessions`: PostgreSQL session store for `whatsapp-web.js` RemoteAuth chunks.
- `bot_logs`: Real-time worker logs, container events, and heartbeat telemetry.
- `templates`: User message templates with dynamic `{{variables}}`, categories, and channels.
- `messages`: Message delivery records, recipient, content, status, latency, and credit cost.
- `billing_transactions`: Invoice records and credit top-up history.

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/MsgBridge.git
cd MsgBridge
npm install
```

### 2. Configure Environment (`.env`)
```ini
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
JWT_SECRET=super-secret-jwt-key
PORT=4321
```

### 3. Run Database Migration & Seed
```bash
npm run migrate
```
*(Creates all tables in Supabase Postgres and seeds initial admin, demo tenant, default bots, and sample templates)*

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:4321](http://localhost:4321)** in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 🔑 Default Demo Credentials

| Role | Email | Password | Access Area |
| :--- | :--- | :--- | :--- |
| **Developer (Tenant)** | `developer@company.com` | `developer123` | `/dashboard` (Bots, Templates, Sender, Logs, API Keys, Billing) |
| **Cluster Administrator** | `admin@msgbridge.io` | `admin123456` | `/admin` (System Metrics, All Tenants, Bot Fleet Health) |

*(Quick 1-click login buttons are also provided directly on the `/login` page)*

---

## 📡 REST API Quick Usage

### 1. Send an OTP / Message
```bash
curl -X POST "http://localhost:4321/api/v1/messages/send" \
  -H "Authorization: Bearer mb_live_948f2b71c890e44a1b02d6" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+1 650 555 0192",
    "message": "Your MsgBridge verification code is 492019. Valid for 5 minutes.",
    "type": "otp"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "messageId": "msg_otp_9001",
  "recipient": "+1 650 555 0192",
  "channel": "whatsapp",
  "type": "otp",
  "status": "delivered",
  "costCredits": 1,
  "timestamp": "2026-09-27T12:00:00.000Z",
  "botId": "bot_wx_dev_cluster_01",
  "remainingCredits": 2499
}
```

### 2. Create a Message Template (Plan Quota Protected)
```bash
curl -X POST "http://localhost:4321/api/v1/templates" \
  -H "Authorization: Bearer mb_live_948f2b71c890e44a1b02d6" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Dispatch Notice",
    "category": "transactional",
    "content": "Hi {{name}}, your order #{{order_id}} has shipped via {{carrier}}! Tracking: {{tracking_url}}"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "template": {
    "id": "tpl_transactional_a98f12c34d5e",
    "name": "Order Dispatch Notice",
    "category": "transactional",
    "content": "Hi {{name}}, your order #{{order_id}} has shipped via {{carrier}}! Tracking: {{tracking_url}}",
    "variables": ["name", "order_id", "carrier", "tracking_url"],
    "channel": "whatsapp"
  },
  "quota": {
    "plan": "developer",
    "currentCount": 4,
    "maxTemplates": 5,
    "remaining": 1
  }
}
```

---

## ⚖️ Disclaimer & Compliance

- **Unofficial Integration**: **MsgBridge** is an independent, third-party software leveraging browser automation via [`whatsapp-web.js`](https://github.com/wwebjs/whatsapp-web.js). It is neither endorsed nor certified by WhatsApp LLC or Meta Platforms, Inc.
- **Trademark Notice**: "WhatsApp" and associated names, marks, emblems, and logos are registered trademarks of Meta Platforms, Inc. Their use in this documentation is solely for identification and interoperability purposes.
- **Terms of Service Compliance**: Automated messaging is subject to WhatsApp's official [Terms of Service](https://www.whatsapp.com/legal/terms-of-service) and [Business Messaging Policy](https://www.whatsapp.com/legal/business-policy/). Sending unsolicited bulk broadcasts, spam, or high-frequency automated campaigns may result in account restriction, suspension, or permanent phone number bans by WhatsApp.
- **Limitation of Liability**: This software is provided for testing, personal, and developmental integration purposes on an "AS IS" basis without warranty of any kind. The authors and maintainers assume no liability for account suspensions, service interruptions, or consequences arising from the use or misuse of this software.

