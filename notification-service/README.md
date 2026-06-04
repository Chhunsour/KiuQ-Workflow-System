# KiuQ WhatsApp Notification Service

A standalone Node.js daemon that monitors database changes inside the KiuQ system (via Supabase Realtime) and forwards event alerts to WhatsApp group chats in real-time.

---

## 🛠️ Tech Stack

- **Node.js** (v18+)
- **TypeScript**
- **whatsapp-web.js** (headless Chromium via Puppeteer)
- **Supabase** (Postgres Realtime WebSockets)
- **PM2** (Process daemon manager)

---

## 📁 Project Structure

```
notification-service/
├── .wwebjs_auth/       # Auto-created; stores local WhatsApp session (persist scan)
├── dist/               # Compiled JavaScript files
├── logs/               # PM2 logs folder
├── src/
│   ├── config.ts       # Parses configuration and environment
│   ├── index.ts        # Service bootstrapper and health controller
│   ├── queue.ts        # Rate-limiter and event batching queue
│   ├── supabase.ts     # Supabase Realtime subscribers and API lookups
│   └── whatsapp.ts     # WhatsApp client setup and messaging functions
├── .env                # Private API credentials (ignored by git)
├── config.json         # Customize templates, event toggles, and Group IDs
├── ecosystem.config.js # PM2 daemon config
├── package.json        # Dependencies list
└── tsconfig.json       # TypeScript compiler options
```

---

## 🚀 Setup & Installation

### Step 1: Install Dependencies
Run the following command from the root of the `notification-service` folder:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase credentials:
- `SUPABASE_URL`: Your Supabase Project URL (e.g. `https://xxxx.supabase.co`).
- `SUPABASE_SERVICE_KEY`: Your Supabase **`service_role`** key. This is required because the backend needs to listen to PostgreSQL replication updates and bypass Row-Level Security (RLS) tables.

### Step 3: Configure Base URL and Event Toggles
Open `config.json` and adjust configurations:
- `webUrl`: The domain where your Vue web app runs (e.g. `http://localhost:5173` or `https://kiuq.mycompany.com`).
- `batching`:
  - `enabled`: Set to `true` (recommended) to debounce spam. If someone drags multiple cards, the service collects them and sends them in a single combined message.
  - `windowMs`: The batching window in milliseconds (default is `30000` for 30 seconds).

---

## 📲 Step 4: First Time QR Login & Group JID Discovery

Since WhatsApp requires scanning a QR code for the initial login, **you must run the service in interactive development mode first**:

1. Compile the project and start the development server:
   ```bash
   npm run dev
   ```
2. Wait a few seconds. A **QR code** will be generated and printed directly inside your terminal window.
3. Open WhatsApp on your phone, go to **Settings > Linked Devices**, tap **Link a Device**, and scan the QR code.
4. Once authenticated, the terminal will log a list of all your joined WhatsApp groups and their corresponding **Group IDs (JIDs)** (e.g. `120363043818047913@g.us`).
5. Copy the target Group ID and paste it into the `groupIds` section in `config.json`:
   ```json
   "groupIds": {
     "default": "120363043818047913@g.us",
     "tasks": "",
     "quality_checks": "",
     "followups": "",
     "notifications": ""
   }
   ```
   *Note: If specific channels (like `tasks` or `quality_checks`) are left empty, they default to sending to the `default` Group ID.*
6. After configuring the Group ID, press `Ctrl + C` to stop the development server.

---

## 🔒 Step 5: Production Deployment with PM2 (24/7 Mode)

To run this service permanently in the background:

### 1. Build the TypeScript Code
Compile the code to JavaScript:
```bash
npm run build
```

### 2. Start the Service under PM2
```bash
pm2 start ecosystem.config.js
```
The service will start in the background as `kiuq-whatsapp`.

### 3. Check logs and process state
Verify it is running correctly:
```bash
pm2 list
pm2 logs kiuq-whatsapp
```

### 4. Enable Startup on System Boot
To make sure the service automatically restarts after the Mac Mini reboots:
1. Run the PM2 startup command:
   ```bash
   pm2 startup
   ```
   *This command will output a line of shell code that you need to copy and paste to run with `sudo`.*
2. Copy and execute that code in the terminal.
3. Save the active process list so it loads on boot:
   ```bash
   pm2 save
   ```

---

## 🛡️ Reliability & Health Checks

- **Auto-Reconnect:** The service listens for disconnection events from WhatsApp and tries to reinitialise the session automatically.
- **Auto-Restart:** PM2 is configured to restart the application within 5 seconds if it crashes or reaches a memory ceiling of `300MB`.
- **Health Logs:** Every 5 minutes, the service logs a health report indicating its memory footprint and whether the WhatsApp client is connected. Check these logs via `pm2 logs kiuq-whatsapp`.
