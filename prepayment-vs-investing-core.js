(() => {
  'use strict';

  const Mortgage = window.CarrowmontMortgageCore;
  if (!Mortgage) throw new Error('CarrowmontMortgageCore is required before prepayment-vs-investing-core.js');

  const VERSION = '1.0.0';
  const EPS = 1e-8;
  const MAX_YEARS = 100;
  const MS_DAY = 86400000;
  const AVG_YEAR_DAYS = 365.2425;

  function finite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function toIsoDate(value) {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const text = String(value || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    return new Date().toISOString().slice(0, 10);
  }

  function utcDate(iso) {
    return new Date(`${toIsoDate(iso)}T00:00:00Z`);
  }

  function daysBetween(startIso, endIso) {
    return Math.max(0, Math.round((utcDate(endIso).getTime() - utcDate(startIso).getTime()) / MS_DAY));
  }

  function yearFraction(startIso, endIso) {
    return daysBetween(startIso, endIso) / AVG_YEAR_DAYS;
  }

  function futureValue(amount, date, horizon, annualReturnDecimal) {
    const c = finite(amount);
    const r = finite(annualReturnDecimal);
    if (r <= -1) return NaN;
    const yf = yearFraction(date, horizon);
    const factor = Math.pow(1 + r, yf);
    return Number.isFinite(factor) ? c * factor : NaN;
  }

  function buildDueSchedule(paymentFrequency, extraFrequency, startPeriod = 1, customIntervalMonths = 3) {
    const periodsPerYear = Mortgage.periodsPerYear(paymentFrequency || 'monthly');
    const start = Math.max(1, Math.round(finite(startPeriod, 1)));
    if (extraFrequency === 'everyScheduled') {
      return period => period >= start;
    }
    const events = Mortgage.extraEventsPerYear(extraFrequency, customIntervalMonths);
    if (!events) return () => false;
    const step = periodsPerYear / events;
    let eventIndex = 0;
    let next = Math.max(start, Math.round(start + eventIndex * step));
    return period => {
      if (period < start || period < next) return false;
      while (next <= period) {
        eventIndex += 1;
        next = Math.max(next + 1, Math.round(start + eventIndex * step));
      }
      return true;
    };
  }

  function makePlannedExtraMap(input, baseline) {
    const map = new Map();
    const mode = input.extraMode || 'lump';
    const amount = Math.max(0, finite(input.extraAmount));
    if (amount <= 0) return map;

    if (mode === 'lump') {
      const period = Math.max(1, Math.round(finite(input.lumpSumPeriod, 1)));
      if (period <= baseline.payoffPeriods) map.set(period, amount);
      return map;
    }

    if (mode === 'recurring') {
      const due = buildDueSchedule(
        input.paymentFrequency || 'monthly',
        input.extraFrequency,
        input.extraStartPeriod || 1,
        input.customIntervalMonths || 3
      );
      for (let period = 1; period <= baseline.payoffPeriods; period += 1) {
        if (due(period)) map.set(period, amount);
      }
    }
    return map;
  }

  function validate(input) {
    const balance = finite(input.balance, -1);
    const rate = finite(input.annualRatePct, -1);
    const frequency = input.paymentFrequency || 'monthly';
    const m = Mortgage.periodsPerYear(frequency);
    const years = finite(input.remainingYears, -1);
    const months = finite(input.remainingMonths, -1);
    const periods = Math.round(years * m + months * m / 12);
    const mode = input.extraMode || 'lump';
    const amount = finite(input.extraAmount, -1);

    if (!(balance > 0)) return 'balance';
    if (rate < 0 || rate > 50) return 'rate';
    if (years < 0 || months < 0 || months >= 12 || !(periods > 0) || periods > MAX_YEARS * m) return 'term';
    if (input.useCurrentPayment && !(finite(input.currentPayment) > 0)) return 'payment';
    if (!['lump', 'recurring'].includes(mode)) return 'extra-mode';
    if (amount < 0) return 'extra';
    if (mode === 'recurring' && !input.extraFrequency) return 'extra-frequency';
    if (mode === 'recurring' && input.extraFrequency === 'custom') {
      const interval = finite(input.customIntervalMonths, 0);
      if (!(interval >= 1 && interval <= 120)) return 'custom-interval';
    }
    const fee = finite(input.prepaymentCharge, -1);
    if (fee < 0) return 'fee';
    if (input.assumedInvestmentReturnPct !== '' && input.assumedInvestmentReturnPct != null) {
      const r = Number(input.assumedInvestmentReturnPct);
      if (!Number.isFinite(r) || r <= -100 || r > 100) return 'investment-return';
    }
    return null;
  }

  function baselineFor(input) {
    const frequency = input.paymentFrequency || 'monthly';
    const m = Mortgage.periodsPerYear(frequency);
    const periods = Math.round(Math.max(0, finite(input.remainingYears)) * m + Math.max(0, finite(input.remainingMonths)) * m / 12);
    const convention = Mortgage.paymentConvention(input.country || 'OTHER', input.rateMode || 'fixed');
    const periodic = Mortgage.periodicRate(input.annualRatePct, frequency, convention);
    const formulaPayment = Mortgage.scheduledPayment(input.balance, periodic, periods);
    const payment = input.useCurrentPayment ? Math.max(0, finite(input.currentPayment)) : formulaPayment;
    const baseline = Mortgage.simulate({
      balance: input.balance,
      annualRatePct: input.annualRatePct,
      paymentFrequency: frequency,
      convention,
      periods,
      payment,
      startDate: toIsoDate(input.startDate)
    });
    return { baseline, common: { frequency, m, periods, convention, periodicRate: periodic, formulaPayment, payment } };
  }

  function prepayScheduleFor(input, common, baseline) {
    const opts = {
      balance: input.balance,
      annualRatePct: input.annualRatePct,
      paymentFrequency: common.frequency,
      convention: common.convention,
      periods: common.periods,
      payment: common.payment,
      startDate: toIsoDate(input.startDate)
    };
    if ((input.extraMode || 'lump') === 'lump') {
      opts.lumpSums = [{
        period: Math.max(1, Math.round(finite(input.lumpSumPeriod, 1))),
        amount: Math.max(0, finite(input.extraAmount))
      }];
    } else {
      opts.recurringEnabled = true;
      opts.recurringExtra = Math.max(0, finite(input.extraAmount));
      opts.extraFrequency = input.extraFrequency;
      opts.extraStartPeriod = Math.max(1, Math.round(finite(input.extraStartPeriod, 1)));
      opts.customIntervalMonths = finite(input.customIntervalMonths, 3);
    }
    return Mortgage.simulate(opts);
  }

  function makeCashFlows(input, baseline, prepay) {
    const plannedExtra = makePlannedExtraMap(input, baseline);
    const prepayRows = new Map((prepay.ledger || []).map(row => [row.period, row]));
    const prepayInvestmentCashFlows = [];
    const investCashFlows = [];
    const accounting = [];
    let firstPrepaymentDate = null;

    for (const baseRow of baseline.ledger || []) {
      const period = baseRow.period;
      const extra = plannedExtra.get(period) || 0;
      const prepayRow = prepayRows.get(period);
      const prepayMortgageOutflow = prepayRow ? prepayRow.scheduledRepayment + prepayRow.extraRepayment : 0;
      const plannedBudget = baseRow.scheduledRepayment + extra;
      let prepayInvestment = plannedBudget - prepayMortgageOutflow;
      const tolerance = Math.max(0.005, finite(input.balance) * 1e-12);
      if (Math.abs(prepayInvestment) <= tolerance) prepayInvestment = 0;
      if (prepayInvestment < -tolerance) {
        return { ok: false, error: 'cash-flow-invariant-negative', plannedExtra, accounting: [] };
      }
      if (prepayInvestment > 0) {
        prepayInvestmentCashFlows.push({ period, date: baseRow.date, amount: prepayInvestment });
      }
      if (extra > 0) {
        investCashFlows.push({ period, date: baseRow.date, amount: extra });
        if (!firstPrepaymentDate) firstPrepaymentDate = baseRow.date;
      }
      accounting.push({
        period,
        date: baseRow.date,
        baselineScheduledCash: baseRow.scheduledRepayment,
        plannedExtraCash: extra,
        plannedBudget,
        prepayScheduledMortgagePaid: prepayRow ? prepayRow.scheduledRepayment : 0,
        prepayExtraPrincipalPaid: prepayRow ? prepayRow.extraRepayment : 0,
        prepayInvestmentContribution: prepayInvestment,
        prepayMortgageOutflow,
        identityDifference: plannedBudget - prepayMortgageOutflow - prepayInvestment
      });
    }
    return { ok: true, plannedExtra, prepayInvestmentCashFlows, investCashFlows, accounting, firstPrepaymentDate };
  }

  function valuePaths(cash, fee, horizon, annualReturnDecimal) {
    let prepayInvestmentFutureValue = 0;
    let investEndingValue = 0;
    for (const cf of cash.prepayInvestmentCashFlows || []) {
      prepayInvestmentFutureValue += futureValue(cf.amount, cf.date, horizon, annualReturnDecimal);
    }
    for (const cf of cash.investCashFlows || []) {
      investEndingValue += futureValue(cf.amount, cf.date, horizon, annualReturnDecimal);
    }
    const feeFutureValue = fee > 0 && cash.firstPrepaymentDate
      ? futureValue(fee, cash.firstPrepaymentDate, horizon, annualReturnDecimal)
      : 0;
    const prepayEndingNetValue = prepayInvestmentFutureValue - feeFutureValue;
    const pathDifference = prepayEndingNetValue - investEndingValue;
    return {
      prepayInvestmentFutureValue,
      feeFutureValue,
      prepayEndingNetValue,
      investEndingValue,
      pathDifference
    };
  }

  function solverPoints() {
    const points = [];
    for (let n = -99; n <= 100; n += 1) points.push(n / 100);
    for (let n = 105; n <= 500; n += 5) points.push(n / 100);
    return points;
  }

  function solveBreakEven(cash, fee, horizon, balance) {
    const currencyTolerance = Math.max(0.01, finite(balance) * 1e-8);
    const points = solverPoints();
    let prev = null;
    for (const r of points) {
      const value = valuePaths(cash, fee, horizon, r).pathDifference;
      if (!Number.isFinite(value)) return { value: null, status: 'non-finite' };
      if (Math.abs(value) <= currencyTolerance) return { value: r, status: 'solved' };
      if (prev && ((prev.value < 0 && value > 0) || (prev.value > 0 && value < 0))) {
        let lo = prev.r, hi = r, fLo = prev.value;
        for (let iteration = 0; iteration < 100; iteration += 1) {
          const mid = (lo + hi) / 2;
          const fMid = valuePaths(cash, fee, horizon, mid).pathDifference;
          if (!Number.isFinite(fMid)) return { value: null, status: 'non-finite' };
          if (Math.abs(fMid) <= currencyTolerance || (hi - lo) < 1e-8) return { value: mid, status: 'solved' };
          if ((fLo < 0 && fMid > 0) || (fLo > 0 && fMid < 0)) hi = mid;
          else { lo = mid; fLo = fMid; }
        }
        return { value: (lo + hi) / 2, status: 'solved' };
      }
      prev = { r, value };
    }
    return { value: null, status: 'no-crossing' };
  }

  function calculate(input = {}) {
    const normalized = {
      ...input,
      country: input.country || 'OTHER',
      currency: input.currency || 'USD',
      paymentFrequency: input.paymentFrequency || 'monthly',
      rateMode: input.rateMode || 'fixed',
      extraMode: input.extraMode || 'lump',
      startDate: toIsoDate(input.startDate)
    };
    const validationError = validate(normalized);
    if (validationError) return { ok: false, version: VERSION, error: validationError, input: normalized };

    const { baseline, common } = baselineFor(normalized);
    if (!baseline.ok) return { ok: false, version: VERSION, error: baseline.error || 'baseline', input: normalized, common, baseline };

    const fee = Math.max(0, finite(normalized.prepaymentCharge));
    const assumedRaw = normalized.assumedInvestmentReturnPct;
    const hasAssumed = assumedRaw !== '' && assumedRaw != null && Number.isFinite(Number(assumedRaw));
    const assumedReturnPct = hasAssumed ? Number(assumedRaw) : null;

    if (finite(normalized.extraAmount) === 0) {
      const zeroRows = (baseline.ledger || []).map(row => ({
        period: row.period,
        date: row.date,
        baselineScheduledCash: row.scheduledRepayment,
        plannedExtraCash: 0,
        plannedBudget: row.scheduledRepayment,
        prepayScheduledMortgagePaid: row.scheduledRepayment,
        prepayExtraPrincipalPaid: 0,
        prepayInvestmentContribution: 0,
        prepayMortgageOutflow: row.scheduledRepayment,
        identityDifference: 0
      }));
      return {
        ok: true,
        version: VERSION,
        input: {
          country: normalized.country, currency: normalized.currency, balance: finite(normalized.balance),
          annualRatePct: finite(normalized.annualRatePct), remainingYears: finite(normalized.remainingYears),
          remainingMonths: finite(normalized.remainingMonths), paymentFrequency: normalized.paymentFrequency,
          useCurrentPayment: Boolean(normalized.useCurrentPayment),
          currentPayment: normalized.useCurrentPayment ? finite(normalized.currentPayment) : null,
          extraMode: normalized.extraMode, extraAmount: 0,
          extraFrequency: normalized.extraMode === 'recurring' ? normalized.extraFrequency : null,
          extraStartPeriod: normalized.extraMode === 'recurring' ? Math.max(1, Math.round(finite(normalized.extraStartPeriod, 1))) : null,
          customIntervalMonths: normalized.extraMode === 'recurring' && normalized.extraFrequency === 'custom' ? finite(normalized.customIntervalMonths, 3) : null,
          lumpSumPeriod: normalized.extraMode === 'lump' ? Math.round(finite(normalized.lumpSumPeriod, 1)) : null,
          prepaymentCharge: fee, assumedInvestmentReturnPct: assumedReturnPct, startDate: normalized.startDate
        },
        common,
        baseline: { payment: baseline.payment, payoffPeriods: baseline.payoffPeriods, payoffDate: baseline.payoffDate, totalInterest: baseline.totalInterest, ledger: baseline.ledger },
        prepay: {
          mortgagePayment: baseline.payment, payoffPeriods: baseline.payoffPeriods, payoffDate: baseline.payoffDate,
          totalInterest: baseline.totalInterest, interestAvoided: 0, periodsSaved: 0, mortgageLedger: baseline.ledger,
          investmentCashFlows: [], endingInvestmentValue: hasAssumed ? 0 : null, feeFutureValue: hasAssumed ? 0 : null, endingNetValue: hasAssumed ? 0 : null
        },
        invest: { investmentCashFlows: [], endingValue: hasAssumed ? 0 : null },
        comparison: {
          applicable: false, commonHorizonDate: baseline.payoffDate, assumedReturnPct, pathDifference: hasAssumed ? 0 : null,
          higherModeledPath: hasAssumed ? 'approximately-equal' : null, breakEvenReturnPct: null, breakEvenStatus: 'no-extra'
        },
        accounting: { rows: zeroRows, maxIdentityError: 0, firstPrepaymentDate: null },
        messages: ['no-extra']
      };
    }

    if (normalized.extraMode === 'lump') {
      const p = Math.round(finite(normalized.lumpSumPeriod, 1));
      if (p < 1 || p > baseline.payoffPeriods) {
        return { ok: false, version: VERSION, error: 'lump-period', input: normalized, common, baseline };
      }
    }

    const prepayMortgage = prepayScheduleFor(normalized, common, baseline);
    if (!prepayMortgage.ok) return { ok: false, version: VERSION, error: prepayMortgage.error || 'prepay', input: normalized, common, baseline, prepayMortgage };

    const cash = makeCashFlows(normalized, baseline, prepayMortgage);
    if (!cash.ok) return { ok: false, version: VERSION, error: cash.error, input: normalized, common, baseline, prepayMortgage };

    const horizon = baseline.payoffDate;
    const breakEven = solveBreakEven(cash, fee, horizon, normalized.balance);
    const assumedValues = hasAssumed ? valuePaths(cash, fee, horizon, assumedReturnPct / 100) : null;
    const interestAvoided = baseline.totalInterest - prepayMortgage.totalInterest;
    const periodsSaved = Math.max(0, baseline.payoffPeriods - prepayMortgage.payoffPeriods);
    const pathTolerance = Math.max(0.01, finite(normalized.balance) * 1e-8);
    let higherModeledPath = null;
    if (assumedValues) {
      if (Math.abs(assumedValues.pathDifference) <= pathTolerance) higherModeledPath = 'approximately-equal';
      else higherModeledPath = assumedValues.pathDifference > 0 ? 'prepay' : 'invest';
    }

    const maxIdentityError = cash.accounting.reduce((m, row) => Math.max(m, Math.abs(row.identityDifference)), 0);
    return {
      ok: true,
      version: VERSION,
      input: {
        country: normalized.country,
        currency: normalized.currency,
        balance: finite(normalized.balance),
        annualRatePct: finite(normalized.annualRatePct),
        remainingYears: finite(normalized.remainingYears),
        remainingMonths: finite(normalized.remainingMonths),
        paymentFrequency: normalized.paymentFrequency,
        useCurrentPayment: Boolean(normalized.useCurrentPayment),
        currentPayment: normalized.useCurrentPayment ? finite(normalized.currentPayment) : null,
        extraMode: normalized.extraMode,
        extraAmount: finite(normalized.extraAmount),
        extraFrequency: normalized.extraMode === 'recurring' ? normalized.extraFrequency : null,
        extraStartPeriod: normalized.extraMode === 'recurring' ? Math.max(1, Math.round(finite(normalized.extraStartPeriod, 1))) : null,
        customIntervalMonths: normalized.extraMode === 'recurring' && normalized.extraFrequency === 'custom' ? finite(normalized.customIntervalMonths, 3) : null,
        lumpSumPeriod: normalized.extraMode === 'lump' ? Math.round(finite(normalized.lumpSumPeriod, 1)) : null,
        prepaymentCharge: fee,
        assumedInvestmentReturnPct: assumedReturnPct,
        startDate: normalized.startDate
      },
      common,
      baseline: {
        payment: baseline.payment,
        payoffPeriods: baseline.payoffPeriods,
        payoffDate: baseline.payoffDate,
        totalInterest: baseline.totalInterest,
        ledger: baseline.ledger
      },
      prepay: {
        mortgagePayment: prepayMortgage.payment,
        payoffPeriods: prepayMortgage.payoffPeriods,
        payoffDate: prepayMortgage.payoffDate,
        totalInterest: prepayMortgage.totalInterest,
        interestAvoided,
        periodsSaved,
        mortgageLedger: prepayMortgage.ledger,
        investmentCashFlows: cash.prepayInvestmentCashFlows,
        endingInvestmentValue: assumedValues ? assumedValues.prepayInvestmentFutureValue : null,
        feeFutureValue: assumedValues ? assumedValues.feeFutureValue : null,
        endingNetValue: assumedValues ? assumedValues.prepayEndingNetValue : null
      },
      invest: {
        investmentCashFlows: cash.investCashFlows,
        endingValue: assumedValues ? assumedValues.investEndingValue : null
      },
      comparison: {
        applicable: true,
        commonHorizonDate: horizon,
        assumedReturnPct,
        pathDifference: assumedValues ? assumedValues.pathDifference : null,
        higherModeledPath,
        breakEvenReturnPct: breakEven.value == null ? null : breakEven.value * 100,
        breakEvenStatus: breakEven.status
      },
      accounting: {
        rows: cash.accounting,
        maxIdentityError,
        firstPrepaymentDate: cash.firstPrepaymentDate
      },
      messages: []
    };
  }

  window.CarrowmontMdc1aCore = {
    VERSION,
    calculate,
    futureValue,
    yearFraction,
    buildDueSchedule,
    makePlannedExtraMap,
    valuePaths,
    solveBreakEven
  };
})();
