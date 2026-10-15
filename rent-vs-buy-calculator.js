(function(){
  'use strict';
  const L=()=>window.CarrowmontLocale;
  const C=()=>window.CarrowmontRentVsBuyCore;
  const $=id=>document.getElementById(id);
  let downMode='amount',buyCostMode='amount',lastResult=null;
  const ids=['homePrice','downPayment','downPaymentPct','loanRate','loanTermYears','monthlyRent','stayYears','homeGrowth','rentGrowth','investmentReturn','otherCostGrowth','upfrontBuyingCosts','upfrontBuyingCostsPct','propertyTaxAnnual','homeInsuranceAnnual','maintenanceAnnual','associationMonthly','loanInsuranceMonthly','otherOwnerMonthly','sellingCostPct','rentalDeposit','otherRentUpfront','renterOnlyMonthly'];
  function n(id){ const v=$(id)?.value; return v===''?NaN:Number(v); }
  function money(v){ return L().formatMoney(Number(v)||0,{maximumFractionDigits:0}); }
  function pct(v){ return `${Number(v||0).toFixed(2).replace(/\.00$/,'')}%`; }
  function terms(){ return L().getMortgageTerms(L().getRegion()); }
  function regionFamily(){ const r=L().getRegion(); return ['IN','AU','NZ'].includes(r)?'home-loan':['US','CA','GB','IE'].includes(r)?'mortgage':'loan'; }
  function setHidden(id,hidden){ $(id).hidden=Boolean(hidden); }
  function setModeButtons(a,b,mode){ $(a).classList.toggle('active',mode==='amount'); $(b).classList.toggle('active',mode==='percent'); }
  function currentDownPayment(){
    const price=Math.max(0,n('homePrice')||0);
    return downMode==='percent'?price*Math.max(0,n('downPaymentPct')||0)/100:Math.max(0,n('downPayment')||0);
  }
  function currentBuyingCosts(){
    const price=Math.max(0,n('homePrice')||0);
    return buyCostMode==='percent'?price*Math.max(0,n('upfrontBuyingCostsPct')||0)/100:Math.max(0,n('upfrontBuyingCosts')||0);
  }
  function syncModeDisplays(){
    setModeButtons('downModeAmount','downModePercent',downMode); setHidden('downAmountWrap',downMode!=='amount'); setHidden('downPercentWrap',downMode!=='percent');
    setModeButtons('buyCostModeAmount','buyCostModePercent',buyCostMode); setHidden('buyCostAmountWrap',buyCostMode!=='amount'); setHidden('buyCostPercentWrap',buyCostMode!=='percent');
    const price=Math.max(0,n('homePrice')||0),dp=currentDownPayment(),bc=currentBuyingCosts();
    $('downPaymentHelp').textContent=price>0?`${(dp/price*100).toFixed(1).replace(/\.0$/,'')}% of the entered home price · ${money(dp)}.`:`${money(dp)} entered.`;
    $('buyCostAmountHelp').textContent=`Amount included in the model: ${money(bc)}.`;
  }
  function populateLocale(){
    const regionSel=$('regionSelect'),currencySel=$('currencySelect'); regionSel.innerHTML=''; currencySel.innerHTML='';
    Object.entries(L().regions).sort((a,b)=>a[0]==='OTHER'?1:b[0]==='OTHER'?-1:a[1].label.localeCompare(b[1].label)).forEach(([code,p])=>{const o=document.createElement('option');o.value=code;o.textContent=p.label;regionSel.appendChild(o);});
    Object.entries(L().currencies).sort((a,b)=>a[1].label.localeCompare(b[1].label)).forEach(([code,p])=>{const o=document.createElement('option');o.value=code;o.textContent=`${p.label} (${code})`;currencySel.appendChild(o);});
    regionSel.value=L().getRegion(); currencySel.value=L().getCurrency(); updateLocaleCopy();
  }
  function updateLocaleCopy(){
    const r=L().getRegion(),profile=L().getProfile(),t=terms(),family=regionFamily();
    $('localeCurrent').textContent=`${profile.label} · ${L().getCurrency()}`;
    $('loanRateLabel').textContent=family==='home-loan'?'Home loan interest rate':family==='mortgage'?'Mortgage interest rate':'Mortgage / home loan interest rate';
    $('loanTermLabel').textContent=family==='home-loan'?'Home loan term':family==='mortgage'?'Mortgage term':'Mortgage / home loan term';
    $('loanInsuranceLabel').textContent=family==='home-loan'?'Home-loan insurance each month':family==='mortgage'?'Mortgage insurance each month':'Loan insurance each month';
    $('startLoanPaymentLabel').textContent=r==='IN'?'Starting EMI / home-loan payment':['AU','NZ'].includes(r)?'Starting home-loan repayment':family==='mortgage'?'Starting mortgage payment':'Starting loan payment';
    $('payoffLinkLabel').textContent=family==='home-loan'?'Home Loan Payoff Calculator':family==='mortgage'?'Mortgage Payoff Calculator':'Mortgage / Home Loan Payoff Calculator';
    const examples={
      IN:'Examples can include stamp duty, registration, legal / documentation costs and buyer-paid brokerage where applicable.',
      US:'Examples can include closing / settlement, lender, appraisal, title and government fees where applicable.',
      CA:'Examples can include closing costs, legal fees, inspection, title insurance and local transfer charges where applicable.',
      GB:'Examples can include purchase tax where applicable, legal / conveyancing, survey and mortgage fees.',
      IE:'Examples can include purchase tax where applicable, legal / conveyancing, survey and mortgage fees.',
      AU:'Examples can include stamp / transfer duty where applicable, legal / conveyancing, inspection and lender costs.',
      NZ:'Examples can include legal / conveyancing, inspection and lender costs where applicable.'
    };
    $('buyingCostHelp').textContent=`Enter local purchase costs you know. ${examples[r]||'Examples can include local purchase, legal, lender, registration and transfer costs.'} Carrowmont does not calculate local taxes automatically.`;
    document.querySelectorAll('.currency-prefix').forEach(el=>el.textContent=L().currencySymbol());
    document.title='Rent vs Buy Calculator | Compare Renting and Buying | Carrowmont';
    L().applyMortgageCopy?.(); syncModeDisplays();
  }
  function readInputs(){
    return {country:L().getRegion(),currency:L().getCurrency(),homePrice:n('homePrice'),downPayment:currentDownPayment(),annualLoanRatePct:n('loanRate'),loanTermYears:n('loanTermYears'),monthlyRent:n('monthlyRent'),stayYears:n('stayYears'),upfrontBuyingCosts:currentBuyingCosts(),propertyTaxAnnual:n('propertyTaxAnnual'),homeInsuranceAnnual:n('homeInsuranceAnnual'),maintenanceAnnual:n('maintenanceAnnual'),associationMonthly:n('associationMonthly'),loanInsuranceMonthly:n('loanInsuranceMonthly'),otherOwnerMonthly:n('otherOwnerMonthly'),sellingCostPct:n('sellingCostPct'),refundableRentalDeposit:n('rentalDeposit'),otherUpfrontRentingCosts:n('otherRentUpfront'),renterOnlyMonthly:n('renterOnlyMonthly'),homeGrowthPct:n('homeGrowth'),rentGrowthPct:n('rentGrowth'),investmentReturnPct:n('investmentReturn'),otherHousingGrowthPct:n('otherCostGrowth')};
  }
  function errorText(code){
    return ({'home-price':'Enter a home price above 0.','monthly-rent':'Enter monthly rent of 0 or more.','down-payment':'Down payment cannot be negative or more than the home price.','loan-term':'Enter a loan term from 1 to 40 years.','loan-rate':'Enter a loan interest rate from 0% to 50%.','stay-years':'Enter how long you expect to stay, from 1 to 40 whole years.','cost':'Buying and renting costs cannot be negative.','selling-cost':'Enter selling costs from 0% to 50%.','assumption-rate':'Growth and return assumptions must be greater than -100%.'})[code]||'Check the entered assumptions.';
  }
  function crossoverText(c){
    if(!c) return '—';
    if(c.state==='stable-crossover') return `${c.newLeader==='buy'?'Buying':'Renting'} moves ahead from about year ${(c.month/12).toFixed(1)} and stays ahead`;
    if(c.state==='buy-ahead-throughout') return 'Buying is ahead throughout the modeled period';
    if(c.state==='rent-ahead-throughout') return 'Renting + investing is ahead throughout the modeled period';
    if(c.state==='approximately-even-throughout') return 'Approximately even throughout';
    return 'No single stable break-even point within this period';
  }
  function headlineFor(r){
    const y=r.input.stayYears,d=Math.abs(r.comparison.wealthDifference);
    if(r.comparison.leader==='even') return `The two paths are very close after ${y} ${y===1?'year':'years'}.`;
    return r.comparison.leader==='buy'?`Under these assumptions, buying is ahead by ${money(d)} after ${y} ${y===1?'year':'years'}.`:`Under these assumptions, renting + investing is ahead by ${money(d)} after ${y} ${y===1?'year':'years'}.`;
  }
  function renderChart(r){
    const g=$('wealthChartPlot'); g.innerHTML=''; const s=r.comparison.series; if(!s.length)return;
    const W=800,H=300,x0=62,y0=20,w=716,h=230; const vals=s.flatMap(p=>[p.buyWealth,p.rentWealth]); let min=Math.min(0,...vals),max=Math.max(0,...vals); if(max-min<1){max+=1;min-=1;}
    const x=m=>x0+(m/s[s.length-1].month)*w, y=v=>y0+(max-v)/(max-min)*h;
    const ns='http://www.w3.org/2000/svg'; const line=(x1,y1,x2,y2,cls)=>{const e=document.createElementNS(ns,'line');e.setAttribute('x1',x1);e.setAttribute('y1',y1);e.setAttribute('x2',x2);e.setAttribute('y2',y2);e.setAttribute('class',cls);g.appendChild(e);};
    for(let k=0;k<=4;k++){const yy=y0+h*k/4;line(x0,yy,x0+w,yy,'rent1-chart-grid'); const value=max-(max-min)*k/4; const t=document.createElementNS(ns,'text');t.setAttribute('x',x0-8);t.setAttribute('y',yy+4);t.setAttribute('text-anchor','end');t.setAttribute('class','rent1-chart-label');t.textContent=L().formatCompactMoney(value,{maximumFractionDigits:1});g.appendChild(t);} line(x0,y0,x0,y0+h,'rent1-chart-axis');line(x0,y0+h,x0+w,y0+h,'rent1-chart-axis');
    function path(key,cls){const step=Math.max(1,Math.ceil(s.length/180));let d='';s.forEach((p,i)=>{if(i%step&&i!==s.length-1)return;d+=`${d?'L':'M'} ${x(p.month).toFixed(2)} ${y(p[key]).toFixed(2)} `;});const e=document.createElementNS(ns,'path');e.setAttribute('d',d);e.setAttribute('class',cls);g.appendChild(e);} path('buyWealth','rent1-buy-line');path('rentWealth','rent1-rent-line');
    if(r.comparison.crossover?.state==='stable-crossover'){
      const cx=x(r.comparison.crossover.month);line(cx,y0,cx,y0+h,'rent1-crossover-line');
      const ct=document.createElementNS(ns,'text');ct.setAttribute('x',Math.min(x0+w-6,cx+7));ct.setAttribute('y',y0+14);ct.setAttribute('class','rent1-crossover-label');ct.textContent=`Stable crossover · year ${(r.comparison.crossover.month/12).toFixed(1)}`;g.appendChild(ct);
    }
    const end=document.createElementNS(ns,'text');end.setAttribute('x',x0+w);end.setAttribute('y',y0+h+25);end.setAttribute('text-anchor','end');end.setAttribute('class','rent1-chart-label');end.textContent=`${r.input.stayYears} years`;g.appendChild(end); const start=document.createElementNS(ns,'text');start.setAttribute('x',x0);start.setAttribute('y',y0+h+25);start.setAttribute('class','rent1-chart-label');start.textContent='Start';g.appendChild(start);
  }
  function renderCheckpoints(r){
    const body=$('checkpointRows');body.innerHTML='';
    for(let year=1;year<=r.input.stayYears;year++){
      const p=r.comparison.series[Math.min(r.comparison.series.length-1,year*12-1)];const tr=document.createElement('tr');
      tr.innerHTML=`<td>${year}</td><td>${money(p.homeValue)}</td><td>${money(p.loanBalance)}</td><td>${money(p.buyWealth)}</td><td>${money(p.rentWealth)}</td><td>${money(p.difference)}</td>`;body.appendChild(tr);
    }
  }
  function render(r){
    lastResult=r; $('validation').hidden=true; $('headline').textContent=headlineFor(r); $('headlineNote').textContent='This is a scenario comparison, not a recommendation to rent or buy.';
    $('buyWealth').textContent=money(r.buying.endWealth);$('rentWealth').textContent=money(r.renting.endWealth);$('buyUpfront').textContent=money(r.upfront.buyerUpfront);$('rentUpfront').textContent=money(r.upfront.renterUpfront);$('buyHousingCost').textContent=money(r.monthly.startingBuyerOutflow);$('rentHousingCost').textContent=money(r.monthly.startingRenterOutflow);$('loanPayment').textContent=money(r.loan.scheduledPayment);$('startRent').textContent=money(r.input.monthlyRent);$('homeEquity').textContent=money(r.buying.netHomeSaleProceeds);$('crossover').textContent=crossoverText(r.comparison.crossover);
    $('buyHomeValue').textContent=money(r.buying.projectedHomeValue);$('buyLoanBalance').textContent=money(r.loan.remainingBalance);$('buyInterest').textContent=money(r.loan.totalInterest);$('buyOwnerCosts').textContent=money(r.buying.ownerRecurringCosts);$('buySellingCosts').textContent=money(r.buying.sellingCost);$('buyInvestments').textContent=money(r.buying.investmentBalance);
    $('rentPaid').textContent=money(r.renting.totalRentPaid);$('rentOtherCosts').textContent=money(r.renting.renterRecurringCosts);$('rentDeposit').textContent=money(r.renting.depositReturned);$('rentInvestments').textContent=money(r.renting.investmentBalance);$('rentInvestmentBalance').textContent=money(r.renting.investmentBalance);$('rentNetWealth').textContent=money(r.renting.endWealth);
    $('chartHeadline').textContent=headlineFor(r); renderChart(r);renderCheckpoints(r);
  }
  function recalculate(){
    syncModeDisplays(); const r=C().calculate(readInputs()); if(!r.ok){lastResult=null;$('validation').hidden=false;$('validation').textContent=errorText(r.error);$('headline').textContent='Check the highlighted assumptions before comparing.';return r;} render(r); return r;
  }
  function summaryText(){
    const r=lastResult;if(!r)return'';const t=terms();const d=Math.abs(r.comparison.wealthDifference);const diff=r.comparison.leader==='even'?'Difference: approximately even under these assumptions.':`Difference: ${money(d)} in favor of ${r.comparison.leader==='buy'?'buying':'renting + investing'} under these assumptions.`;
    return [`Carrowmont Rent vs Buy Calculator`,`Period: ${r.input.stayYears} years`,headlineFor(r),`Country: ${L().getProfile().label} · Currency: ${L().getCurrency()}`,`Home price: ${money(r.input.homePrice)}`,`Down payment: ${money(r.input.downPayment)}`,`${t.nounCap} amount: ${money(r.loan.principal)}`,`${t.nounCap} interest rate: ${pct(r.input.annualLoanRatePct)}`,`Buying projected wealth: ${money(r.buying.endWealth)}`,`Renting + investing projected wealth: ${money(r.renting.endWealth)}`,diff,`Buy cash needed upfront: ${money(r.upfront.buyerUpfront)}`,`Rent cash needed upfront: ${money(r.upfront.renterUpfront)}`,`Starting buy housing cost: ${money(r.monthly.startingBuyerOutflow)}/month`,`Starting rent housing cost: ${money(r.monthly.startingRenterOutflow)}/month`,`Projected home value: ${money(r.buying.projectedHomeValue)}`,`Remaining loan balance: ${money(r.loan.remainingBalance)}`,`Stable crossover: ${crossoverText(r.comparison.crossover)}`,`Assumptions: home value ${pct(r.input.homeGrowthPct)}/year; rent ${pct(r.input.rentGrowthPct)}/year; money kept invested ${pct(r.input.investmentReturnPct)}/year; other housing costs ${pct(r.input.otherHousingGrowthPct)}/year.`,`Scenario estimate only; not financial, lending, tax, legal or property advice.`].join('\n');
  }
  async function copySummary(){
    const text=summaryText();if(!text)return;try{if(!navigator.clipboard?.writeText)throw new Error('blocked');await navigator.clipboard.writeText(text);$('actionStatus').textContent='Summary copied.';}catch(_){$('actionStatus').textContent='Could not copy automatically. Your browser may block clipboard access.';}
  }
  async function generateReport(){
    if(!lastResult)return; $('actionStatus').textContent='Preparing 3-page report…';try{await window.CarrowmontRentVsBuyPdfRenderer.generate({result:lastResult,summary:summaryText(),identity:{product:'Rent vs Buy Calculator',terms:terms(),country:L().getProfile().label,currency:L().getCurrency()}});$('actionStatus').textContent='Report downloaded.';}catch(err){console.error(err);$('actionStatus').textContent='Could not generate the report in this browser.';}
  }
  function bindModes(){
    $('downModeAmount').addEventListener('click',()=>{if(downMode!=='amount'){$('downPayment').value=String(Math.round(currentDownPayment()));downMode='amount';recalculate();}});
    $('downModePercent').addEventListener('click',()=>{if(downMode!=='percent'){const price=n('homePrice')||0,p=currentDownPayment();$('downPaymentPct').value=price>0?(p/price*100).toFixed(2):'0';downMode='percent';recalculate();}});
    $('buyCostModeAmount').addEventListener('click',()=>{if(buyCostMode!=='amount'){$('upfrontBuyingCosts').value=String(Math.round(currentBuyingCosts()));buyCostMode='amount';recalculate();}});
    $('buyCostModePercent').addEventListener('click',()=>{if(buyCostMode!=='percent'){const price=n('homePrice')||0,p=currentBuyingCosts();$('upfrontBuyingCostsPct').value=price>0?(p/price*100).toFixed(2):'0';buyCostMode='percent';recalculate();}});
  }
  function reset(){
    const values={homePrice:8000000,downPayment:1600000,downPaymentPct:20,loanRate:8.5,loanTermYears:20,monthlyRent:28000,stayYears:10,homeGrowth:5,rentGrowth:5,investmentReturn:7,otherCostGrowth:5,upfrontBuyingCosts:400000,upfrontBuyingCostsPct:5,propertyTaxAnnual:20000,homeInsuranceAnnual:12000,maintenanceAnnual:80000,associationMonthly:3000,loanInsuranceMonthly:0,otherOwnerMonthly:0,sellingCostPct:2,rentalDeposit:56000,otherRentUpfront:0,renterOnlyMonthly:0};Object.entries(values).forEach(([id,v])=>{$(id).value=v;});downMode='amount';buyCostMode='amount';$('actionStatus').textContent='';recalculate();
  }
  function init(){
    populateLocale(); bindModes(); ids.forEach(id=>$(id)?.addEventListener('input',recalculate)); $('resetBtn').addEventListener('click',reset);$('copyBtn').addEventListener('click',copySummary);$('reportBtn').addEventListener('click',generateReport);
    $('regionSelect').addEventListener('change',()=>{L().setRegion($('regionSelect').value);$('currencySelect').value=L().getCurrency();updateLocaleCopy();recalculate();});$('currencySelect').addEventListener('change',()=>{L().setCurrency($('currencySelect').value);updateLocaleCopy();recalculate();});$('localeDone').addEventListener('click',()=>{$('localeMenu').open=false;});window.addEventListener('carrowmont:localechange',()=>{updateLocaleCopy();});recalculate();
  }
  window.CarrowmontRentVsBuyApp={readInputs,recalculate,summaryText,getLastResult:()=>lastResult}; init();
})();
