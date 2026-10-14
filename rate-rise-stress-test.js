(() => {
  'use strict';
  const M = window.CarrowmontMortgageCore;
  const C = window.CarrowmontMdc1cCore;
  const L = window.CarrowmontLocale;
  const P = window.CarrowmontMortgageDecisionProfile;
  const $ = id => document.getElementById(id);
  const qsa = selector => [...document.querySelectorAll(selector)];
  let lastResult = null;
  let profileDismissed = false;
  let initialized = false;

  const els = {
    regionSelect:$('regionSelect'),currencySelect:$('currencySelect'),localeMenu:$('localeMenu'),localeCurrent:$('localeCurrent'),
    balance:$('balance'),currentRate:$('currentRate'),remainingYears:$('remainingYears'),remainingMonths:$('remainingMonths'),paymentFrequency:$('paymentFrequency'),
    useCurrentPayment:$('useCurrentPayment'),currentPayment:$('currentPayment'),currentPaymentFields:$('currentPaymentFields'),monthsUntilRateChange:$('monthsUntilRateChange'),stressedRate:$('stressedRate'),
    budgetEnabled:$('budgetEnabled'),budgetFields:$('budgetFields'),monthlyIncome:$('monthlyIncome'),monthlyExpenses:$('monthlyExpenses'),validationMessage:$('validationMessage'),
    profileBanner:$('profileBanner'),profileSummary:$('profileSummary'),reportStatus:$('reportDownloadStatus'),scenarioTableBody:$('scenarioTableBody'),stressChart:$('stressChart')
  };

  const num = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
  const money = (v, decimals = 0) => v == null || !Number.isFinite(Number(v)) ? '—' : L.formatMoney(Number(v), { maximumFractionDigits:decimals, minimumFractionDigits:decimals });
  const pct = (v, decimals = 2) => v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(decimals)}%`;
  const pp = v => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)} percentage point${Math.abs(Number(v)) === 1 ? '' : 's'}`;
  const signedMoney = (v, decimals = 0) => { if (!Number.isFinite(Number(v))) return '—'; const n=Number(v); if (Math.abs(n) <= 0.005) return money(0,decimals); return `${n>0?'+':'−'}${money(Math.abs(n),decimals)}`; };
  const signedPct = v => { if (!Number.isFinite(Number(v))) return '—'; const n=Number(v); if (Math.abs(n)<0.00005)return '0.00%'; return `${n>0?'+':'−'}${Math.abs(n).toFixed(2)}%`; };
  function twoWeekLabel(){ const p=L.getProfile(); return p.twoWeekLabel==='fortnightly'?'Fortnightly':p.twoWeekLabel==='biweekly'?'Biweekly':'Every 2 Weeks'; }
  function duration(periods){ return M.durationLabel(Math.max(0,num(periods)),els.paymentFrequency.value); }
  function paymentCadenceLabel(){ const f=els.paymentFrequency.value; return f==='monthly'?'monthly':f==='weekly'?'weekly':twoWeekLabel().toLowerCase(); }

  function identity(region=L.getRegion()){
    const map={
      IN:{product:'Home Loan EMI Rate Rise Stress Test',title:'How much could your home loan EMI rise if rates increase?',balance:'Outstanding home loan balance',term:'Remaining loan tenure - years',currentPayment:'Current EMI / scheduled repayment',reset:'rate reset / repricing'},
      US:{product:'Mortgage Rate Rise & Payment Stress Test',title:'How much would your mortgage payment rise if rates increase?',balance:'Outstanding mortgage balance',term:'Remaining mortgage term - years',currentPayment:'Current scheduled mortgage payment',reset:'ARM adjustment / reset / refinance'},
      CA:{product:'Mortgage Renewal Payment Stress Test',title:'How much could your mortgage payment change at renewal?',balance:'Outstanding mortgage balance',term:'Remaining amortization - years',currentPayment:'Current scheduled mortgage payment',reset:'renewal / reset'},
      GB:{product:'Mortgage Rate Rise / Remortgage Payment Stress Test',title:'How much could your mortgage payment rise when the rate changes?',balance:'Outstanding mortgage balance',term:'Remaining mortgage term - years',currentPayment:'Current scheduled mortgage payment',reset:'rate change / remortgage'},
      IE:{product:'Mortgage Rate Rise / Switch Payment Stress Test',title:'How much could your mortgage payment rise when the rate changes?',balance:'Outstanding mortgage balance',term:'Remaining mortgage term - years',currentPayment:'Current scheduled mortgage payment',reset:'rate change / switch'},
      AU:{product:'Home Loan Rate Rise Stress Test',title:'How much could your home loan repayment rise if rates increase?',balance:'Outstanding home loan balance',term:'Remaining loan term - years',currentPayment:'Current scheduled home loan repayment',reset:'rate change'},
      NZ:{product:'Home Loan Rate Rise Stress Test',title:'How much could your home loan repayment rise if rates increase?',balance:'Outstanding home loan balance',term:'Remaining loan term - years',currentPayment:'Current scheduled home loan repayment',reset:'rate change'}
    };
    return map[region]||{product:'Mortgage / Home Loan Rate Rise Stress Test',title:'How much could your mortgage or home-loan payment rise if rates increase?',balance:'Outstanding mortgage / home loan balance',term:'Remaining loan term - years',currentPayment:'Current scheduled repayment',reset:'rate change / reset'};
  }

  function populateLocale(){
    const regions=Object.entries(L.regions).sort((a,b)=>{if(a[0]==='OTHER')return 1;if(b[0]==='OTHER')return -1;return a[1].label.localeCompare(b[1].label,'en');});
    els.regionSelect.innerHTML=regions.map(([code,p])=>`<option value="${code}">${p.label}</option>`).join('');
    els.currencySelect.innerHTML=Object.entries(L.currencies).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,c])=>`<option value="${code}">${code} · ${c.label}</option>`).join('');
  }

  function syncLocaleUi(){
    els.regionSelect.value=L.getRegion();els.currencySelect.value=L.getCurrency();els.localeCurrent.textContent=`${L.getProfile().label} · ${L.getCurrency()}`;
    const id=identity(); $('productLabel').textContent=id.product;$('toolTitle').textContent=id.title;$('balanceLabel').textContent=id.balance;$('termLabel').textContent=id.term;$('currentPaymentLabel').textContent=id.currentPayment;$('footerProductName').textContent=id.product;$('footerProductBottom').textContent=id.product;
    $('biweeklyOption').textContent=twoWeekLabel();
    const symbol=L.currencySymbol();qsa('.currency-prefix').forEach(el=>{el.textContent=symbol;});L.applyMortgageCopy?.();
    updateRateDeltaHelp();
  }

  function readInput(){
    return {
      country:L.getRegion(),currency:L.getCurrency(),balance:num(els.balance.value,NaN),annualRatePct:num(els.currentRate.value,NaN),remainingYears:num(els.remainingYears.value,NaN),remainingMonths:num(els.remainingMonths.value,NaN),paymentFrequency:els.paymentFrequency.value,
      useCurrentPayment:els.useCurrentPayment.checked,currentPayment:els.useCurrentPayment.checked?num(els.currentPayment.value,NaN):null,monthsUntilRateChange:num(els.monthsUntilRateChange.value,NaN),stressedAnnualRatePct:num(els.stressedRate.value,NaN),
      householdBudgetEnabled:els.budgetEnabled.checked,monthlyTakeHomeIncome:els.monthlyIncome.value.trim()===''?null:num(els.monthlyIncome.value,NaN),monthlyEssentialOutgoings:els.monthlyExpenses.value.trim()===''?null:num(els.monthlyExpenses.value,NaN),rateMode:'fixed',startDate:new Date().toISOString().slice(0,10)
    };
  }

  const errors={
    balance:'Enter an outstanding balance greater than zero.',
    'current-rate':'Enter a current annual interest rate between 0% and 50%.',
    term:'Enter a remaining term greater than zero. Additional months must be from 0 to 11.',
    frequency:'Choose a supported repayment frequency.',
    'current-payment':'Enter a current scheduled repayment amount greater than zero.',
    'negative-amortization':'The entered current repayment must be greater than the first modeled interest charge. Negative-amortization products are outside MDC1C V1.',
    'reset-timing':'Enter zero or a positive number of months until the rate change.',
    'reset-after-term':'The rate-change timing must occur before the remaining loan term ends.',
    'stressed-rate':'Enter a future / stressed annual rate between 0% and 50%.',
    income:'Monthly take-home household income cannot be negative.',
    expenses:'Monthly essential outgoings cannot be negative.',
    projection:'The future reset balance could not be projected from these assumptions.'
  };
  function showError(code){els.validationMessage.textContent=errors[code]||'Review the entered values and try again.';els.validationMessage.hidden=false;}
  function clearError(){els.validationMessage.hidden=true;els.validationMessage.textContent='';}

  function updateRateDeltaHelp(){
    const cur=num(els.currentRate.value,NaN), stress=num(els.stressedRate.value,NaN);
    if(Number.isFinite(cur)&&Number.isFinite(stress)) $('rateDeltaHelp').textContent=`${stress.toFixed(2)}% = ${pp(stress-cur)} from ${cur.toFixed(2)}%.`;
  }

  function budgetStateText(buffer){
    if(Math.abs(buffer)<=0.01)return {title:'Approximately break-even',state:'break-even'};
    if(buffer>0)return {title:'Monthly surplus remains',state:'surplus'};
    return {title:'Modeled monthly shortfall',state:'shortfall'};
  }

  function renderBudget(r){
    const card=$('budgetResultCard');
    if(!r.budget.applicable){card.hidden=true; qsa('.budget-column').forEach(el=>el.hidden=true);$('budgetTableFoot').hidden=true;$('budgetLineKey').hidden=true;return;}
    card.hidden=false;qsa('.budget-column').forEach(el=>el.hidden=false);$('budgetTableFoot').hidden=false;$('budgetLineKey').hidden=false;
    const state=budgetStateText(r.budget.customBuffer);card.dataset.state=state.state;$('budgetStateTitle').textContent=state.title;
    $('bufferTodayResult').textContent=money(r.budget.bufferToday,0);$('bufferStressResult').textContent=money(r.budget.customBuffer,0);$('mortgageShareResult').textContent=pct(r.budget.stressedMortgageSharePct,1);
    const status=r.budget.zeroBufferStatus;
    if(status==='found'){$('zeroBufferRateResult').textContent=pct(r.budget.zeroBufferRatePct,2);$('zeroBufferNote').textContent='This is the modeled rate where the entered monthly household buffer reaches approximately zero. It is not a recommended maximum or lender affordability result.';}
    else if(status==='non-mortgage-outgoings-use-all-income'){$('zeroBufferRateResult').textContent='Not applicable';$('zeroBufferNote').textContent=`The entered essential expenses already use all or more of the entered take-home income before this ${family().noun}.`;}
    else if(status==='no-nonnegative-rate'){$('zeroBufferRateResult').textContent='No non-negative rate';$('zeroBufferNote').textContent=`Even a 0% modeled ${family().paymentLabel} is greater than the monthly amount left after the entered essential expenses.`;}
    else if(status==='above-modeled-ceiling'){$('zeroBufferRateResult').textContent='Above 50% ceiling';$('zeroBufferNote').textContent='The mathematical crossover is above the V1 modeled rate ceiling. No value is extrapolated beyond 50%.';}
    else {$('zeroBufferRateResult').textContent='—';$('zeroBufferNote').textContent='A mathematical crossover is shown only when the entered budget supports one inside the modeled range.';}
  }

  function scenarioBudgetBuffer(r,monthly){return r.budget.applicable?r.budget.availableForMortgage-monthly:null;}
  function tableRow(label,rate,payment,monthly,change,pctChange,buffer,cls=''){
    return `<tr class="${cls}"><td>${label}</td><td>${rate.toFixed(2)}%</td><td>${money(payment,2)}</td><td>${money(monthly,2)}</td><td>${signedMoney(change,2)}</td><td>${signedPct(pctChange)}</td><td class="budget-column"${lastResult?.budget?.applicable?'':' hidden'}>${buffer==null?'—':money(buffer,0)}</td></tr>`;
  }
  function renderTable(r){
    const rows=[];
    rows.push(tableRow('Current-rate baseline at reset',r.input.annualRatePct,r.reset.sameRateReferencePayment,r.reset.sameRateMonthlyEquivalent,0,0,scenarioBudgetBuffer(r,r.reset.sameRateMonthlyEquivalent),'baseline-row'));
    rows.push(tableRow(`Custom · ${pp(r.customScenario.rateChangePctPoints)}`,r.customScenario.annualRatePct,r.customScenario.payment,r.customScenario.monthlyEquivalent,r.customScenario.rateOnlyChange,r.customScenario.rateOnlyPctChange,r.customScenario.budget?.monthlyBuffer??null,'custom-row'));
    r.ladder.forEach(s=>rows.push(tableRow(`Standard · +${s.deltaPctPoints.toFixed(2)} pp`,s.annualRatePct,s.payment,s.monthlyEquivalent,s.rateOnlyChange,s.rateOnlyPctChange,s.budget?.monthlyBuffer??null)));
    els.scenarioTableBody.innerHTML=rows.join('');
  }

  function svgEl(name,attrs={}){const e=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));return e;}
  function renderChart(r){
    const svg=els.stressChart; while(svg.firstChild)svg.removeChild(svg.firstChild);
    const customRate=r.customScenario.annualRatePct;
    const byRate=new Map();
    byRate.set(r.input.annualRatePct,{rate:r.input.annualRatePct,payment:r.reset.sameRateMonthlyEquivalent,kind:'baseline'});
    r.ladder.forEach(s=>byRate.set(Number(s.annualRatePct.toFixed(8)),{rate:s.annualRatePct,payment:s.monthlyEquivalent,kind:'standard'}));
    byRate.set(Number(customRate.toFixed(8)),{rate:customRate,payment:r.customScenario.monthlyEquivalent,kind:'custom'});
    const pts=[...byRate.values()].sort((a,b)=>a.rate-b.rate);
    if(pts.length<2)return;
    const W=760,H=300,m={l:72,r:28,t:24,b:54}; const innerW=W-m.l-m.r,innerH=H-m.t-m.b;
    let minRate=Math.min(...pts.map(p=>p.rate)),maxRate=Math.max(...pts.map(p=>p.rate)); if(maxRate-minRate<0.1){minRate=Math.max(0,minRate-.5);maxRate+=.5;}
    const budgetLine=r.budget.applicable?r.budget.availableForMortgage:null;
    let minPay=Math.min(...pts.map(p=>p.payment),budgetLine==null?Infinity:budgetLine),maxPay=Math.max(...pts.map(p=>p.payment),budgetLine==null?-Infinity:budgetLine); const pad=Math.max(1,(maxPay-minPay)*.16);minPay=Math.max(0,minPay-pad);maxPay+=pad;
    const x=v=>m.l+(v-minRate)/(maxRate-minRate)*innerW; const y=v=>m.t+(maxPay-v)/(maxPay-minPay)*innerH;
    for(let i=0;i<=4;i++){const yy=m.t+i*innerH/4;svg.appendChild(svgEl('line',{x1:m.l,y1:yy,x2:W-m.r,y2:yy,class:'stress-chart-grid'}));const val=maxPay-i*(maxPay-minPay)/4;const t=svgEl('text',{x:m.l-9,y:yy+4,'text-anchor':'end',class:'stress-chart-label'});t.textContent=money(val,0);svg.appendChild(t);}
    svg.appendChild(svgEl('line',{x1:m.l,y1:m.t,x2:m.l,y2:H-m.b,class:'stress-chart-axis'}));svg.appendChild(svgEl('line',{x1:m.l,y1:H-m.b,x2:W-m.r,y2:H-m.b,class:'stress-chart-axis'}));
    if(budgetLine!=null&&budgetLine>=minPay&&budgetLine<=maxPay){const yy=y(budgetLine);svg.appendChild(svgEl('line',{x1:m.l,y1:yy,x2:W-m.r,y2:yy,class:'stress-chart-budget'}));const tx=svgEl('text',{x:W-m.r,y:yy-7,'text-anchor':'end',class:'stress-chart-label strong'});tx.textContent=`Available for ${family().noun}`;svg.appendChild(tx);}
    let d='';pts.forEach((p,i)=>{d+=`${i?'L':'M'} ${x(p.rate).toFixed(1)} ${y(p.payment).toFixed(1)} `;});svg.appendChild(svgEl('path',{d,class:'stress-chart-path'}));
    pts.forEach(p=>{const cx=x(p.rate),cy=y(p.payment);svg.appendChild(svgEl('circle',{cx,cy,r:p.kind==='custom'?5:4,class:`stress-chart-point${p.kind==='custom'?' custom':''}`}));const tx=svgEl('text',{x:cx,y:H-m.b+22,'text-anchor':'middle',class:p.kind==='custom'?'stress-chart-label strong':'stress-chart-label'});tx.textContent=`${p.rate.toFixed(2)}%`;svg.appendChild(tx);});
    $('chartSummary').textContent=r.budget.applicable?`The custom ${pct(customRate)} scenario gives a monthly-equivalent payment of ${money(r.customScenario.monthlyEquivalent,0)}. The horizontal reference is the ${money(r.budget.availableForMortgage,0)} monthly amount left after entered essential outgoings.`:`The custom ${pct(customRate)} scenario gives a monthly-equivalent payment of ${money(r.customScenario.monthlyEquivalent,0)}. Standard points show +0.25, +0.50, +1, +2 and +3 percentage-point stresses where they remain inside the 50% ceiling.`;
  }

  function renderResults(r){
    if(r.paidOffBeforeReset){
      $('stressedPaymentResult').textContent=money(0,2);$('heroResultText').textContent=`The modeled loan is repaid before the entered rate-change checkpoint, so no stressed ${family().paymentLabel} applies.`;
    }else{
      $('stressedPaymentResult').textContent=money(r.customScenario.payment,2);
      const delta=r.customScenario.rateOnlyChange;const direction=Math.abs(delta)<=0.005?'about the same as':delta>0?'more than':'less than';
      $('heroResultText').textContent=`At ${pct(r.customScenario.annualRatePct)}, the modeled ${paymentCadenceLabel()} payment is ${money(r.customScenario.payment,2)} — ${money(Math.abs(delta),2)} ${direction} the same-rate reference from the rate change alone.`;
    }
    $('paymentTodayResult').textContent=money(r.current.paymentToday,2);$('sameRatePaymentResult').textContent=money(r.reset.sameRateReferencePayment,2);$('rateOnlyChangeResult').textContent=signedMoney(r.customScenario.rateOnlyChange,2);$('todayChangeResult').textContent=signedMoney(r.customScenario.todayChange,2);$('ratePctChangeResult').textContent=signedPct(r.customScenario.rateOnlyPctChange);$('monthlyEquivalentResult').textContent=money(r.customScenario.monthlyEquivalent,2);$('annualCashFlowResult').textContent=signedMoney(r.customScenario.annualCashFlowChange,0);
    $('resetTimingResult').textContent=r.reset.modeledPeriods===0?'Applies now':`${r.reset.modeledMonths.toFixed(r.reset.modeledMonths%1?1:0)} modeled months`;$('resetBalanceResult').textContent=money(r.reset.projectedBalance,0);$('resetTermResult').textContent=duration(r.reset.remainingPeriods);
    $('resetNote').textContent=r.reset.modeledPeriods===0?'The stressed rate is applied to the current balance immediately.':`Requested ${r.reset.requestedMonths} months; modeled at ${r.reset.modeledPeriods} scheduled repayment periods. Lender dates can fall between modeled checkpoints.`;
    renderBudget(r);renderTable(r);renderChart(r);
  }

  function clearResults(message='Enter valid assumptions to calculate the payment stress.'){
    ['stressedPaymentResult','paymentTodayResult','sameRatePaymentResult','rateOnlyChangeResult','todayChangeResult','ratePctChangeResult','monthlyEquivalentResult','annualCashFlowResult','resetTimingResult','resetBalanceResult','resetTermResult'].forEach(id=>$(id).textContent='—');$('heroResultText').textContent=message;$('budgetResultCard').hidden=true;els.scenarioTableBody.innerHTML='';while(els.stressChart.firstChild)els.stressChart.removeChild(els.stressChart.firstChild);$('chartSummary').textContent='The chart reinforces the scenario table and does not replace it.';
  }

  function render(){
    els.currentPaymentFields.classList.toggle('mdc-hidden',!els.useCurrentPayment.checked);els.budgetFields.classList.toggle('mdc-hidden',!els.budgetEnabled.checked);updateRateDeltaHelp();
    const r=C.calculate(readInput());lastResult=r.ok?r:null;
    if(!r.ok){showError(r.error);clearResults();return;}
    clearError();renderResults(r);
  }

  function profileFromCurrent(){
    const i=readInput();
    if(!(i.balance>0)||i.annualRatePct<0||i.annualRatePct>50||i.remainingYears<0||i.remainingMonths<0||i.remainingMonths>11||(i.remainingYears===0&&i.remainingMonths===0))return null;
    if(i.useCurrentPayment&&!(i.currentPayment>0))return null;
    return {country:i.country,currency:i.currency,balance:i.balance,annualRatePct:i.annualRatePct,remainingYears:i.remainingYears,remainingMonths:i.remainingMonths,paymentFrequency:i.paymentFrequency,useCurrentPayment:i.useCurrentPayment,currentPayment:i.useCurrentPayment?i.currentPayment:null};
  }

  function refreshProfileBanner(){
    const p=P.read();els.profileBanner.hidden=!p||profileDismissed;if(!p)return;let formatted;try{formatted=new Intl.NumberFormat(L.regions[p.country]?.locale||L.getLocale(),{style:'currency',currency:p.currency,maximumFractionDigits:0}).format(p.balance);}catch(_){formatted=`${p.currency} ${Math.round(p.balance).toLocaleString()}`;}
    const override=p.useCurrentPayment?` · current payment ${L.formatMoney(p.currentPayment,{currency:p.currency,maximumFractionDigits:2})}`:'';
    els.profileSummary.textContent=`${formatted} balance · ${p.annualRatePct.toFixed(2)}% · ${p.remainingYears}y ${p.remainingMonths}m · ${p.paymentFrequency}${override}. Nothing is applied until you choose Use these loan details.`;
  }

  function applyProfile(){
    const p=P.read();if(!p)return;els.balance.value=String(p.balance);els.currentRate.value=String(p.annualRatePct);els.remainingYears.value=String(p.remainingYears);els.remainingMonths.value=String(p.remainingMonths);els.paymentFrequency.value=p.paymentFrequency==='fortnightly'?'biweekly':p.paymentFrequency;els.useCurrentPayment.checked=Boolean(p.useCurrentPayment);if(p.useCurrentPayment)els.currentPayment.value=String(p.currentPayment);els.stressedRate.value=String(Math.min(50,p.annualRatePct+1).toFixed(2));profileDismissed=true;L.setLocale(p.country,p.currency);render();els.reportStatus.textContent=p.useCurrentPayment?`Saved ${family().detailsLabel} and the saved current-payment override were applied after validation. Stress rate, timing and household budget were not taken from the profile.`:`Saved ${family().detailsLabel} applied after validation. Stress rate, timing and household budget remain decision-specific.`;
  }
  function startFresh(){profileDismissed=true;refreshProfileBanner();reset();els.reportStatus.textContent='Started fresh. The saved profile remains available in this browser but was not applied.';}
  function saveProfile(){const p=profileFromCurrent();if(!p){els.reportStatus.textContent='Enter valid current-loan details before saving.';return;}const res=P.write(p);els.reportStatus.textContent=res.ok?`Current ${family().detailsLabel} saved locally. Future rate, reset timing, income, expenses and results were not saved.`:'Could not save loan details in this browser.';profileDismissed=false;refreshProfileBanner();}
  function clearProfile(){P.clear();profileDismissed=false;refreshProfileBanner();els.reportStatus.textContent=`Saved ${family().detailsLabel} cleared. Country/currency preferences were not changed.`;}

  function zeroBufferSummary(r){
    if(!r.budget.applicable)return 'Household budget context: not entered';
    if(r.budget.zeroBufferStatus==='found')return `Modeled zero-buffer rate: ${pct(r.budget.zeroBufferRatePct,2)}`;
    if(r.budget.zeroBufferStatus==='no-nonnegative-rate')return 'Modeled zero-buffer rate: no non-negative modeled rate leaves a positive buffer';
    if(r.budget.zeroBufferStatus==='above-modeled-ceiling')return 'Modeled zero-buffer rate: above 50% modeled ceiling';
    if(r.budget.zeroBufferStatus==='non-mortgage-outgoings-use-all-income')return `Modeled zero-buffer rate: not applicable because entered essential expenses excluding the ${family().noun} already use all or more of take-home income`;
    return 'Modeled zero-buffer rate: not applicable';
  }

  function summaryText(){
    const r=lastResult;if(!r?.ok)return '';
    const id=identity();const lines=[
      `Carrowmont — ${id.product}`,
      `Country / currency: ${L.getProfile().label} / ${L.getCurrency()}`,
      `Outstanding balance: ${money(r.input.balance,0)}`,
      `Current annual rate: ${pct(r.input.annualRatePct)}`,
      `Remaining term: ${r.input.remainingYears} years ${r.input.remainingMonths} months`,
      `Repayment frequency: ${r.input.paymentFrequency}`,
      `Payment today: ${money(r.current.paymentToday,2)}${r.input.useCurrentPayment?' (user-entered override)':''}`,
      `Months until rate change: ${r.input.monthsUntilRateChange}`,
      `Modeled projected balance at reset: ${money(r.reset.projectedBalance,0)}`,
      `Same-rate reference payment at reset: ${money(r.reset.sameRateReferencePayment,2)}`,
      `Future / stressed annual rate: ${pct(r.customScenario.annualRatePct)} (${pp(r.customScenario.rateChangePctPoints)})`,
      `Stressed scheduled payment: ${money(r.customScenario.payment,2)}`,
      `Stressed monthly equivalent: ${money(r.customScenario.monthlyEquivalent,2)}`,
      `Rate-only payment change: ${signedMoney(r.customScenario.rateOnlyChange,2)} (${signedPct(r.customScenario.rateOnlyPctChange)})`,
      `Change from what you pay today: ${signedMoney(r.customScenario.todayChange,2)}`
    ];
    if(r.budget.applicable){lines.push(`Monthly take-home household income: ${money(r.budget.monthlyTakeHomeIncome,0)}`,`Monthly essential expenses excluding this ${family().noun}: ${money(r.budget.monthlyEssentialOutgoings,0)}`,`Current monthly buffer: ${money(r.budget.bufferToday,0)}`,`Stressed monthly buffer: ${money(r.budget.customBuffer,0)}`,`Stressed ${family().noun} share of take-home income: ${pct(r.budget.stressedMortgageSharePct,1)}`,zeroBufferSummary(r));}
    else lines.push('Household budget context: not entered');
    lines.push('Method: future balance is projected to the modeled reset checkpoint; the stressed payment uses the same remaining term. Weekly / every-two-weeks repayments are normalized to monthly equivalents before household comparison.',`Educational stress scenario only. Carrowmont does not forecast future rates, determine lender affordability or recommend a ${family().noun} action.`);
    return lines.join('\n');
  }

  async function copySummary(){if(!lastResult?.ok)return;try{await navigator.clipboard.writeText(summaryText());els.reportStatus.textContent='Summary copied.';}catch(_){els.reportStatus.textContent='Could not copy automatically. Your browser may block clipboard access.';}}
  async function generateReport(){if(!lastResult?.ok)return;try{els.reportStatus.textContent='Generating report...';await window.CarrowmontRateRisePdfRenderer.generate({result:lastResult,identity:identity()});els.reportStatus.textContent='Report has been downloaded.';}catch(err){console.error(err);els.reportStatus.textContent='Could not generate the report.';}}

  function reset(){
    const india=L.getRegion()==='IN';els.balance.value=india?'5000000':'400000';els.currentRate.value=india?'8.50':'6.00';els.remainingYears.value=india?'15':'20';els.remainingMonths.value='0';els.paymentFrequency.value='monthly';els.useCurrentPayment.checked=false;els.currentPayment.value=india?'50000':'2900';els.monthsUntilRateChange.value='0';els.stressedRate.value=india?'9.50':'7.00';els.budgetEnabled.checked=false;els.monthlyIncome.value='';els.monthlyExpenses.value='';render();
  }

  function bind(){
    [...document.querySelectorAll('#calculator input,#calculator select')].forEach(el=>{el.addEventListener('input',render);el.addEventListener('change',render);});
    els.regionSelect.addEventListener('change',()=>L.setRegion(els.regionSelect.value));els.currencySelect.addEventListener('change',()=>L.setCurrency(els.currencySelect.value));$('localeDone').addEventListener('click',()=>{els.localeMenu.open=false;});
    window.addEventListener('carrowmont:localechange',()=>{syncLocaleUi();if(initialized)render();});
    $('resetBtn').addEventListener('click',reset);$('applyProfileBtn').addEventListener('click',applyProfile);$('startFreshBtn').addEventListener('click',startFresh);$('clearProfileBtn').addEventListener('click',clearProfile);$('saveProfileBtn').addEventListener('click',saveProfile);$('clearSavedBtn').addEventListener('click',clearProfile);$('copyBtn').addEventListener('click',copySummary);$('reportBtn').addEventListener('click',generateReport);
  }

  populateLocale();syncLocaleUi();bind();initialized=true;reset();refreshProfileBanner();
})();
