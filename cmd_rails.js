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
  red: '\x1b[31m',
  brightRed: '\x1b[1;31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[1;36m',
  white: '\x1b[37m'
}

const c = {
  success: (text) => `${colors.brightGreen}${text}${colors.reset}`,
  error: (text) => `${colors.brightRed}${text}${colors.reset}`,
  info: (text) => `${colors.brightCyan}${text}${colors.reset}`,
  warn: (text) => `${colors.yellow}${text}${colors.reset}`,
  dim: (text) => `${colors.white}${text}${colors.reset}`,
  bright: (text) => `${colors.bright}${text}${colors.reset}`
}

export async function handleRailsList(provider, flags) {
  const privateKey = flags.key
  if (!privateKey) {
    throw new Error('--key flag is required for rails list')
  }

  const wallet = new ethers.Wallet(privateKey, provider)
  const paymentsService = new PaymentsService(
    provider,
    wallet,
    FILECOIN_PAY_V1,
    USDFC_ADDRESS,
    true
  )

  console.log(c.bright(`\n🚆 Payment Rails\n`))
  console.log(c.dim(`Address: ${wallet.address}`))
  console.log(c.dim('\nFetching rails...\n'))

  // Get rails as payer and payee (only returns railIds)
  const [asPayerRails, asPayeeRails] = await Promise.all([
    paymentsService.getRailsAsPayer('USDFC'),
    paymentsService.getRailsAsPayee('USDFC')
  ])

  console.log(c.bright(`═══ Rails as Payer (${asPayerRails.length}) ═══`))
  if (asPayerRails.length === 0) {
    console.log(c.dim('  (none)'))
  } else {
    for (let i = 0; i < asPayerRails.length; i++) {
      const railId = asPayerRails[i].railId
      const rail = await paymentsService.getRail(railId, 'USDFC')
      const isTerminated = rail.endEpoch !== 0n

      console.log(`  ${c.info(`${i + 1}. Rail #${railId}`)} → ${c.dim(rail.to)}`)
      console.log(`     Rate: ${c.bright(ethers.formatUnits(rail.paymentRate, 18))} USDFC/epoch`)
      console.log(`     Status: ${isTerminated ? c.dim('⊗ Terminated') : c.success('✓ Active')}`)
    }
  }

  console.log(c.bright(`\n═══ Rails as Payee (${asPayeeRails.length}) ═══`))
  if (asPayeeRails.length === 0) {
    console.log(c.dim('  (none)'))
  } else {
    for (let i = 0; i < asPayeeRails.length; i++) {
      const railId = asPayeeRails[i].railId
      const rail = await paymentsService.getRail(railId, 'USDFC')
      const isTerminated = rail.endEpoch !== 0n

      console.log(`  ${c.info(`${i + 1}. Rail #${railId}`)} ← ${c.dim(rail.from)}`)
      console.log(`     Rate: ${c.bright(ethers.formatUnits(rail.paymentRate, 18))} USDFC/epoch`)
      console.log(`     Status: ${isTerminated ? c.dim('⊗ Terminated') : c.success('✓ Active')}`)
    }
  }

  console.log(c.bright(`\n📊 Total: ${asPayerRails.length + asPayeeRails.length} rails`))
}

export async function handleRailInfo(provider, railId, flags) {
  const privateKey = flags.key
  if (!privateKey) {
    throw new Error('--key flag is required for rail info')
  }

  const wallet = new ethers.Wallet(privateKey, provider)
  const paymentsService = new PaymentsService(
    provider,
    wallet,
    FILECOIN_PAY_V1,
    USDFC_ADDRESS,
    true
  )

  console.log(c.dim(`\nFetching rail #${railId}...\n`))

  const rail = await paymentsService.getRail(parseInt(railId), 'USDFC')
  const isTerminated = rail.endEpoch !== 0n

  console.log(c.bright(`🚆 Rail #${railId}`))
  console.log(c.bright(`═══════════════════════════════════════`))
  console.log(`Payer:           ${c.info(rail.from)}`)
  console.log(`Payee:           ${c.info(rail.to)}`)
  console.log(`Payment Rate:    ${c.bright(ethers.formatUnits(rail.paymentRate, 18))} USDFC/epoch`)
  console.log(`Lockup Period:   ${c.dim(rail.lockupPeriod)} epochs`)
  console.log(`Settled Up To:   ${c.dim(`epoch ${rail.settledUpTo}`)}`)
  console.log(`Status:          ${isTerminated ? c.dim('⊗ Terminated') : c.success('✓ Active')}`)
  if (isTerminated) {
    console.log(`End Epoch:       ${c.dim(rail.endEpoch)}`)
  }
  console.log(`Operator:        ${rail.operator === ethers.ZeroAddress ? c.dim('None') : c.dim(rail.operator)}`)
  console.log(`Validator:       ${rail.validator === ethers.ZeroAddress ? c.dim('None') : c.dim(rail.validator)}`)
}

export async function handleRailSettle(provider, payerAddr, flags) {
  const privateKey = flags.key
  if (!privateKey) {
    throw new Error('--key flag is required for settle')
  }

  const wallet = new ethers.Wallet(privateKey, provider)
  const paymentsService = new PaymentsService(
    provider,
    wallet,
    FILECOIN_PAY_V1,
    USDFC_ADDRESS,
    true
  )

  console.log(c.bright(`\n💳 Settle Payment Rail\n`))
  console.log(c.dim(`Payer: ${payerAddr}`))
  console.log(c.dim(`Payee: ${wallet.address}\n`))

  // Preview settlement first
  console.log(c.dim('Calculating settlement amounts...'))
  const amounts = await paymentsService.getSettlementAmounts(payerAddr, wallet.address, 'USDFC')

  console.log(`Payment amount:  ${c.bright(ethers.formatUnits(amounts.paymentAmount, 18))} USDFC`)
  console.log(`Settlement fee:  ${c.dim(ethers.formatUnits(amounts.settlementFee, 18))} USDFC`)
  console.log(`Total to payee:  ${c.success(ethers.formatUnits(amounts.paymentAmount - amounts.settlementFee, 18))} USDFC`)

  if (amounts.paymentAmount === 0n) {
    console.log(c.warn('\n⚠ No payment to settle (amount is 0)'))
    return
  }

  if (!flags.yes) {
    console.log(c.warn('\n⚡ Proceed with settlement? [y/N]: '))
    const response = await new Promise(resolve => {
      process.stdin.once('data', data => resolve(data.toString().trim()))
    })
    if (response !== 'y' && response !== 'Y') {
      console.log(c.dim('Cancelled'))
      return
    }
  }

  console.log(c.info('\n📤 Sending settlement transaction...'))
  const tx = await paymentsService.settle(payerAddr, 'USDFC')
  console.log(c.dim(`Transaction hash: ${tx.hash}`))

  console.log(c.dim('Waiting for confirmation...'))
  const receipt = await tx.wait()

  if (receipt.status === 1) {
    console.log(c.success(`\n✓ Settlement confirmed in block ${receipt.blockNumber}`))
    console.log(c.dim(`Gas used: ${receipt.gasUsed}`))
  } else {
    throw new Error('Settlement transaction failed')
  }
}

export async function handleRailSettleAll(provider, flags) {
  const privateKey = flags.key
  if (!privateKey) {
    throw new Error('--key flag is required for settle-all')
  }

  const wallet = new ethers.Wallet(privateKey, provider)
  const paymentsService = new PaymentsService(
    provider,
    wallet,
    FILECOIN_PAY_V1,
    USDFC_ADDRESS,
    true
  )

  const isPreview = flags.preview

  console.log(c.bright(`\n${isPreview ? '🔍 Preview' : '💳'} Settle All Rails\n`))
  console.log(c.dim(`Address: ${wallet.address}\n`))

  // Get all rails as payee
  const asPayeeRails = await paymentsService.getRailsAsPayee('USDFC')
  console.log(c.dim(`Found ${asPayeeRails.length} rails as payee\n`))

  const settled = []
  const skipped = []
  const failed = []

  // Iterate through each rail and calculate settlements
  for (const railSummary of asPayeeRails) {
    const railId = railSummary.railId

    try {
      // Get full rail details to find payer
      const rail = await paymentsService.getRail(railId, 'USDFC')
      const payer = rail.from

      // Check settlement amount
      const amounts = await paymentsService.getSettlementAmounts(payer, wallet.address, 'USDFC')

      if (amounts.paymentAmount === 0n) {
        skipped.push({ railId, payer })
        console.log(c.dim(`⊘ Rail #${railId} (${payer.substring(0, 10)}...): No payment due`))
        continue
      }

      // In preview mode, just show what would be settled
      if (isPreview) {
        settled.push({ railId, payer, amount: amounts.paymentAmount, fee: amounts.settlementFee })
        const netAmount = amounts.paymentAmount - amounts.settlementFee
        console.log(c.info(`→ Rail #${railId} (${payer.substring(0, 10)}...)`))
        console.log(c.dim(`  Payment:     ${ethers.formatUnits(amounts.paymentAmount, 18)} USDFC`))
        console.log(c.dim(`  Fee:         ${ethers.formatUnits(amounts.settlementFee, 18)} USDFC`))
        console.log(c.success(`  Net to you:  ${ethers.formatUnits(netAmount, 18)} USDFC`))
        continue
      }

      // Settle the rail (non-preview mode)
      console.log(c.info(`→ Rail #${railId} (${payer.substring(0, 10)}...): Settling ${ethers.formatUnits(amounts.paymentAmount, 18)} USDFC...`))
      const tx = await paymentsService.settle(payer, 'USDFC')
      const receipt = await tx.wait()

      if (receipt.status === 1) {
        settled.push({ railId, payer, amount: amounts.paymentAmount, txHash: tx.hash })
        console.log(c.success(`  ✓ Confirmed in block ${receipt.blockNumber}`))
      } else {
        failed.push({ railId, payer, error: 'Transaction failed' })
        console.log(c.error(`  ✗ Transaction failed`))
      }
    } catch (error) {
      failed.push({ railId, error: error.message })
      console.log(c.dim(`  ⊘ Rail #${railId}: ${error.message.includes('RailInactiveOrSettled') ? 'Already settled' : 'Error'}`))
    }
  }

  // Summary
  console.log(c.bright(`\n═══════════════════════════════════`))
  if (isPreview) {
    console.log(c.info(`→ Would settle: ${settled.length}`))
    console.log(c.dim(`⊘ Would skip:   ${skipped.length}`))
    if (settled.length > 0) {
      const totalAmount = settled.reduce((sum, s) => sum + s.amount, 0n)
      const totalFees = settled.reduce((sum, s) => sum + (s.fee || 0n), 0n)
      const totalNet = totalAmount - totalFees
      console.log(c.bright(`\n💰 Settlement Summary:`))
      console.log(c.dim(`   Total payment:  ${ethers.formatUnits(totalAmount, 18)} USDFC`))
      console.log(c.dim(`   Total fees:     ${ethers.formatUnits(totalFees, 18)} USDFC`))
      console.log(c.success(`   Net to you:     ${ethers.formatUnits(totalNet, 18)} USDFC`))
      console.log(c.warn(`\n⚡ Run without --preview flag to execute settlements`))
    }
  } else {
    console.log(c.success(`✓ Settled: ${settled.length}`))
    console.log(c.dim(`⊘ Skipped: ${skipped.length}`))
    console.log(c.error(`✗ Failed:  ${failed.length}`))

    if (settled.length > 0) {
      console.log(c.bright(`\n💰 Total settled: ${ethers.formatUnits(settled.reduce((sum, s) => sum + s.amount, 0n), 18)} USDFC`))
    }
  }
}
