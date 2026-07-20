/* ==========================================================================
   services/paystackService.js — verifies a Paystack transaction reference
   server-side after the client-side popup reports success. Never trust the
   client's word alone for a payment — always re-verify with the secret key.
   ========================================================================== */

const { PAYSTACK_SECRET_KEY } = process.env;

function isConfigured() {
  return Boolean(PAYSTACK_SECRET_KEY);
}

async function verifyTransaction(reference) {
  if (!isConfigured()) throw new Error('PAYSTACK_SECRET_KEY not set in server/.env');
  if (!reference || typeof reference !== 'string') throw new Error('Missing transaction reference');

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || `Paystack verification failed (${res.status})`);
  }
  return data.data; // { status: 'success', amount, currency, customer, reference, ... }
}

module.exports = { verifyTransaction, isConfigured };
