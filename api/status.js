
const { json, supabase } = require('./_shared');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, {
      error: 'Method not allowed.'
    });
  }

  const id = String((req.query && req.query.id) || '');

  if (!/^ws_CO_[A-Za-z0-9_-]+$/.test(id)) {
    return json(res, 400, {
      error: 'Invalid payment reference.'
    });
  }

  try {
    const rows = await supabase(
      `payments?select=status,receipt,result_desc,amount,confirmed_amount&checkout_request_id=eq.${encodeURIComponent(id)}&limit=1`
    );

    if (!rows || rows.length === 0) {
      return json(res, 404, {
        error: 'Payment reference not found yet.'
      });
    }

    const payment = rows[0];

    return json(res, 200, {
      status: payment.status,
      receipt: payment.receipt || null,
      resultDesc: payment.result_desc || null,
      amount: payment.amount
    });
  } catch (error) {
    console.error('Payment status error:', error.message);

    return json(res, 500, {
      error: 'Unable to check payment status right now.'
    });
  }
};
