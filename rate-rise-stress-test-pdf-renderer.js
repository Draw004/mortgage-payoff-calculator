(() => {
  'use strict';
  const P=()=>window.CarrowmontPdfExport;
  const RS=()=>window.CarrowmontReportStandard;
  const L=()=>window.CarrowmontLocale;
  const T=()=>L().getMortgageTerms?.()||{noun:'mortgage',nounCap:'Mortgage',familyName:'Mortgage Decision Centre',paymentLabel:'mortgage payment'};
  const M=()=>window.CarrowmontMortgageCore;
  const W=794,H=1123,MG=42,CW=W-MG*2;
  const C={ink:'#102945',teal:'#0e827a',tealDark:'#08736c',muted:'#4b637b',line:'#c9d9e2',pale:'#e8f6f3',light:'#f7fafb',amber:'#fff7e8',red:'#fff2f0',white:'#ffffff'};
  function page(){return P().createPage({width:W,height:H,scale:2.6,background:'#fff'});}
  function card(ctx,x,y,w,h,fill=C.white,stroke=C.line){P().roundRect(ctx,x,y,w,h,10,fill,stroke,1);}
  function money(v,d=0){return v==null?'—':L().formatMoney(Number(v)||0,{maximumFractionDigits:d,minimumFractionDigits:d});}
  function pct(v,d=2){return v==null?'—':`${Number(v).toFixed(d)}%`;}
  function signedMoney(v,d=0){const n=Number(v)||0;return Math.abs(n)<.005?money(0,d):`${n>0?'+':'−'}${money(Math.abs(n),d)}`;}
  function signedPct(v){const n=Number(v)||0;return Math.abs(n)<.00005?'0.00%':`${n>0?'+':'−'}${Math.abs(n).toFixed(2)}%`;}
  function duration(periods,freq){return M().durationLabel(periods,freq);}
  function header(ctx,title,subtitle){P().text(ctx,'CARROWMONT',MG,54,{size:15,weight:900,color:C.teal});P().text(ctx,title,MG,94,{size:26,weight:900,color:C.ink});P().wrappedText(ctx,subtitle,MG,119,CW,{size:9.6,lineHeight:13.2,weight:550,color:C.muted,maxLines:2});P().line(ctx,MG,145,W-MG,145,C.line,1);}
  function footer(ctx){P().line(ctx,MG,H-48,W-MG,H-48,C.line,1);P().text(ctx,`Carrowmont · ${T().familyName} · Educational payment-stress report`,MG,H-27,{size:7.8,weight:650,color:C.muted});P().text(ctx,'carrowmont.com',W-MG,H-27,{size:7.8,weight:650,color:C.muted,align:'right'});}
  function metric(ctx,x,y,w,label,value,note,fill=C.white){card(ctx,x,y,w,100,fill,C.line);P().text(ctx,label.toUpperCase(),x+14,y+22,{size:8.2,weight:900,color:C.muted});P().text(ctx,value,x+14,y+51,{size:18,weight:900,color:C.ink});if(note)P().wrappedText(ctx,note,x+14,y+72,w-28,{size:8,lineHeight:10.5,weight:550,color:C.muted,maxLines:2});}
  function row(ctx,y,label,value,alt=false){if(alt){ctx.fillStyle='#fbfdfe';ctx.fillRect(MG,y,CW,34);}P().text(ctx,label,MG+9,y+21,{size:8.5,weight:750,color:C.muted});P().text(ctx,value,W-MG-9,y+21,{size:8.8,weight:850,color:C.ink,align:'right'});P().line(ctx,MG,y+34,W-MG,y+34,C.line,1);return y+34;}
  function budgetState(v){return Math.abs(v)<=.01?'Approximately break-even':v>0?'Monthly surplus remains':'Modeled monthly shortfall';}
  function zeroBufferText(b){if(!b?.applicable)return 'Not entered';if(b.zeroBufferStatus==='found')return pct(b.zeroBufferRatePct);if(b.zeroBufferStatus==='no-nonnegative-rate')return 'No non-negative modeled rate';if(b.zeroBufferStatus==='above-modeled-ceiling')return 'Above 50% modeled ceiling';if(b.zeroBufferStatus==='non-mortgage-outgoings-use-all-income')return 'Not applicable';return '—';}

  function summaryPage(model){
    const pg=page(),ctx=pg.ctx,r=model.result,i=r.input,s=r.customScenario;
    header(ctx,`${model.identity.product} Decision Report`,'Custom stressed payment, rate-only change and optional household cash-flow impact from the same deterministic result used on screen.');
    card(ctx,MG,166,CW,126,'#102945','#102945');P().text(ctx,'CUSTOM STRESSED PAYMENT',MG+18,191,{size:9,weight:900,color:'#a6ddd8'});P().text(ctx,money(s.payment,2),MG+18,235,{size:34,weight:900,color:'#fff'});P().wrappedText(ctx,`At ${pct(s.annualRatePct)}, the modeled ${i.paymentFrequency} payment changes by ${signedMoney(s.rateOnlyChange,2)} from the same-rate reference at the reset checkpoint (${signedPct(s.rateOnlyPctChange)}).`,MG+18,261,CW-36,{size:9,lineHeight:12.4,weight:550,color:'#dce8f1',maxLines:2});
    const gap=12,col=(CW-gap)/2;metric(ctx,MG,310,col,'Payment today',money(r.current.paymentToday,2),i.useCurrentPayment?'User-entered current-payment override':'Modeled from current balance, rate and term',C.pale);metric(ctx,MG+col+gap,310,col,'Same-rate reference at reset',money(r.reset.sameRateReferencePayment,2),'Reference used to isolate the rate-only effect.',C.pale);
    metric(ctx,MG,424,col,'Stressed monthly equivalent',money(s.monthlyEquivalent,2),`${i.paymentFrequency} payment normalized to monthly cash flow.`);metric(ctx,MG+col+gap,424,col,'Monthly-equivalent rate-only change',signedMoney(s.annualCashFlowChange/12,2),'Rate-only change normalized to one month of household cash flow.');
    P().text(ctx,'RATE-CHANGE CHECKPOINT',MG,555,{size:9,weight:900,color:C.tealDark});let y=571;[
      ['Current outstanding balance',money(i.balance)],['Current annual rate',pct(i.annualRatePct)],['Repayment frequency',i.paymentFrequency],['Requested months until rate change',String(i.monthsUntilRateChange)],['Modeled months to reset',Number(r.reset.modeledMonths).toFixed(r.reset.modeledMonths%1?1:0)],['Projected balance at reset',money(r.reset.projectedBalance)],['Remaining term at reset',duration(r.reset.remainingPeriods,i.paymentFrequency)],['Custom stressed annual rate',pct(s.annualRatePct)]
    ].forEach((e,idx)=>{y=row(ctx,y,e[0],e[1],idx%2===1);});
    P().text(ctx,'HOUSEHOLD CONTEXT',MG,y+30,{size:9,weight:900,color:C.tealDark});
    if(r.budget.applicable){card(ctx,MG,y+46,CW,128,r.budget.customBuffer<-.01?C.red:C.pale,C.line);P().text(ctx,budgetState(r.budget.customBuffer).toUpperCase(),MG+14,y+71,{size:8.5,weight:900,color:r.budget.customBuffer<-.01?'#9b2f27':C.tealDark});P().text(ctx,money(r.budget.customBuffer,0),MG+14,y+104,{size:22,weight:900,color:C.ink});P().wrappedText(ctx,`Current monthly buffer ${money(r.budget.bufferToday,0)} · stressed ${T().noun} share ${pct(r.budget.stressedMortgageSharePct,1)} · modeled zero-buffer rate ${zeroBufferText(r.budget)}.`,MG+14,y+128,CW-28,{size:8.7,lineHeight:11.5,weight:550,color:C.muted,maxLines:3});}
    else {card(ctx,MG,y+46,CW,96,C.light,C.line);P().text(ctx,'HOUSEHOLD BUDGET NOT ENTERED',MG+14,y+73,{size:9,weight:900,color:C.muted});P().wrappedText(ctx,'The payment stress calculation is complete without income or expense inputs. Household cash-flow context is optional and was not included in this report.',MG+14,y+98,CW-28,{size:8.8,lineHeight:11.8,weight:550,color:C.muted,maxLines:3});}
    footer(ctx);return pg.canvas;
  }

  function scenarioPage(model){
    const pg=page(),ctx=pg.ctx,r=model.result,i=r.input;
    header(ctx,'Scenario ladder & household impact','Baseline, custom and standard +0.25 / +0.50 / +1 / +2 / +3 percentage-point scenarios use the same remaining term after the modeled reset.');
    P().text(ctx,'PAYMENT STRESS SCENARIOS',MG,172,{size:9,weight:900,color:C.tealDark});
    const rows=[{label:'Baseline',rate:i.annualRatePct,payment:r.reset.sameRateReferencePayment,monthly:r.reset.sameRateMonthlyEquivalent,change:0,pct:0,budget:r.budget.applicable?r.budget.availableForMortgage-r.reset.sameRateMonthlyEquivalent:null},{label:'Custom',rate:r.customScenario.annualRatePct,payment:r.customScenario.payment,monthly:r.customScenario.monthlyEquivalent,change:r.customScenario.rateOnlyChange,pct:r.customScenario.rateOnlyPctChange,budget:r.customScenario.budget?.monthlyBuffer??null},...r.ladder.map(s=>({label:`+${s.deltaPctPoints.toFixed(2)} pp`,rate:s.annualRatePct,payment:s.payment,monthly:s.monthlyEquivalent,change:s.rateOnlyChange,pct:s.rateOnlyPctChange,budget:s.budget?.monthlyBuffer??null}))];
    card(ctx,MG,190,CW,42+rows.length*46,C.white,C.line);const cols=[MG+12,MG+144,MG+245,MG+370,MG+498,MG+603];P().text(ctx,'Scenario',cols[0],215,{size:8,weight:900,color:C.muted});P().text(ctx,'Rate',cols[1],215,{size:8,weight:900,color:C.muted});P().text(ctx,'Payment',cols[2],215,{size:8,weight:900,color:C.muted});P().text(ctx,'Monthly eq.',cols[3],215,{size:8,weight:900,color:C.muted});P().text(ctx,'Rate-only',cols[4],215,{size:8,weight:900,color:C.muted});P().text(ctx,r.budget.applicable?'Buffer':'% change',cols[5],215,{size:8,weight:900,color:C.muted});
    rows.forEach((s,idx)=>{const y=236+idx*46;if(idx%2===1){ctx.fillStyle='#f8fbfc';ctx.fillRect(MG+1,y-14,CW-2,45);}P().text(ctx,s.label,cols[0],y+12,{size:8.6,weight:s.label==='Custom'?900:700,color:s.label==='Custom'?C.tealDark:C.ink});P().text(ctx,pct(s.rate),cols[1],y+12,{size:8.6,weight:750,color:C.ink});P().text(ctx,money(s.payment,2),cols[2],y+12,{size:8.4,weight:750,color:C.ink});P().text(ctx,money(s.monthly,2),cols[3],y+12,{size:8.4,weight:750,color:C.ink});P().text(ctx,signedMoney(s.change,2),cols[4],y+12,{size:8.4,weight:750,color:C.ink});P().text(ctx,r.budget.applicable?money(s.budget,0):signedPct(s.pct),cols[5],y+12,{size:8.4,weight:750,color:C.ink});});
    let y=190+42+rows.length*46+34;P().text(ctx,'RESET CONTEXT',MG,y,{size:9,weight:900,color:C.tealDark});P().text(ctx,`Projected balance at reset: ${money(r.reset.projectedBalance)} · remaining term: ${duration(r.reset.remainingPeriods,i.paymentFrequency)}`,MG,y+20,{size:8.6,weight:650,color:C.muted});y+=46;P().text(ctx,'BUDGET ASSUMPTIONS',MG,y,{size:9,weight:900,color:C.tealDark});y+=17;
    if(r.budget.applicable){[
      ['Monthly take-home household income',money(r.budget.monthlyTakeHomeIncome)],[`Monthly essential expenses excluding ${T().noun}`,money(r.budget.monthlyEssentialOutgoings)],[`Available monthly amount for ${T().noun}`,money(r.budget.availableForMortgage)],['Current monthly buffer',money(r.budget.bufferToday)],['Custom stressed monthly buffer',money(r.budget.customBuffer)],[`Custom stressed ${T().noun} share`,pct(r.budget.stressedMortgageSharePct,1)],['Modeled zero-buffer rate',zeroBufferText(r.budget)]
    ].forEach((e,idx)=>{y=row(ctx,y,e[0],e[1],idx%2===1);});}
    else {card(ctx,MG,y,CW,84,C.light,C.line);P().wrappedText(ctx,'No household income or essential-outgoing assumptions were activated. Carrowmont intentionally does not prefill a normative affordability benchmark.',MG+14,y+31,CW-28,{size:9,lineHeight:12.2,weight:550,color:C.muted,maxLines:3});y+=100;}
    card(ctx,MG,y+18,CW,94,C.amber,'#ead7a5');P().text(ctx,'INTERPRETATION',MG+14,y+42,{size:8.5,weight:900,color:'#7a5b13'});P().wrappedText(ctx,'The scenario ladder is a payment stress test, not a prediction that rates will reach any particular level. The modeled zero-buffer rate, when shown, is only a mathematical crossover under the entered household assumptions and is not a lender or Carrowmont affordability threshold.',MG+14,y+65,CW-28,{size:8.7,lineHeight:11.5,weight:550,color:C.muted,maxLines:4});
    footer(ctx);return pg.canvas;
  }

  function guidePage(model){
    const r=model.result,i=r.input;
    return RS().guidePage({
      reportTitle:`${model.identity.product} Decision Report`,preparedFrom:`Prepared from Carrowmont ${T().familyName} · ${model.identity.product}`,
      howToRead:'Start with the custom stressed payment and the rate-only change. If the rate applies later, review the projected balance and remaining term at the reset checkpoint. Household figures are optional and describe only the cash flow you entered.',
      methodology:[
        {label:'Future reset projection',body:`The current loan is projected for ${r.reset.modeledPeriods} scheduled repayment periods using the current ${i.useCurrentPayment?'entered':'modeled'} repayment. The balance is not amortized over only the pre-reset period.`},
        {label:'Rate-only isolation',body:'At the reset checkpoint, Carrowmont recalculates a same-rate reference payment and a stressed-rate payment over the identical remaining term. Their difference isolates the rate effect.'},
        {label:'Monthly-equivalent cash flow',body:'Weekly and every-two-weeks scheduled repayments are multiplied by their annual frequency and divided by 12 before comparison with monthly household income or outgoings.'},
        {label:'Zero-buffer crossover',body:r.budget.applicable?`A binary search between 0% and 50% solves the ${T().noun} rate at which the entered monthly household buffer is approximately zero. This is not a recommended or lender-qualified rate.`:'No household budget was entered, so no zero-buffer crossover was calculated.'}
      ],
      terminology:[
        {label:'Rate change',body:`Current ${pct(i.annualRatePct)} → custom stressed ${pct(r.customScenario.annualRatePct)}. Standard ladder changes are expressed in percentage points, not percent increase.`},
        {label:'US fixed-rate note',body:'A typical fully fixed-rate US mortgage does not automatically change payment because market rates rise. Use this scenario for an ARM adjustment, contractual reset, refinance or another event that actually changes the loan rate.'},
        {label:'Learn guide',body:`How much could your ${T().paymentLabel} rise if rates increase? · carrowmont.com/mortgage-rate-rise-payment-stress.html`},
        {label:'Next decisions',body:'Fees or term changes belong in Refinance Break-Even. Extra-repayment questions belong in Payoff / Prepayment or Prepayment vs Investing.'}
      ],
      assumptions:'The remaining amortization term is held constant after the modeled rate change. Income and essential outgoings, when entered, are held constant to the reset point. Carrowmont does not forecast future rates, wages, inflation, living costs, lender rules or eligibility.',
      disclaimer:`This report is educational planning software, not individualized lending, financial, tax or legal advice. It does not predict future rates, determine affordability, approve a ${T().noun}, or recommend fixing, floating, refinancing or prepaying.`,
      methodologyMeta:`${T().familyName} MDC1C methodology v1.0.0`,methodologyUrl:'carrowmont.com/mortgage-payoff-calculator/rate-rise-stress-test.html#methodology'
    });
  }

  async function generate(model){if(!P()||!RS())throw new Error('PDF helpers unavailable');const canvases=[summaryPage(model),scenarioPage(model),guidePage(model)];return P().downloadCanvases(canvases,{filename:'carrowmont-mortgage-rate-rise-stress-report.pdf',quality:.93});}
  window.CarrowmontRateRisePdfRenderer={generate};
})();
