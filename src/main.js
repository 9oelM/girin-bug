import SignClient from '@walletconnect/sign-client'
import { WalletConnectModal } from '@walletconnect/modal'

// ---------------------------------------------------------------------------
// Config — copy .env.example to .env and set your WalletConnect Project ID
// from https://cloud.walletconnect.com
// ---------------------------------------------------------------------------
const PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID

if (!PROJECT_ID || PROJECT_ID === 'your_project_id_here') {
  document.getElementById('status').textContent =
    '⚠ Set VITE_WC_PROJECT_ID in .env (see .env.example)'
}

// XRPL CAIP-2 chain IDs
// xrpl:1 = mainnet / xrpl:0 = testnet
const XRPL_CHAIN = 'xrpl:0'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let client = null
let session = null
let modal = null

const $ = (id) => document.getElementById(id)

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function init() {
  client = await SignClient.init({
    projectId: PROJECT_ID,
    metadata: {
      name: 'MPTokenAuthorize Bug Repro',
      description: 'Minimal repro for Girin Wallet crash on mptAuthorize tx',
      url: window.location.origin,
      icons: [],
    },
  })

  modal = new WalletConnectModal({ projectId: PROJECT_ID })

  client.on('session_delete', () => {
    session = null
    log('Session deleted by wallet')
    render()
  })

  client.on('session_expire', () => {
    session = null
    log('Session expired')
    render()
  })

  // Restore an existing active session across page reloads
  const existing = client.session.getAll()
  if (existing.length > 0) {
    session = existing[existing.length - 1]
    log('Restored existing session')
  }

  render()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getAccount() {
  // WalletConnect accounts are CAIP-10: "xrpl:1:rAddress..."
  const accounts = session?.namespaces?.xrpl?.accounts ?? []
  return accounts.length > 0 ? accounts[0].split(':')[2] : null
}

function log(msg) {
  $('status').textContent = msg
}

function render() {
  const account = getAccount()
  const connected = !!session && !!account

  $('btn-connect').disabled = connected
  $('btn-disconnect').disabled = !connected
  $('btn-send').disabled = !connected
  $('account-info').textContent = connected ? `Connected: ${account}` : 'Not connected'
}

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
async function connect() {
  log('Requesting session…')
  try {
    const { uri, approval } = await client.connect({
      requiredNamespaces: {
        xrpl: {
          chains: [XRPL_CHAIN],
          methods: ['xrpl_signTransaction'],
          events: ['accountsChanged'],
        },
      },
    })

    if (uri) {
      // Show the QR modal so the user can scan with Girin Wallet
      await modal.openModal({ uri })
    }

    session = await approval()
    modal.closeModal()
    log('Connected')
    render()
  } catch (err) {
    modal?.closeModal()
    log(`Connect error: ${err.message}`)
    console.error(err)
  }
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------
async function disconnect() {
  try {
    await client.disconnect({
      topic: session.topic,
      reason: { code: 6000, message: 'User disconnected' },
    })
  } catch (_) {
    // ignore — wallet may already be disconnected
  }
  session = null
  log('Disconnected')
  render()
}

// ---------------------------------------------------------------------------
// Send MPTokenAuthorize
// ---------------------------------------------------------------------------
async function sendMptAuthorize() {
  const account = getAccount()
  if (!account) return

  const issuanceId = $('issuance-id').value.trim()
  const holderAddr = $('holder-addr').value.trim()

  // Build the MPTokenAuthorize transaction.
  // TransactionType is the official XRPL field name used by xrpl-dev-portal.
  // Some wallet implementations may expect "mptAuthorize" (lowercase) — that
  // mismatch is one likely source of the crash we are reproducing.
  const tx = {
    TransactionType: 'MPTokenAuthorize',
    Account: account,
    MPTokenIssuanceID: issuanceId,
    Fee: '12',
    // Flags: 1 (tfMPTUnauthorize) to revoke instead of grant
  }

  // If a holder address is specified the issuer is authorizing a holder
  // (requires the issuance to have the tfMPTRequireAuth flag set).
  if (holderAddr) {
    tx.Holder = holderAddr
  }

  log('Awaiting wallet approval…')
  $('result').textContent = `Sending tx:\n${JSON.stringify(tx, null, 2)}`

  console.group('MPTokenAuthorize request')
  console.log('topic:', session.topic)
  console.log('chainId:', XRPL_CHAIN)
  console.log('tx:', tx)
  console.groupEnd()

  try {
    const result = await client.request({
      topic: session.topic,
      chainId: XRPL_CHAIN,
      request: {
        method: 'xrpl_signTransaction',
        params: {
          tx_json: tx,
        },
      },
    })

    log('Transaction signed!')
    $('result').textContent = JSON.stringify(result, null, 2)
  } catch (err) {
    log(`Error: ${err.message}`)
    $('result').textContent = [
      `Error: ${err.message}`,
      '',
      JSON.stringify(err, null, 2),
    ].join('\n')
    console.error(err)
  }
}

// ---------------------------------------------------------------------------
// Wire up buttons
// ---------------------------------------------------------------------------
$('btn-connect').addEventListener('click', connect)
$('btn-disconnect').addEventListener('click', disconnect)
$('btn-send').addEventListener('click', sendMptAuthorize)

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
init().catch((err) => {
  console.error('Init failed:', err)
  log(`Init error: ${err.message}`)
})
