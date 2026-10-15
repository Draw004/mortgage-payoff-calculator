(function(){
  'use strict';
  const VERSION='RENT1-1.0';
  const EPS=1e-7;
  const MAX_LOAN_RATE=50;
  const MAX_SELLING_COST=50;
  const MAX_POSITIVE_ASSUMPTION=1000;

  function finite(v){ const n=Number(v); return Number.isFinite(n)?n:NaN; }
  function monthlyEffective(pct){ const r=pct/100; return Math.pow(1+r,1/12)-1; }
  function scheduledPayment(principal,annualRatePct,months){
    if(!(principal>0)||!(months>0)) return 0;
    const r=annualRatePct/1200;
    if(Math.abs(r)<1e-15) return principal/months;
    return principal*r/(1-Math.pow(1+r,-months));
  }
  function normalize(raw={}){
    return {
      country:String(raw.country||'OTHER'), currency:String(raw.currency||'USD'),
      homePrice:finite(raw.homePrice), downPayment:finite(raw.downPayment), annualLoanRatePct:finite(raw.annualLoanRatePct),
      loanTermYears:finite(raw.loanTermYears), monthlyRent:finite(raw.monthlyRent), stayYears:finite(raw.stayYears),
      upfrontBuyingCosts:finite(raw.upfrontBuyingCosts||0), propertyTaxAnnual:finite(raw.propertyTaxAnnual||0),
      homeInsuranceAnnual:finite(raw.homeInsuranceAnnual||0), maintenanceAnnual:finite(raw.maintenanceAnnual||0),
      associationMonthly:finite(raw.associationMonthly||0), loanInsuranceMonthly:finite(raw.loanInsuranceMonthly||0),
      otherOwnerMonthly:finite(raw.otherOwnerMonthly||0), sellingCostPct:finite(raw.sellingCostPct||0),
      refundableRentalDeposit:finite(raw.refundableRentalDeposit||0), otherUpfrontRentingCosts:finite(raw.otherUpfrontRentingCosts||0),
      renterOnlyMonthly:finite(raw.renterOnlyMonthly||0), homeGrowthPct:finite(raw.homeGrowthPct), rentGrowthPct:finite(raw.rentGrowthPct),
      investmentReturnPct:finite(raw.investmentReturnPct), otherHousingGrowthPct:finite(raw.otherHousingGrowthPct)
    };
  }
  function invalidNonNegative(v){ return !Number.isFinite(v)||v<0; }
  function validate(i){
    if(!(i.homePrice>0)) return 'home-price';
    if(invalidNonNegative(i.monthlyRent)) return 'monthly-rent';
    if(invalidNonNegative(i.downPayment)||i.downPayment>i.homePrice) return 'down-payment';
    const loan=i.homePrice-i.downPayment;
    if(loan>EPS && (!Number.isFinite(i.loanTermYears)||i.loanTermYears<1||i.loanTermYears>40)) return 'loan-term';
    if(loan>EPS && (!Number.isFinite(i.annualLoanRatePct)||i.annualLoanRatePct<0||i.annualLoanRatePct>MAX_LOAN_RATE)) return 'loan-rate';
    if(!Number.isFinite(i.stayYears)||i.stayYears<1||i.stayYears>40||Math.round(i.stayYears)!==i.stayYears) return 'stay-years';
    const nonneg=['upfrontBuyingCosts','propertyTaxAnnual','homeInsuranceAnnual','maintenanceAnnual','associationMonthly','loanInsuranceMonthly','otherOwnerMonthly','refundableRentalDeposit','otherUpfrontRentingCosts','renterOnlyMonthly'];
    if(nonneg.some(k=>invalidNonNegative(i[k]))) return 'cost';
    if(!Number.isFinite(i.sellingCostPct)||i.sellingCostPct<0||i.sellingCostPct>MAX_SELLING_COST) return 'selling-cost';
    for(const k of ['homeGrowthPct','rentGrowthPct','investmentReturnPct','otherHousingGrowthPct']){
      if(!Number.isFinite(i[k])||i[k]<=-100||i[k]>MAX_POSITIVE_ASSUMPTION) return 'assumption-rate';
    }
    return null;
  }
  function classifyStableCrossover(series,tol){
    if(!series.length) return {state:'none',month:null,crossings:0};
    const sign=v=>v>tol?1:v<-tol?-1:0;
    const signs=series.map(p=>sign(p.difference));
    const nonzero=signs.filter(Boolean);
    if(!nonzero.length) return {state:'approximately-even-throughout',month:null,crossings:0};
    const first=nonzero[0];
    if(nonzero.every(s=>s===first)) return {state:first>0?'buy-ahead-throughout':'rent-ahead-throughout',month:null,crossings:0};
    let crossings=0;
    let prev=first;
    for(const s of signs){ if(!s) continue; if(s!==prev){ crossings++; prev=s; } }
    // More than one lead change means there is no single dependable break-even
    // within the selected period, even if the final change occurs near the end.
    if(crossings>1) return {state:'no-single-stable-break-even',month:null,crossings};
    for(let idx=0;idx<signs.length;idx++){
      const s=signs[idx]; if(!s) continue;
      let before=0; for(let j=idx-1;j>=0;j--){ if(signs[j]){before=signs[j];break;} }
      if(!before||before===s) continue;
      let stable=true;
      for(let j=idx;j<signs.length;j++){ if(signs[j]&&signs[j]!==s){ stable=false; break; } }
      if(stable) return {state:'stable-crossover',month:series[idx].month,newLeader:s>0?'buy':'rent',crossings};
    }
    return {state:'no-single-stable-break-even',month:null,crossings};
  }

  function calculate(raw={}){
    const input=normalize(raw); const error=validate(input);
    if(error) return {ok:false,version:VERSION,error,input};
    const loanPrincipal=Math.max(0,input.homePrice-input.downPayment);
    const loanMonths=loanPrincipal>EPS?Math.round(input.loanTermYears*12):0;
    const horizonMonths=Math.round(input.stayYears*12);
    const payment=scheduledPayment(loanPrincipal,input.annualLoanRatePct,loanMonths);
    const buyerUpfront=input.downPayment+input.upfrontBuyingCosts;
    const renterUpfront=input.refundableRentalDeposit+input.otherUpfrontRentingCosts;
    const startingHousingCash=Math.max(buyerUpfront,renterUpfront);
    let buyerInvestment=Math.max(0,startingHousingCash-buyerUpfront);
    let renterInvestment=Math.max(0,startingHousingCash-renterUpfront);
    let loanBalance=loanPrincipal;
    let homeValue=input.homePrice;
    let rent=input.monthlyRent;
    let ownerRecurring=(input.propertyTaxAnnual+input.homeInsuranceAnnual+input.maintenanceAnnual)/12+input.associationMonthly+input.loanInsuranceMonthly+input.otherOwnerMonthly;
    let renterRecurring=input.renterOnlyMonthly;
    const rLoan=input.annualLoanRatePct/1200;
    const rHome=monthlyEffective(input.homeGrowthPct);
    const rRent=monthlyEffective(input.rentGrowthPct);
    const rInv=monthlyEffective(input.investmentReturnPct);
    const rOther=monthlyEffective(input.otherHousingGrowthPct);
    let totalInterest=0,totalPrincipal=0,totalOwnerRecurring=0,totalRent=0,totalRenterRecurring=0;
    let buyerMonthlyInvested=0,renterMonthlyInvested=0;
    let firstBuyerOutflow=null,firstRenterOutflow=null;
    const series=[];
    for(let month=1;month<=horizonMonths;month++){
      buyerInvestment*=1+rInv; renterInvestment*=1+rInv;
      let loanPayment=0,interest=0,principal=0;
      if(loanBalance>EPS){
        interest=loanBalance*rLoan;
        loanPayment=Math.min(payment,loanBalance+interest);
        principal=Math.max(0,loanPayment-interest);
        loanBalance=Math.max(0,loanBalance-principal);
        if(loanBalance<EPS) loanBalance=0;
        totalInterest+=interest; totalPrincipal+=principal;
      }
      const buyerHousingOutflow=loanPayment+ownerRecurring;
      const renterHousingOutflow=rent+renterRecurring;
      if(firstBuyerOutflow==null){ firstBuyerOutflow=buyerHousingOutflow; firstRenterOutflow=renterHousingOutflow; }
      const sharedMonthlyHousingBudget=Math.max(buyerHousingOutflow,renterHousingOutflow);
      const buyerAdd=sharedMonthlyHousingBudget-buyerHousingOutflow;
      const renterAdd=sharedMonthlyHousingBudget-renterHousingOutflow;
      buyerInvestment+=buyerAdd; renterInvestment+=renterAdd;
      buyerMonthlyInvested+=buyerAdd; renterMonthlyInvested+=renterAdd;
      totalOwnerRecurring+=ownerRecurring; totalRent+=rent; totalRenterRecurring+=renterRecurring;
      homeValue*=1+rHome;
      const saleCost=homeValue*(input.sellingCostPct/100);
      const buyWealth=buyerInvestment+homeValue-saleCost-loanBalance;
      const rentWealth=renterInvestment+input.refundableRentalDeposit;
      series.push({month,buyWealth,rentWealth,difference:buyWealth-rentWealth,homeValue,loanBalance,buyerInvestment,renterInvestment,buyerHousingOutflow,renterHousingOutflow,sharedMonthlyHousingBudget});
      rent*=1+rRent; ownerRecurring*=1+rOther; renterRecurring*=1+rOther;
    }
    const final=series[series.length-1];
    const saleCost=final.homeValue*(input.sellingCostPct/100);
    const netHomeSaleProceeds=final.homeValue-saleCost-final.loanBalance;
    const buyerEndWealth=final.buyerInvestment+netHomeSaleProceeds;
    const renterEndWealth=final.renterInvestment+input.refundableRentalDeposit;
    const wealthDifference=buyerEndWealth-renterEndWealth;
    const displayTolerance=Math.max(1,Math.max(Math.abs(buyerEndWealth),Math.abs(renterEndWealth))*0.0005);
    const crossover=classifyStableCrossover(series,displayTolerance);
    const leader=Math.abs(wealthDifference)<=displayTolerance?'even':wealthDifference>0?'buy':'rent';
    return {
      ok:true,version:VERSION,input,
      loan:{principal:loanPrincipal,termMonths:loanMonths,scheduledPayment:payment,remainingBalance:final.loanBalance,totalInterest,totalPrincipalRepaid:totalPrincipal},
      upfront:{buyerUpfront,renterUpfront,startingHousingCash,buyerInitialInvestment:Math.max(0,startingHousingCash-buyerUpfront),renterInitialInvestment:Math.max(0,startingHousingCash-renterUpfront)},
      monthly:{startingBuyerOutflow:firstBuyerOutflow,startingRenterOutflow:firstRenterOutflow,buyerMonthlyInvested,renterMonthlyInvested},
      buying:{projectedHomeValue:final.homeValue,sellingCost:saleCost,netHomeSaleProceeds,ownerRecurringCosts:totalOwnerRecurring,investmentBalance:final.buyerInvestment,endWealth:buyerEndWealth},
      renting:{totalRentPaid:totalRent,renterRecurringCosts:totalRenterRecurring,depositReturned:input.refundableRentalDeposit,investmentBalance:final.renterInvestment,endWealth:renterEndWealth},
      comparison:{horizonMonths,wealthDifference,leader,displayTolerance,crossover,series}
    };
  }

  function runFixtures(){
    const out=[]; const add=(name,ok)=>out.push({name,ok:Boolean(ok)}); const close=(a,b,t=1e-6)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=t;
    const base={country:'US',currency:'USD',homePrice:500000,downPayment:100000,annualLoanRatePct:6,loanTermYears:30,monthlyRent:2200,stayYears:10,upfrontBuyingCosts:10000,propertyTaxAnnual:6000,homeInsuranceAnnual:1500,maintenanceAnnual:5000,associationMonthly:0,loanInsuranceMonthly:0,otherOwnerMonthly:0,sellingCostPct:5,refundableRentalDeposit:2200,otherUpfrontRentingCosts:0,renterOnlyMonthly:0,homeGrowthPct:3,rentGrowthPct:3,investmentReturnPct:6,otherHousingGrowthPct:3};
    const calc=o=>calculate({...base,...o});
    let r=calc({downPayment:500000,annualLoanRatePct:0,loanTermYears:1}); add('cash purchase no loan',r.ok&&r.loan.principal===0&&r.loan.scheduledPayment===0);
    r=calc({stayYears:5,loanTermYears:30}); add('positive-rate loan shorter horizon',r.ok&&r.loan.remainingBalance>0&&r.loan.totalInterest>0);
    r=calc({stayYears:30,loanTermYears:30}); add('horizon equal loan term',r.ok&&r.loan.remainingBalance<1e-5);
    r=calc({stayYears:35,loanTermYears:20,monthlyRent:4000}); add('horizon longer than loan term buyer can invest',r.ok&&r.loan.remainingBalance===0&&r.monthly.buyerMonthlyInvested>0);
    r=calc({annualLoanRatePct:0,loanTermYears:20}); add('zero loan rate',r.ok&&close(r.loan.scheduledPayment,r.loan.principal/240,1e-7));
    r=calc({homeGrowthPct:0}); add('zero home growth',r.ok&&close(r.buying.projectedHomeValue,r.input.homePrice,1e-4));
    r=calc({homeGrowthPct:-2}); add('negative home growth',r.ok&&r.buying.projectedHomeValue<r.input.homePrice);
    r=calc({rentGrowthPct:0}); add('zero rent growth',r.ok&&close(r.renting.totalRentPaid,r.input.monthlyRent*r.comparison.horizonMonths,1e-3));
    r=calc({rentGrowthPct:-2}); add('negative rent growth',r.ok&&r.renting.totalRentPaid<r.input.monthlyRent*r.comparison.horizonMonths);
    r=calc({investmentReturnPct:0}); add('zero investment return',r.ok&&Number.isFinite(r.renting.investmentBalance));
    r=calc({monthlyRent:500,investmentReturnPct:8}); add('renter cheaper invests monthly difference',r.ok&&r.monthly.renterMonthlyInvested>0);
    r=calc({loanTermYears:5,stayYears:10,monthlyRent:5000,investmentReturnPct:5}); add('buyer cheaper after payoff can invest',r.ok&&r.loan.remainingBalance===0&&r.monthly.buyerMonthlyInvested>0);
    r=calc({downPayment:100000,upfrontBuyingCosts:0,refundableRentalDeposit:100000,otherUpfrontRentingCosts:0}); add('equal upfront costs',r.ok&&close(r.upfront.buyerUpfront,r.upfront.renterUpfront));
    r=calc({refundableRentalDeposit:2000}); add('renter upfront lower',r.ok&&r.upfront.renterUpfront<r.upfront.buyerUpfront&&r.upfront.renterInitialInvestment>0);
    r=calc({downPayment:10000,upfrontBuyingCosts:0,refundableRentalDeposit:50000,otherUpfrontRentingCosts:0}); add('renter upfront higher',r.ok&&r.upfront.renterUpfront>r.upfront.buyerUpfront&&r.upfront.buyerInitialInvestment>0);
    r=calc({refundableRentalDeposit:12345}); add('rental deposit returned exactly',r.ok&&r.renting.depositReturned===12345);
    const s0=calc({sellingCostPct:0}),s5=calc({sellingCostPct:5}); add('selling cost reduces buyer wealth',s0.ok&&s5.ok&&s5.buying.endWealth<s0.buying.endWealth);
    const c0=calc({otherHousingGrowthPct:0}),c5=calc({otherHousingGrowthPct:5}); add('owner recurring costs grow',c0.ok&&c5.ok&&c5.buying.ownerRecurringCosts>c0.buying.ownerRecurringCosts);
    r=calc({stayYears:.5}); add('sub-year horizon rejected',!r.ok&&r.error==='stay-years');
    r=calc({homePrice:1200,downPayment:0,annualLoanRatePct:12,loanTermYears:1,monthlyRent:0,stayYears:1,upfrontBuyingCosts:0,propertyTaxAnnual:0,homeInsuranceAnnual:0,maintenanceAnnual:0,sellingCostPct:0,homeGrowthPct:0,rentGrowthPct:0,investmentReturnPct:0,otherHousingGrowthPct:0}); add('final payment caps without negative balance',r.ok&&r.loan.remainingBalance===0&&close(r.loan.totalPrincipalRepaid,1200,1e-5));
    r=calc({homePrice:500000,downPayment:0,annualLoanRatePct:8,loanTermYears:30,homeGrowthPct:-50,stayYears:1,sellingCostPct:10}); add('negative equity preserved',r.ok&&Number.isFinite(r.buying.netHomeSaleProceeds)&&r.buying.netHomeSaleProceeds<0);
    r=calculate({country:'US',currency:'USD',homePrice:100,downPayment:100,annualLoanRatePct:0,loanTermYears:1,monthlyRent:0,stayYears:1,upfrontBuyingCosts:0,propertyTaxAnnual:0,homeInsuranceAnnual:0,maintenanceAnnual:0,associationMonthly:0,loanInsuranceMonthly:0,otherOwnerMonthly:0,sellingCostPct:0,refundableRentalDeposit:0,otherUpfrontRentingCosts:0,renterOnlyMonthly:0,homeGrowthPct:0,rentGrowthPct:0,investmentReturnPct:0,otherHousingGrowthPct:0}); add('constructed parity case',r.ok&&close(r.buying.endWealth,r.renting.endWealth));
    let x=classifyStableCrossover([{month:1,difference:-10},{month:2,difference:5},{month:3,difference:8}],.01); add('one stable crossover',x.state==='stable-crossover'&&x.month===2&&x.newLeader==='buy');
    x=classifyStableCrossover([{month:1,difference:-10},{month:2,difference:5},{month:3,difference:-2},{month:4,difference:6},{month:5,difference:-1}],.01); add('multiple crossover no single stable',x.state==='no-single-stable-break-even'&&x.crossings>=2);
    const a=calc({country:'IN',currency:'INR'}),b=calc({country:'IN',currency:'USD'}); add('currency does not alter math',a.ok&&b.ok&&close(a.comparison.wealthDifference,b.comparison.wealthDifference));
    const us=calc({country:'US'}),india=calc({country:'IN'}); add('country terminology does not alter math',us.ok&&india.ok&&close(us.comparison.wealthDifference,india.comparison.wealthDifference));
    r=calc({stayYears:1,investmentReturnPct:12,monthlyRent:1000}); const first=r.comparison.series[0]; add('month-end contribution convention finite',r.ok&&first&&Number.isFinite(first.renterInvestment)&&Number.isFinite(first.buyerInvestment));
    r=calc({stayYears:40,homeGrowthPct:50,rentGrowthPct:50,investmentReturnPct:50,otherHousingGrowthPct:50}); add('extreme allowed assumptions finite',r.ok&&Number.isFinite(r.buying.endWealth)&&Number.isFinite(r.renting.endWealth));
    r=calc({homeGrowthPct:-100}); add('minus one hundred assumption rejected',!r.ok&&r.error==='assumption-rate');
    r=calc({stayYears:10}); add('result object reconciles headline inputs',r.ok&&close(r.buying.endWealth-r.renting.endWealth,r.comparison.wealthDifference,1e-6)&&r.comparison.horizonMonths===120);
    return out;
  }

  window.CarrowmontRentVsBuyCore={VERSION,calculate,scheduledPayment,monthlyEffective,classifyStableCrossover,runFixtures};
  if(typeof module!=='undefined'&&module.exports) module.exports=window.CarrowmontRentVsBuyCore;
})();
