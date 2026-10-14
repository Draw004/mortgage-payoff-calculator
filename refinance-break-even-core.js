(() => {
  'use strict';

  const M = window.CarrowmontMortgageCore;
  const VERSION = 'mdc1b-v1.0.0';
  const MAX_YEARS = 100;

  function finite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeMonths(years, months) {
    const y = Math.max(0, finite(years));
    const m = Math.max(0, finite(months));
    return y * 12 + m;
  }

  function periodsFromMonths(totalMonths, paymentFrequency) {
    const ppy = M.periodsPerYear(paymentFrequency || 'monthly');
    return Math.max(1, Math.round(totalMonths * ppy / 12));
  }

  function monthsFromPeriods(periods, paymentFrequency) {
    const ppy = M.periodsPerYear(paymentFrequency || 'monthly');
    return Math.max(0, Math.ceil(Math.max(0, finite(periods)) * 12 / ppy));
  }

  function validate(input) {
    const frequency = input.paymentFrequency || 'monthly';
    const ppy = M.periodsPerYear(frequency);
    const balance = finite(input.balance, NaN);
    const currentRate = finite(input.currentRatePct, NaN);
    const newRate = finite(input.newRatePct, NaN);
    const currentMonths = normalizeMonths(input.remainingYears, input.remainingMonths);
    const proposedMonths = normalizeMonths(input.proposedYears, input.proposedMonths);
    const switchingFees = finite(input.switchingFees, NaN);
    const exitCharge = finite(input.exitCharge, NaN);
    const cashback = finite(input.cashback, NaN);

    if (!(balance > 0)) return 'balance';
    if (!Number.isFinite(currentRate) || currentRate < 0 || currentRate > 50) return 'current-rate';
    if (!Number.isFinite(newRate) || newRate < 0 || newRate > 50) return 'new-rate';
    if (currentMonths < 1 || currentMonths > MAX_YEARS * 12) return 'current-term';
    if (proposedMonths < 1 || proposedMonths > MAX_YEARS * 12) return 'proposed-term';
    if (!['monthly', 'biweekly', 'fortnightly', 'weekly'].includes(frequency)) return 'frequency';
    if (!Number.isFinite(switchingFees) || switchingFees < 0) return 'switching-fees';
    if (!Number.isFinite(exitCharge) || exitCharge < 0) return 'exit-charge';
    if (!Number.isFinite(cashback) || cashback < 0) return 'cashback';
    if (!['upfront', 'financed'].includes(input.feePaymentMode || 'upfront')) return 'fee-mode';
    if (input.useHoldingPeriod) {
      const holdingMonths = normalizeMonths(input.holdingYears, input.holdingMonths);
      if (holdingMonths < 1 || holdingMonths > MAX_YEARS * 12) return 'holding-period';
      if (!Number.isFinite(periodsFromMonths(holdingMonths, frequency)) || periodsFromMonths(holdingMonths, frequency) > MAX_YEARS * ppy) return 'holding-period';
    }
    return null;
  }

  function simulateLoan({ balance, ratePct, periods, paymentFrequency, country, startDate }) {
    const convention = M.paymentConvention(country || 'OTHER', 'fixed');
    const periodic = M.periodicRate(ratePct, paymentFrequency, convention);
    const payment = M.scheduledPayment(balance, periodic, periods);
    const model = M.simulate({
      balance,
      annualRatePct: ratePct,
      paymentFrequency,
      convention,
      periods,
      payment,
      startDate
    });
    return { ...model, convention, periodicRate: periodic, payment };
  }

  function seriesArrays(model, horizon, startingBalance) {
    const interest = new Array(horizon + 1).fill(0);
    const cash = new Array(horizon + 1).fill(0);
    const balance = new Array(horizon + 1).fill(0);
    balance[0] = startingBalance;
    let cumInterest = 0;
    let cumCash = 0;
    let lastBalance = startingBalance;
    const byPeriod = new Map((model.ledger || []).map(row => [row.period, row]));
    for (let k = 1; k <= horizon; k += 1) {
      const row = byPeriod.get(k);
      if (row) {
        cumInterest += row.interest;
        cumCash += row.scheduledRepayment + row.extraRepayment;
        lastBalance = row.closingBalance;
      }
      interest[k] = cumInterest;
      cash[k] = cumCash;
      balance[k] = lastBalance;
    }
    return { interest, cash, balance };
  }

  function durableBreakEven(advantages, tolerance) {
    const n = advantages.length;
    const suffixMin = new Array(n);
    suffixMin[n - 1] = advantages[n - 1];
    for (let i = n - 2; i >= 0; i -= 1) suffixMin[i] = Math.min(advantages[i], suffixMin[i + 1]);
    let firstNonNegative = null;
    let temporary = null;
    for (let i = 0; i < n; i += 1) {
      if (advantages[i] >= -tolerance) {
        if (firstNonNegative == null) firstNonNegative = i;
        if (suffixMin[i] >= -tolerance) return { durable: i, temporary };
        if (temporary == null) temporary = i;
      }
    }
    return { durable: null, temporary: temporary ?? firstNonNegative };
  }

  function calculate(input = {}) {
    if (!M) return { ok: false, version: VERSION, error: 'mortgage-core' };
    const normalized = {
      country: input.country || 'OTHER',
      currency: input.currency || 'USD',
      balance: finite(input.balance, NaN),
      currentRatePct: finite(input.currentRatePct, NaN),
      remainingYears: finite(input.remainingYears),
      remainingMonths: finite(input.remainingMonths),
      paymentFrequency: input.paymentFrequency || 'monthly',
      newRatePct: finite(input.newRatePct, NaN),
      proposedYears: finite(input.proposedYears),
      proposedMonths: finite(input.proposedMonths),
      switchingFees: finite(input.switchingFees, NaN),
      exitCharge: finite(input.exitCharge, NaN),
      cashback: finite(input.cashback, NaN),
      feePaymentMode: input.feePaymentMode || 'upfront',
      useHoldingPeriod: Boolean(input.useHoldingPeriod),
      holdingYears: finite(input.holdingYears),
      holdingMonths: finite(input.holdingMonths),
      startDate: input.startDate || new Date().toISOString().slice(0, 10)
    };

    const error = validate(normalized);
    if (error) return { ok: false, version: VERSION, error, input: normalized };

    const ppy = M.periodsPerYear(normalized.paymentFrequency);
    const currentMonths = normalizeMonths(normalized.remainingYears, normalized.remainingMonths);
    const proposedMonths = normalizeMonths(normalized.proposedYears, normalized.proposedMonths);
    const currentPeriods = periodsFromMonths(currentMonths, normalized.paymentFrequency);
    const proposedPeriods = periodsFromMonths(proposedMonths, normalized.paymentFrequency);
    const financedFees = normalized.feePaymentMode === 'financed' ? normalized.switchingFees : 0;
    const proposedPrincipal = normalized.balance + financedFees;
    const netSwitchingCost = normalized.switchingFees + normalized.exitCharge - normalized.cashback;
    const tolerance = Math.max(0.01, normalized.balance * 1e-8);

    const current = simulateLoan({ balance: normalized.balance, ratePct: normalized.currentRatePct, periods: currentPeriods, paymentFrequency: normalized.paymentFrequency, country: normalized.country, startDate: normalized.startDate });
    const rateOnly = simulateLoan({ balance: normalized.balance, ratePct: normalized.newRatePct, periods: currentPeriods, paymentFrequency: normalized.paymentFrequency, country: normalized.country, startDate: normalized.startDate });
    const proposed = simulateLoan({ balance: proposedPrincipal, ratePct: normalized.newRatePct, periods: proposedPeriods, paymentFrequency: normalized.paymentFrequency, country: normalized.country, startDate: normalized.startDate });

    if (!current.ok) return { ok: false, version: VERSION, error: current.error || 'current-loan', input: normalized };
    if (!rateOnly.ok) return { ok: false, version: VERSION, error: rateOnly.error || 'rate-only', input: normalized };
    if (!proposed.ok) return { ok: false, version: VERSION, error: proposed.error || 'proposed-loan', input: normalized };

    const horizon = Math.max(current.payoffPeriods, proposed.payoffPeriods);
    const cur = seriesArrays(current, horizon, normalized.balance);
    const refi = seriesArrays(proposed, horizon, proposedPrincipal);
    const advantages = [];
    const advantageSeries = [];
    const upfrontCashAdjustment = (normalized.feePaymentMode === 'upfront' ? normalized.switchingFees : 0) + normalized.exitCharge - normalized.cashback;
    let maxEquivalenceError = 0;

    for (let k = 0; k <= horizon; k += 1) {
      const advantage = cur.interest[k] - refi.interest[k] - netSwitchingCost;
      advantages.push(advantage);
      const cashBalanceAdvantage = (cur.cash[k] + cur.balance[k]) - (refi.cash[k] + refi.balance[k] + upfrontCashAdjustment);
      maxEquivalenceError = Math.max(maxEquivalenceError, Math.abs(advantage - cashBalanceAdvantage));
      advantageSeries.push({
        period: k,
        months: monthsFromPeriods(k, normalized.paymentFrequency),
        currentInterest: cur.interest[k],
        proposedInterest: refi.interest[k],
        currentBalance: cur.balance[k],
        proposedBalance: refi.balance[k],
        advantage,
        cashBalanceAdvantage
      });
    }

    const crossing = durableBreakEven(advantages, tolerance);
    const holdingMonths = normalized.useHoldingPeriod ? normalizeMonths(normalized.holdingYears, normalized.holdingMonths) : null;
    const holdingPeriodsRaw = holdingMonths == null ? null : Math.ceil(holdingMonths * ppy / 12);
    const holdingPeriods = holdingPeriodsRaw == null ? null : Math.min(horizon, holdingPeriodsRaw);
    const holdingPeriodAdvantage = holdingPeriods == null ? null : advantages[holdingPeriods];
    const lifetimeAdvantage = advantages[horizon];
    const paymentChange = proposed.payment - current.payment;
    const termChangePeriods = proposedPeriods - currentPeriods;
    const lowerPaymentHigherLifetimeCost = paymentChange < -tolerance && lifetimeAdvantage < -tolerance;

    const messages = [];
    if (termChangePeriods > 0) messages.push('term-extension');
    if (termChangePeriods < 0) messages.push('term-shortening');
    if (lowerPaymentHigherLifetimeCost) messages.push('lower-payment-higher-lifetime-cost');
    if (crossing.durable == null) messages.push('no-durable-break-even');
    if (crossing.temporary != null && crossing.durable == null) messages.push('temporary-crossing');
    if (holdingPeriods != null && crossing.durable != null && holdingPeriods < crossing.durable) messages.push('holding-before-break-even');

    return {
      ok: true,
      version: VERSION,
      input: normalized,
      tolerance,
      currentLoan: {
        balance: normalized.balance,
        rate: normalized.currentRatePct,
        termPeriods: currentPeriods,
        payment: current.payment,
        totalInterest: current.totalInterest,
        payoffPeriods: current.payoffPeriods,
        payoffDate: current.payoffDate,
        ledger: current.ledger
      },
      rateOnlySameTerm: {
        rate: normalized.newRatePct,
        principal: normalized.balance,
        termPeriods: currentPeriods,
        payment: rateOnly.payment,
        totalInterest: rateOnly.totalInterest,
        payoffPeriods: rateOnly.payoffPeriods,
        payoffDate: rateOnly.payoffDate
      },
      proposedLoan: {
        rate: normalized.newRatePct,
        baseBalance: normalized.balance,
        financedFees,
        principal: proposedPrincipal,
        termPeriods: proposedPeriods,
        payment: proposed.payment,
        totalInterest: proposed.totalInterest,
        payoffPeriods: proposed.payoffPeriods,
        payoffDate: proposed.payoffDate,
        ledger: proposed.ledger
      },
      costs: {
        switchingFees: normalized.switchingFees,
        exitCharge: normalized.exitCharge,
        cashback: normalized.cashback,
        netSwitchingCost,
        feePaymentMode: normalized.feePaymentMode,
        upfrontCashAdjustment
      },
      comparison: {
        periodsPerYear: ppy,
        comparisonHorizonPeriods: horizon,
        paymentChange,
        termChangePeriods,
        lifetimeAdvantage,
        durableBreakEvenPeriod: crossing.durable,
        durableBreakEvenMonths: crossing.durable == null ? null : monthsFromPeriods(crossing.durable, normalized.paymentFrequency),
        temporaryCrossingPeriod: crossing.temporary,
        temporaryCrossingMonths: crossing.temporary == null ? null : monthsFromPeriods(crossing.temporary, normalized.paymentFrequency),
        holdingPeriodPeriods: holdingPeriodsRaw,
        holdingPeriodMonths: holdingMonths,
        holdingPeriodAdvantage,
        lowerPaymentHigherLifetimeCost,
        advantageSeries,
        equivalenceMaxError: maxEquivalenceError
      },
      messages
    };
  }

  window.CarrowmontMdc1bCore = {
    VERSION,
    calculate,
    periodsFromMonths,
    monthsFromPeriods
  };
})();
