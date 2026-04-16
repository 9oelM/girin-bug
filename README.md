# mptAuthorize WalletConnect Bug Repro

Minimal website to reproduce the Girin Wallet crash when sending an `MPTokenAuthorize` transaction via WalletConnect on XRPL.

**Live page:** https://be8c2b80.xrpl-mptauthorize-repro.pages.dev/

Open the page, scan the QR code with Girin Wallet, then click **Send MPTokenAuthorize**.

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

## Tested environment

| Field | Value |
|-------|-------|
| Girin Wallet version | v2.2.0 (build 174) |
| iOS version | 26.3.1 (a) |
| Device | iPhone 15 |
| XRPL network | Testnet |

## Suspected causes

- Wallet doesn't recognise `MPTokenAuthorize` as a valid `TransactionType`
- Wallet uses a codec that lacks MPT amendment support and throws during deserialization
- Field name mismatch (`MPTokenIssuanceID` vs what the wallet expects)
