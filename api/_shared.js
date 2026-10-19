
const crypto = require('crypto');

function json(res, status, body) {
  res.status(status).setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

function getEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return process.env[name];
}

function getBaseUrl() {
  const env = getEnv('MPESA_ENVIRONMENT').toLowerCase();

  if (env === 'production') {
    return 'https://api.safaricom.co.ke';
  }

  if (env === 'sandbox') {
    return 'https://sandbox.safaricom.co.ke';
  }

  throw new Error('MPESA_ENVIRONMENT must be production or sandbox.');
}

async function darajaToken() {
  const auth = Buffer.from(
    `${getEnv('MPESA_CONSUMER_KEY')}:${getEnv('MPESA_CONSUMER_SECRET')}`
  ).toString('base64');

  const response = await fetch(
    `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    throw new Error('Daraja authentication failed.');
  }

  return data.access_token;
}

function timestamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');

  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function supabase(path, options = {}) {
  const url = getEnv('SUPABASE_URL').replace(/\/+$/, '');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function newId() {
  return crypto.randomUUID();
}

module.exports = {
  json,
  getEnv,
  getBaseUrl,
  darajaToken,
  timestamp,
  supabase,
  newId
};
