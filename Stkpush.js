
const {
  json,
  getEnv,
  getBaseUrl,
  darajaToken,
  timestamp,
  supabase,
  newId
} = require('./_shared');

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (/^0[17]\d{8}$/.test(digits)) {
    return '254' + digits.slice(1);
  }

  if (/^254[17]\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^[17]\d{8}$/.test(digits)) {
    return '254' + digits;
  }

  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, {
      error: 'Method not allowed.'
    });
  }

  try {
    const phone = normalizePhone(
      req.body && req.body.phone
    );

    const amount = Number(
      req.body && req.body.amount
    );

    if (!phone) {
      return json(res, 400, {
        error: 'Enter a valid Kenyan Safaricom mobile number.'
      });
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > 150000
    ) {
      return json(res, 400, {
        error: 'Amount must be a whole number between KES 1 and KES 150,000.'
      });
    }

    const shortcode = getEnv('MPESA_SHORTCODE');
    const passkey = getEnv('MPESA_PASSKEY');
    const callbackUrl = getEnv('MPESA_CALLBACK_URL');

    if (!callbackUrl.startsWith('https://')) {
      return json(res, 500, {
        error: 'MPESA_CALLBACK_URL must be a public HTTPS URL.'
      });
    }

    const id = newId();

    // Record the payment attempt before requesting the STK Push.
    await supabase('payments', {
      method: 'POST',
      headers: {
        Prefer: 'return=minimal'
      },
      body: JSON.stringify([{
        id,
        phone,
        amount,
        status: 'PENDING',
        result_desc: 'STK request is being initiated'
      }])
    });

    const time = timestamp();

    const password = Buffer.from(
      `${shortcode}${passkey}${time}`
    ).toString('base64');

    const token = await darajaToken();

    const response = await fetch(
      `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: time,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phone,
          PartyB: shortcode,
          PhoneNumber: phone,
          CallBackURL: callbackUrl,
          AccountReference: 'REGISTRATION',
          TransactionDesc: 'Registration'
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (
      !response.ok ||
      data.ResponseCode !== '0' ||
      !data.CheckoutRequestID
    ) {
      const reason =
        data.errorMessage ||
        data.ResponseDescription ||
        'Daraja rejected the STK request.';

      await supabase(
        `payments?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: {
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({
            status: 'FAILED',
            result_desc: String(reason).slice(0, 250)
          })
        }
      ).catch(() => {});

      return json(res, 502, {
        error: 'M-Pesa could not start the payment. ' + reason
      });
    }

    // Store the checkout reference used to match the callback.
    await supabase(
      `payments?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          checkout_request_id: data.CheckoutRequestID,
          merchant_request_id: data.MerchantRequestID || null,
          result_desc: data.CustomerMessage || 'STK Push sent'
        })
      }
    );

    return json(res, 200, {
      message:
        data.CustomerMessage ||
        'STK Push requested. Check your phone.',
      checkoutRequestId: data.CheckoutRequestID
    });

  } catch (error) {
    console.error('STK Push error:', error.message);

    return json(res, 500, {
      error: 'Unable to start payment. Check server configuration and try again.'
    });
  }
};
