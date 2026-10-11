(() => {
  'use strict';

  const PERIODS = Object.freeze({ monthly:12, biweekly:26, fortnightly:26, weekly:52 });
  const PAY_PERIODS = Object.freeze({ weekly:52, biweekly:26, fortnightly:26, semimonthly:24, fourweekly:13, monthly:12, annual:1 });
  const EXTRA_EVENTS = Object.freeze({ monthly:12, quarterly:4, halfyearly:2, annual:1 });
  const MAX_YEARS = 100;
  const EPS = 1e-8;

  function finite(value, fallback=0){ const n=Number(value); return Number.isFinite(n)?n:fallback; }
  function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }
  function periodsPerYear(freq){ return PERIODS[freq] || 12; }
  function payPeriodsPerYear(freq){ return PAY_PERIODS[freq] || 12; }

  function periodicRate(annualRatePct, paymentFrequency='monthly', convention='standard'){
    const r=Math.max(0,finite(annualRatePct))/100;
    const m=periodsPerYear(paymentFrequency);
    if(convention==='canada-fixed') return Math.pow(1+r/2,2/m)-1;
    return r/m;
  }

  function scheduledPayment(balance, periodic, periods){
    const P=Math.max(0,finite(balance));
    const n=Math.max(1,Math.round(finite(periods,1)));
    const i=Math.max(0,finite(periodic));
    if(P===0) return 0;
    if(i<EPS) return P/n;
    const denom=1-Math.pow(1+i,-n);
    if(Math.abs(denom)<EPS) return P/n;
    return P*i/denom;
  }

  function addMonthsUtc(date, months){
    const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
    const day=d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+months);
    const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
    d.setUTCDate(Math.min(day,last));
    return d;
  }
  function addDaysUtc(date, days){ const d=new Date(date.getTime()); d.setUTCDate(d.getUTCDate()+days); return d; }
  function periodDate(startDate, frequency, periodIndex){
    const base=startDate instanceof Date ? startDate : new Date(`${startDate||new Date().toISOString().slice(0,10)}T00:00:00Z`);
    if(frequency==='weekly') return addDaysUtc(base,7*periodIndex);
    if(frequency==='biweekly'||frequency==='fortnightly') return addDaysUtc(base,14*periodIndex);
    return addMonthsUtc(base,periodIndex);
  }
  function isoDate(date){ return date.toISOString().slice(0,10); }

  function extraEventsPerYear(extraFrequency, customIntervalMonths){
    if(EXTRA_EVENTS[extraFrequency]) return EXTRA_EVENTS[extraFrequency];
    if(extraFrequency==='custom'){
      const months=clamp(finite(customIntervalMonths,3),1,120);
      return 12/months;
    }
    return null;
  }

  function extraSchedule(paymentFrequency, extraFrequency, startPeriod=1, customIntervalMonths=3){
    const m=periodsPerYear(paymentFrequency);
    const start=Math.max(1,Math.round(finite(startPeriod,1)));
    if(extraFrequency==='everyScheduled') return { due:period=>period>=start, eventsPerYear:m };
    const events=extraEventsPerYear(extraFrequency,customIntervalMonths);
    if(!events) return { due:()=>false, eventsPerYear:0 };
    const step=m/events;
    let eventIndex=0;
    let next=Math.max(start,Math.round(start+eventIndex*step));
    return {
      eventsPerYear:events,
      due(period){
        if(period<start) return false;
        if(period<next) return false;
        while(next<=period){ eventIndex+=1; next=Math.max(next+1,Math.round(start+eventIndex*step)); }
        return true;
      }
    };
  }

  function simulate(options={}){
    const balance=Math.max(0,finite(options.balance));
    const frequency=options.paymentFrequency||'monthly';
    const m=periodsPerYear(frequency);
    const convention=options.convention||'standard';
    const i=periodicRate(options.annualRatePct,frequency,convention);
    const statedPeriods=Math.max(1,Math.round(finite(options.periods,m)));
    const formulaPayment=scheduledPayment(balance,i,statedPeriods);
    const payment=Math.max(0,finite(options.payment,formulaPayment));
    const maxPeriods=Math.min(Math.round(MAX_YEARS*m),Math.max(statedPeriods*4,m*2));
    if(balance<=0) return {ok:false,error:'balance',ledger:[]};
    if(payment<=0) return {ok:false,error:'payment',ledger:[]};
    if(i>0 && payment<=balance*i+EPS) return {ok:false,error:'negative-amortization',formulaPayment,payment,periodicRate:i,ledger:[]};

    const recurringEnabled=!!options.recurringEnabled && finite(options.recurringExtra)>0 && !!options.extraFrequency;
    const schedule=extraSchedule(frequency,options.extraFrequency,options.extraStartPeriod||1,options.customIntervalMonths);
    const recurringExtra=Math.max(0,finite(options.recurringExtra));
    const lumpMap=new Map();
    for(const item of options.lumpSums||[]){
      const p=Math.max(1,Math.round(finite(item.period,1)));
      const amount=Math.max(0,finite(item.amount));
      if(amount>0) lumpMap.set(p,(lumpMap.get(p)||0)+amount);
    }

    let bal=balance,totalInterest=0,totalScheduled=0,totalExtra=0,totalPrincipal=0;
    const ledger=[];
    const startDate=options.startDate ? new Date(`${options.startDate}T00:00:00Z`) : new Date();
    for(let period=1; period<=maxPeriods && bal>EPS; period+=1){
      const opening=bal;
      const interest=opening*i;
      let scheduled=Math.min(payment,opening+interest);
      let extra=0;
      if(recurringEnabled && schedule.due(period)) extra+=recurringExtra;
      if(lumpMap.has(period)) extra+=lumpMap.get(period);
      const maxExtra=Math.max(0,opening+interest-scheduled);
      const requestedExtra=extra;
      extra=Math.min(extra,maxExtra);
      const rawClosing=Math.max(0,opening+interest-scheduled-extra);
      const payoffTolerance=Math.max(EPS,balance*1e-12);
      let closing=rawClosing;
      if(rawClosing>0 && rawClosing<=payoffTolerance){
        scheduled=Math.min(opening+interest-extra,scheduled+rawClosing);
        closing=0;
      }
      const principal=Math.max(0,opening-closing);
      totalInterest+=interest; totalScheduled+=scheduled; totalExtra+=extra; totalPrincipal+=principal;
      ledger.push({
        period, date:isoDate(periodDate(startDate,frequency,period)), openingBalance:opening, interest,
        scheduledRepayment:scheduled, extraRepayment:extra, requestedExtra, principalRepaid:principal, closingBalance:closing
      });
      bal=closing;
    }
    const paidOff=bal<=EPS;
    return {
      ok:paidOff,
      error:paidOff?null:'safety-limit',
      ledger,
      periodicRate:i,
      formulaPayment,
      payment,
      payoffPeriods:ledger.length,
      payoffDate:ledger.length?ledger[ledger.length-1].date:null,
      totalInterest,
      totalScheduled,
      totalExtra,
      totalPrincipal,
      totalPaid:totalScheduled+totalExtra,
      finalBalance:bal
    };
  }

  function annualSummary(ledger,paymentFrequency='monthly'){
    const m=periodsPerYear(paymentFrequency);
    const groups=[];
    for(const row of ledger||[]){
      const year=Math.floor((row.period-1)/m)+1;
      let g=groups[year-1];
      if(!g){
        g={year,openingBalance:row.openingBalance,scheduledRepayments:0,extraRepayments:0,interestCharged:0,principalRepaid:0,closingBalance:row.closingBalance};
        groups.push(g);
      }
      g.scheduledRepayments+=row.scheduledRepayment;
      g.extraRepayments+=row.extraRepayment;
      g.interestCharged+=row.interest;
      g.principalRepaid+=row.principalRepaid;
      g.closingBalance=row.closingBalance;
    }
    return groups;
  }

  function paymentConvention(country, rateMode='fixed'){
    return country==='CA' && rateMode==='fixed' ? 'canada-fixed' : 'standard';
  }

  function commonModel(input={}){
    const frequency=input.paymentFrequency||'monthly';
    const m=periodsPerYear(frequency);
    const periods=Math.max(1,Math.round(Math.max(0,finite(input.remainingYears))*m + Math.max(0,finite(input.remainingMonths))*m/12));
    const convention=input.convention || paymentConvention(input.country||'OTHER',input.rateMode||'fixed');
    const i=periodicRate(input.annualRatePct,frequency,convention);
    const formulaPayment=scheduledPayment(input.balance,i,periods);
    const payment=input.useCurrentPayment ? Math.max(0,finite(input.currentPayment)) : formulaPayment;
    return {frequency,m,periods,convention,i,formulaPayment,payment};
  }

  function lowerPaymentAfterLump(input,baseline,common){
    const lumpPeriod=clamp(Math.round(finite(input.lumpSumPeriod,1)),1,Math.max(1,baseline.payoffPeriods));
    const first=simulate({
      balance:input.balance,annualRatePct:input.annualRatePct,paymentFrequency:common.frequency,convention:common.convention,
      periods:common.periods,payment:common.payment,startDate:input.startDate,lumpSums:[{period:lumpPeriod,amount:input.lumpSumAmount}]
    });
    if(!first.ledger.length) return first;
    const eventRow=first.ledger[Math.min(lumpPeriod,first.ledger.length)-1];
    const remainingPeriods=Math.max(0,baseline.payoffPeriods-lumpPeriod);
    if(eventRow.closingBalance<=EPS || remainingPeriods===0){ return first; }
    const newPayment=scheduledPayment(eventRow.closingBalance,common.i,remainingPeriods);
    const second=simulate({balance:eventRow.closingBalance,annualRatePct:input.annualRatePct,paymentFrequency:common.frequency,convention:common.convention,periods:remainingPeriods,payment:newPayment,startDate:eventRow.date});
    const ledger=first.ledger.slice(0,lumpPeriod).concat(second.ledger.map(r=>({...r,period:r.period+lumpPeriod})));
    return {
      ...second, ok:second.ok, ledger, payment:newPayment, formulaPayment:newPayment,
      payoffPeriods:ledger.length, payoffDate:ledger.length?ledger[ledger.length-1].date:eventRow.date,
      totalInterest:first.ledger.slice(0,lumpPeriod).reduce((s,r)=>s+r.interest,0)+second.totalInterest,
      totalScheduled:first.ledger.slice(0,lumpPeriod).reduce((s,r)=>s+r.scheduledRepayment,0)+second.totalScheduled,
      totalExtra:first.ledger.slice(0,lumpPeriod).reduce((s,r)=>s+r.extraRepayment,0)+second.totalExtra,
      totalPrincipal:first.ledger.slice(0,lumpPeriod).reduce((s,r)=>s+r.principalRepaid,0)+second.totalPrincipal,
      totalPaid:first.ledger.slice(0,lumpPeriod).reduce((s,r)=>s+r.scheduledRepayment+r.extraRepayment,0)+second.totalPaid,
      recastPayment:newPayment
    };
  }

  function targetScenario(input,baseline,common){
    const targetPeriods=Math.max(1,Math.round(Math.max(0,finite(input.targetYears))*common.m + Math.max(0,finite(input.targetMonths))*common.m/12));
    const lump=Math.min(Math.max(0,finite(input.targetLumpSum)),Math.max(0,finite(input.balance)));
    const startBalance=Math.max(0,finite(input.balance)-lump);
    if(targetPeriods>=baseline.payoffPeriods){
      return { ...baseline, targetPeriods, requiredPayment:common.payment, extraRequired:0, targetLaterThanBaseline:true, initialLumpSum:0, ignoredTargetLumpSum:lump };
    }
    if(startBalance<=EPS){
      return {
        ok:true,ledger:[],periodicRate:common.i,formulaPayment:0,payment:0,payoffPeriods:0,
        payoffDate:input.startDate||new Date().toISOString().slice(0,10),totalInterest:0,totalScheduled:0,totalExtra:lump,
        totalPrincipal:lump,totalPaid:lump,finalBalance:0,targetPeriods,requiredPayment:0,extraRequired:0,
        targetLaterThanBaseline:false,initialLumpSum:lump
      };
    }
    const required=scheduledPayment(startBalance,common.i,targetPeriods);
    const payment=Math.max(common.payment,required);
    const modeled=simulate({balance:startBalance,annualRatePct:input.annualRatePct,paymentFrequency:common.frequency,convention:common.convention,periods:targetPeriods,payment,startDate:input.startDate});
    return {
      ...modeled,
      totalExtra:modeled.totalExtra+lump,
      totalPrincipal:modeled.totalPrincipal+lump,
      totalPaid:modeled.totalPaid+lump,
      targetPeriods,
      requiredPayment:payment,
      extraRequired:Math.max(0,payment-common.payment),
      targetLaterThanBaseline:false,
      initialLumpSum:lump,
      openingBalanceBeforeLump:finite(input.balance)
    };
  }

  function calculate(input={}){
    const balance=Math.max(0,finite(input.balance));
    const annualRatePct=finite(input.annualRatePct,-1);
    if(balance<=0) return {ok:false,error:'balance'};
    if(annualRatePct<0 || annualRatePct>50) return {ok:false,error:'rate'};
    const common=commonModel({...input,balance,annualRatePct});
    if(common.periods<=0 || common.periods>MAX_YEARS*common.m) return {ok:false,error:'term'};
    if(input.useCurrentPayment && common.payment<=0) return {ok:false,error:'payment'};
    const baseline=simulate({balance,annualRatePct,paymentFrequency:common.frequency,convention:common.convention,periods:common.periods,payment:common.payment,startDate:input.startDate});
    if(!baseline.ok) return {ok:false,error:baseline.error,common,baseline};

    const mode=input.mode||'recurring';
    let scenario;
    let messages=[];
    if(mode==='recurring'){
      const recurringEnabled=!!input.recurringEnabled;
      if(recurringEnabled && (!input.extraFrequency || finite(input.recurringExtra)<=0)) return {ok:false,error:'recurring-selection',common,baseline};
      const lump=Math.max(0,finite(input.optionalLumpSum));
      scenario=simulate({
        balance,annualRatePct,paymentFrequency:common.frequency,convention:common.convention,periods:common.periods,payment:common.payment,startDate:input.startDate,
        recurringEnabled,recurringExtra:Math.max(0,finite(input.recurringExtra)),extraFrequency:input.extraFrequency,extraStartPeriod:input.extraStartPeriod||1,customIntervalMonths:input.customIntervalMonths,
        lumpSums:lump>0?[{period:Math.max(1,Math.round(finite(input.optionalLumpSumPeriod,1))),amount:lump}]:[]
      });
    } else if(mode==='lump'){
      const lump=Math.max(0,finite(input.lumpSumAmount));
      if(lump<=0) return {ok:false,error:'lump',common,baseline};
      if(lump>balance) messages.push('The entered lump sum exceeds the modeled balance; the model caps it at the amount required to clear the balance.');
      if(input.lumpStrategy==='lower-payment') scenario=lowerPaymentAfterLump({...input,lumpSumAmount:Math.min(lump,balance)},baseline,common);
      else scenario=simulate({balance,annualRatePct,paymentFrequency:common.frequency,convention:common.convention,periods:common.periods,payment:common.payment,startDate:input.startDate,lumpSums:[{period:Math.max(1,Math.round(finite(input.lumpSumPeriod,1))),amount:Math.min(lump,balance)}]});
    } else if(mode==='target'){
      scenario=targetScenario(input,baseline,common);
    } else if(mode==='full'){
      const charges=Math.max(0,finite(input.prepaymentCharge))+Math.max(0,finite(input.otherCharges));
      const full={
        ok:true,payoffPeriods:0,payoffDate:input.startDate||new Date().toISOString().slice(0,10),payment:0,totalInterest:0,totalExtra:balance,
        totalPaid:balance+charges,ledger:[],modeledPrincipalSettlement:balance,totalUserEnteredCharges:charges,modeledSettlementTotal:balance+charges
      };
      return {
        ok:true,mode,common,baseline,scenario:full,messages,
        interestSavedBeforeCharges:baseline.totalInterest,
        netModeledCostReduction:baseline.totalInterest-charges,
        periodsSaved:baseline.payoffPeriods,
        charges,
        annualSummary:[]
      };
    } else return {ok:false,error:'mode',common,baseline};

    if(!scenario?.ok) return {ok:false,error:scenario?.error||'scenario',common,baseline,scenario};
    const charges=Math.max(0,finite(input.prepaymentCharge))+Math.max(0,finite(input.otherCharges));
    const interestSavedBeforeCharges=baseline.totalInterest-scenario.totalInterest;
    return {
      ok:true,mode,common,baseline,scenario,messages,
      interestSavedBeforeCharges,
      netModeledCostReduction:interestSavedBeforeCharges-charges,
      periodsSaved:Math.max(0,baseline.payoffPeriods-scenario.payoffPeriods),
      charges,
      annualSummary:(()=>{
        const rows=annualSummary(scenario.ledger,common.frequency);
        if(mode==='target' && scenario.initialLumpSum>0){
          if(rows.length){
            rows[0]={...rows[0],openingBalance:balance,extraRepayments:rows[0].extraRepayments+scenario.initialLumpSum,principalRepaid:rows[0].principalRepaid+scenario.initialLumpSum};
          } else {
            rows.push({year:1,openingBalance:balance,scheduledRepayments:0,extraRepayments:scenario.initialLumpSum,interestCharged:0,principalRepaid:scenario.initialLumpSum,closingBalance:0});
          }
        }
        return rows;
      })(),
      baselineAnnualSummary:annualSummary(baseline.ledger,common.frequency)
    };
  }

  function setAsidePerPayCycle(input={}){
    if(!input.recurringEnabled || finite(input.recurringExtra)<=0 || !input.extraFrequency) return 0;
    const m=periodsPerYear(input.paymentFrequency||'monthly');
    let events=input.extraFrequency==='everyScheduled'?m:extraEventsPerYear(input.extraFrequency,input.customIntervalMonths);
    if(!events) return 0;
    return finite(input.recurringExtra)*events/payPeriodsPerYear(input.payFrequency||'monthly');
  }

  function durationLabel(periods,frequency='monthly'){
    const months=Math.round(finite(periods)*12/periodsPerYear(frequency));
    const y=Math.floor(months/12), m=months%12;
    if(y && m) return `${y} year${y===1?'':'s'} ${m} month${m===1?'':'s'}`;
    if(y) return `${y} year${y===1?'':'s'}`;
    return `${m} month${m===1?'':'s'}`;
  }

  window.CarrowmontMortgageCore={
    PERIODS,PAY_PERIODS,EXTRA_EVENTS,periodsPerYear,payPeriodsPerYear,periodicRate,scheduledPayment,simulate,calculate,annualSummary,setAsidePerPayCycle,durationLabel,paymentConvention,extraEventsPerYear
  };
})();
