(() => {
  'use strict';

  const M = window.CarrowmontMortgageCore;
  const VERSION = '1.0.0';
  const EPS = 1e-8;
  const MONEY_EPS = 0.01;
  const MAX_RATE = 50;
  const LADDER_DELTAS = Object.freeze([0.25, 0.50, 1.00, 2.00, 3.00]);
  const FREQUENCIES = new Set(['monthly','biweekly','fortnightly','weekly']);

  function finite(value, fallback = NaN) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function close(a, b, tolerance = EPS) { return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance; }

  function emptyBudget() {
    return {
      applicable:false,
      monthlyTakeHomeIncome:null,
      monthlyEssentialOutgoings:null,
      availableForMortgage:null,
      bufferToday:null,
      customBuffer:null,
      customBufferChange:null,
      currentMortgageSharePct:null,
      stressedMortgageSharePct:null,
      zeroBufferRatePct:null,
      zeroBufferStatus:'not-applicable'
    };
  }

  function normalize(input = {}) {
    const frequency = String(input.paymentFrequency || 'monthly');
    const balance = finite(input.balance);
    const annualRatePct = finite(input.annualRatePct);
    const remainingYears = finite(input.remainingYears);
    const remainingMonths = finite(input.remainingMonths);
    const useCurrentPayment = Boolean(input.useCurrentPayment);
    const currentPayment = useCurrentPayment ? finite(input.currentPayment) : null;
    const monthsUntilRateChange = finite(input.monthsUntilRateChange);
    const stressedAnnualRatePct = finite(input.stressedAnnualRatePct);
    const householdBudgetEnabled = Boolean(input.householdBudgetEnabled);
    const monthlyTakeHomeIncome = input.monthlyTakeHomeIncome === '' || input.monthlyTakeHomeIncome == null ? null : finite(input.monthlyTakeHomeIncome);
    const monthlyEssentialOutgoings = input.monthlyEssentialOutgoings === '' || input.monthlyEssentialOutgoings == null ? null : finite(input.monthlyEssentialOutgoings);
    return {
      country:String(input.country || 'OTHER'),
      currency:String(input.currency || 'USD'),
      balance,
      annualRatePct,
      remainingYears,
      remainingMonths,
      paymentFrequency:frequency,
      useCurrentPayment,
      currentPayment,
      monthsUntilRateChange,
      stressedAnnualRatePct,
      householdBudgetEnabled,
      monthlyTakeHomeIncome,
      monthlyEssentialOutgoings,
      rateMode:String(input.rateMode || 'fixed'),
      startDate:String(input.startDate || new Date().toISOString().slice(0,10))
    };
  }

  function validationError(i) {
    if (!(i.balance > 0)) return 'balance';
    if (!Number.isFinite(i.annualRatePct) || i.annualRatePct < 0 || i.annualRatePct > MAX_RATE) return 'current-rate';
    if (!Number.isFinite(i.remainingYears) || !Number.isFinite(i.remainingMonths) || i.remainingYears < 0 || i.remainingMonths < 0 || i.remainingMonths > 11 || (i.remainingYears === 0 && i.remainingMonths === 0)) return 'term';
    if (!FREQUENCIES.has(i.paymentFrequency)) return 'frequency';
    const m = M.periodsPerYear(i.paymentFrequency);
    const totalPeriods = Math.round(i.remainingYears * m + i.remainingMonths * m / 12);
    if (!(totalPeriods > 0) || totalPeriods > 100 * m) return 'term';
    const convention = M.paymentConvention(i.country, i.rateMode);
    const currentPeriodicRate = M.periodicRate(i.annualRatePct, i.paymentFrequency, convention);
    if (i.useCurrentPayment) {
      if (!(i.currentPayment > 0)) return 'current-payment';
      if (i.currentPayment <= i.balance * currentPeriodicRate + EPS) return 'negative-amortization';
    }
    if (!Number.isFinite(i.monthsUntilRateChange) || i.monthsUntilRateChange < 0) return 'reset-timing';
    const totalMonths = i.remainingYears * 12 + i.remainingMonths;
    if (i.monthsUntilRateChange >= totalMonths) return 'reset-after-term';
    if (!Number.isFinite(i.stressedAnnualRatePct) || i.stressedAnnualRatePct < 0 || i.stressedAnnualRatePct > MAX_RATE) return 'stressed-rate';
    if (i.monthlyTakeHomeIncome != null && (!Number.isFinite(i.monthlyTakeHomeIncome) || i.monthlyTakeHomeIncome < 0)) return 'income';
    if (i.monthlyEssentialOutgoings != null && (!Number.isFinite(i.monthlyEssentialOutgoings) || i.monthlyEssentialOutgoings < 0)) return 'expenses';
    return null;
  }

  function monthlyEquivalent(payment, periodsPerYear) {
    return Number(payment) * periodsPerYear / 12;
  }

  function projectToReset(i, current) {
    const modeledPeriods = clamp(Math.round(i.monthsUntilRateChange * current.periodsPerYear / 12), 0, current.totalPeriods - 1);
    const modeledMonths = modeledPeriods * 12 / current.periodsPerYear;
    if (modeledPeriods === 0) {
      return {
        requestedMonths:i.monthsUntilRateChange,
        modeledPeriods:0,
        modeledMonths:0,
        projectedBalance:i.balance,
        remainingPeriods:current.totalPeriods,
        paidOffBeforeReset:false,
        payoffPeriods:null
      };
    }
    const sim = M.simulate({
      balance:i.balance,
      annualRatePct:i.annualRatePct,
      paymentFrequency:i.paymentFrequency,
      convention:current.convention,
      periods:current.totalPeriods,
      payment:current.paymentToday,
      startDate:i.startDate
    });
    if (!sim.ledger?.length) return { error:sim.error || 'projection' };
    if (sim.payoffPeriods <= modeledPeriods && sim.finalBalance <= EPS) {
      return {
        requestedMonths:i.monthsUntilRateChange,
        modeledPeriods,
        modeledMonths,
        projectedBalance:0,
        remainingPeriods:Math.max(0, current.totalPeriods - modeledPeriods),
        paidOffBeforeReset:true,
        payoffPeriods:sim.payoffPeriods
      };
    }
    const row = sim.ledger[modeledPeriods - 1];
    if (!row) return { error:'projection' };
    return {
      requestedMonths:i.monthsUntilRateChange,
      modeledPeriods,
      modeledMonths,
      projectedBalance:row.closingBalance,
      remainingPeriods:Math.max(1, current.totalPeriods - modeledPeriods),
      paidOffBeforeReset:false,
      payoffPeriods:null
    };
  }

  function budgetForScenario(monthlyPayment, budgetBase) {
    if (!budgetBase.applicable) return null;
    const buffer = budgetBase.monthlyTakeHomeIncome - budgetBase.monthlyEssentialOutgoings - monthlyPayment;
    const share = monthlyPayment / budgetBase.monthlyTakeHomeIncome * 100;
    return {
      monthlyBuffer:buffer,
      bufferChangeFromToday:buffer - budgetBase.bufferToday,
      mortgageSharePct:share,
      state:Math.abs(buffer) <= MONEY_EPS ? 'approximately-break-even' : buffer > 0 ? 'monthly-surplus-remains' : 'modeled-monthly-shortfall'
    };
  }

  function solveZeroBufferRate(resetBalance, remainingPeriods, frequency, convention, targetPayment) {
    if (!(targetPayment > 0) || !(resetBalance > 0) || !(remainingPeriods > 0)) return { rate:null, status:'not-applicable' };
    const paymentAt = rate => M.scheduledPayment(resetBalance, M.periodicRate(rate, frequency, convention), remainingPeriods);
    const p0 = paymentAt(0);
    if (p0 > targetPayment + MONEY_EPS) return { rate:null, status:'no-nonnegative-rate' };
    const pMax = paymentAt(MAX_RATE);
    if (pMax <= targetPayment + MONEY_EPS) return { rate:null, status:'above-modeled-ceiling' };
    let lo = 0, hi = MAX_RATE;
    for (let n = 0; n < 90; n += 1) {
      const mid = (lo + hi) / 2;
      if (paymentAt(mid) <= targetPayment) lo = mid;
      else hi = mid;
    }
    return { rate:(lo + hi) / 2, status:'found' };
  }

  function calculate(rawInput = {}) {
    if (!M) return { ok:false, version:VERSION, error:'mortgage-core-unavailable', messages:[] };
    const input = normalize(rawInput);
    const error = validationError(input);
    if (error) return { ok:false, version:VERSION, error, input, budget:emptyBudget(), messages:[] };

    const periodsPerYear = M.periodsPerYear(input.paymentFrequency);
    const totalPeriods = Math.round(input.remainingYears * periodsPerYear + input.remainingMonths * periodsPerYear / 12);
    const convention = M.paymentConvention(input.country, input.rateMode);
    const currentPeriodicRate = M.periodicRate(input.annualRatePct, input.paymentFrequency, convention);
    const formulaPayment = M.scheduledPayment(input.balance, currentPeriodicRate, totalPeriods);
    const paymentToday = input.useCurrentPayment ? input.currentPayment : formulaPayment;
    const current = {
      convention,
      periodsPerYear,
      totalPeriods,
      formulaPayment,
      paymentToday,
      monthlyEquivalentToday:monthlyEquivalent(paymentToday, periodsPerYear)
    };

    const reset = projectToReset(input, current);
    if (reset.error) return { ok:false, version:VERSION, error:reset.error, input, current, budget:emptyBudget(), messages:[] };

    const messages = [];
    if (Math.abs(reset.modeledMonths - input.monthsUntilRateChange) > 1e-9) {
      messages.push(`The requested rate-change timing was snapped to the nearest scheduled repayment checkpoint: ${reset.modeledPeriods} repayment periods (${reset.modeledMonths.toFixed(2)} modeled months).`);
    }
    if (input.useCurrentPayment) messages.push('A current-payment override is being used for the pre-reset projection and for comparison with what you pay today. The pure rate effect still uses a same-rate reference payment at reset.');

    if (reset.paidOffBeforeReset) {
      const budget = emptyBudget();
      return {
        ok:true,
        version:VERSION,
        input,
        current,
        reset:{...reset,sameRateReferencePayment:0,sameRateMonthlyEquivalent:0},
        customScenario:{annualRatePct:input.stressedAnnualRatePct,rateChangePctPoints:input.stressedAnnualRatePct-input.annualRatePct,payment:0,monthlyEquivalent:0,rateOnlyChange:0,todayChange:-paymentToday,rateOnlyPctChange:0,annualCashFlowChange:-current.monthlyEquivalentToday*12,budget:null},
        ladder:[],
        budget,
        messages:[...messages,'The modeled loan is repaid before the entered higher-rate checkpoint, so no stressed mortgage payment applies to this modeled loan.'],
        paidOffBeforeReset:true
      };
    }

    const sameRateReferencePayment = M.scheduledPayment(reset.projectedBalance, currentPeriodicRate, reset.remainingPeriods);
    const sameRateMonthlyEquivalent = monthlyEquivalent(sameRateReferencePayment, periodsPerYear);
    const resetOut = {...reset,sameRateReferencePayment,sameRateMonthlyEquivalent};

    const budgetApplicable = input.householdBudgetEnabled && input.monthlyTakeHomeIncome != null && input.monthlyTakeHomeIncome > 0 && input.monthlyEssentialOutgoings != null && input.monthlyEssentialOutgoings >= 0;
    let budget = emptyBudget();
    if (budgetApplicable) {
      const availableForMortgage = input.monthlyTakeHomeIncome - input.monthlyEssentialOutgoings;
      const bufferToday = availableForMortgage - current.monthlyEquivalentToday;
      const currentMortgageSharePct = current.monthlyEquivalentToday / input.monthlyTakeHomeIncome * 100;
      budget = {
        applicable:true,
        monthlyTakeHomeIncome:input.monthlyTakeHomeIncome,
        monthlyEssentialOutgoings:input.monthlyEssentialOutgoings,
        availableForMortgage,
        bufferToday,
        customBuffer:null,
        customBufferChange:null,
        currentMortgageSharePct,
        stressedMortgageSharePct:null,
        zeroBufferRatePct:null,
        zeroBufferStatus:'pending'
      };
      const targetPayment = availableForMortgage * 12 / periodsPerYear;
      if (availableForMortgage <= 0) {
        budget.zeroBufferStatus='non-mortgage-outgoings-use-all-income';
      } else {
        const solved = solveZeroBufferRate(reset.projectedBalance, reset.remainingPeriods, input.paymentFrequency, convention, targetPayment);
        budget.zeroBufferRatePct = solved.rate;
        budget.zeroBufferStatus = solved.status;
      }
    }

    function scenario(annualRatePct, deltaPctPoints = annualRatePct - input.annualRatePct) {
      const periodic = M.periodicRate(annualRatePct, input.paymentFrequency, convention);
      const payment = M.scheduledPayment(reset.projectedBalance, periodic, reset.remainingPeriods);
      const monthlyEq = monthlyEquivalent(payment, periodsPerYear);
      const rateOnlyChange = payment - sameRateReferencePayment;
      const todayChange = payment - paymentToday;
      const rateOnlyPctChange = Math.abs(sameRateReferencePayment) <= EPS ? 0 : rateOnlyChange / sameRateReferencePayment * 100;
      const annualCashFlowChange = (monthlyEq - sameRateMonthlyEquivalent) * 12;
      return {
        annualRatePct,
        rateChangePctPoints:deltaPctPoints,
        payment,
        monthlyEquivalent:monthlyEq,
        rateOnlyChange,
        todayChange,
        rateOnlyPctChange,
        annualCashFlowChange,
        budget:budgetForScenario(monthlyEq, budget)
      };
    }

    const customScenario = scenario(input.stressedAnnualRatePct);
    const ladder = LADDER_DELTAS
      .map(delta => ({delta,rate:input.annualRatePct + delta}))
      .filter(x => x.rate <= MAX_RATE + EPS)
      .map(x => ({deltaPctPoints:x.delta,...scenario(x.rate,x.delta)}));

    if (budget.applicable) {
      budget.customBuffer = customScenario.budget.monthlyBuffer;
      budget.customBufferChange = customScenario.budget.bufferChangeFromToday;
      budget.stressedMortgageSharePct = customScenario.budget.mortgageSharePct;
    }

    return {
      ok:true,
      version:VERSION,
      input,
      current,
      reset:resetOut,
      customScenario,
      ladder,
      budget,
      messages,
      paidOffBeforeReset:false,
      tolerance:MONEY_EPS
    };
  }

  window.CarrowmontMdc1cCore = {
    VERSION,
    LADDER_DELTAS,
    MAX_RATE,
    calculate,
    monthlyEquivalent,
    solveZeroBufferRate,
    close
  };
})();
