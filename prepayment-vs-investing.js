(() => {
  'use strict';
  const M=window.CarrowmontMortgageCore;
  const C=window.CarrowmontMdc1aCore;
  const L=window.CarrowmontLocale;
  const P=window.CarrowmontMortgageDecisionProfile;
  const $=id=>document.getElementById(id);
  const qsa=s=>[...document.querySelectorAll(s)];
  let extraMode='lump';
  let lastResult=null;
  let profileDismissed=false;

  const els={
    regionSelect:$('regionSelect'),currencySelect:$('currencySelect'),localeCurrent:$('localeCurrent'),localeMenu:$('localeMenu'),
    balance:$('balance'),annualRate:$('annualRate'),remainingYears:$('remainingYears'),remainingMonths:$('remainingMonths'),paymentFrequency:$('paymentFrequency'),
    useCurrentPayment:$('useCurrentPayment'),currentPayment:$('currentPayment'),currentPaymentField:$('currentPaymentField'),extraAmount:$('extraAmount'),lumpSumPeriod:$('lumpSumPeriod'),lumpPeriodField:$('lumpPeriodField'),
    recurringFields:$('recurringFields'),extraFrequency:$('extraFrequency'),extraStartPeriod:$('extraStartPeriod'),customIntervalMonths:$('customIntervalMonths'),customIntervalField:$('customIntervalField'),
    assumedReturn:$('assumedReturn'),prepaymentCharge:$('prepaymentCharge'),validationMessage:$('validationMessage'),
    breakEvenValue:$('breakEvenValue'),breakEvenText:$('breakEvenText'),assumedOutcome:$('assumedOutcome'),interestAvoided:$('interestAvoided'),prepayPayoff:$('prepayPayoff'),timeSaved:$('timeSaved'),commonHorizon:$('commonHorizon'),enteredCharge:$('enteredCharge'),
    prepayEndingValue:$('prepayEndingValue'),investEndingValue:$('investEndingValue'),pathDifference:$('pathDifference'),endingValueNote:$('endingValueNote'),tablePrepayValue:$('tablePrepayValue'),tableInvestValue:$('tableInvestValue'),
    chartPrepayValue:$('chartPrepayValue'),chartInvestValue:$('chartInvestValue'),chartPrepayLabel:$('chartPrepayLabel'),chartInvestLabel:$('chartInvestLabel'),prepayBar:$('prepayBar'),investBar:$('investBar'),
    reportStatus:$('reportDownloadStatus'),profileBanner:$('profileBanner'),profileSummary:$('profileSummary')
  };

  function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
  function money(v,decimals=0){if(v==null||!Number.isFinite(Number(v)))return '—';return L.formatMoney(Number(v),{maximumFractionDigits:decimals,minimumFractionDigits:decimals});}
  function pct(v){return v==null||!Number.isFinite(Number(v))?'—':`${Number(v).toFixed(2)}%`;}
  function dateLabel(iso){if(!iso)return '—';const d=new Date(`${iso}T00:00:00Z`);try{return new Intl.DateTimeFormat(L.getLocale(),{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(d);}catch(_){return iso;}}
  function duration(periods,frequency){return M.durationLabel(Math.max(0,num(periods)),frequency);}
  function twoWeekLabel(){const p=L.getProfile();return p.twoWeekLabel==='fortnightly'?'Fortnightly':p.twoWeekLabel==='biweekly'?'Biweekly':'Every 2 Weeks';}

  function identity(region=L.getRegion()){
    const map={
      IN:{product:'Home Loan Prepayment vs Investing',title:'Should you prepay your home loan or invest the extra money?',balance:'Outstanding home loan balance',term:'Remaining loan tenure - years',current:'Current EMI / regular repayment',extraLump:'Part-prepayment amount',extraRecurring:'Recurring part-prepayment amount',extraFreq:'Part-Prepayment Frequency',charge:'Prepayment / foreclosure charge',payoff:'Prepay home loan payoff',breadcrumb:'Prepay vs Invest'},
      US:{product:'Mortgage Prepayment vs Investing',title:'Should you prepay your mortgage or invest the extra money?',balance:'Outstanding mortgage balance',term:'Remaining mortgage term - years',current:'Current mortgage payment',extraLump:'Extra principal lump sum',extraRecurring:'Recurring extra principal',extraFreq:'Extra Principal Frequency',charge:'Prepayment penalty / payoff charge',payoff:'Prepay mortgage payoff',breadcrumb:'Prepay vs Invest'},
      CA:{product:'Mortgage Prepayment vs Investing',title:'Should you prepay your mortgage or invest the extra money?',balance:'Outstanding mortgage balance',term:'Remaining amortization - years',current:'Current mortgage payment',extraLump:'Mortgage prepayment amount',extraRecurring:'Recurring mortgage prepayment',extraFreq:'Prepayment Frequency',charge:'Prepayment charge',payoff:'Prepay mortgage payoff',breadcrumb:'Prepay vs Invest'},
      GB:{product:'Mortgage Overpayment vs Investing',title:'Should you overpay your mortgage or invest the extra money?',balance:'Outstanding mortgage balance',term:'Remaining mortgage term - years',current:'Current mortgage payment',extraLump:'Mortgage overpayment amount',extraRecurring:'Recurring mortgage overpayment',extraFreq:'Overpayment Frequency',charge:'Early Repayment Charge (ERC)',payoff:'Overpay mortgage payoff',breadcrumb:'Overpay vs Invest'},
      IE:{product:'Mortgage Overpayment vs Investing',title:'Should you overpay your mortgage or invest the extra money?',balance:'Outstanding mortgage balance',term:'Remaining mortgage term - years',current:'Current mortgage payment',extraLump:'Mortgage overpayment amount',extraRecurring:'Recurring mortgage overpayment',extraFreq:'Overpayment Frequency',charge:'Early repayment charge',payoff:'Overpay mortgage payoff',breadcrumb:'Overpay vs Invest'},
      AU:{product:'Extra Home Loan Repayments vs Investing',title:'Should you make extra home loan repayments or invest the extra money?',balance:'Outstanding home loan balance',term:'Remaining loan term - years',current:'Current home loan repayment',extraLump:'Extra home loan repayment amount',extraRecurring:'Recurring extra repayment',extraFreq:'Extra Repayment Frequency',charge:'Early repayment / break charge',payoff:'Extra-repayment payoff',breadcrumb:'Extra Repayments vs Invest'},
      NZ:{product:'Extra Home Loan Repayments vs Investing',title:'Should you make extra home loan repayments or invest the extra money?',balance:'Outstanding home loan balance',term:'Remaining loan term - years',current:'Current mortgage / home loan repayment',extraLump:'Extra home loan repayment amount',extraRecurring:'Recurring extra repayment',extraFreq:'Extra Repayment Frequency',charge:'Break / early repayment charge',payoff:'Extra-repayment payoff',breadcrumb:'Extra Repayments vs Invest'}
    };
    return map[region]||{product:'Mortgage / Home Loan Prepayment vs Investing',title:'Should you prepay your mortgage or home loan, or invest the extra money?',balance:'Outstanding mortgage / home loan balance',term:'Remaining repayment term - years',current:'Current regular repayment',extraLump:'Prepayment / extra-payment amount',extraRecurring:'Recurring extra-payment amount',extraFreq:'Extra / Prepayment Frequency',charge:'Prepayment / early-repayment charge',payoff:'Prepay payoff',breadcrumb:'Prepay vs Invest'};
  }

  function populateLocale(){
    const regions=Object.entries(L.regions).sort((a,b)=>{if(a[0]==='OTHER')return 1;if(b[0]==='OTHER')return -1;return a[1].label.localeCompare(b[1].label,'en');});
    els.regionSelect.innerHTML=regions.map(([code,p])=>`<option value="${code}">${p.label}</option>`).join('');
    els.currencySelect.innerHTML=Object.entries(L.currencies).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,c])=>`<option value="${code}">${code} · ${c.label}</option>`).join('');
  }

  function syncLocaleUi(){
    const id=identity();
    els.regionSelect.value=L.getRegion();els.currencySelect.value=L.getCurrency();els.localeCurrent.textContent=`${L.getProfile().label} · ${L.getCurrency()}`;
    $('productLabel').textContent=id.product;$('footerProductName').textContent=id.product;$('footerProductBottom').textContent=id.product;$('toolTitle').textContent=id.title;$('breadcrumbCurrent').textContent=id.breadcrumb;
    $('balanceLabel').textContent=id.balance;$('termLabel').textContent=id.term;$('currentPaymentLabel').textContent=id.current;$('extraAmountLabel').textContent=extraMode==='lump'?id.extraLump:id.extraRecurring;$('extraFrequencyLabel').textContent=id.extraFreq;$('prepaymentChargeLabel').textContent=id.charge;$('payoffLabel').textContent=id.payoff;
    qsa('.currency-prefix').forEach(n=>n.textContent=L.currencySymbol());$('biweeklyOption').textContent=twoWeekLabel();
    refreshProfileBanner();
  }

  function readInput(){
    const rawReturn=els.assumedReturn.value.trim();
    return {
      country:L.getRegion(),currency:L.getCurrency(),balance:num(els.balance.value),annualRatePct:num(els.annualRate.value),remainingYears:num(els.remainingYears.value),remainingMonths:num(els.remainingMonths.value),paymentFrequency:els.paymentFrequency.value,
      useCurrentPayment:els.useCurrentPayment.checked,currentPayment:num(els.currentPayment.value),extraMode,extraAmount:num(els.extraAmount.value),lumpSumPeriod:num(els.lumpSumPeriod.value,1),extraFrequency:els.extraFrequency.value,extraStartPeriod:num(els.extraStartPeriod.value,1),customIntervalMonths:num(els.customIntervalMonths.value,3),
      prepaymentCharge:num(els.prepaymentCharge.value),assumedInvestmentReturnPct:rawReturn===''?'':Number(rawReturn),startDate:new Date().toISOString().slice(0,10),rateMode:'fixed'
    };
  }

  const errors={
    balance:'Enter an outstanding balance greater than zero.',rate:'Enter an annual interest rate between 0% and 50%.',term:'Enter a remaining term greater than zero and no more than 100 years.',payment:'Enter a valid current repayment amount.','negative-amortization':'The entered repayment is not high enough to reduce principal under this model. Increase the repayment or use the modeled repayment.','extra-mode':'Choose how the extra money is available.',extra:'Enter an extra-money amount greater than zero.','extra-frequency':'Choose the recurring extra-money frequency.','custom-interval':'Enter a custom interval between 1 and 120 months.','lump-period':'The lump-sum repayment number must be within the original modeled payoff schedule.',fee:'Enter a prepayment charge of zero or more.','investment-return':'Enter an assumed investment return greater than -100% and no more than +100%, or leave it blank.','cash-flow-invariant-negative':'The equal-cash-flow comparison could not be reconciled. Review the assumptions.','safety-limit':'The mortgage did not reach payoff within the supported period. Review the repayment and rate assumptions.'
  };
  function showError(code){els.validationMessage.textContent=errors[code]||'Review the entered values and try again.';els.validationMessage.hidden=false;}
  function clearError(){els.validationMessage.hidden=true;els.validationMessage.textContent='';}

  function updatePanels(){
    qsa('.mdc-mode-btn').forEach(b=>{const on=b.dataset.extraMode===extraMode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    els.lumpPeriodField.classList.toggle('mdc-hidden',extraMode!=='lump');els.recurringFields.classList.toggle('mdc-hidden',extraMode!=='recurring');els.currentPaymentField.classList.toggle('mdc-hidden',!els.useCurrentPayment.checked);els.customIntervalField.classList.toggle('mdc-hidden',extraMode!=='recurring'||els.extraFrequency.value!=='custom');
    const id=identity();$('extraAmountLabel').textContent=extraMode==='lump'?id.extraLump:id.extraRecurring;
  }

  function renderBreakEven(r){
    if(r.comparison.breakEvenReturnPct!=null){
      els.breakEvenValue.textContent=pct(r.comparison.breakEvenReturnPct);
      els.breakEvenText.textContent=`Under these cash-flow assumptions, both paths finish at approximately the same modeled value at the original mortgage payoff date when the investment return is about ${pct(r.comparison.breakEvenReturnPct)} effective annually.`;
    }else{
      els.breakEvenValue.textContent='No modeled crossing';
      els.breakEvenText.textContent=r.comparison.breakEvenStatus==='non-finite'?'A finite break-even return could not be calculated for these assumptions.':'No break-even return was found within the supported solver range of -99% to +500%. Carrowmont does not invent a threshold.';
    }
  }

  function renderAssumed(r){
    const cr=r.comparison.assumedReturnPct;
    if(cr==null){
      els.assumedOutcome.textContent='Enter a return';els.prepayEndingValue.textContent='—';els.investEndingValue.textContent='—';els.pathDifference.textContent='—';els.endingValueNote.textContent='Enter an assumed investment return to compare the ending values at the common horizon.';els.tablePrepayValue.textContent='Enter return';els.tableInvestValue.textContent='Enter return';els.chartPrepayValue.textContent='Enter an assumed return';els.chartInvestValue.textContent='Enter an assumed return';els.chartPrepayLabel.textContent='—';els.chartInvestLabel.textContent='—';els.prepayBar.style.width='0%';els.investBar.style.width='0%';return;
    }
    const diff=r.comparison.pathDifference;
    const abs=money(Math.abs(diff));
    let outcome;
    if(r.comparison.higherModeledPath==='approximately-equal') outcome=`Approximately equal at ${pct(cr)}`;
    else if(r.comparison.higherModeledPath==='prepay') outcome=`Prepay path ${abs} higher`;
    else outcome=`Invest path ${abs} higher`;
    els.assumedOutcome.textContent=outcome;
    els.prepayEndingValue.textContent=money(r.prepay.endingNetValue);els.investEndingValue.textContent=money(r.invest.endingValue);els.pathDifference.textContent=diff>=0?`${money(diff)} toward Prepay`:`${money(Math.abs(diff))} toward Invest`;
    els.endingValueNote.textContent=`At your ${pct(cr)} modeled effective annual return, ${outcome.toLowerCase()} at ${dateLabel(r.comparison.commonHorizonDate)}. This is a deterministic assumption, not a forecast.`;
    els.tablePrepayValue.textContent=money(r.prepay.endingNetValue);els.tableInvestValue.textContent=money(r.invest.endingValue);els.chartPrepayValue.textContent=money(r.prepay.endingNetValue);els.chartInvestValue.textContent=money(r.invest.endingValue);els.chartPrepayLabel.textContent=money(r.prepay.endingNetValue);els.chartInvestLabel.textContent=money(r.invest.endingValue);
    const a=Math.max(0,r.prepay.endingNetValue),b=Math.max(0,r.invest.endingValue),max=Math.max(1,a,b);els.prepayBar.style.width=`${Math.max(0,Math.min(100,a/max*100))}%`;els.investBar.style.width=`${Math.max(0,Math.min(100,b/max*100))}%`;
  }

  function renderResults(r){
    renderBreakEven(r);renderAssumed(r);els.interestAvoided.textContent=money(r.prepay.interestAvoided);els.prepayPayoff.textContent=dateLabel(r.prepay.payoffDate);els.timeSaved.textContent=duration(r.prepay.periodsSaved,r.input.paymentFrequency);els.commonHorizon.textContent=dateLabel(r.comparison.commonHorizonDate);els.enteredCharge.textContent=money(r.input.prepaymentCharge);
  }

  function clearCompletedResults(message='Enter valid assumptions to calculate the comparison.'){
    els.breakEvenValue.textContent='—';els.breakEvenText.textContent=message;els.assumedOutcome.textContent='—';els.interestAvoided.textContent='—';els.prepayPayoff.textContent='—';els.timeSaved.textContent='—';els.commonHorizon.textContent='—';els.enteredCharge.textContent='—';
    els.prepayEndingValue.textContent='—';els.investEndingValue.textContent='—';els.pathDifference.textContent='—';els.endingValueNote.textContent='Complete the comparison to see modeled ending values.';els.tablePrepayValue.textContent='—';els.tableInvestValue.textContent='—';els.chartPrepayValue.textContent='—';els.chartInvestValue.textContent='—';els.chartPrepayLabel.textContent='—';els.chartInvestLabel.textContent='—';els.prepayBar.style.width='0%';els.investBar.style.width='0%';
  }

  function render(){
    updatePanels();clearError();const result=C.calculate(readInput());lastResult=result;
    if(!result.ok){showError(result.error);clearCompletedResults(errors[result.error]||'The comparison could not be calculated.');return;}
    if(result.comparison?.applicable===false){showError('extra');clearCompletedResults(errors.extra);return;}
    renderResults(result);
  }

  function profileFromCurrent(){
    if(!lastResult?.ok)return null;const i=lastResult.input;return {country:i.country,currency:i.currency,balance:i.balance,annualRatePct:i.annualRatePct,remainingYears:i.remainingYears,remainingMonths:i.remainingMonths,paymentFrequency:i.paymentFrequency,useCurrentPayment:i.useCurrentPayment,currentPayment:i.currentPayment};
  }
  function refreshProfileBanner(){
    const p=P.read();els.profileBanner.hidden=!p||profileDismissed;if(!p)return;const locale=L.regions[p.country]?.locale||L.getLocale();let formatted;try{formatted=new Intl.NumberFormat(locale,{style:'currency',currency:p.currency,maximumFractionDigits:0}).format(p.balance);}catch(_){formatted=`${p.currency} ${Math.round(p.balance).toLocaleString()}`;}els.profileSummary.textContent=`${formatted} balance · ${p.annualRatePct.toFixed(2)}% · ${p.remainingYears}y ${p.remainingMonths}m · ${p.paymentFrequency}. Nothing is applied until you choose Use these loan details.`;
  }
  function applyProfile(){
    const p=P.read();if(!p)return;els.balance.value=String(p.balance);els.annualRate.value=String(p.annualRatePct);els.remainingYears.value=String(p.remainingYears);els.remainingMonths.value=String(p.remainingMonths);els.paymentFrequency.value=p.paymentFrequency;els.useCurrentPayment.checked=Boolean(p.useCurrentPayment);els.currentPayment.value=p.useCurrentPayment?String(p.currentPayment):'0';profileDismissed=true;L.setLocale(p.country,p.currency);render();els.reportStatus.textContent='Saved mortgage details applied after validation.';
  }
  function saveProfile(){const p=profileFromCurrent();if(!p){els.reportStatus.textContent='Enter valid mortgage details before saving.';return;}const res=P.write(p);els.reportStatus.textContent=res.ok?'Mortgage details saved locally for the Decision Centre.':'Could not save mortgage details in this browser.';profileDismissed=false;refreshProfileBanner();}
  function clearProfile(){P.clear();profileDismissed=false;refreshProfileBanner();els.reportStatus.textContent='Saved mortgage details cleared. Country/currency preferences were not changed.';}

  function summaryText(){
    if(!lastResult?.ok||lastResult.comparison?.applicable===false)return '';const r=lastResult,i=r.input;const lines=[identity().product,'',`Country: ${L.getProfile().label}`,`Currency: ${i.currency}`,`Outstanding balance: ${money(i.balance)}`,`Mortgage rate: ${i.annualRatePct.toFixed(2)}%`,`Remaining term: ${i.remainingYears} years ${i.remainingMonths} months`,`Scheduled repayment frequency: ${i.paymentFrequency}`,`Baseline scheduled repayment: ${money(r.baseline.payment,2)}`,`Extra-money mode: ${i.extraMode}`,`Extra amount: ${money(i.extraAmount)}`];
    if(i.extraMode==='lump')lines.push(`Apply lump sum at repayment #: ${i.lumpSumPeriod}`);else lines.push(`Extra frequency: ${i.extraFrequency}`,`First extra event / start period: ${i.extraStartPeriod}`);
    lines.push(`Prepayment charge: ${money(i.prepaymentCharge)}`,`Common horizon: ${dateLabel(r.comparison.commonHorizonDate)}`,`Break-even effective annual investment return: ${r.comparison.breakEvenReturnPct==null?'No modeled crossing':pct(r.comparison.breakEvenReturnPct)}`,`Interest avoided by prepayment: ${money(r.prepay.interestAvoided)}`,`Prepay payoff: ${dateLabel(r.prepay.payoffDate)}`,`Time saved: ${duration(r.prepay.periodsSaved,i.paymentFrequency)}`);
    if(r.comparison.assumedReturnPct!=null)lines.push(`Assumed effective annual investment return: ${pct(r.comparison.assumedReturnPct)}`,`Prepay path ending net value: ${money(r.prepay.endingNetValue)}`,`Invest path ending value: ${money(r.invest.endingValue)}`,`Difference at assumed return: ${money(Math.abs(r.comparison.pathDifference))} toward ${r.comparison.higherModeledPath==='prepay'?'Prepay':r.comparison.higherModeledPath==='invest'?'Invest':'approximately equal'}`);else lines.push('Assumed investment return: Not entered');
    lines.push('','Investment returns are uncertain. Mortgage interest savings are comparatively predictable once the modeled loan terms and entered charges are correct. Educational estimate only; not investment, lending, tax or legal advice.','https://carrowmont.com/mortgage-payoff-calculator/prepayment-vs-investing.html');return lines.join('\n');
  }
  async function copySummary(){const text=summaryText();if(!text)return;try{await navigator.clipboard.writeText(text);}catch(_){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}els.reportStatus.textContent='Summary copied.';}
  async function generateReport(){if(!lastResult?.ok||lastResult.comparison?.applicable===false)return;try{els.reportStatus.textContent='Generating report...';await window.CarrowmontPrepayInvestPdfRenderer.generate({result:lastResult,identity:identity()});els.reportStatus.textContent='Report has been downloaded.';}catch(err){console.error(err);els.reportStatus.textContent='Could not generate the report.';}}

  function reset(){
    const india=L.getRegion()==='IN';els.balance.value=india?'5000000':'400000';els.annualRate.value=india?'8.50':'6.00';els.remainingYears.value='15';els.remainingMonths.value='0';els.paymentFrequency.value='monthly';els.useCurrentPayment.checked=false;els.currentPayment.value='0';extraMode='lump';els.extraAmount.value=india?'500000':'25000';els.lumpSumPeriod.value='1';els.extraFrequency.value='';els.extraStartPeriod.value='1';els.customIntervalMonths.value='3';els.assumedReturn.value='';els.prepaymentCharge.value='0';render();
  }

  function bind(){
    qsa('.mdc-mode-btn').forEach(b=>b.addEventListener('click',()=>{extraMode=b.dataset.extraMode;render();}));
    document.querySelector('.mdc-input-card').addEventListener('input',e=>{if(e.target.matches('input,select'))render();});document.querySelector('.mdc-input-card').addEventListener('change',e=>{if(e.target.matches('input,select'))render();});
    els.regionSelect.addEventListener('change',()=>L.setRegion(els.regionSelect.value));els.currencySelect.addEventListener('change',()=>L.setCurrency(els.currencySelect.value));$('localeDone').addEventListener('click',()=>{els.localeMenu.open=false;});window.addEventListener('carrowmont:localechange',()=>{syncLocaleUi();render();});
    $('resetBtn').addEventListener('click',reset);$('copyBtn').addEventListener('click',copySummary);$('reportBtn').addEventListener('click',generateReport);$('saveProfileBtn').addEventListener('click',saveProfile);$('clearProfileBtn').addEventListener('click',clearProfile);$('applyProfileBtn').addEventListener('click',applyProfile);$('startFreshBtn').addEventListener('click',()=>{profileDismissed=true;refreshProfileBanner();els.reportStatus.textContent='Starting fresh. Saved details were not applied.';});
  }

  populateLocale();syncLocaleUi();bind();render();
})();
