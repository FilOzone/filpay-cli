# filpay-cli - Filecoin Pay CLI Tool

Complete CLI tool for managing FilecoinPayV1 payments with proper nonce management for active PDP nodes.

## Features

- ✓ Check account balance and lockup info (with --detailed and --json flags)
- ✓ Withdraw available funds to self or another address
- ✓ Deposit USDFC into FilecoinPay contract
- ✓ List and manage payment rails (shows all rails)
- ✓ Settle payments from payers
- ✓ Preview settlement amounts before settling
- ✓ **Proper "pending" nonce management** - works reliably even with active PDP nodes
- ✓ Built on official Filecoin Cloud Synapse SDK
- ✓ Colorful terminal output with emojis for better readability

## Installation

### Quick Start (via npx)
```bash
npx github:yourusername/filpay-cli balance --account 0x...
```

### Install Globally
```bash
npm install -g .
```

### Local Usage
```bash
node cli.js <command> [options]
```

## Commands

### Balance & Wallet

```bash
# Check account balance
filpay balance --account 0x...

# Detailed balance (includes wallet balance)
filpay balance --account 0x... --detailed

# JSON output (for scripts)
filpay balance --account 0x... --json

# Check wallet USDFC balance (with contract balance if using --key)
filpay wallet-balance --account 0x...
filpay wallet-balance --key YOUR_KEY
```

### Deposits & Withdrawals

```bash
# Deposit USDFC into FilecoinPay
filpay deposit 10 --key YOUR_KEY

# Withdraw to your wallet
filpay withdraw 0.5 --key YOUR_KEY

# Withdraw to another address
filpay withdraw 0.5 --to 0xRecipient --key YOUR_KEY
```

### Payment Rails

```bash
# List all your payment rails
filpay rails list --key YOUR_KEY

# Get detailed rail information
filpay rails info 123 --key YOUR_KEY

# Settle a specific rail
filpay rails settle 0xPayerAddress --key YOUR_KEY

# Auto-settle all rails
filpay rails settle-all --key YOUR_KEY --yes
```

### Settlement

```bash
# Preview settlement amount
filpay settlement-preview 0xPayerAddress --key YOUR_KEY

# Settle payment (shortcut)
filpay settle 0xPayerAddress --key YOUR_KEY
```

## Options

- `--rpc <url>` - RPC endpoint (default: https://rpc.ankr.com/filecoin)
- `--key <key>` - Private key (required for transactions)
- `--account <addr>` - Account address (for balance checks)
- `--to <addr>` - Recipient address (for withdrawals)
- `--detailed` - Show detailed information
- `--json` - Output as JSON
- `--yes` - Skip confirmation prompts

## Why This Tool?

Standard tools like `cast send` use "latest" nonces instead of "pending" nonces, causing "nonce too low" errors when PDP nodes are actively sending transactions. This tool uses the Filecoin Cloud Synapse SDK which properly handles pending nonces, ensuring reliable transaction submission even in high-activity environments.

## Contract Information

- **FilecoinPayV1**: `0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa`
- **USDFC Token**: `0x80B98d3aa09ffff255c3ba4A241111Ff1262F045`
- **Network**: Filecoin Mainnet (Chain ID: 314)

## Requirements

- Node.js 18+ (ES modules support)
- npm

## Development

```bash
# Install dependencies
npm install

# Test locally
node cli.js help

# Link for global usage
npm link
```

## Publishing

To share with other PDP users:

1. **GitHub Release** (recommended):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/filpay-cli.git
   git push -u origin main
   ```

2. **npm Package**:
   ```bash
   npm publish
   # Users can then: npx filpay balance --account 0x...
   ```

## Resources

- [Filecoin Cloud Documentation](https://docs.filecoin.cloud/)
- [Synapse SDK](https://github.com/FilOzone/synapse-sdk)
- [FilecoinPayV1 Contract](https://github.com/FilOzone/filecoin-pay)

## License

ISC
