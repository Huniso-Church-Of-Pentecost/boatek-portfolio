const { verifyTransaction } = require('../services/paystackService');
const { recordPayment } = require('../config/paymentStore');
const { notifyTelegram } = require('../services/telegramService');

async function verifyPayment(req, res) {
  const { reference } = req.body || {};
  if (!reference) return res.status(400).json({ message: 'Missing transaction reference.' });

  try {
    const data = await verifyTransaction(reference);
    const entry = await recordPayment({
      reference: data.reference,
      amount: data.amount / 100, // Paystack amounts are in kobo/pesewas
      currency: data.currency,
      email: data.customer?.email || '',
      status: data.status
    });

    if (data.status === 'success') {
      notifyTelegram(`💰 Deposit received\n${entry.amount} ${entry.currency} from ${entry.email}\nRef: ${entry.reference}`);
    }

    res.json({ status: data.status, payment: entry });
  } catch (err) {
    console.error('[payments] Verification failed:', err.message);
    res.status(502).json({ message: 'Could not verify payment. If you were charged, contact me directly with your reference.' });
  }
}

module.exports = { verifyPayment };
