(() => {
  'use strict';
  const P=()=>window.CarrowmontPdfExport;
  const RS=()=>window.CarrowmontReportStandard;
  const L=()=>window.CarrowmontLocale;
  const M=()=>window.CarrowmontMortgageCore;
  const W=794,H=1123,MG=42,CW=W-MG*2;
  const C={ink:'#102945',teal:'#0e827a',tealDark:'#08736c',muted:'#4b637b',line:'#c9d9e2',pale:'#e8f6f3',light:'#f7fafb',amber:'#fff7e8',red:'#fff1ef',white:'#ffffff'};
  function page(){return P().createPage({width:W,height:H,scale:2.6,background:'#fff'});}
  function card(ctx,x,y,w,h,fill=C.white,stroke=C.line){P().roundRect(ctx,x,y,w,h,10,fill,stroke,1);}
  function money(v,d=0){return L().formatMoney(Number(v)||0,{maximumFractionDigits:d,minimumFractionDigits:d});}
  function pct(v){return v==null?'—':`${Number(v).toFixed(2)}%`;}
  function duration(periods,freq){return M().durationLabel(Math.max(0,Number(periods)||0),freq);}
  function dateLabel(iso){if(!iso)return '—';const d=new Date(`${iso}T00:00:00Z`);try{return new Intl.DateTimeFormat(L().getLocale(),{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(d);}catch(_){return iso;}}
  function header(ctx,title,subtitle){P().text(ctx,'CARROWMONT',MG,54,{size:15,weight:900,color:C.teal});P().text(ctx,title,MG,94,{size:25,weight:900,color:C.ink});P().wrappedText(ctx,subtitle,MG,119,CW,{size:9.4,lineHeight:13,weight:550,color:C.muted,maxLines:2});P().line(ctx,MG,145,W-MG,145,C.line,1);}
  function footer(ctx,text='Carrowmont · Mortgage Decision Centre · Educational planning report'){P().line(ctx,MG,H-48,W-MG,H-48,C.line,1);P().text(ctx,text,MG,H-27,{size:7.8,weight:650,color:C.muted});P().text(ctx,'carrowmont.com',W-MG,H-27,{size:7.8,weight:650,color:C.muted,align:'right'});}
  function metric(ctx,x,y,w,label,value,note,fill=C.white){card(ctx,x,y,w,104,fill,C.line);P().text(ctx,label.toUpperCase(),x+14,y+22,{size:8.1,weight:900,color:C.muted});P().wrappedText(ctx,value,x+14,y+50,w-28,{size:17.5,lineHeight:20,weight:900,color:C.ink,maxLines:2});if(note)P().wrappedText(ctx,note,x+14,y+80,w-28,{size:7.8,lineHeight:10.4,weight:550,color:C.muted,maxLines:2});}
  function row(ctx,y,label,value,alt=false){if(alt){ctx.fillStyle='#fbfdfe';ctx.fillRect(MG,y,CW,34);}P().text(ctx,label,MG+9,y+21,{size:8.4,weight:750,color:C.muted});P().text(ctx,value,W-MG-9,y+21,{size:8.7,weight:850,color:C.ink,align:'right'});P().line(ctx,MG,y+34,W-MG,y+34,C.line,1);return y+34;}
  function breakEvenLabel(r){const c=r.comparison;if(c.durableBreakEvenPeriod===0)return 'Immediate / at completion';if(c.durableBreakEvenPeriod==null)return 'No durable break-even';return r.input.paymentFrequency==='monthly'?`${c.durableBreakEvenMonths} months`:`About ${c.durableBreakEvenMonths} months`;}
  function effectLabel(value,tol){if(Math.abs(value)<=tol)return 'Approximately break-even';return value>0?`Modeled saving ${money(value)}`:`Additional cost ${money(Math.abs(value))}`;}

  function summaryPage(model){
    const pg=page(),ctx=pg.ctx,r=model.result,i=r.input,c=r.comparison;
    header(ctx,`${model.identity.product} Decision Report`,'Durable break-even, three-payment comparison, switching costs and term effects from the same deterministic result used on screen.');
    card(ctx,MG,166,CW,130,'#102945','#102945');P().text(ctx,'DURABLE ECONOMIC BREAK-EVEN',MG+18,192,{size:9,weight:900,color:'#a6ddd8'});P().wrappedText(ctx,breakEvenLabel(r),MG+18,236,CW-36,{size:31,lineHeight:34,weight:900,color:'#fff',maxLines:2});P().wrappedText(ctx,c.durableBreakEvenPeriod==null?(c.temporaryCrossingPeriod==null?'Switching costs are not durably recovered within the modeled loan horizons.':`An early crossing appears around month ${c.temporaryCrossingMonths}, but it later reverses and is not treated as durable break-even.`):'The break-even is only reported when the modeled advantage stays non-negative through the full comparison horizon.',MG+18,270,CW-36,{size:8.7,lineHeight:11.7,weight:550,color:'#dce8f1',maxLines:3});
    const gap=12,col=(CW-gap)/2;metric(ctx,MG,316,col,'Current repayment',money(r.currentLoan.payment,2),'Derived from current balance, rate and term.',C.pale);metric(ctx,MG+col+gap,316,col,'New rate · same term',money(r.rateOnlySameTerm.payment,2),'Rate effect isolated before fees and term changes.',C.pale);metric(ctx,MG,432,col,'Proposed refinance repayment',money(r.proposedLoan.payment,2),`Proposed term: ${duration(r.proposedLoan.termPeriods,i.paymentFrequency)}`);metric(ctx,MG+col+gap,432,col,'Lifetime modeled effect',effectLabel(c.lifetimeAdvantage,r.tolerance),'Borrowing-cost comparison after switching cost.');
    if(i.useHoldingPeriod)metric(ctx,MG,548,col,'At expected holding period',effectLabel(c.holdingPeriodAdvantage,r.tolerance),`${i.holdingYears} years ${i.holdingMonths} months`);else metric(ctx,MG,548,col,'At expected holding period','Not entered','Break-even and lifetime comparison still calculated.');metric(ctx,MG+col+gap,548,col,'Net switching cost',money(r.costs.netSwitchingCost),`${r.costs.feePaymentMode==='financed'?'Switching fees financed':'Switching fees paid upfront'} · cashback included.`);
    const warning=c.lowerPaymentHigherLifetimeCost?'The modeled repayment is lower, but the modeled lifetime borrowing cost is higher under these assumptions.':c.termChangePeriods>0?'The proposed loan runs longer. Part of a lower payment may come from borrowing for longer, not only from the lower rate.':c.termChangePeriods<0?'The proposed loan finishes sooner. A higher repayment can coexist with lower lifetime borrowing cost.':'The current remaining term and proposed new term are the same length.';
    card(ctx,MG,672,CW,82,c.lowerPaymentHigherLifetimeCost?C.red:C.amber,c.lowerPaymentHigherLifetimeCost?'#e4aaa5':'#ead7a5');P().text(ctx,'TERM & PAYMENT INTERPRETATION',MG+14,696,{size:8.5,weight:900,color:c.lowerPaymentHigherLifetimeCost?'#9b2f27':'#7a5b13'});P().wrappedText(ctx,warning,MG+14,718,CW-28,{size:8.7,lineHeight:11.5,weight:600,color:C.muted,maxLines:4});
    P().text(ctx,'ASSUMPTIONS',MG,796,{size:9,weight:900,color:C.tealDark});let y=812;[
      ['Current balance',money(i.balance)],['Current / new annual rate',`${pct(i.currentRatePct)} / ${pct(i.newRatePct)}`],['Current / proposed term',`${i.remainingYears}y ${i.remainingMonths}m / ${i.proposedYears}y ${i.proposedMonths}m`],['Repayment frequency',i.paymentFrequency],['Switching fees',money(r.costs.switchingFees)],['Exit / early-repayment charge',money(r.costs.exitCharge)],['Cashback / incentive',money(r.costs.cashback)]
    ].forEach((e,idx)=>{y=row(ctx,y,e[0],e[1],idx%2===1);});footer(ctx);return pg.canvas;
  }

  function drawAdvantageChart(ctx,r,x,y,w,h){
    const s=r.comparison.advantageSeries||[];if(!s.length)return;const vals=s.map(p=>p.advantage);let min=Math.min(0,...vals),max=Math.max(0,...vals);if(Math.abs(max-min)<1e-9){max+=1;min-=1;}const px=p=>x+(p/Math.max(1,s[s.length-1].period))*w,py=v=>y+(max-v)/(max-min)*h;const zero=py(0);P().line(ctx,x,y,x,y+h,C.line,1);P().line(ctx,x,y+h,x+w,y+h,C.line,1);ctx.save();ctx.setLineDash([5,5]);P().line(ctx,x,zero,x+w,zero,'#738999',1.2);ctx.restore();const step=Math.max(1,Math.ceil(s.length/80));ctx.beginPath();let started=false;s.forEach((p,idx)=>{if(idx%step!==0&&idx!==s.length-1)return;const xx=px(p.period),yy=py(p.advantage);if(!started){ctx.moveTo(xx,yy);started=true;}else ctx.lineTo(xx,yy);});ctx.strokeStyle=C.teal;ctx.lineWidth=2.6;ctx.stroke();if(r.comparison.durableBreakEvenPeriod!=null){const p=s[Math.min(r.comparison.durableBreakEvenPeriod,s.length-1)];ctx.beginPath();ctx.arc(px(p.period),py(p.advantage),4,0,Math.PI*2);ctx.fillStyle=C.teal;ctx.fill();}if(r.comparison.holdingPeriodPeriods!=null){const p=s[Math.min(r.comparison.holdingPeriodPeriods,s.length-1)];ctx.beginPath();ctx.arc(px(p.period),py(p.advantage),4,0,Math.PI*2);ctx.fillStyle=C.ink;ctx.fill();}P().text(ctx,'0 / break-even',x+4,zero-6,{size:7.5,weight:650,color:C.muted});P().text(ctx,'Start',x,y+h+18,{size:7.5,weight:650,color:C.muted});P().text(ctx,`${s[s.length-1].months} months`,x+w,y+h+18,{size:7.5,weight:650,color:C.muted,align:'right'});
  }

  function comparisonPage(model){
    const pg=page(),ctx=pg.ctx,r=model.result,i=r.input,c=r.comparison;header(ctx,'Cost, term & time comparison','The middle scenario isolates the rate effect. The proposed refinance uses the entered new term and any financed switching fees.');
    P().text(ctx,'THREE PAYMENT FIGURES',MG,172,{size:9,weight:900,color:C.tealDark});const g=10,cw=(CW-g*2)/3;metric(ctx,MG,190,cw,'Current loan',money(r.currentLoan.payment,2),`${pct(r.currentLoan.rate)} · ${duration(r.currentLoan.termPeriods,i.paymentFrequency)}`,C.light);metric(ctx,MG+cw+g,190,cw,'New rate · same term',money(r.rateOnlySameTerm.payment,2),`${pct(r.rateOnlySameTerm.rate)} · same term`,C.pale);metric(ctx,MG+(cw+g)*2,190,cw,'Proposed refinance',money(r.proposedLoan.payment,2),`${pct(r.proposedLoan.rate)} · ${duration(r.proposedLoan.termPeriods,i.paymentFrequency)}`,C.light);
    P().text(ctx,'MODELED REFINANCE ADVANTAGE OVER TIME',MG,332,{size:9,weight:900,color:C.tealDark});card(ctx,MG,348,CW,292,C.white,C.line);drawAdvantageChart(ctx,r,MG+26,372,CW-52,220);P().wrappedText(ctx,c.durableBreakEvenPeriod==null?'No durable break-even appears within the modeled horizons.':c.durableBreakEvenPeriod===0?'Durable break-even is immediate at completion.':`Durable break-even is about ${c.durableBreakEvenMonths} months.`,MG+26,622,CW-52,{size:8.4,lineHeight:11.2,weight:750,color:C.ink,maxLines:2});
    P().text(ctx,'COST COMPOSITION & LIFETIME INTEREST',MG,686,{size:9,weight:900,color:C.tealDark});let yy=703;[
      ['Current remaining-lifetime interest',money(r.currentLoan.totalInterest)],['New-rate same-term interest',money(r.rateOnlySameTerm.totalInterest)],['Proposed refinance lifetime interest',money(r.proposedLoan.totalInterest)],['Financed switching fees added to principal',money(r.proposedLoan.financedFees)],['Switching fees',money(r.costs.switchingFees)],['Exit / early-repayment charge',money(r.costs.exitCharge)],['Cashback / incentive',money(r.costs.cashback)],['Net switching cost',money(r.costs.netSwitchingCost)],['Lifetime modeled refinance advantage',effectLabel(c.lifetimeAdvantage,r.tolerance)]
    ].forEach((e,idx)=>{yy=row(ctx,yy,e[0],e[1],idx%2===1);});
    card(ctx,MG,yy+16,CW,76,C.amber,'#ead7a5');P().wrappedText(ctx,'Principal repayment itself is not treated as a borrowing cost. The period-by-period interest-plus-cost comparison reconciles with cumulative borrower cash outflow plus remaining loan balance. Property value, sale costs and future replacement loans are outside this model.',MG+14,yy+42,CW-28,{size:8.5,lineHeight:11.2,weight:550,color:C.muted,maxLines:4});footer(ctx);return pg.canvas;
  }

  function guidePage(model){
    const r=model.result,i=r.input,c=r.comparison;
    return RS().guidePage({
      reportTitle:`${model.identity.product} Decision Report`,preparedFrom:`Prepared from Carrowmont Mortgage Decision Centre · ${model.identity.product}`,
      howToRead:'Start with durable break-even, then compare the three repayment figures. The same-term new-rate payment isolates the rate effect; the proposed payment also reflects the entered term and any financed switching fees. Review the holding-period and lifetime results separately.',
      methodology:[
        {label:'Borrowing-cost comparison',body:'At each modeled repayment period, current-loan cumulative interest is compared with proposed-loan cumulative interest plus switching fees, exit charge and cashback. Principal repayment is not mislabeled as a cost.'},
        {label:'Financed fees',body:`Switching fees are ${r.costs.feePaymentMode==='financed'?'financed into the proposed principal':'paid upfront'} in this run. The full fee remains an economic cost; financed fees also generate new-loan interest.`},
        {label:'Durable break-even',body:c.durableBreakEvenPeriod==null?'No durable non-negative crossing remains through the full comparison horizon. A temporary crossing is not promoted as break-even.':`The earliest durable crossing is ${c.durableBreakEvenPeriod===0?'at completion':`about ${c.durableBreakEvenMonths} months`}.`},
        {label:'Holding period',body:i.useHoldingPeriod?`The entered holding point is ${i.holdingYears} years ${i.holdingMonths} months and is evaluated independently of the lifetime result.`:'No holding period was entered; the break-even and lifetime calculations still apply.'}
      ],
      terminology:[
        {label:'Same-term rate-only payment',body:'New offered rate applied to the current balance and current remaining term. Switching fees are intentionally excluded from this isolation figure.'},
        {label:'Proposed refinance payment',body:'New offered rate applied to the proposed new term and to the current balance plus any financed switching fees.'},
        {label:'Learn guide',body:'When Does Mortgage Refinancing Break Even? · carrowmont.com/mortgage-refinance-break-even.html'},
        {label:'Decision Centre',body:'Continue the mortgage journey at carrowmont.com/mortgage-payoff-calculator/decision-centre.html'}
      ],
      assumptions:`Current and proposed rates are held constant. One repayment frequency is used for both loans. Carrowmont does not automatically model country-specific penalties, taxes, legal settlement rules, APR/APRC normalization, variable-rate paths, property values, sale costs or a future replacement loan.`,
      disclaimer:'This report is educational planning software, not individualized lending, financial, tax or legal advice. It does not rank lenders, determine eligibility or guarantee savings. Confirm actual charges, incentive conditions and lender rules from authoritative documents.',
      methodologyMeta:'Mortgage Decision Centre MDC1B methodology v1.0.0',methodologyUrl:'carrowmont.com/mortgage-payoff-calculator/refinance-break-even.html#methodology'
    });
  }

  async function generate(model){if(!P()||!RS())throw new Error('PDF helpers unavailable');const canvases=[summaryPage(model),comparisonPage(model),guidePage(model)];return P().downloadCanvases(canvases,{filename:'carrowmont-refinance-break-even-decision-report.pdf',quality:.93});}
  window.CarrowmontRefinancePdfRenderer={generate};
})();
