# M-Pesa Registration Payment Page (Vercel)

This project contains a registration-fee payment page that asks for a Kenyan phone number and amount, requests a Daraja STK Push from a serverless function, receives the Safaricom callback, and polls the stored result.

## Project files

- `public/index.html` — responsive payment page
- `api/stkpush.js` — validates input and starts STK Push on the server
- `api/callback.js` — receives Daraja's payment result
- `api/status.js` — lets the page check pending/success/failed status
- `api/_shared.js` — server-side helpers
- `supabase-schema.sql` — payment table schema
- `.env.example` — environment variable names (no secrets)

## 1. Create Supabase payment storage

1. Create a Supabase project.
2. Open **SQL Editor** and run the contents of `supabase-schema.sql`.
3. In **Project Settings → API**, copy the project URL and `service_role` key.
4. Keep the service-role key secret. Never place it in frontend code or commit it to GitHub.

## 2. Set up Daraja

1. Open the official [Safaricom Daraja developer portal](https://developer.safaricom.co.ke/).
2. Sign in and create an app for **M-Pesa Express / Lipa na M-Pesa Online**.
3. Start with the sandbox environment and use the sandbox credentials/shortcode/passkey provided in your Daraja dashboard.
4. For production, complete Safaricom's required business/merchant onboarding and use your approved production shortcode and passkey. Do not assume sandbox credentials can collect real money.

## 3. Upload to GitHub

Upload the entire project structure, including the `api` folder and `public` folder, to a GitHub repository. Do not upload a real `.env` file or any API secrets. `.gitignore` excludes environment files.

## 4. Deploy to Vercel

1. In Vercel, choose **Add New → Project**, import the GitHub repository, and deploy.
2. In **Project Settings → Environment Variables**, add:
   - `MPESA_ENVIRONMENT` = `sandbox` (initial testing)
   - `MPESA_CONSUMER_KEY` = your sandbox consumer key
   - `MPESA_CONSUMER_SECRET` = your sandbox consumer secret
   - `MPESA_SHORTCODE` = sandbox shortcode supplied by Daraja
   - `MPESA_PASSKEY` = sandbox passkey supplied by Daraja
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service-role key
   - `MPESA_CALLBACK_URL` = `https://YOUR-VERCEL-DOMAIN/api/callback`
3. Deploy again after adding variables. Replace `YOUR-VERCEL-DOMAIN` with the actual Vercel domain.
4. Open the deployed page and try the sandbox flow using test details allowed by your Daraja sandbox app.

## 5. Important callback ordering

The callback must be a publicly reachable HTTPS URL. This implementation stores the initial payment attempt before contacting Daraja, then records the returned checkout ID. In rare cases a callback can arrive before the checkout ID is saved; check Supabase and reconcile with Daraja if a payment remains pending.

## Before accepting real payments

- Complete Daraja production approval and test end-to-end with your own authorized merchant setup.
- Add rate limiting / bot protection to the payment endpoint before public launch.
- Reconcile pending payments against Daraja when callbacks are delayed or missing.
- Do not treat an accepted STK request as proof of payment; only a verified successful callback confirms it.
- Add a registration/order identifier and an admin-only process for matching successful payments to registrants.
- Add duplicate-payment handling and monitoring appropriate to your business.
- Never ask a customer to type their M-Pesa PIN into this website. The PIN is entered only in the official M-Pesa prompt.

## Notes

This is a starter integration, not a guarantee of live-payment approval. Daraja account permissions, shortcode configuration, callback reachability, and the deployed environment must all be correct. Use the current Daraja dashboard documentation for the exact requirements of your account.
