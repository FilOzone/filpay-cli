import { ethers } from 'ethers'
import { PaymentsService } from '@filoz/synapse-sdk/payments'

const FILECOIN_PAY_V1 = '0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa'
const USDFC_ADDRESS = '0x80B98d3aa09ffff255c3ba4A241111Ff1262F045'

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  brightGreen: '\x1b[1;32m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[1;36m',
  white: '\x1b[37m'
}

const c = {
  success: (text) => `${colors.brightGreen}${text}${colors.reset}`,
  info: (text) => `${colors.brightCyan}${text}${colors.reset}`,
  dim: (text) => `${colors.white}${text}${colors.reset}`,
  bright: (text) => `${colors.bright}${text}${colors.reset}`
}

export async function handleDeposit(provider, amountStr, flags) {
  if (!amountStr) {
    throw new Error('Amount is required for deposit command')
  }

  const privateKey = flags.key
  if (!privateKey) {
    throw new Error('--key flag is required for deposit')
  }

  const amount = ethers.parseUnits(amountStr, 18) // USDFC has 18 decimals

  const wallet = new ethers.Wallet(privateKey, provider)
  const paymentsService = new PaymentsService(
    provider,
    wallet,
    FILECOIN_PAY_V1,
    USDFC_ADDRESS,
    true
  )

  console.log(c.bright(`\n📥 Deposit USDFC\n`))
  console.log(c.dim(`From: ${wallet.address}`))
  console.log(`Amount: ${c.bright(amountStr)} USDFC\n`)

  // Check wallet balance first
  console.log(c.dim('Checking wallet balance...'))
  const walletBalance = await paymentsService.walletBalance('USDFC')
  console.log(`Wallet balance: ${c.success(ethers.formatUnits(walletBalance, 18))} USDFC`)

  if (walletBalance < amount) {
    throw new Error(`Insufficient wallet balance`)
  }

  // Check allowance
  console.log(c.dim('Checking allowance...'))
  const currentAllowance = await paymentsService.allowance('USDFC')
  console.log(`Current allowance: ${c.dim(ethers.formatUnits(currentAllowance, 18))} USDFC`)

  if (currentAllowance < amount) {
    console.log(c.info(`\n🔓 Need to approve ${amountStr} USDFC...`))
    const approveTx = await paymentsService.approve(amount, 'USDFC')
    console.log(c.dim(`Approval tx: ${approveTx.hash}`))
    console.log(c.dim('Waiting for approval confirmation...'))
    await approveTx.wait()
    console.log(c.success('✓ Approved\n'))
  }

  // Deposit
  console.log(c.info('📤 Depositing...'))
  const depositTx = await paymentsService.deposit(amount, 'USDFC')
  console.log(c.dim(`Deposit tx: ${depositTx.hash}`))

  console.log(c.dim('Waiting for confirmation...'))
  const receipt = await depositTx.wait()

  if (receipt.status === 1) {
    console.log(c.success(`\n✓ Deposit confirmed in block ${receipt.blockNumber}`))
    console.log(c.dim(`Gas used: ${receipt.gasUsed}`))
  } else {
    throw new Error('Deposit transaction failed')
  }
}

export async function handleWalletBalance(provider, flags) {
  const privateKey = flags.key
  const accountAddress = flags.account

  if (!privateKey && !accountAddress) {
    throw new Error('Either --key or --account flag is required')
  }

  let address
  if (accountAddress) {
    address = accountAddress
  } else {
    const wallet = new ethers.Wallet(privateKey, provider)
    address = wallet.address
  }

  console.log(c.bright(`\n👛 Wallet Balance\n`))
  console.log(c.dim(`Address: ${address}\n`))

  // Query USDFC balance directly
  const usdfcAbi = ['function balanceOf(address) view returns (uint256)']
  const usdfcContract = new ethers.Contract(USDFC_ADDRESS, usdfcAbi, provider)

  const balance = await usdfcContract.balanceOf(address)

  console.log(`USDFC Balance: ${c.success(ethers.formatUnits(balance, 18))} USDFC`)

  // If we have a private key, also show contract balance
  if (privateKey) {
    const wallet = new ethers.Wallet(privateKey, provider)
    const paymentsService = new PaymentsService(
      provider,
      wallet,
      FILECOIN_PAY_V1,
      USDFC_ADDRESS,
      true
    )

    const accountInfo = await paymentsService.accountInfo('USDFC')
    console.log(c.bright(`\n📋 FilecoinPay Contract:`))
    console.log(`  Total Funds:  ${c.bright(ethers.formatUnits(accountInfo.funds, 18))} USDFC`)
    console.log(`  Available:    ${c.success(ethers.formatUnits(accountInfo.availableFunds, 18))} USDFC`)
  }
}
