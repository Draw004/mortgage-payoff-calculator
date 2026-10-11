(() => {
  'use strict';
  const C=window.CarrowmontMortgageCore;
  const L=window.CarrowmontLocale;
  const S=window.CarrowmontPlanState;
  const $=id=>document.getElementById(id);
  const qsa=s=>[...document.querySelectorAll(s)];
  let mode='recurring', planningView='monthly', lastResult=null, userTouched=false;

  const els={
    regionSelect:$('regionSelect'),currencySelect:$('currencySelect'),localeCurrent:$('localeCurrent'),localeMenu:$('localeMenu'),
    balance:$('balance'),annualRate:$('annualRate'),remainingYears:$('remainingYears'),remainingMonths:$('remainingMonths'),paymentFrequency:$('paymentFrequency'),
    useCurrentPayment:$('useCurrentPayment'),currentPayment:$('currentPayment'),currentPaymentField:$('currentPaymentField'),payCycleFields:$('payCycleFields'),payFrequency:$('payFrequency'),
    recurringEnabled:$('recurringEnabled'),recurringFields:$('recurringFields'),recurringExtra:$('recurringExtra'),extraFrequency:$('extraFrequency'),extraStartPeriod:$('extraStartPeriod'),customIntervalMonths:$('customIntervalMonths'),customIntervalField:$('customIntervalField'),optionalLumpSum:$('optionalLumpSum'),optionalLumpSumPeriod:$('optionalLumpSumPeriod'),setAsideCard:$('setAsideCard'),setAsideAmount:$('setAsideAmount'),
    lumpSumAmount:$('lumpSumAmount'),lumpSumPeriod:$('lumpSumPeriod'),lumpStrategy:$('lumpStrategy'),targetYears:$('targetYears'),targetMonths:$('targetMonths'),targetLumpSum:$('targetLumpSum'),prepaymentCharge:$('prepaymentCharge'),otherCharges:$('otherCharges'),
    validationMessage:$('validationMessage'),resultHeadline:$('resultHeadline'),resultSubtext:$('resultSubtext'),baselinePayment:$('baselinePayment'),scenarioPayment:$('scenarioPayment'),interestSaved:$('interestSaved'),timeSaved:$('timeSaved'),baselinePayoff:$('baselinePayoff'),scenarioPayoff:$('scenarioPayoff'),enteredCharges:$('enteredCharges'),netReduction:$('netReduction'),baselinePaymentCaption:$('baselinePaymentCaption'),scenarioPaymentCaption:$('scenarioPaymentCaption'),
    annualTableBody:$('annualTableBody'),periodTableBody:$('periodTableBody'),balanceChart:$('balanceChart'),chartBaselineEnd:$('chartBaselineEnd'),chartScenarioEnd:$('chartScenarioEnd'),reportStatus:$('reportDownloadStatus')
  };

  function num(v,f=0){ const n=Number(v); return Number.isFinite(n)?n:f; }
  function money(v,opts={}){ return L.formatMoney(num(v),{maximumFractionDigits:opts.decimals??0,minimumFractionDigits:opts.decimals??0}); }
  function dateLabel(iso){
    if(!iso) return '-';
    const d=new Date(`${iso}T00:00:00Z`);
    try{return new Intl.DateTimeFormat(L.getLocale(),{year:'numeric',month:'short',timeZone:'UTC'}).format(d);}catch(_){return iso;}
  }
  function regionIdentity(region=L.getRegion()){
    const map={
      IN:{product:'Home Loan Prepayment / Foreclosure',title:'See how part-prepayments could change your home loan',balance:'Outstanding home loan balance',term:'Remaining loan tenure - years',extra:'Part-prepayment amount',extraFreq:'Part-Prepayment Frequency',current:'Current EMI / regular repayment',report:'Generate Home Loan Prepayment Report',full:'Full foreclosure / pre-closure estimate',charge:'Prepayment / foreclosure charge',note:'For India, the model uses home-loan / EMI / tenure terminology. Confirm product-specific prepayment or foreclosure rules and charges with your lender.'},
      US:{product:'Mortgage Payoff',title:'See how extra principal could change your mortgage payoff',balance:'Current mortgage balance',term:'Remaining mortgage term - years',extra:'Extra principal amount',extraFreq:'Extra Principal Frequency',current:'Current mortgage payment',report:'Generate Mortgage Payoff Report',full:'Full mortgage payoff estimate',charge:'Prepayment penalty / payoff charge',note:'For the United States, payoff estimates can differ from current balance because of accrued interest and servicer fees. Check whether your loan has a prepayment penalty.'},
      CA:{product:'Mortgage Prepayment & Payoff',title:'See how prepayments could change your mortgage amortization',balance:'Current mortgage balance',term:'Remaining amortization - years',extra:'Prepayment amount',extraFreq:'Prepayment Frequency',current:'Current mortgage payment',report:'Generate Mortgage Prepayment Report',full:'Full mortgage payoff estimate',charge:'Prepayment charge',note:'Canadian fixed-rate mode uses the nominal-rate semi-annual compounding conversion in the model. Mortgage term and amortization are different; this calculator models the remaining amortization at the rate entered.'},
      GB:{product:'Mortgage Overpayment',title:'See how overpayments could change your mortgage',balance:'Current mortgage balance',term:'Remaining mortgage term - years',extra:'Overpayment amount',extraFreq:'Overpayment Frequency',current:'Current mortgage payment',report:'Generate Mortgage Overpayment Report',full:'Full early repayment estimate',charge:'Early Repayment Charge (ERC)',note:'For the UK, overpayment allowances and Early Repayment Charges vary by lender and product. Enter a charge only when you know it and confirm your terms.'},
      AU:{product:'Home Loan Extra Repayments',title:'See how extra repayments could change your home loan',balance:'Current home loan balance',term:'Remaining loan term - years',extra:'Extra repayment amount',extraFreq:'Extra Repayment Frequency',current:'Current home loan repayment',report:'Generate Home Loan Repayment Report',full:'Full home loan payoff estimate',charge:'Early repayment / break charge',note:'Australian loan outcomes can differ because of daily interest timing, redraw, offset and fixed-rate conditions. V1 models principal-and-interest repayment without redraw or offset.'},
      NZ:{product:'Home Loan Extra Repayments',title:'See how extra repayments could change your home loan',balance:'Current home loan balance',term:'Remaining loan term - years',extra:'Extra repayment amount',extraFreq:'Extra Repayment Frequency',current:'Current mortgage / home loan repayment',report:'Generate Home Loan Repayment Report',full:'Full early repayment estimate',charge:'Break / early repayment charge',note:'New Zealand fixed lending can involve break fees and contract-specific limits. Confirm actual early-repayment terms with your lender.'},
      IE:{product:'Mortgage Overpayment',title:'See how overpayments could change your mortgage',balance:'Current mortgage balance',term:'Remaining mortgage term - years',extra:'Overpayment amount',extraFreq:'Overpayment Frequency',current:'Current mortgage payment',report:'Generate Mortgage Overpayment Report',full:'Full early repayment estimate',charge:'Early repayment charge',note:'Mortgage overpayment and early-repayment conditions vary by contract. Confirm any applicable charge with your lender.'}
    };
    return map[region]||{product:'Mortgage / Home Loan Payoff',title:'See how extra payments could change your home loan or mortgage',balance:'Current mortgage / home loan balance',term:'Remaining loan term - years',extra:'Extra / prepayment amount',extraFreq:'Extra / Prepayment Frequency',current:'Current regular repayment',report:'Generate Mortgage Payoff Report',full:'Full early payoff estimate',charge:'Early repayment / prepayment charge',note:'Carrowmont uses a general principal-and-interest approximation for this country profile. Confirm local lender rules, fees and interest conventions before acting.'};
  }
  function twoWeekLabel(){ const p=L.getProfile(); return p.twoWeekLabel==='fortnightly'?'Fortnightly':p.twoWeekLabel==='biweekly'?'Biweekly':'Every 2 Weeks'; }
  function countryDefaultPay(){ return L.getProfile().contributionFrequency||'monthly'; }
  function countryFaq(region=L.getRegion()){
    const map={
      IN:{q:'What does home-loan foreclosure or pre-closure mean in India?',a:'In Indian home-loan usage, foreclosure or pre-closure can mean voluntarily repaying the outstanding loan in full before the scheduled end. Check the lender and loan type for any applicable prepayment conditions or charges.'},
      US:{q:'What should I check before making extra mortgage principal payments in the United States?',a:'Confirm that extra money is applied to principal, check the loan terms for any prepayment penalty, and remember that an official payoff quote can include accrued interest and servicer charges beyond the current principal balance.'},
      CA:{q:'What is a mortgage prepayment privilege in Canada?',a:'Many Canadian mortgage contracts specify how much extra principal can be paid, and when, without a penalty. The exact privilege and any penalty for exceeding it come from the mortgage contract.'},
      GB:{q:'What is mortgage overpayment in the UK?',a:'An overpayment is money paid above the contractual mortgage payment. Some products allow a penalty-free annual amount while others can apply an Early Repayment Charge, so check the actual mortgage deal.'},
      AU:{q:'What should I check before making extra home-loan repayments in Australia?',a:'Check whether extra repayments are allowed, whether the loan is fixed or variable, and whether fees, redraw or offset features change how the payment affects the balance.'},
      NZ:{q:'What should I check before making extra home-loan repayments in New Zealand?',a:'Check the contract for extra-repayment limits and possible break or early-repayment charges, especially on fixed lending. Confirm how the lender applies the extra amount.'},
      IE:{q:'What should I check before overpaying a mortgage in Ireland?',a:'Check the mortgage contract for overpayment limits, fixed-rate conditions and any early-repayment charge. The allowed amount and treatment can vary by lender and product.'}
    };
    return map[region]||{q:'What lender rules should I check before making extra repayments?',a:'Check whether extra principal is allowed, whether limits or charges apply, how the lender applies the payment and how an official payoff or settlement amount is calculated.'};
  }
  function resultLearn(input){
    if(input.paymentFrequency==='biweekly'||input.paymentFrequency==='fortnightly') return {href:'/biweekly-fortnightly-mortgage-payments.html',title:'Where do every-two-weeks savings actually come from?',text:'Separate the 26-half-payment effect from twice-monthly timing and lender processing.'};
    if(mode==='target') return {href:'/pay-off-mortgage-five-years-early.html',title:'How does a target payoff date change the required payment?',text:'Work backward from a shorter horizon and see why the required extra depends on rate, balance and remaining term.'};
    if(mode==='lump') return {href:'/monthly-extra-vs-annual-lump-sum-mortgage.html',title:'Monthly extra or one lump sum: what changes?',text:'Compare the same annual extra cash at different times so timing is not confused with contribution size.'};
    if(mode==='recurring'&&input.extraFrequency==='annual') return {href:'/one-extra-mortgage-payment-a-year.html',title:'What can one extra payment a year really save?',text:'See transparent 25-year examples instead of relying on a universal “five years saved” claim.'};
    return {href:'/extra-mortgage-payments-early-vs-late.html',title:'Why does paying extra earlier usually save more?',text:'See how the same principal reduction can affect more future interest periods when it happens earlier.'};
  }

  function populateLocale(){
    const regions=Object.entries(L.regions).sort((a,b)=>{if(a[0]==='OTHER')return 1;if(b[0]==='OTHER')return -1;return a[1].label.localeCompare(b[1].label,'en');});
    els.regionSelect.innerHTML=regions.map(([code,p])=>`<option value="${code}">${p.label}</option>`).join('');
    els.currencySelect.innerHTML=Object.entries(L.currencies).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,c])=>`<option value="${code}">${code} · ${c.label}</option>`).join('');
  }
  function syncLocaleUi(){
    const id=regionIdentity();
    els.regionSelect.value=L.getRegion(); els.currencySelect.value=L.getCurrency(); els.localeCurrent.textContent=`${L.getProfile().label} · ${L.getCurrency()}`;
    $('productLabel').textContent=id.product; qsa('.footer-product-name,.footer-product-bottom').forEach(n=>n.textContent=id.product); $('toolTitle').textContent=id.title; $('balanceLabel').textContent=id.balance; $('termLabel').textContent=id.term; $('extraAmountLabel').textContent=id.extra; $('extraFrequencyLabel').textContent=id.extraFreq; $('currentPaymentLabel').textContent=id.current; $('reportBtn').textContent=id.report; $('fullPayoffHeading').textContent=id.full; $('prepaymentChargeLabel').textContent=id.charge; $('methodologyCountryNote').textContent=id.note;
    const symbol=L.currencySymbol(); qsa('.currency-prefix').forEach(n=>n.textContent=symbol); $('biweeklyOption').textContent=twoWeekLabel();
    const payBi=els.payFrequency.querySelector('option[value="biweekly"]'); if(payBi) payBi.textContent=twoWeekLabel();
    const inv=L.getRegion()==='IN'?'SIP Calculator':'Recurring Investment Calculator'; qsa('.investment-tool-link,.footer-investment-link').forEach(n=>n.textContent=inv);
    const faq=countryFaq(); $('countryFaqQuestion').textContent=faq.q; $('countryFaqAnswer').textContent=faq.a;
  }

  function readInput(){
    return {
      country:L.getRegion(),currency:L.getCurrency(),balance:num(els.balance.value),annualRatePct:num(els.annualRate.value),remainingYears:num(els.remainingYears.value),remainingMonths:num(els.remainingMonths.value),paymentFrequency:els.paymentFrequency.value,
      useCurrentPayment:els.useCurrentPayment.checked,currentPayment:num(els.currentPayment.value),mode,planningView,payFrequency:els.payFrequency.value,
      recurringEnabled:els.recurringEnabled.checked,recurringExtra:num(els.recurringExtra.value),extraFrequency:els.extraFrequency.value,extraStartPeriod:num(els.extraStartPeriod.value,1),customIntervalMonths:num(els.customIntervalMonths.value,3),optionalLumpSum:num(els.optionalLumpSum.value),optionalLumpSumPeriod:num(els.optionalLumpSumPeriod.value,1),
      lumpSumAmount:num(els.lumpSumAmount.value),lumpSumPeriod:num(els.lumpSumPeriod.value,1),lumpStrategy:els.lumpStrategy.value,targetYears:num(els.targetYears.value),targetMonths:num(els.targetMonths.value),targetLumpSum:num(els.targetLumpSum.value),prepaymentCharge:num(els.prepaymentCharge.value),otherCharges:num(els.otherCharges.value),startDate:new Date().toISOString().slice(0,10),rateMode:'fixed'
    };
  }

  const errors={balance:'Enter an outstanding balance greater than zero.',rate:'Enter an annual interest rate between 0% and 50%.',term:'Enter a remaining term greater than zero and no more than 100 years.',payment:'Enter a valid current repayment amount.', 'negative-amortization':'The entered repayment is not high enough to reduce principal under this model. Increase the repayment or use the modeled repayment.', 'recurring-selection':'Enable recurring part-prepayment only after entering an amount and choosing its frequency.',lump:'Enter a lump-sum amount greater than zero.',mode:'Choose a valid scenario mode.','safety-limit':'The model did not reach payoff within the supported period. Review the repayment and rate assumptions.'};
  function showError(code){ const text=errors[code]||'Review the entered values and try again.'; els.validationMessage.textContent=text; els.validationMessage.hidden=false; }
  function clearError(){ els.validationMessage.hidden=true; els.validationMessage.textContent=''; }

  function updatePanels(){
    qsa('[data-mode-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.modePanel!==mode));
    qsa('.mode-btn').forEach(b=>{const on=b.dataset.mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    qsa('.view-btn').forEach(b=>{const on=b.dataset.view===planningView;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    els.payCycleFields.classList.toggle('hidden',planningView!=='paycycle');
    els.currentPaymentField.classList.toggle('hidden',!els.useCurrentPayment.checked);
    els.recurringFields.classList.toggle('hidden',!els.recurringEnabled.checked);
    els.customIntervalField.classList.toggle('hidden',els.extraFrequency.value!=='custom');
  }

  function duration(periods,freq){ return C.durationLabel(periods,freq); }
  function messageFor(result,input){
    if(input.mode==='full') return `Modeled settlement: ${money(result.scenario.modeledSettlementTotal)} including ${money(result.scenario.totalUserEnteredCharges)} of charges you entered. Confirm the final amount with your lender.`;
    if(input.mode==='target' && result.scenario.targetLaterThanBaseline) return 'Your selected target is not earlier than the baseline payoff, so no additional repayment is required under this model.';
    if(input.mode==='recurring' && !input.recurringEnabled && input.optionalLumpSum<=0) return 'Recurring part-prepayment is currently off. The scenario matches the baseline until you enable an extra-payment plan.';
    if(input.mode==='lump' && input.lumpStrategy==='lower-payment') return `The modeled repayment falls to ${money(result.scenario.recastPayment)} while keeping the original payoff horizon. Your lender may not automatically recast the loan this way.`;
    if(result.periodsSaved>0) return `This scenario reaches modeled payoff ${duration(result.periodsSaved,input.paymentFrequency)} sooner and reduces modeled interest by ${money(result.interestSavedBeforeCharges)} before entered charges.`;
    return `This scenario changes modeled interest by ${money(result.interestSavedBeforeCharges)} with no earlier payoff under the current assumptions.`;
  }

  function renderResults(result,input){
    const b=result.baseline,s=result.scenario;
    els.baselinePaymentCaption.textContent='Baseline regular repayment'; els.scenarioPaymentCaption.textContent=input.mode==='full'?'Modeled settlement total':input.mode==='target'?'Required regular repayment':input.mode==='lump'&&input.lumpStrategy==='lower-payment'?'Modeled lower repayment':'Scenario regular repayment';
    els.baselinePayment.textContent=money(b.payment, {decimals:2});
    els.scenarioPayment.textContent=input.mode==='full'?money(s.modeledSettlementTotal,{decimals:2}):money(s.payment,{decimals:2});
    els.interestSaved.textContent=money(result.interestSavedBeforeCharges);
    els.timeSaved.textContent=duration(result.periodsSaved,input.paymentFrequency);
    els.baselinePayoff.textContent=dateLabel(b.payoffDate); els.scenarioPayoff.textContent=input.mode==='full'?'Now / lender settlement':dateLabel(s.payoffDate);
    els.enteredCharges.textContent=money(result.charges); els.netReduction.textContent=money(result.netModeledCostReduction);
    els.resultHeadline.textContent=input.mode==='full'?`Estimated lender settlement starts from ${money(input.balance)} principal.`:result.periodsSaved>0?`${duration(result.periodsSaved,input.paymentFrequency)} sooner to modeled payoff.`:input.mode==='lump'&&input.lumpStrategy==='lower-payment'?`Modeled repayment becomes ${money(s.recastPayment,{decimals:2})}.`:'Compare the two repayment paths.';
    els.resultSubtext.textContent=messageFor(result,input)+(result.messages?.length?` ${result.messages.join(' ')}`:'');
    els.chartBaselineEnd.textContent=`payoff ${dateLabel(b.payoffDate)}`; els.chartScenarioEnd.textContent=input.mode==='full'?'modeled full payoff now':`payoff ${dateLabel(s.payoffDate)}`;
  }

  function svgEl(name,attrs={}){ const el=document.createElementNS('http://www.w3.org/2000/svg',name); Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v))); return el; }
  function renderChart(result,input){
    const svg=els.balanceChart; while(svg.lastChild && !['title','desc'].includes(svg.lastChild.tagName?.toLowerCase())) svg.removeChild(svg.lastChild);
    const W=900,H=360,m={l:74,r:36,t:32,b:54}; const pw=W-m.l-m.r,ph=H-m.t-m.b; const b=result.baseline.ledger; const s=result.scenario.ledger||[]; const maxP=Math.max(1,b.length,s.length); const maxB=Math.max(1,input.balance);
    const x=p=>m.l+pw*(p/maxP), y=v=>m.t+ph*(1-v/maxB);
    for(let j=0;j<=4;j++){ const yy=m.t+ph*j/4; svg.appendChild(svgEl('line',{x1:m.l,y1:yy,x2:W-m.r,y2:yy,stroke:'#dbe5ea','stroke-width':1})); const t=svgEl('text',{x:m.l-10,y:yy+4,'text-anchor':'end',fill:'#62788c','font-size':12,'font-family':'Inter,system-ui,sans-serif'}); t.textContent=money(maxB*(1-j/4)); svg.appendChild(t); }
    const axis=svgEl('line',{x1:m.l,y1:m.t+ph,x2:W-m.r,y2:m.t+ph,stroke:'#91a5b3','stroke-width':1.3}); svg.appendChild(axis);
    function pathFor(rows,zeroImmediate=false){ const pts=[`${x(0)},${y(maxB)}`]; if(zeroImmediate) pts.push(`${x(1)},${y(0)}`); else rows.forEach(r=>pts.push(`${x(r.period)},${y(r.closingBalance)}`)); return `M${pts.join(' L')}`; }
    const p1=svgEl('path',{d:pathFor(b),fill:'none',stroke:'#7891a6','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'}); svg.appendChild(p1);
    const p2=svgEl('path',{d:pathFor(s,input.mode==='full'),fill:'none',stroke:'#0e827a','stroke-width':3.4,'stroke-linecap':'round','stroke-linejoin':'round'}); svg.appendChild(p2);
    const label1=svgEl('text',{x:Math.max(m.l,x(b.length)-8),y:m.t+ph-12,'text-anchor':'end',fill:'#61788d','font-size':12,'font-weight':800,'font-family':'Inter,system-ui,sans-serif'}); label1.textContent=`Baseline ${dateLabel(result.baseline.payoffDate)}`; svg.appendChild(label1);
    const scenarioX=input.mode==='full'?x(1):Math.max(m.l,x(s.length)-8); const label2=svgEl('text',{x:scenarioX,y:input.mode==='full'?m.t+ph-34:m.t+ph-32,'text-anchor':input.mode==='full'?'start':'end',fill:'#08736c','font-size':12,'font-weight':900,'font-family':'Inter,system-ui,sans-serif'}); label2.textContent=input.mode==='full'?'Scenario payoff now':`Scenario ${dateLabel(result.scenario.payoffDate)}`; svg.appendChild(label2);
    const xlabel=svgEl('text',{x:m.l+pw/2,y:H-15,'text-anchor':'middle',fill:'#62788c','font-size':12,'font-family':'Inter,system-ui,sans-serif'}); xlabel.textContent='Repayment periods / time'; svg.appendChild(xlabel);
  }

  function renderTables(result,input){
    const annual=result.annualSummary||[];
    if(!annual.length){ els.annualTableBody.innerHTML=`<tr><td colspan="7">Full payoff mode estimates an immediate settlement rather than a future amortization schedule.</td></tr>`; els.periodTableBody.innerHTML=`<tr><td colspan="7">No future repayment periods in full payoff mode.</td></tr>`; return; }
    els.annualTableBody.innerHTML=annual.map(r=>`<tr><td>Year ${r.year}</td><td>${money(r.openingBalance)}</td><td>${money(r.scheduledRepayments)}</td><td>${money(r.extraRepayments)}</td><td>${money(r.interestCharged)}</td><td>${money(r.principalRepaid)}</td><td>${money(r.closingBalance)}</td></tr>`).join('');
    els.periodTableBody.innerHTML=result.scenario.ledger.map(r=>`<tr><td>${r.period}</td><td>${r.date}</td><td>${money(r.openingBalance)}</td><td>${money(r.interest)}</td><td>${money(r.scheduledRepayment)}</td><td>${money(r.extraRepayment)}</td><td>${money(r.closingBalance)}</td></tr>`).join('');
  }

  function writeShared(result,input){
    if(!S||!result?.ok) return;
    const monthlyEquivalent=result.common.payment*result.common.m/12;
    S.setMany({
      'housingLoan.balance':{value:input.balance,currency:input.currency},
      'housingLoan.annualInterestRatePct':{value:input.annualRatePct},
      'housingLoan.remainingPeriods':{value:result.baseline.payoffPeriods},
      'housingLoan.paymentFrequency':{value:input.paymentFrequency},
      'housingLoan.regularPayment':{value:result.common.payment,currency:input.currency},
      'housingLoan.monthlyEquivalentPayment':{value:monthlyEquivalent,currency:input.currency},
      'housingLoan.modeledPayoffDate':{value:result.baseline.payoffDate}
    },{sourceTool:'mortgage-payoff-calculator'});
  }

  function render(){
    updatePanels(); clearError(); const input=readInput();
    if(planningView==='paycycle' && !userTouched && els.payFrequency.value==='monthly') els.payFrequency.value=countryDefaultPay();
    const result=C.calculate(input); lastResult=result;
    if(!result.ok){ showError(result.error); els.resultHeadline.textContent='Review the highlighted assumptions.'; els.resultSubtext.textContent=errors[result.error]||'The model could not calculate this scenario.'; return; }
    renderResults(result,input); renderChart(result,input); renderTables(result,input); writeShared(result,input);
    const setAside=C.setAsidePerPayCycle(input); els.setAsideAmount.textContent=money(setAside,{decimals:2}); els.setAsideCard.classList.toggle('hidden',!(planningView==='paycycle'&&input.recurringEnabled&&input.extraFrequency&&input.recurringExtra>0));
    const learn=resultLearn(input); $('resultLearnTitle').textContent=learn.title; $('resultLearnText').textContent=learn.text; $('resultLearnLink').setAttribute('href',learn.href);
  }

  function summaryText(){
    if(!lastResult?.ok) return '';
    const i=readInput(),r=lastResult;
    return [regionIdentity().product,'',`Country: ${L.getProfile().label}`,`Currency: ${L.getCurrency()}`,`Balance: ${money(i.balance)}`,`Annual rate: ${i.annualRatePct.toFixed(2)}%`,`Remaining duration: ${i.remainingYears} years ${i.remainingMonths} months`,`Scheduled repayment frequency: ${els.paymentFrequency.options[els.paymentFrequency.selectedIndex].text}`,`Planning view: ${planningView==='paycycle'?'Pay Cycle View':'Monthly View'}`,`Scenario: ${mode}`,`Baseline repayment: ${money(r.baseline.payment,{decimals:2})}`,`Baseline payoff: ${dateLabel(r.baseline.payoffDate)}`,`Scenario repayment: ${mode==='full'?money(r.scenario.modeledSettlementTotal,{decimals:2}):money(r.scenario.payment,{decimals:2})}`,`Scenario payoff: ${mode==='full'?'Immediate modeled settlement':dateLabel(r.scenario.payoffDate)}`,`Interest difference: ${money(r.interestSavedBeforeCharges)}`,`Time difference: ${duration(r.periodsSaved,i.paymentFrequency)}`,`Entered charges: ${money(r.charges)}`,`Net modeled cost reduction after entered charges: ${money(r.netModeledCostReduction)}`,'','Educational estimate only. Confirm actual payoff amounts, lender fees and prepayment rules with your lender.'].join('\n');
  }
  async function copySummary(){
    const text=summaryText(); if(!text)return; try{await navigator.clipboard.writeText(text);els.reportStatus.textContent='Summary copied.';}catch(_){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();els.reportStatus.textContent='Summary copied.';}
  }
  function csvEscape(v){ const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
  function downloadCsv(){
    if(!lastResult?.ok)return; const i=readInput(),r=lastResult;
    const rows=[['field','value'],['country',L.getRegion()],['currency',L.getCurrency()],['calculation_convention',r.common.convention],['balance',i.balance],['annual_rate_pct',i.annualRatePct],['remaining_periods',r.common.periods],['payment_frequency',i.paymentFrequency],['planning_view',planningView],['baseline_payment',r.baseline.payment],['baseline_total_interest',r.baseline.totalInterest],['baseline_payoff_date',r.baseline.payoffDate],['scenario_mode',mode],['recurring_extra',i.recurringEnabled?i.recurringExtra:0],['recurring_extra_frequency',i.recurringEnabled?i.extraFrequency:''],['recurring_extra_start_period',i.recurringEnabled?(i.extraStartPeriod||1):''],['recurring_custom_interval_months',i.recurringEnabled&&i.extraFrequency==='custom'?i.customIntervalMonths:''],['lump_sum',mode==='lump'?i.lumpSumAmount:i.optionalLumpSum],['lump_sum_period',mode==='lump'?i.lumpSumPeriod:(mode==='recurring'&&i.optionalLumpSum>0?i.optionalLumpSumPeriod:'')],['target_payoff_periods',mode==='target'?r.scenario.targetPeriods:''],['target_upfront_lump_sum',mode==='target'?i.targetLumpSum:''],['target_payoff_date',mode==='target'?(r.scenario.payoffDate||''):''],['user_entered_charges',r.charges],['scenario_total_interest',r.scenario.totalInterest||0],['scenario_payoff_date',r.scenario.payoffDate||''],['interest_saved',r.interestSavedBeforeCharges],['periods_saved',r.periodsSaved],['net_modeled_cost_reduction_after_entered_charges',r.netModeledCostReduction],['methodology_version','1.0.0'],[],['period','date','opening_balance','interest','scheduled_repayment','extra_repayment','principal_repaid','closing_balance']];
    for(const x of r.scenario.ledger||[]) rows.push([x.period,x.date,x.openingBalance,x.interest,x.scheduledRepayment,x.extraRepayment,x.principalRepaid,x.closingBalance]);
    const blob=new Blob([rows.map(row=>row.map(csvEscape).join(',')).join('\n')],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='carrowmont-mortgage-payoff-schedule.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000); els.reportStatus.textContent='CSV has been downloaded.';
  }
  async function generateReport(){
    if(!lastResult?.ok)return; try{els.reportStatus.textContent='Generating report...'; await window.CarrowmontMortgagePdfRenderer.generate({input:readInput(),result:lastResult,identity:regionIdentity(),planningView}); els.reportStatus.textContent='Report has been downloaded.';}catch(err){console.error(err);els.reportStatus.textContent='Could not generate the report.';}
  }

  function reset(){
    const region=L.getRegion(); const india=region==='IN'; els.balance.value=india?'5000000':'400000'; els.annualRate.value=india?'8.50':'6.00'; els.remainingYears.value='15';els.remainingMonths.value='0';els.paymentFrequency.value='monthly';els.useCurrentPayment.checked=false;els.currentPayment.value='0'; mode='recurring';planningView='monthly';els.recurringEnabled.checked=false;els.recurringExtra.value='0';els.extraFrequency.value='';els.extraStartPeriod.value='1';els.customIntervalMonths.value='3';els.optionalLumpSum.value='0';els.optionalLumpSumPeriod.value='1';els.lumpSumAmount.value=india?'500000':'25000';els.lumpSumPeriod.value='1';els.lumpStrategy.value='finish-sooner';els.targetYears.value='10';els.targetMonths.value='0';els.targetLumpSum.value='0';els.prepaymentCharge.value='0';els.otherCharges.value='0';els.payFrequency.value=countryDefaultPay();userTouched=false;render();
  }

  function bind(){
    qsa('.mode-btn').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render();})); qsa('.view-btn').forEach(b=>b.addEventListener('click',()=>{planningView=b.dataset.view;render();}));
    document.querySelector('.planner-card').addEventListener('input',e=>{if(e.target.matches('input,select'))userTouched=true;render();}); document.querySelector('.planner-card').addEventListener('change',e=>{if(e.target.matches('input,select'))userTouched=true;render();});
    els.regionSelect.addEventListener('change',()=>{L.setRegion(els.regionSelect.value); if(!userTouched) els.payFrequency.value=countryDefaultPay();}); els.currencySelect.addEventListener('change',()=>L.setCurrency(els.currencySelect.value));
    $('localeDone').addEventListener('click',()=>{els.localeMenu.open=false;}); window.addEventListener('carrowmont:localechange',()=>{syncLocaleUi();render();});
    $('resetBtn').addEventListener('click',reset); $('copyBtn').addEventListener('click',copySummary); $('csvBtn').addEventListener('click',downloadCsv); $('reportBtn').addEventListener('click',generateReport); $('clearSharedBtn').addEventListener('click',()=>{S?.clear();els.reportStatus.textContent='Shared Carrowmont plan values cleared from this browser.';});
  }

  populateLocale(); syncLocaleUi(); els.payFrequency.value=countryDefaultPay(); bind(); render();
})();
