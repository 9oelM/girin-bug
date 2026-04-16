# mptAuthorize WalletConnect Bug Repro

Minimal website to reproduce the Girin Wallet crash when sending an `MPTokenAuthorize` transaction via WalletConnect on XRPL.

## Setup

```bash
cp .env.example .env
# Edit .env and set VITE_WC_PROJECT_ID
# Get a free Project ID at https://cloud.walletconnect.com

npm install
npm run dev
```

Open http://localhost:5173, scan the QR code with Girin Wallet, then click **Send MPTokenAuthorize**.

## What it does

1. Connects to Girin Wallet via WalletConnect v2 (`xrpl_signTransaction` method)
2. Sends a minimal `MPTokenAuthorize` transaction:
   ```json
   {
     "TransactionType": "MPTokenAuthorize",
     "Account": "<connected account>",
     "MPTokenIssuanceID": "<configured ID>",
     "Fee": "12"
   }
   ```
3. The wallet crashes on receiving this request (the bug being reproduced)

## Suspected causes

- Wallet doesn't recognise `MPTokenAuthorize` as a valid `TransactionType`
- Wallet uses a codec that lacks MPT amendment support and throws during deserialization
- Field name mismatch (`MPTokenIssuanceID` vs what the wallet expects)
