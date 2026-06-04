import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

// Global WhatsApp Client Instance
let client: Client;
let isClientReady = false;

/**
 * Initializes the WhatsApp client with persistent local authentication.
 */
export function initWhatsApp(onReadyCallback: () => void): Client {
  console.log('[WhatsApp] Initializing client...');

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  });

  // Display QR Code in Terminal for authentication
  client.on('qr', (qr) => {
    console.log('[WhatsApp] QR code received. Scan it with your WhatsApp app:');
    qrcode.generate(qr, { small: true });
  });

  // Client Authenticated
  client.on('authenticated', () => {
    console.log('[WhatsApp] Authentication successful. Session stored locally.');
  });

  // Authentication Failure
  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Authentication failure:', msg);
  });

  // Client Ready
  client.on('ready', async () => {
    console.log('[WhatsApp] Client is ready and connected!');
    isClientReady = true;

    // Fetch and log joined groups to assist with finding target Group IDs
    try {
      const chats = await client.getChats();
      const groups = chats.filter(chat => chat.isGroup);
      
      console.log('\n==================================================');
      console.log('         DISCOVERED WHATSAPP GROUP CHATS');
      console.log('==================================================');
      if (groups.length === 0) {
        console.log(' No groups found. Make sure this account is added to target groups.');
      } else {
        groups.forEach((g) => {
          console.log(` • Group Name : "${g.name}"`);
          console.log(`   Group ID   : "${g.id._serialized}"`);
          console.log(' ------------------------------------------------');
        });
      }
      console.log('==================================================\n');
    } catch (err) {
      console.error('[WhatsApp] Error listing chats:', err);
    }

    // Trigger ready callback (e.g. to start Supabase realtime listeners)
    onReadyCallback();
  });

  // Reconnection and Disconnect Logic
  client.on('disconnected', (reason) => {
    console.warn('[WhatsApp] Client was disconnected:', reason);
    isClientReady = false;
    // Auto-reconnect attempts
    console.log('[WhatsApp] Attempting to reconnect...');
    setTimeout(() => {
      client.initialize().catch(err => {
        console.error('[WhatsApp] Reinitialization failed:', err);
      });
    }, 5000);
  });

  // Bootstrap initialization
  client.initialize().catch((error) => {
    console.error('[WhatsApp] Initialization error:', error);
  });

  return client;
}

/**
 * Sends a message to a WhatsApp group.
 * @param groupId The JID of the WhatsApp group (ending in @g.us)
 * @param message The formatted message text
 * @param mentions Optional list of user JIDs to mention/tag
 */
export async function sendWhatsAppMessage(groupId: string, message: string, mentions?: string[]): Promise<boolean> {
  if (!client) {
    console.error('[WhatsApp] Cannot send message: Client not initialized.');
    return false;
  }
  if (!isClientReady) {
    console.warn('[WhatsApp] Cannot send message: Client is not ready yet.');
    return false;
  }
  if (!groupId || groupId.trim() === '' || groupId === 'default-group-id@g.us') {
    console.warn('[WhatsApp] Skipping send: target Group ID is not configured.');
    return false;
  }

  try {
    // Trim and parse JID format
    const targetJid = groupId.trim();
    console.log(`[WhatsApp] Sending message to: ${targetJid}`);
    console.log(`[WhatsApp] Message content:\n${message}\n----------------------`);
    if (mentions && mentions.length > 0) {
      console.log(`[WhatsApp] Mentions: ${JSON.stringify(mentions)}`);
    }
    
    await client.sendMessage(targetJid, message, mentions && mentions.length > 0 ? { mentions } : {});
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Error sending message to ${groupId}:`, error);
    return false;
  }
}

/**
 * Exposes the status of the WhatsApp client.
 */
export function getWhatsAppStatus(): { connected: boolean } {
  return { connected: isClientReady };
}

/**
 * Gracefully closes the WhatsApp browser instance.
 */
export async function shutdownWhatsApp(): Promise<void> {
  if (client) {
    console.log('[WhatsApp] Shutting down client...');
    try {
      await client.destroy();
      console.log('[WhatsApp] Client destroyed successfully.');
    } catch (err) {
      console.error('[WhatsApp] Error during client destruction:', err);
    }
  }
}
