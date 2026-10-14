(() => {
  'use strict';
  const M = window.CarrowmontMortgageCore;
  const C = window.CarrowmontMdc1bCore;
  const L = window.CarrowmontLocale;
  const P = window.CarrowmontMortgageDecisionProfile;
  const $ = id => document.getElementById(id);
  const qsa = s => [...document.querySelectorAll(s)];
  let lastResult = null;
  let profileDismissed = false;

  const els = {
    regionSelect: $('regionSelect'), currencySelect: $('currencySelect'), localeCurrent: $('localeCurrent'), localeMenu: $('localeMenu'),
    balance: $('balance'), currentRate: $('currentRate'), remainingYears: $('remainingYears'), remainingMonths: $('remainingMonths'), paymentFrequency: $('paymentFrequency'),
    newRate: $('newRate'), proposedYears: $('proposedYears'), proposedMonths: $('proposedMonths'), switchingFees: $('switchingFees'), exitCharge: $('exitCharge'), cashback: $('cashback'), feePaymentMode: $('feePaymentMode'),
    useHoldingPeriod: $('useHoldingPeriod'), holdingFields: $('holdingFields'), holdingYears: $('holdingYears'), holdingMonths: $('holdingMonths'), validationMessage: $('validationMessage'),
    breakEvenValue: $('breakEvenValue'), breakEvenText: $('breakEvenText'), currentPaymentResult: $('currentPaymentResult'), rateOnlyPaymentResult: $('rateOnlyPaymentResult'), proposedPaymentResult: $('proposedPaymentResult'), paymentChangeResult: $('paymentChangeResult'), holdingResultLabel: $('holdingResultLabel'), holdingResult: $('holdingResult'), lifetimeResult: $('lifetimeResult'),
    termWarning: $('termWarning'), termWarningTitle: $('termWarningTitle'), termWarningText: $('termWarningText'), switchingFeesResult: $('switchingFeesResult'), exitChargeResult: $('exitChargeResult'), cashbackResult: $('cashbackResult'), netSwitchingCostResult: $('netSwitchingCostResult'), feeModeNote: $('feeModeNote'),
    profileBanner: $('profileBanner'), profileSummary: $('profileSummary'), reportStatus: $('reportDownloadStatus'), advantageChartPlot: $('advantageChartPlot'), chartHeadline: $('chartHeadline'), chartSummary: $('chartSummary')
  };

  function num(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
  function money(v, decimals = 0) { if (v == null || !Number.isFinite(Number(v))) return '—'; return L.formatMoney(Number(v), { maximumFractionDigits: decimals, minimumFractionDigits: decimals }); }
  function pct(v) { return v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(2)}%`; }
  function dateLabel(iso) { if (!iso) return '—'; const d = new Date(`${iso}T00:00:00Z`); try { return new Intl.DateTimeFormat(L.getLocale(), { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d); } catch (_) { return iso; } }
  function duration(periods) { return M.durationLabel(Math.max(0, num(periods)), els.paymentFrequency.value); }
  function twoWeekLabel() { const p = L.getProfile(); return p.twoWeekLabel === 'fortnightly' ? 'Fortnightly' : p.twoWeekLabel === 'biweekly' ? 'Biweekly' : 'Every 2 Weeks'; }

  function identity(region = L.getRegion()) {
    const map = {
      IN: { product: 'Home Loan Balance Transfer Break-Even', title: 'When does a home loan balance transfer actually break even?', breadcrumb: 'Balance Transfer Break-Even', balance: 'Outstanding home loan balance', currentTerm: 'Remaining loan tenure - years', proposedTerm: 'Proposed new tenure - years', exit: 'Existing lender foreclosure / prepayment charge' },
      US: { product: 'Mortgage Refinance Break-Even', title: 'When does refinancing your mortgage actually break even?', breadcrumb: 'Refinance Break-Even', balance: 'Outstanding mortgage balance', currentTerm: 'Remaining mortgage term - years', proposedTerm: 'Proposed new mortgage term - years', exit: 'Existing lender prepayment / payoff charge' },
      CA: { product: 'Mortgage Refinance Break-Even', title: 'When does refinancing your mortgage actually break even?', breadcrumb: 'Refinance Break-Even', balance: 'Outstanding mortgage balance', currentTerm: 'Remaining amortization - years', proposedTerm: 'Proposed new amortization - years', exit: 'Existing lender prepayment / discharge charge' },
      GB: { product: 'Remortgage / Product Switch Break-Even', title: 'When does a remortgage or product switch actually break even?', breadcrumb: 'Remortgage Break-Even', balance: 'Outstanding mortgage balance', currentTerm: 'Remaining mortgage term - years', proposedTerm: 'Proposed new mortgage term - years', exit: 'Existing lender Early Repayment Charge (ERC)' },
      IE: { product: 'Mortgage Refinance / Switch Break-Even', title: 'When does refinancing or switching your mortgage actually break even?', breadcrumb: 'Mortgage Switch Break-Even', balance: 'Outstanding mortgage balance', currentTerm: 'Remaining mortgage term - years', proposedTerm: 'Proposed new mortgage term - years', exit: 'Existing lender early repayment / exit charge' },
      AU: { product: 'Home Loan Refinance Break-Even', title: 'When does refinancing your home loan actually break even?', breadcrumb: 'Refinance Break-Even', balance: 'Outstanding home loan balance', currentTerm: 'Remaining loan term - years', proposedTerm: 'Proposed new loan term - years', exit: 'Existing lender break / early repayment charge' },
      NZ: { product: 'Home Loan Refinance Break-Even', title: 'When does refinancing your home loan actually break even?', breadcrumb: 'Refinance Break-Even', balance: 'Outstanding home loan balance', currentTerm: 'Remaining loan term - years', proposedTerm: 'Proposed new loan term - years', exit: 'Existing lender break / early repayment charge' }
    };
    return map[region] || { product: 'Mortgage / Home Loan Refinance Break-Even', title: 'When does refinancing a mortgage or home loan actually break even?', breadcrumb: 'Refinance Break-Even', balance: 'Outstanding mortgage / home loan balance', currentTerm: 'Remaining repayment term - years', proposedTerm: 'Proposed new repayment term - years', exit: 'Existing lender exit / early-repayment charge' };
  }

  function populateLocale() {
    const regions = Object.entries(L.regions).sort((a, b) => { if (a[0] === 'OTHER') return 1; if (b[0] === 'OTHER') return -1; return a[1].label.localeCompare(b[1].label, 'en'); });
    els.regionSelect.innerHTML = regions.map(([code, p]) => `<option value="${code}">${p.label}</option>`).join('');
    els.currencySelect.innerHTML = Object.entries(L.currencies).sort((a, b) => a[0].localeCompare(b[0])).map(([code, c]) => `<option value="${code}">${code} · ${c.label}</option>`).join('');
  }

  function syncLocaleUi() {
    const id = identity();
    els.regionSelect.value = L.getRegion(); els.currencySelect.value = L.getCurrency(); els.localeCurrent.textContent = `${L.getProfile().label} · ${L.getCurrency()}`;
    $('productLabel').textContent = id.product; $('footerProductName').textContent = id.product; $('footerProductBottom').textContent = id.product; $('toolTitle').textContent = id.title; $('breadcrumbCurrent').textContent = id.breadcrumb;
    $('balanceLabel').textContent = id.balance; $('currentTermLabel').textContent = id.currentTerm; $('proposedTermLabel').textContent = id.proposedTerm; $('exitChargeLabel').textContent = id.exit;
    qsa('.currency-prefix').forEach(n => n.textContent = L.currencySymbol()); $('biweeklyOption').textContent = twoWeekLabel(); refreshProfileBanner();
  }

  function readInput() {
    return {
      country: L.getRegion(), currency: L.getCurrency(), balance: num(els.balance.value, NaN), currentRatePct: num(els.currentRate.value, NaN), remainingYears: num(els.remainingYears.value), remainingMonths: num(els.remainingMonths.value), paymentFrequency: els.paymentFrequency.value,
      newRatePct: num(els.newRate.value, NaN), proposedYears: num(els.proposedYears.value), proposedMonths: num(els.proposedMonths.value), switchingFees: num(els.switchingFees.value, NaN), exitCharge: num(els.exitCharge.value, NaN), cashback: num(els.cashback.value, NaN), feePaymentMode: els.feePaymentMode.value,
      useHoldingPeriod: els.useHoldingPeriod.checked, holdingYears: num(els.holdingYears.value), holdingMonths: num(els.holdingMonths.value), startDate: new Date().toISOString().slice(0, 10)
    };
  }

  const errors = {
    balance: 'Enter an outstanding balance greater than zero.', 'current-rate': 'Enter a current annual interest rate between 0% and 50%.', 'new-rate': 'Enter a new offered annual interest rate between 0% and 50%.', 'current-term': 'Enter a remaining term of at least one month and no more than 100 years.', 'proposed-term': 'Enter a proposed new term of at least one month and no more than 100 years.', frequency: 'Choose a supported repayment frequency.', 'switching-fees': 'Enter switching fees of zero or more.', 'exit-charge': 'Enter an exit / early-repayment charge of zero or more.', cashback: 'Enter cashback of zero or more.', 'fee-mode': 'Choose whether switching fees are paid upfront or financed.', 'holding-period': 'Enter an expected holding period of at least one month and no more than 100 years.', 'negative-amortization': 'The modeled repayment would not reduce principal under these assumptions.', 'safety-limit': 'The modeled loan did not pay off within the supported safety horizon.'
  };

  function showError(code) { els.validationMessage.textContent = errors[code] || 'Review the entered values and try again.'; els.validationMessage.hidden = false; }
  function clearError() { els.validationMessage.hidden = true; els.validationMessage.textContent = ''; }
  function statusMoney(value, positiveLabel = 'Modeled saving', negativeLabel = 'Modeled additional cost') { const tol = lastResult?.tolerance || 0.01; if (Math.abs(value) <= tol) return 'Approximately break-even'; return value > 0 ? `${positiveLabel} ${money(value)}` : `${negativeLabel} ${money(Math.abs(value))}`; }

  function renderBreakEven(r) {
    const c = r.comparison;
    if (c.durableBreakEvenPeriod === 0) {
      els.breakEvenValue.textContent = 'Immediate';
      els.breakEvenText.textContent = 'The refinance path is durably non-negative at completion under the entered assumptions.';
    } else if (c.durableBreakEvenPeriod == null) {
      els.breakEvenValue.textContent = 'No durable break-even';
      els.breakEvenText.textContent = c.temporaryCrossingPeriod == null ? 'Switching costs are not durably recovered within the modeled loan horizons.' : `The modeled advantage becomes non-negative temporarily around month ${c.temporaryCrossingMonths}, but later reverses. Carrowmont does not label that a durable break-even.`;
    } else {
      const approx = r.input.paymentFrequency === 'monthly' ? `${c.durableBreakEvenMonths} months` : `About ${c.durableBreakEvenMonths} months`;
      els.breakEvenValue.textContent = approx;
      els.breakEvenText.textContent = r.input.paymentFrequency === 'monthly' ? `Switching costs are durably recovered around repayment month ${c.durableBreakEvenPeriod}.` : `Switching costs are durably recovered around repayment cycle ${c.durableBreakEvenPeriod}.`;
    }
  }

  function renderWarning(r) {
    const c = r.comparison;
    els.termWarning.hidden = false; els.termWarning.classList.remove('strong-warning');
    if (c.lowerPaymentHigherLifetimeCost) {
      els.termWarning.classList.add('strong-warning'); els.termWarningTitle.textContent = 'Lower payment, higher lifetime borrowing cost'; els.termWarningText.textContent = 'The modeled payment is lower, but the modeled lifetime borrowing cost is higher under these assumptions. A lower repayment is not being labeled a saving.'; return;
    }
    if (c.termChangePeriods > 0) {
      els.termWarningTitle.textContent = 'The proposed loan runs longer'; els.termWarningText.textContent = `Part of a lower payment may come from borrowing for longer, not only from the lower rate. The proposed term is ${duration(c.termChangePeriods)} longer.`; return;
    }
    if (c.termChangePeriods < 0) {
      els.termWarningTitle.textContent = 'The proposed loan finishes sooner'; els.termWarningText.textContent = `The proposed repayment may be higher because the modeled loan is ${duration(Math.abs(c.termChangePeriods))} shorter. Review payment affordability separately from this borrowing-cost comparison.`; return;
    }
    els.termWarning.hidden = true;
  }

  function setTable(r) {
    $('tableCurrentPrincipal').textContent = money(r.currentLoan.balance); $('tableRateOnlyPrincipal').textContent = money(r.rateOnlySameTerm.principal); $('tableProposedPrincipal').textContent = money(r.proposedLoan.principal);
    $('tableCurrentRate').textContent = pct(r.currentLoan.rate); $('tableRateOnlyRate').textContent = pct(r.rateOnlySameTerm.rate); $('tableProposedRate').textContent = pct(r.proposedLoan.rate);
    $('tableCurrentTerm').textContent = duration(r.currentLoan.termPeriods); $('tableRateOnlyTerm').textContent = duration(r.rateOnlySameTerm.termPeriods); $('tableProposedTerm').textContent = duration(r.proposedLoan.termPeriods);
    $('tableCurrentPayment').textContent = money(r.currentLoan.payment, 2); $('tableRateOnlyPayment').textContent = money(r.rateOnlySameTerm.payment, 2); $('tableProposedPayment').textContent = money(r.proposedLoan.payment, 2);
    $('tableCurrentInterest').textContent = money(r.currentLoan.totalInterest); $('tableRateOnlyInterest').textContent = money(r.rateOnlySameTerm.totalInterest); $('tableProposedInterest').textContent = money(r.proposedLoan.totalInterest);
    $('tableCurrentPayoff').textContent = dateLabel(r.currentLoan.payoffDate); $('tableRateOnlyPayoff').textContent = dateLabel(r.rateOnlySameTerm.payoffDate); $('tableProposedPayoff').textContent = dateLabel(r.proposedLoan.payoffDate);
  }

  function svgEl(name, attrs = {}) { const e = document.createElementNS('http://www.w3.org/2000/svg', name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v))); return e; }
  function renderChart(r) {
    const group = els.advantageChartPlot; group.innerHTML = '';
    const series = r.comparison.advantageSeries || []; if (!series.length) return;
    const W = 800, H = 280, left = 64, right = 22, top = 22, bottom = 50, plotW = W - left - right, plotH = H - top - bottom;
    const values = series.map(x => x.advantage); let min = Math.min(0, ...values), max = Math.max(0, ...values); if (Math.abs(max - min) < 1e-9) { max += 1; min -= 1; }
    const xFor = p => left + (p / Math.max(1, series[series.length - 1].period)) * plotW;
    const yFor = v => top + (max - v) / (max - min) * plotH;
    const zeroY = yFor(0);
    group.appendChild(svgEl('line', { x1: left, y1: top, x2: left, y2: top + plotH, class: 'refi-chart-axis' }));
    group.appendChild(svgEl('line', { x1: left, y1: top + plotH, x2: left + plotW, y2: top + plotH, class: 'refi-chart-axis' }));
    group.appendChild(svgEl('line', { x1: left, y1: zeroY, x2: left + plotW, y2: zeroY, class: 'refi-chart-zero' }));
    const maxPoints = 72, step = Math.max(1, Math.ceil(series.length / maxPoints)); const sampled = series.filter((_, i) => i % step === 0 || i === series.length - 1);
    let d = ''; sampled.forEach((p, i) => { d += `${i ? ' L' : 'M'} ${xFor(p.period).toFixed(2)} ${yFor(p.advantage).toFixed(2)}`; });
    group.appendChild(svgEl('path', { d, class: 'refi-chart-path' }));
    const zeroText = svgEl('text', { x: left + 4, y: zeroY - 6, class: 'refi-chart-label' }); zeroText.textContent = 'Break-even'; group.appendChild(zeroText);
    const startText = svgEl('text', { x: left, y: H - 18, class: 'refi-chart-label' }); startText.textContent = 'Start'; group.appendChild(startText);
    const endText = svgEl('text', { x: left + plotW, y: H - 18, 'text-anchor': 'end', class: 'refi-chart-label' }); endText.textContent = `${series[series.length - 1].months} months`; group.appendChild(endText);
    if (r.comparison.durableBreakEvenPeriod != null) { const p = series[Math.min(r.comparison.durableBreakEvenPeriod, series.length - 1)]; group.appendChild(svgEl('circle', { cx: xFor(p.period), cy: yFor(p.advantage), r: 5, class: 'refi-chart-marker' })); }
    if (r.comparison.holdingPeriodPeriods != null) { const hp = Math.min(series.length - 1, r.comparison.holdingPeriodPeriods); const p = series[hp]; group.appendChild(svgEl('circle', { cx: xFor(p.period), cy: yFor(p.advantage), r: 5, class: 'refi-chart-marker holding' })); }
    els.chartHeadline.textContent = statusMoney(r.comparison.lifetimeAdvantage, 'Lifetime modeled saving', 'Lifetime modeled additional cost');
    const parts = [`The full deterministic ledger spans ${series[series.length - 1].months} months.`];
    if (r.comparison.durableBreakEvenPeriod != null) parts.push(r.comparison.durableBreakEvenPeriod === 0 ? 'Durable break-even is immediate.' : `Durable break-even is about ${r.comparison.durableBreakEvenMonths} months.`);
    else parts.push('No durable break-even appears within the modeled horizons.');
    if (r.comparison.holdingPeriodAdvantage != null) parts.push(`${statusMoney(r.comparison.holdingPeriodAdvantage)} at the entered holding period.`);
    els.chartSummary.textContent = parts.join(' ');
  }

  function renderResults(r) {
    renderBreakEven(r);
    els.currentPaymentResult.textContent = money(r.currentLoan.payment, 2); els.rateOnlyPaymentResult.textContent = money(r.rateOnlySameTerm.payment, 2); els.proposedPaymentResult.textContent = money(r.proposedLoan.payment, 2);
    els.paymentChangeResult.textContent = Math.abs(r.comparison.paymentChange) <= r.tolerance ? 'Approximately unchanged' : r.comparison.paymentChange < 0 ? `${money(Math.abs(r.comparison.paymentChange), 2)} lower` : `${money(r.comparison.paymentChange, 2)} higher`;
    els.holdingResultLabel.textContent = r.input.useHoldingPeriod ? `At ${r.input.holdingYears}y ${r.input.holdingMonths}m holding period` : 'At expected holding period';
    els.holdingResult.textContent = r.input.useHoldingPeriod ? statusMoney(r.comparison.holdingPeriodAdvantage) : 'Not entered';
    els.lifetimeResult.textContent = statusMoney(r.comparison.lifetimeAdvantage, 'Modeled saving', 'Modeled additional cost');
    els.switchingFeesResult.textContent = money(r.costs.switchingFees); els.exitChargeResult.textContent = money(r.costs.exitCharge); els.cashbackResult.textContent = money(r.costs.cashback); els.netSwitchingCostResult.textContent = money(r.costs.netSwitchingCost);
    els.feeModeNote.textContent = r.costs.feePaymentMode === 'financed' ? `${money(r.proposedLoan.financedFees)} of switching fees is added to the proposed principal. The fee remains an economic cost and the financed amount also creates interest.` : 'Switching fees are treated as paid upfront. The proposed loan principal therefore starts from the current balance only.';
    renderWarning(r); setTable(r); renderChart(r);
  }

  function clearResults(message = 'Enter valid assumptions to calculate the comparison.') {
    els.breakEvenValue.textContent = '—'; els.breakEvenText.textContent = message; [els.currentPaymentResult, els.rateOnlyPaymentResult, els.proposedPaymentResult, els.paymentChangeResult, els.holdingResult, els.lifetimeResult, els.switchingFeesResult, els.exitChargeResult, els.cashbackResult, els.netSwitchingCostResult].forEach(e => e.textContent = '—'); els.feeModeNote.textContent = ''; els.termWarning.hidden = true; els.advantageChartPlot.innerHTML = ''; els.chartHeadline.textContent = 'Complete the comparison to see the cost path.'; els.chartSummary.textContent = 'Visible results above and the comparison table remain the accessible source of truth; no hover is required.';
    ['tableCurrentPrincipal','tableRateOnlyPrincipal','tableProposedPrincipal','tableCurrentRate','tableRateOnlyRate','tableProposedRate','tableCurrentTerm','tableRateOnlyTerm','tableProposedTerm','tableCurrentPayment','tableRateOnlyPayment','tableProposedPayment','tableCurrentInterest','tableRateOnlyInterest','tableProposedInterest','tableCurrentPayoff','tableRateOnlyPayoff','tableProposedPayoff'].forEach(id => $(id).textContent = '—');
  }

  function render() {
    els.holdingFields.classList.toggle('mdc-hidden', !els.useHoldingPeriod.checked); clearError(); const result = C.calculate(readInput()); lastResult = result;
    if (!result.ok) { showError(result.error); clearResults(errors[result.error] || 'The comparison could not be calculated.'); return; }
    renderResults(result);
  }

  function profileFromCurrent() { const i = readInput(); if (!(i.balance > 0) || i.currentRatePct < 0 || i.currentRatePct > 50 || (i.remainingYears === 0 && i.remainingMonths === 0)) return null; return { country: i.country, currency: i.currency, balance: i.balance, annualRatePct: i.currentRatePct, remainingYears: i.remainingYears, remainingMonths: i.remainingMonths, paymentFrequency: i.paymentFrequency, useCurrentPayment: false, currentPayment: null }; }
  function refreshProfileBanner() { const p = P.read(); els.profileBanner.hidden = !p || profileDismissed; if (!p) return; const locale = L.regions[p.country]?.locale || L.getLocale(); let formatted; try { formatted = new Intl.NumberFormat(locale, { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.balance); } catch (_) { formatted = `${p.currency} ${Math.round(p.balance).toLocaleString()}`; } const override = p.useCurrentPayment ? ' Saved current-payment overrides are not used by this refinance model.' : ''; els.profileSummary.textContent = `${formatted} balance · ${p.annualRatePct.toFixed(2)}% · ${p.remainingYears}y ${p.remainingMonths}m · ${p.paymentFrequency}. Nothing is applied until you choose Use these loan details.${override}`; }
  function applyProfile() { const p = P.read(); if (!p) return; els.balance.value = String(p.balance); els.currentRate.value = String(p.annualRatePct); els.remainingYears.value = String(p.remainingYears); els.remainingMonths.value = String(p.remainingMonths); els.paymentFrequency.value = p.paymentFrequency; profileDismissed = true; L.setLocale(p.country, p.currency); render(); els.reportStatus.textContent = p.useCurrentPayment ? 'Saved loan facts applied. The saved current-payment override was intentionally ignored; payments are recalculated from balance, rate and term.' : 'Saved mortgage details applied after validation.'; }
  function saveProfile() { const p = profileFromCurrent(); if (!p) { els.reportStatus.textContent = 'Enter valid current-loan details before saving.'; return; } const res = P.write(p); els.reportStatus.textContent = res.ok ? 'Mortgage details saved locally for the Decision Centre. Offer-specific refinance values were not saved.' : 'Could not save mortgage details in this browser.'; profileDismissed = false; refreshProfileBanner(); }
  function clearProfile() { P.clear(); profileDismissed = false; refreshProfileBanner(); els.reportStatus.textContent = 'Saved mortgage details cleared. Country/currency preferences were not changed.'; }

  function summaryText() {
    if (!lastResult?.ok) return ''; const r = lastResult, i = r.input; const lines = [identity().product, '', `Country: ${L.getProfile().label}`, `Currency: ${i.currency}`, `Current balance: ${money(i.balance)}`, `Current rate: ${pct(i.currentRatePct)}`, `Current remaining term: ${i.remainingYears} years ${i.remainingMonths} months`, `Repayment frequency: ${i.paymentFrequency}`, `New offered rate: ${pct(i.newRatePct)}`, `Proposed new term: ${i.proposedYears} years ${i.proposedMonths} months`, `Current modeled repayment: ${money(r.currentLoan.payment,2)}`, `New-rate same-term repayment: ${money(r.rateOnlySameTerm.payment,2)}`, `Proposed refinance repayment: ${money(r.proposedLoan.payment,2)}`, `Switching fees: ${money(r.costs.switchingFees)}`, `Exit / early-repayment charge: ${money(r.costs.exitCharge)}`, `Cashback / incentive: ${money(r.costs.cashback)}`, `Fee mode: ${r.costs.feePaymentMode}`, `Net switching cost: ${money(r.costs.netSwitchingCost)}`, `Durable break-even: ${r.comparison.durableBreakEvenPeriod == null ? 'No durable break-even within modeled horizons' : r.comparison.durableBreakEvenPeriod === 0 ? 'Immediate / at completion' : `${r.comparison.durableBreakEvenMonths} months`}`];
    if (i.useHoldingPeriod) lines.push(`Holding period: ${i.holdingYears} years ${i.holdingMonths} months`, `Holding-period modeled effect: ${statusMoney(r.comparison.holdingPeriodAdvantage)}`);
    lines.push(`Lifetime modeled effect: ${statusMoney(r.comparison.lifetimeAdvantage, 'Modeled saving', 'Modeled additional cost')}`);
    if (r.comparison.termChangePeriods > 0) lines.push('Warning: The proposed loan runs longer. Part of a lower payment may come from borrowing for longer, not only from the lower rate.');
    if (r.comparison.lowerPaymentHigherLifetimeCost) lines.push('Warning: The modeled payment is lower, but the modeled lifetime borrowing cost is higher under these assumptions.');
    lines.push('', 'Educational illustration only. Carrowmont does not rank lenders, determine eligibility, calculate country-specific penalties automatically or forecast future variable rates. Confirm actual lender charges and legal/tax rules from authoritative documents.', 'https://carrowmont.com/mortgage-payoff-calculator/refinance-break-even.html');
    return lines.join('\n');
  }
  async function copySummary() { const text = summaryText(); if (!text) return; try { await navigator.clipboard.writeText(text); } catch (_) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } els.reportStatus.textContent = 'Summary copied.'; }
  async function generateReport() { if (!lastResult?.ok) return; try { els.reportStatus.textContent = 'Generating report...'; await window.CarrowmontRefinancePdfRenderer.generate({ result: lastResult, identity: identity() }); els.reportStatus.textContent = 'Report has been downloaded.'; } catch (err) { console.error(err); els.reportStatus.textContent = 'Could not generate the report.'; } }

  function reset() { const india = L.getRegion() === 'IN'; els.balance.value = india ? '5000000' : '400000'; els.currentRate.value = india ? '8.50' : '6.50'; els.remainingYears.value = '15'; els.remainingMonths.value = '0'; els.paymentFrequency.value = 'monthly'; els.newRate.value = india ? '7.75' : '5.75'; els.proposedYears.value = '15'; els.proposedMonths.value = '0'; els.switchingFees.value = india ? '25000' : '5000'; els.exitCharge.value = '0'; els.cashback.value = '0'; els.feePaymentMode.value = 'upfront'; els.useHoldingPeriod.checked = true; els.holdingYears.value = '5'; els.holdingMonths.value = '0'; render(); }

  function bind() {
    document.querySelector('.mdc-input-card').addEventListener('input', e => { if (e.target.matches('input,select')) render(); }); document.querySelector('.mdc-input-card').addEventListener('change', e => { if (e.target.matches('input,select')) render(); });
    els.regionSelect.addEventListener('change', () => L.setRegion(els.regionSelect.value)); els.currencySelect.addEventListener('change', () => L.setCurrency(els.currencySelect.value)); $('localeDone').addEventListener('click', () => { els.localeMenu.open = false; }); window.addEventListener('carrowmont:localechange', () => { syncLocaleUi(); render(); });
    $('resetBtn').addEventListener('click', reset); $('copyBtn').addEventListener('click', copySummary); $('reportBtn').addEventListener('click', generateReport); $('saveProfileBtn').addEventListener('click', saveProfile); $('clearProfileBtn').addEventListener('click', clearProfile); $('applyProfileBtn').addEventListener('click', applyProfile); $('startFreshBtn').addEventListener('click', () => { profileDismissed = true; refreshProfileBanner(); els.reportStatus.textContent = 'Starting fresh. Saved details were not applied.'; });
  }

  populateLocale(); syncLocaleUi(); bind(); render();
})();
