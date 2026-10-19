
const { json, supabase } = require('./_shared');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const callback =
      req.body &&
      req.body.Body &&
      req.body.Body.stkCallback;

    if (
      !callback ||
      !callback.CheckoutRequestID ||
      typeof callback.ResultCode === 'undefined'
    ) {
      return json(res, 400, {
        error: 'Invalid callback payload.'
      });
    }

    const items =
      (callback.CallbackMetadata &&
       callback.CallbackMetadata.Item) || [];

    const findValue = (name) => {
      const item = items.find(
        (entry) => entry && entry.Name === name
      );

      return item &&
        typeof item.Value !== 'undefined'
        ? item.Value
        : null;
    };

    const success = Number(callback.ResultCode) === 0;

    const patch = {
      status: success ? 'SUCCESS' : 'FAILED',
      result_desc: String(
        callback.ResultDesc ||
        (success ? 'Payment confirmed' : 'Payment failed')
      ).slice(0, 250),
      receipt: success ? findValue('MpesaReceiptNumber') : null,
      confirmed_amount: success ? findValue('Amount') : null,
      confirmed_phone: success
        ? String(findValue('PhoneNumber') || '')
        : null,
      transaction_date:
        success && findValue('TransactionDate')
          ? String(findValue('TransactionDate'))
          : null
    };

    await supabase(
      `payments?checkout_request_id=eq.${encodeURIComponent(
        callback.CheckoutRequestID
      )}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patch)
      }
    );

    return json(res, 200, {
      ResultCode: 0,
      ResultDesc: 'Callback processed.'
    });

  } catch (error) {
    console.error('M-Pesa callback error:', error.message);

    return json(res, 500, {
      ResultCode: 1,
      ResultDesc: 'Callback processing failed.'
    });
  }
};
