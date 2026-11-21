(() => {
  'use strict';

  const M = window.CarrowmontMortgageCore;
  const R = window.CarrowmontMdc1bCore;
  const VERSION = 'fre12b3-v1.0.0';

  function finite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function validate(input = {}) {
    const balance = finite(input.balance, NaN);
    const currentRatePct = finite(input.currentRatePct, NaN);
    const lumpSumAmount = finite(input.lumpSumAmount, NaN);
    const newRatePct = finite(input.newRatePct, NaN);
    const remainingMonths = Math.max(0, finite(input.remainingYears)) * 12 + Math.max(0, finite(input.remainingMonths));
    const proposedMonths = Math.max(0, finite(input.proposedYears)) * 12 + Math.max(0, finite(input.proposedMonths));
    if (!M || !R) return 'dependency';
    if (!(balance > 0)) return 'balance';
    if (!Number.isFinite(currentRatePct) || currentRatePct < 0 || currentRatePct > 50) return 'current-rate';
    if (!(lumpSumAmount > 0) || lumpSumAmount >= balance) return 'lump-sum';
    if (remainingMonths < 1 || remainingMonths > 1200) return 'remaining-term';
    if (!Number.isFinite(newRatePct) || newRatePct < 0 || newRatePct > 50) return 'new-rate';
    if (proposedMonths < 1 || proposedMonths > 1200) return 'proposed-term';
    for (const key of ['prepaymentCharge','switchingFees','exitCharge','cashback']) {
      const value = finite(input[key], NaN);
      if (!Number.isFinite(value) || value < 0) return key;
    }
    if (!['monthly','biweekly','fortnightly','weekly'].includes(input.paymentFrequency || 'monthly')) return 'frequency';
    if (!['upfront','financed'].includes(input.feePaymentMode || 'upfront')) return 'fee-mode';
    return null;
  }

  function calculate(input = {}) {
    const error = validate(input);
    if (error) return { ok: false, version: VERSION, error };

    const normalized = {
      country: input.country || 'OTHER',
      currency: input.currency || 'USD',
      balance: finite(input.balance),
      currentRatePct: finite(input.currentRatePct),
      remainingYears: finite(input.remainingYears),
      remainingMonths: finite(input.remainingMonths),
      paymentFrequency: input.paymentFrequency || 'monthly',
      lumpSumAmount: finite(input.lumpSumAmount),
      prepaymentCharge: finite(input.prepaymentCharge),
      newRatePct: finite(input.newRatePct),
      proposedYears: finite(input.proposedYears),
      proposedMonths: finite(input.proposedMonths),
      switchingFees: finite(input.switchingFees),
      exitCharge: finite(input.exitCharge),
      cashback: finite(input.cashback),
      feePaymentMode: input.feePaymentMode || 'upfront',
      startDate: input.startDate || new Date().toISOString().slice(0, 10)
    };

    const sharedMortgage = {
      country: normalized.country,
      currency: normalized.currency,
      balance: normalized.balance,
      annualRatePct: normalized.currentRatePct,
      remainingYears: normalized.remainingYears,
      remainingMonths: normalized.remainingMonths,
      paymentFrequency: normalized.paymentFrequency,
      useCurrentPayment: false,
      mode: 'lump',
      lumpSumAmount: normalized.lumpSumAmount,
      lumpSumPeriod: 1,
      prepaymentCharge: normalized.prepaymentCharge,
      otherCharges: 0,
      startDate: normalized.startDate
    };

    const prepay = M.calculate({ ...sharedMortgage, lumpStrategy: 'finish-sooner' });
    const recast = M.calculate({ ...sharedMortgage, lumpStrategy: 'lower-payment' });
    if (!prepay.ok) return { ok: false, version: VERSION, error: `prepay-${prepay.error || 'scenario'}` };
    if (!recast.ok) return { ok: false, version: VERSION, error: `recast-${recast.error || 'scenario'}` };

    const firstRow = prepay.scenario.ledger?.[0];
    const afterLumpBalance = firstRow?.closingBalance;
    if (!(afterLumpBalance > 0)) return { ok: false, version: VERSION, error: 'lump-clears-loan' };

    const ppy = M.periodsPerYear(normalized.paymentFrequency);
    const remainingPrepayPeriods = Math.max(1, prepay.scenario.payoffPeriods - 1);
    const remainingPrepayMonths = remainingPrepayPeriods * 12 / ppy;
    const refinance = R.calculate({
      country: normalized.country,
      currency: normalized.currency,
      balance: afterLumpBalance,
      currentRatePct: normalized.currentRatePct,
      remainingYears: 0,
      remainingMonths: remainingPrepayMonths,
      paymentFrequency: normalized.paymentFrequency,
      newRatePct: normalized.newRatePct,
      proposedYears: normalized.proposedYears,
      proposedMonths: normalized.proposedMonths,
      switchingFees: normalized.switchingFees,
      exitCharge: normalized.exitCharge,
      cashback: normalized.cashback,
      feePaymentMode: normalized.feePaymentMode,
      useHoldingPeriod: false,
      startDate: firstRow.date
    });
    if (!refinance.ok) return { ok: false, version: VERSION, error: `refinance-${refinance.error || 'scenario'}` };

    const firstPeriodInterest = finite(firstRow.interest);
    const baseline = prepay.baseline;
    const baselineBorrowingCost = baseline.totalInterest;
    const prepayBorrowingCost = prepay.scenario.totalInterest + normalized.prepaymentCharge;
    const recastBorrowingCost = recast.scenario.totalInterest + normalized.prepaymentCharge;
    const refinanceBorrowingCost = firstPeriodInterest + refinance.proposedLoan.totalInterest + refinance.costs.netSwitchingCost;

    return {
      ok: true,
      version: VERSION,
      input: normalized,
      event: {
        lumpSumPeriod: 1,
        eventDate: firstRow.date,
        balanceAfterLump: afterLumpBalance,
        firstPeriodInterest
      },
      baseline: {
        payment: baseline.payment,
        payoffPeriods: baseline.payoffPeriods,
        payoffDate: baseline.payoffDate,
        totalInterest: baseline.totalInterest,
        borrowingCost: baselineBorrowingCost
      },
      prepay: {
        payment: prepay.common.payment,
        payoffPeriods: prepay.scenario.payoffPeriods,
        payoffDate: prepay.scenario.payoffDate,
        periodsSaved: prepay.periodsSaved,
        totalInterest: prepay.scenario.totalInterest,
        interestSavedBeforeCharges: prepay.interestSavedBeforeCharges,
        charge: normalized.prepaymentCharge,
        borrowingCost: prepayBorrowingCost,
        costReductionVsBaseline: baselineBorrowingCost - prepayBorrowingCost
      },
      recast: {
        payment: recast.scenario.recastPayment || recast.scenario.payment,
        paymentReduction: Math.max(0, prepay.common.payment - (recast.scenario.recastPayment || recast.scenario.payment)),
        payoffPeriods: recast.scenario.payoffPeriods,
        payoffDate: recast.scenario.payoffDate,
        totalInterest: recast.scenario.totalInterest,
        interestSavedBeforeCharges: recast.interestSavedBeforeCharges,
        charge: normalized.prepaymentCharge,
        borrowingCost: recastBorrowingCost,
        costReductionVsBaseline: baselineBorrowingCost - recastBorrowingCost,
        lenderAvailabilityNotModeled: true
      },
      refinance: {
        startingBalanceAfterLump: afterLumpBalance,
        payment: refinance.proposedLoan.payment,
        payoffPeriodsAfterLump: refinance.proposedLoan.payoffPeriods,
        payoffDate: refinance.proposedLoan.payoffDate,
        totalInterestFromToday: firstPeriodInterest + refinance.proposedLoan.totalInterest,
        borrowingCost: refinanceBorrowingCost,
        netSwitchingCost: refinance.costs.netSwitchingCost,
        durableBreakEvenMonths: refinance.comparison.durableBreakEvenMonths,
        temporaryCrossingMonths: refinance.comparison.temporaryCrossingMonths,
        lifetimeAdvantageVsPrepayPathAfterLump: refinance.comparison.lifetimeAdvantage,
        paymentChangeVsPrepayPathAfterLump: refinance.comparison.paymentChange,
        termChangePeriodsVsPrepayPathAfterLump: refinance.comparison.termChangePeriods,
        lowerPaymentHigherLifetimeCost: refinance.comparison.lowerPaymentHigherLifetimeCost,
        messages: refinance.messages
      },
      comparison: {
        sameLumpSumAcrossPaths: true,
        refinanceStartsAfterLump: true,
        lowestBorrowingCostPath: [
          ['prepay', prepayBorrowingCost],
          ['recast', recastBorrowingCost],
          ['refinance', refinanceBorrowingCost]
        ].sort((a, b) => a[1] - b[1])[0][0]
      }
    };
  }

  window.CarrowmontFre12b3MortgageChoiceCore = { VERSION, calculate };
})();
