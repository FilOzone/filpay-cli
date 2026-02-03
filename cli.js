#!/usr/bin/env node

/**
 * filpay - CLI tool for FilecoinPayV1 using Synapse SDK
 *
 * Usage:
 *   filpay balance --rpc <url> --account <address>
 *   filpay withdraw <amount> --rpc <url> --key <private_key>
 *   filpay withdraw <amount> --to <recipient> --rpc <url> --key <private_key>
 */

import { ethers } from 'ethers'
import { PaymentsService } from '@filoz/synapse-sdk/payments'
import { handleRailsList, handleRailInfo, handleRailSettle, handleRailSettleAll } from './cmd_rails.js'
import { handleDeposit, handleWalletBalance } from './cmd_deposit.js'

const DEFAULT_RPC = 'https://rpc.ankr.com/filecoin'
const DEFAULT_CHAIN_ID = 314
const FILECOIN_PAY_V1 = '0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa'
const USDFC_ADDRESS = '0x80B98d3aa09ffff255c3ba4A241111Ff1262F045'

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  brightGreen: '\x1b[1;32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[1;36m',
  white: '\x1b[37m'
}

export const c = {
  success: (text) => `${colors.brightGreen}${text}${colors.reset}`,
  info: (text) => `${colors.brightCyan}${text}${colors.reset}`,
  warn: (text) => `${colors.yellow}${text}${colors.reset}`,
  dim: (text) => `${colors.white}${text}${colors.reset}`,
  bright: (text) => `${colors.bright}${text}${colors.reset}`
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === 'help' || command === '--help') {
    printHelp()
    process.exit(0)
  }

  // Parse flags
  const flags = {}
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      // Check if next arg is a value or another flag/command
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[++i]
      } else {
        // Boolean flag (no value)
        flags[key] = true
      }
    }
  }

  const rpcUrl = flags.rpc || DEFAULT_RPC
  const privateKey = flags.key
  const provider = new ethers.JsonRpcProvider(rpcUrl)

  try {
    switch (command) {
      case 'balance':
        await handleBalance(provider, flags)
        break
      case 'withdraw':
        await handleWithdraw(provider, args[1], flags)
        break
      case 'deposit':
        await handleDeposit(provider, args[1], flags)
        break
      case 'wallet-balance':
        await handleWalletBalance(provider, flags)
        break
      case 'rails':
        const subcommand = args[1]
        switch (subcommand) {
          case 'list':
            await handleRailsList(provider, flags)
            break
          case 'info':
            await handleRailInfo(provider, args[2], flags)
            break
          case 'settle':
            await handleRailSettle(provider, args[2], flags)
            break
          case 'settle-all':
            await handleRailSettleAll(provider, flags)
            break
          default:
            console.error(`Unknown rails subcommand: ${subcommand}`)
            console.error('Available: list, info <railId>, settle <payer>, settle-all')
            process.exit(1)
        }
        break
      case 'settle':
        // Shortcut for rails settle
        await handleRailSettle(provider, args[1], flags)
        break
      case 'settlement-preview':
        await handleSettlementPreview(provider, args[1], flags)
        break
      default:
        console.error(`Unknown command: ${command}`)
        printHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

async function handleBalance(provider, flags) {
  const accountAddress = flags.account

  if (!accountAddress) {
    throw new Error('--account flag is required for balance command')
  }

  // Call contract directly for balance check
  const paymentsAbi = [
    'function getAccountInfoIfSettled(address token, address account) view returns (uint256 fundedUntilEpoch, uint256 currentFunds, uint256 availableFunds, uint256 currentLockupRate)'
  ]
  const paymentsContract = new ethers.Contract(FILECOIN_PAY_V1, paymentsAbi, provider)

  const [fundedUntilEpoch, currentFunds, availableFunds, currentLockupRate] =
    await paymentsContract.getAccountInfoIfSettled(USDFC_ADDRESS, accountAddress)

  // JSON output
  if (flags.json) {
    const output = {
      address: accountAddress,
      token: USDFC_ADDRESS,
      fundedUntilEpoch: fundedUntilEpoch.toString(),
      currentFunds: currentFunds.toString(),
      currentFundsFormatted: ethers.formatUnits(currentFunds, 18),
      availableFunds: availableFunds.toString(),
      availableFundsFormatted: ethers.formatUnits(availableFunds, 18),
      currentLockupRate: currentLockupRate.toString(),
      currentLockupRateFormatted: ethers.formatUnits(currentLockupRate, 18)
    }
    console.log(JSON.stringify(output, null, 2))
    return
  }

  console.log(c.bright(`\n💰 Account Balance\n`))
  console.log(c.dim(`Address: ${accountAddress}`))
  console.log(c.dim(`Token: USDFC (${USDFC_ADDRESS})\n`))

  console.log(`Funded Until:     ${c.info(`epoch ${fundedUntilEpoch === ethers.MaxUint256 ? '∞ (no active lockup)' : fundedUntilEpoch}`)}`)
  console.log(`Current Funds:    ${c.bright(ethers.formatUnits(currentFunds, 18))} USDFC`)
  console.log(`Available:        ${c.success(ethers.formatUnits(availableFunds, 18))} USDFC`)
  console.log(`Lockup Rate:      ${c.dim(ethers.formatUnits(currentLockupRate, 18))} USDFC/epoch`)

  // Detailed output
  if (flags.detailed) {
    console.log(c.bright('\n═══ Detailed Information ═══'))

    // Check wallet balance too
    const usdfcAbi = ['function balanceOf(address) view returns (uint256)']
    const usdfcContract = new ethers.Contract(USDFC_ADDRESS, usdfcAbi, provider)
    const walletBalance = await usdfcContract.balanceOf(accountAddress)

    console.log(`Wallet Balance:   ${c.success(ethers.formatUnits(walletBalance, 18))} USDFC`)
    console.log(`Locked Amount:    ${c.warn(ethers.formatUnits(currentFunds - availableFunds, 18))} USDFC`)
    console.log(`Total (Wallet + Contract): ${c.bright(ethers.formatUnits(walletBalance + currentFunds, 18))} USDFC`)
  }

  if (currentLockupRate === 0n) {
    console.log(c.success(`\n✓ No active payment rails - all funds available for withdrawal`))
  }
}

async function handleWithdraw(provider, amountStr, flags) {
  if (!amountStr) {
    throw new Error('Amount is required for withdraw command')
  }

  const privateKey = flags.key
  if (!privateKey) {
    throw new Error('--key flag is required for withdraw command')
  }

  const recipientAddr = flags.to

  // Parse amount (supports decimals like "0.5")
  const amount = ethers.parseUnits(amountStr, 18) // USDFC has 18 decimals

  const wallet = new ethers.Wallet(privateKey, provider)

  console.log(c.bright(`\n💸 Withdraw USDFC\n`))
  console.log(c.dim(`From: ${wallet.address}`))
  console.log(c.dim(`Token: USDFC`))
  console.log(`Amount: ${c.bright(amountStr)} USDFC`)
  if (recipientAddr) {
    console.log(c.info(`To: ${recipientAddr}`))
  }

  const paymentsService = new PaymentsService(
    provider,
    wallet,
    FILECOIN_PAY_V1,
    USDFC_ADDRESS,
    true // disableNonceManager - uses pending nonce!
  )

  // Check balance first
  console.log(c.dim('\nChecking available funds...'))
  const accountInfo = await paymentsService.accountInfo('USDFC')
  console.log(`Available: ${c.success(ethers.formatUnits(accountInfo.availableFunds, 18))} USDFC`)

  if (accountInfo.availableFunds < amount) {
    throw new Error(`Insufficient available funds`)
  }

  // Send transaction
  console.log(c.info('\n📤 Sending transaction...'))
  const tx = await paymentsService.withdraw(amount, 'USDFC')
  console.log(c.dim(`Transaction hash: ${tx.hash}`))

  console.log(c.dim('Waiting for confirmation...'))
  const receipt = await tx.wait()

  if (receipt.status === 1) {
    console.log(c.success(`\n✓ Transaction confirmed in block ${receipt.blockNumber}`))
    console.log(c.dim(`Gas used: ${receipt.gasUsed}`))
  } else {
    throw new Error(`Transaction failed`)
  }
}

async function handleSettlementPreview(provider, payerAddr, flags) {
  const privateKey = flags.key
  if (!privateKey) {
    throw new Error('--key flag is required for settlement preview')
  }

  const wallet = new ethers.Wallet(privateKey, provider)
  const paymentsService = new PaymentsService(
    provider,
    wallet,
    FILECOIN_PAY_V1,
    USDFC_ADDRESS,
    true
  )

  console.log(c.bright(`\n🔍 Settlement Preview\n`))
  console.log(c.dim(`Payer:  ${payerAddr}`))
  console.log(c.dim(`Payee:  ${wallet.address}\n`))

  const amounts = await paymentsService.getSettlementAmounts(payerAddr, wallet.address, 'USDFC')

  console.log(`Payment Amount:     ${c.bright(ethers.formatUnits(amounts.paymentAmount, 18))} USDFC`)
  console.log(`Settlement Fee:     ${c.dim(ethers.formatUnits(amounts.settlementFee, 18))} USDFC`)
  console.log(c.dim(`═════════════════════════════════════════════════`))
  console.log(`Net to Payee:       ${c.success(ethers.formatUnits(amounts.paymentAmount - amounts.settlementFee, 18))} USDFC`)

  if (amounts.paymentAmount === 0n) {
    console.log(c.warn('\n⚠ No payment to settle'))
  } else {
    console.log(c.success(`\n✓ Ready to settle`))
    console.log(c.dim(`\nTo settle, run: filpay settle ${payerAddr} --key YOUR_KEY`))
  }
}

function printHelp() {
  console.log(c.bright(`
╔═══════════════════════════════════════╗
║   💰 filpay - Filecoin Pay CLI Tool  ║
╚═══════════════════════════════════════╝
`))
  console.log(c.bright('Commands:'))
  console.log(`  ${c.info('balance')}                      Check account balance`)
  console.log(`  ${c.info('withdraw <amount>')}            Withdraw available funds`)
  console.log(`  ${c.info('deposit <amount>')}             Deposit USDFC into FilecoinPay`)
  console.log(`  ${c.info('wallet-balance')}               Check wallet USDFC balance`)
  console.log(``)
  console.log(`  ${c.info('rails list')}                   List all your payment rails`)
  console.log(`  ${c.info('rails info <railId>')}          Get detailed rail information`)
  console.log(`  ${c.info('rails settle <payer>')}         Settle a specific rail`)
  console.log(`  ${c.info('rails settle-all')}             Auto-settle all rails`)
  console.log(``)
  console.log(`  ${c.info('settle <payer>')}               Settle rail with payer (shortcut)`)
  console.log(`  ${c.info('settlement-preview <payer>')}   Preview settlement amounts`)
  console.log(``)
  console.log(c.bright('Flags:'))
  console.log(`  ${c.dim('--rpc <url>')}         RPC endpoint (default: ${DEFAULT_RPC})`)
  console.log(`  ${c.dim('--key <key>')}         Private key (required for transactions)`)
  console.log(`  ${c.dim('--account <addr>')}    Account address (for balance check)`)
  console.log(`  ${c.dim('--to <addr>')}         Recipient address (for withdraw)`)
  console.log(`  ${c.dim('--detailed')}          Show detailed balance info`)
  console.log(`  ${c.dim('--json')}              Output as JSON`)
  console.log(`  ${c.dim('--yes')}               Skip confirmation prompts`)
  console.log(``)
  console.log(c.bright('Examples:'))
  console.log(c.dim(`  # Check balance`))
  console.log(`  filpay balance --account 0x... --detailed`)
  console.log(``)
  console.log(c.dim(`  # List all your rails`))
  console.log(`  filpay rails list --key YOUR_KEY`)
  console.log(``)
  console.log(c.dim(`  # Withdraw funds`))
  console.log(`  filpay withdraw 0.5 --key YOUR_KEY`)
  console.log(``)
  console.log(c.dim(`  # Settle all rails`))
  console.log(`  filpay rails settle-all --key YOUR_KEY --yes`)
  console.log(``)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
