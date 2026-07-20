/* ==========================================================================
   services/telegramService.js — optional instant notification for new
   inquiries/bookings, faster to notice than email on a phone. No-ops
   silently if TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID aren't set, and never
   throws — a failed notification should never break the actual request.
   ========================================================================== */

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

function isConfigured() {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

async function notifyTelegram(text) {
  if (!isConfigured()) return;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    if (!res.ok) {
      console.warn('[telegramService] Telegram API responded', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('[telegramService] Failed to send Telegram notification:', err.message);
  }
}

module.exports = { notifyTelegram, isConfigured };
