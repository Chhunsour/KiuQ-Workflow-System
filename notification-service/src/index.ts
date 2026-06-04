import { loadConfig } from './config';
import { initWhatsApp, getWhatsAppStatus, shutdownWhatsApp } from './whatsapp';
import { startSupabaseListeners, stopSupabaseListeners } from './supabase';
import { flushAllQueues } from './queue';

// Log startup header
console.log('==================================================');
console.log('    KIUQ WHATSAPP NOTIFICATION SERVICE STARTING   ');
console.log('==================================================');

// 1. Load and validate configurations
const config = loadConfig();
console.log('[App] Configurations loaded successfully.');
console.log(`[App] Target Web URL: ${config.webUrl}`);
console.log(`[App] Debounce Event Batching: ${config.batching?.enabled ? 'ENABLED' : 'DISABLED'} (${config.batching?.windowMs}ms)`);

// 2. Initialize WhatsApp Client
const waClient = initWhatsApp(() => {
  // Callback triggered when WhatsApp connection is established and client is ready
  console.log('[App] WhatsApp client ready. Activating database realtime hooks...');
  startSupabaseListeners();
});

// 3. Setup periodic health checks (runs every 5 minutes)
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const healthCheckTimer = setInterval(() => {
  const status = getWhatsAppStatus();
  const memory = process.memoryUsage();
  
  console.log(`[Health] ${new Date().toISOString()} | WhatsApp Status: ${status.connected ? 'CONNECTED' : 'DISCONNECTED'} | RAM Heap: ${Math.round(memory.heapUsed / 1024 / 1024)} MB / Total: ${Math.round(memory.heapTotal / 1024 / 1024)} MB`);
}, HEALTH_CHECK_INTERVAL_MS);

// 4. Handle Graceful Shutdowns
let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[App] Received shutdown signal (${signal}). Preparing for clean termination...`);

  // Stop periodic health logs
  clearInterval(healthCheckTimer);

  // Flush any pending debounced message queues immediately
  try {
    flushAllQueues();
  } catch (err) {
    console.error('[Shutdown] Error flushing message queues:', err);
  }

  // Stop Supabase Realtime WebSocket listeners
  try {
    await stopSupabaseListeners();
  } catch (err) {
    console.error('[Shutdown] Error stopping Supabase listeners:', err);
  }

  // Shutdown WhatsApp headless browser connection
  try {
    await shutdownWhatsApp();
  } catch (err) {
    console.error('[Shutdown] Error shutting down WhatsApp client:', err);
  }

  console.log('[App] Shutdown operations complete. Terminating process.');
  process.exit(0);
}

// Bind process signals
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[App] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[App] Uncaught Exception occurred:', error);
});
