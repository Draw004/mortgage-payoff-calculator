(() => {
  'use strict';
  const P=()=>window.CarrowmontPdfExport;
  const RS=()=>window.CarrowmontReportStandard;
  const L=()=>window.CarrowmontLocale;
  const T=()=>L().getMortgageTerms?.()||{noun:'mortgage',nounCap:'Mortgage',familyName:'Mortgage Decision Centre'};
  const W=794,H=1123,M=40,CW=W-M*2;
  const C={ink:'#102945',navy:'#123f5f',teal:'#0e8b80',tealDark:'#08756d',muted:'#4c6379',line:'#d6e1e6',pale:'#e8f6f3',light:'#f7fafc',white:'#fff',amber:'#fff5df',red:'#fff0ee'};

  function page(){return P().createPage({width:W,height:H,scale:2.6,background:'#fff'});}
  function card(ctx,x,y,w,h,fill=C.white,stroke=C.line,r=10){P().roundRect(ctx,x,y,w,h,r,fill,stroke,1);}
  function line(ctx,x1,x2,y,color=C.line,width=1){P().line(ctx,x1,y,x2,y,color,width);}
  function money(v,digits=0){return L().formatMoney(Number(v)||0,{minimumFractionDigits:digits,maximumFractionDigits:digits});}
  function pct(v){return `${Number(v||0).toFixed(2)}%`;}
  function dateLabel(iso){if(!iso)return '-';const d=new Date(`${iso}T00:00:00Z`);try{return new Intl.DateTimeFormat(L().getLocale(),{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(d);}catch(_){return iso;}}
  function freqLabel(key){const bi=(L().getProfile()?.twoWeekLabel==='fortnightly')?'Fortnightly':(L().getProfile()?.twoWeekLabel==='biweekly'?'Biweekly':'Every 2 Weeks');return ({monthly:'Monthly',biweekly:bi,fortnightly:bi,weekly:'Weekly'})[key]||String(key||'Monthly');}
  function payFreqLabel(key){const bi=(L().getProfile()?.twoWeekLabel==='fortnightly')?'Fortnightly':(L().getProfile()?.twoWeekLabel==='biweekly'?'Biweekly':'Every 2 Weeks');return ({weekly:'Weekly',biweekly:bi,semimonthly:'Twice Monthly',fourweekly:'Every 4 Weeks',monthly:'Monthly',annual:'Annual'})[key]||String(key||'Monthly');}
  function extraFreqLabel(key){return ({everyScheduled:'Every scheduled repayment',monthly:'Monthly',quarterly:'Quarterly',halfyearly:'Half-yearly',annual:'Annually',custom:'Custom interval'})[key]||'Not enabled';}
  function duration(periods,frequency){const p=Math.max(0,Number(periods)||0),m=({monthly:12,biweekly:26,fortnightly:26,weekly:52})[frequency]||12;if(!p)return 'No time saved';const months=Math.round(p*12/m);if(months<12)return `${months} month${months===1?'':'s'}`;const y=Math.floor(months/12),mo=months%12;return `${y} year${y===1?'':'s'}${mo?` ${mo} month${mo===1?'':'s'}`:''}`;}
  function modeLabel(mode){return ({recurring:'Pay extra regularly',lump:'Lump-sum prepayment',target:'Target payoff',full:'Full early payoff'})[mode]||'Pay extra regularly';}
  function title(ctx,model,subtitle){P().text(ctx,'CARROWMONT',M,48,{size:14,weight:900,color:C.teal});P().text(ctx,model.identity.product,W-M,48,{size:9.4,weight:750,color:C.muted,align:'right'});P().text(ctx,subtitle,M,85,{size:24,weight:900,color:C.ink});P().text(ctx,`${L().getProfile().label} · ${L().getCurrency()} · Generated ${new Intl.DateTimeFormat(L().getLocale(),{year:'numeric',month:'short',day:'numeric'}).format(new Date())}`,M,110,{size:9.2,weight:600,color:C.muted});line(ctx,M,W-M,132,C.navy,2);}
  function footer(ctx,right='Illustrative estimate · carrowmont.com'){P().text(ctx,'CARROWMONT',M,H-34,{size:9.8,weight:900,color:C.teal});P().text(ctx,right,W-M,H-34,{size:8.5,weight:500,color:C.muted,align:'right'});}
  function metric(ctx,x,y,w,label,value,fill=C.white){card(ctx,x,y,w,74,fill,C.line,10);P().wrappedText(ctx,label,x+12,y+20,w-24,{size:8.3,lineHeight:10.2,weight:700,color:C.muted,maxLines:2});P().text(ctx,value,x+12,y+57,{size:16,weight:900,color:C.ink});}
  function row(ctx,y,label,value,opt={}){const h=opt.h||31;if(opt.fill){ctx.fillStyle=opt.fill;ctx.fillRect(M,y,CW,h);}P().wrappedText(ctx,label,M+8,y+19,280,{size:8.8,lineHeight:10.6,weight:700,color:C.muted,maxLines:2});P().wrappedText(ctx,value,M+310,y+19,CW-318,{size:9,lineHeight:10.8,weight:800,color:C.ink,align:'right',maxLines:2});line(ctx,M,W-M,y+h,C.line,1);return y+h;}

  function summaryPage(model){
    const pg=page(),ctx=pg.ctx,r=model.result,i=model.input;
    title(ctx,model,'Loan & scenario summary');
    card(ctx,M,153,CW,118,C.navy,null,14);
    P().text(ctx,'MODELED OUTCOME',M+18,181,{size:9,weight:900,color:'#dbe8ef'});
    const hero=model.input.mode==='full'?money(r.scenario.modeledSettlementTotal):money(Math.max(0,r.netModeledCostReduction));
    const heroLabel=model.input.mode==='full'?'Modeled settlement total':'Net modeled cost reduction';
    P().text(ctx,hero,M+18,226,{size:31,weight:900,color:C.white});
    P().text(ctx,heroLabel,M+18,250,{size:9.5,weight:650,color:'#dbe8ef'});
    P().wrappedText(ctx,model.input.mode==='full'?'Estimate only. Obtain the lender\'s actual settlement / payoff statement before paying the loan in full.':'This compares the selected scenario with the modeled baseline after deducting entered early-repayment charges.',M+380,184,CW-398,{size:9.2,lineHeight:13,weight:550,color:'#dbe8ef',maxLines:5});
    const gap=8,col=(CW-gap*3)/4,y=294;
    metric(ctx,M,y,col,'Baseline repayment',money(r.baseline.payment,2));
    metric(ctx,M+col+gap,y,col,'Scenario repayment',model.input.mode==='full'?money(r.scenario.modeledSettlementTotal,2):money(r.scenario.payment,2),C.pale);
    metric(ctx,M+(col+gap)*2,y,col,'Interest saved before charges',money(r.interestSavedBeforeCharges),C.pale);
    metric(ctx,M+(col+gap)*3,y,col,'Time saved',duration(r.periodsSaved,i.paymentFrequency));
    metric(ctx,M,y+84,col,'Baseline payoff',dateLabel(r.baseline.payoffDate));
    metric(ctx,M+col+gap,y+84,col,'Scenario payoff',model.input.mode==='full'?'Immediate modeled settlement':dateLabel(r.scenario.payoffDate));
    metric(ctx,M+(col+gap)*2,y+84,col,'Entered charges',money(r.charges));
    metric(ctx,M+(col+gap)*3,y+84,col,'Annual rate',pct(i.annualRatePct));

    P().text(ctx,'LOAN ASSUMPTIONS',M,y+192,{size:9,weight:900,color:C.tealDark});
    let ry=y+207;
    const remaining=`${Number(i.remainingYears||0)} years ${Number(i.remainingMonths||0)} months`;
    const entries=[
      ['Outstanding balance',money(i.balance)],['Remaining duration',remaining],['Scheduled repayment frequency',freqLabel(i.paymentFrequency)],['Calculation convention',r.common.convention==='canada-fixed'?'Canadian fixed-rate semi-annual conversion':'Standard periodic-rate approximation'],['Planning view',model.planningView==='paycycle'?'Pay Cycle View':'Monthly View'],['Scenario type',modeLabel(i.mode)]
    ];
    entries.forEach((e,idx)=>{ry=row(ctx,ry,e[0],e[1],{fill:idx%2?'#fbfdfe':null});});

    P().text(ctx,'SCENARIO INPUTS',M,ry+24,{size:9,weight:900,color:C.tealDark});ry+=39;
    const extra=[];
    if(i.mode==='recurring'){
      extra.push(['Recurring part-prepayment',i.recurringEnabled?money(i.recurringExtra):'Off / not enabled']);
      extra.push(['Part-prepayment cadence',i.recurringEnabled?extraFreqLabel(i.extraFrequency):'Neutral - no cadence selected']);
      if(i.recurringEnabled) extra.push(['Starts at repayment period',String(i.extraStartPeriod||1)]);
      if(Number(i.optionalLumpSum)>0) extra.push(['Optional lump sum',`${money(i.optionalLumpSum)} at period ${i.optionalLumpSumPeriod||1}`]);
      if(model.planningView==='paycycle'&&i.recurringEnabled&&i.extraFrequency) extra.push(['Set aside per pay cycle',`${money(window.CarrowmontMortgageCore.setAsidePerPayCycle(i),2)} · ${payFreqLabel(i.payFrequency)}`]);
    } else if(i.mode==='lump'){
      extra.push(['Lump-sum amount',money(i.lumpSumAmount)]);extra.push(['Apply at repayment period',String(i.lumpSumPeriod||1)]);extra.push(['After lump sum',i.lumpStrategy==='lower-payment'?'Keep payoff horizon; model lower repayment':'Keep repayment; finish sooner']);
    } else if(i.mode==='target'){
      extra.push(['Target payoff horizon',`${Number(i.targetYears||0)} years ${Number(i.targetMonths||0)} months`]);if(Number(i.targetLumpSum)>0)extra.push(['Lump sum applied first',money(i.targetLumpSum)]);
    } else {
      extra.push(['Entered early-repayment / foreclosure charge',money(i.prepaymentCharge)]);extra.push(['Other entered lender charges',money(i.otherCharges)]);
    }
    extra.slice(0,5).forEach((e,idx)=>{ry=row(ctx,ry,e[0],e[1],{fill:idx%2?'#fbfdfe':null});});
    footer(ctx);return pg.canvas;
  }

  function drawBalanceChart(ctx,model,x0,y0,w,h){
    const b=model.result.baseline.ledger||[],s=model.result.scenario.ledger||[];
    if(!b.length){card(ctx,x0,y0,w,h,C.light,C.line,10);P().wrappedText(ctx,'Full-payoff mode models an immediate settlement rather than a future balance path.',x0+20,y0+45,w-40,{size:11,lineHeight:15,weight:700,color:C.muted,maxLines:3});return;}
    const maxN=Math.max(b.length,s.length||1),maxBal=Math.max(model.input.balance,...b.map(r=>r.openingBalance),...s.map(r=>r.openingBalance));
    const px=x0+52,py=y0+20,pw=w-72,ph=h-60;
    for(let k=0;k<=4;k++){const yy=py+ph*k/4;P().line(ctx,px,yy,px+pw,yy,'#dbe4e9',1);P().text(ctx,money(maxBal*(1-k/4)),px-8,yy+3,{size:7.5,weight:600,color:C.muted,align:'right'});}
    P().line(ctx,px,py,px,py+ph,C.line,1);P().line(ctx,px,py+ph,px+pw,py+ph,C.line,1);
    const X=n=>px+(n/maxN)*pw,Y=v=>py+ph-(v/maxBal)*ph;
    const path=(rows,color,width)=>{if(!rows.length)return;ctx.beginPath();ctx.moveTo(X(0),Y(model.input.balance));rows.forEach(r=>ctx.lineTo(X(r.period),Y(r.closingBalance)));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();};
    path(b,'#698197',2);path(s,C.teal,3);
    P().text(ctx,'Baseline',px,py+12,{size:8.2,weight:850,color:'#698197'});P().text(ctx,'Scenario',px+68,py+12,{size:8.2,weight:850,color:C.tealDark});
    P().text(ctx,`0`,px,py+ph+18,{size:7.6,color:C.muted});P().text(ctx,`${maxN} periods`,px+pw,py+ph+18,{size:7.6,color:C.muted,align:'right'});
  }

  function balancePage(model){
    const pg=page(),ctx=pg.ctx,r=model.result,i=model.input;title(ctx,model,'Balance path & payoff comparison');
    drawBalanceChart(ctx,model,M,154,CW,410);
    const gap=10,col=(CW-gap)/2,y=590;
    card(ctx,M,y,col,156,C.light,C.line,10);P().text(ctx,'BASELINE',M+14,y+24,{size:8.6,weight:900,color:C.muted});P().text(ctx,dateLabel(r.baseline.payoffDate),M+14,y+55,{size:18,weight:900,color:C.ink});P().text(ctx,`Total interest ${money(r.baseline.totalInterest)}`,M+14,y+83,{size:10,weight:750,color:C.muted});P().text(ctx,`Regular repayment ${money(r.baseline.payment,2)}`,M+14,y+105,{size:10,weight:750,color:C.muted});P().text(ctx,`${r.baseline.payoffPeriods} modeled repayment periods`,M+14,y+127,{size:9,color:C.muted});
    card(ctx,M+col+gap,y,col,156,C.pale,'#b8ddd8',10);P().text(ctx,'SCENARIO',M+col+gap+14,y+24,{size:8.6,weight:900,color:C.tealDark});P().text(ctx,i.mode==='full'?'Immediate settlement':dateLabel(r.scenario.payoffDate),M+col+gap+14,y+55,{size:18,weight:900,color:C.ink});P().text(ctx,`Total interest ${money(r.scenario.totalInterest||0)}`,M+col+gap+14,y+83,{size:10,weight:750,color:C.muted});P().text(ctx,`Interest difference ${money(r.interestSavedBeforeCharges)}`,M+col+gap+14,y+105,{size:10,weight:750,color:C.muted});P().text(ctx,`Time difference ${duration(r.periodsSaved,i.paymentFrequency)}`,M+col+gap+14,y+127,{size:9,color:C.muted});
    P().text(ctx,'WHAT CHANGES',M,y+190,{size:9,weight:900,color:C.tealDark});
    let ry=y+206;[
      ['Modeled interest difference',money(r.interestSavedBeforeCharges)],['Entered charges',money(r.charges)],['Net modeled cost reduction after charges',money(r.netModeledCostReduction)],['Scenario repayment',i.mode==='full'?money(r.scenario.modeledSettlementTotal,2):money(r.scenario.payment,2)]
    ].forEach((e,idx)=>{ry=row(ctx,ry,e[0],e[1],{fill:idx%2?'#fbfdfe':null});});
    card(ctx,M,ry+22,CW,78,C.amber,'#ead7a5',10);P().text(ctx,'Important',M+14,ry+44,{size:9,weight:900,color:'#7a5b13'});P().wrappedText(ctx,'The chart is a planning illustration. Actual lender outcomes can differ because of daily interest, rounding, settlement dates, variable rates, fees, offsets/redraw and product-specific prepayment rules.',M+14,ry+63,CW-28,{size:8.8,lineHeight:11.6,weight:550,color:C.muted,maxLines:3});
    footer(ctx);return pg.canvas;
  }

  function detailPage(model){
    const pg=page(),ctx=pg.ctx,r=model.result,i=model.input;title(ctx,model,'Repayment detail');
    let y=154;P().wrappedText(ctx,'This page summarizes the same period-by-period ledger used on screen. CSV contains the complete repayment ledger when a future schedule exists.',M,y,CW,{size:9.4,lineHeight:13,weight:550,color:C.muted,maxLines:2});y+=44;
    P().text(ctx,'ANNUAL SUMMARY',M,y,{size:9,weight:900,color:C.tealDark});y+=17;
    const annual=(r.annualSummary||[]).slice(0,14);
    if(!annual.length){card(ctx,M,y,CW,70,C.light,C.line,10);P().wrappedText(ctx,'Full-payoff mode estimates an immediate settlement, so there is no future annual amortization table.',M+14,y+28,CW-28,{size:9.6,lineHeight:13,weight:650,color:C.muted,maxLines:2});y+=90;}
    else {
      const cols=[50,116,116,108,104,104,116],heads=['Year','Opening','Scheduled','Extra','Interest','Principal','Closing'];
      let x=M;ctx.fillStyle=C.navy;ctx.fillRect(M,y,CW,27);heads.forEach((h,idx)=>{P().text(ctx,h,x+5,y+18,{size:7.1,weight:900,color:C.white});x+=cols[idx];});y+=27;
      annual.forEach((a,idx)=>{const vals=[a.year,money(a.openingBalance),money(a.scheduledRepayments),money(a.extraRepayments),money(a.interestCharged),money(a.principalRepaid),money(a.closingBalance)];x=M;if(idx%2){ctx.fillStyle='#fbfdfe';ctx.fillRect(M,y,CW,29);}vals.forEach((v,j)=>{P().text(ctx,String(v),x+5,y+19,{size:j===0?7.6:6.9,weight:j===0?850:650,color:C.ink});x+=cols[j];});line(ctx,M,W-M,y+29,C.line,1);y+=29;});
      if((r.annualSummary||[]).length>14){P().text(ctx,`First 14 years shown here · complete detail is included in the CSV (${r.annualSummary.length} modeled years).`,M,y+18,{size:7.9,weight:650,color:C.muted});y+=32;}
    }
    P().text(ctx,'ASSUMPTIONS & LIMITATIONS',M,y+10,{size:9,weight:900,color:C.tealDark});y+=28;
    const notes=[
      ['Interest-rate assumption',`The entered annual rate of ${pct(i.annualRatePct)} is held constant throughout the V1 scenario.`],
      ['Repayment timing',`${freqLabel(i.paymentFrequency)} scheduled repayments drive the amortization model. The ${model.planningView==='paycycle'?'Pay Cycle':'Monthly'} View changes presentation only.`],
      ['Part-prepayment cadence',i.recurringEnabled?`${extraFreqLabel(i.extraFrequency)} was selected by the user. No country-specific cadence was assumed.`:'Recurring part-prepayment was not enabled. No country-specific cadence was assumed.'],
      ['Entered charges',`${money(r.charges)} of user-entered charges are included when showing net modeled cost reduction.`]
    ];
    if(r.common.convention==='canada-fixed')notes.push(['Canada fixed-rate convention','The nominal annual rate is converted using semi-annual compounding before deriving the payment-period rate.']);
    if(i.mode==='full')notes.push(['Full payoff warning','The modeled settlement is not a lender payoff statement and can exclude accrued daily interest, discharge fees or other product-specific amounts.']);
    notes.slice(0,6).forEach((e,idx)=>{const h=52;if(idx%2){ctx.fillStyle='#fbfdfe';ctx.fillRect(M,y,CW,h);}P().text(ctx,e[0],M+8,y+18,{size:8.5,weight:850,color:C.ink});P().wrappedText(ctx,e[1],M+205,y+18,CW-213,{size:8.4,lineHeight:11.1,weight:550,color:C.muted,maxLines:3});line(ctx,M,W-M,y+h,C.line,1);y+=h;});
    footer(ctx);return pg.canvas;
  }

  function guide(model){
    const id=model.identity,r=model.result,i=model.input;
    return RS().guidePage({
      reportTitle:`${id.product} Report`,preparedFrom:`Prepared from the Carrowmont ${id.product} calculator`,
      howToRead:'Start with the modeled cost/time change, then compare the baseline and scenario payoff paths. Review the assumptions, repayment frequency, selected prepayment cadence and any user-entered charges before using the result for planning.',
      methodology:[
        {label:'Amortization basis',body:'Carrowmont models principal-and-interest repayment period by period using the entered balance, annual rate, remaining duration and scheduled repayment frequency.'},
        {label:'Extra principal',body:'Recurring extras and lump sums reduce the modeled balance when they occur. The final repayment is capped so the balance does not become negative.'},
        {label:'Target payoff',body:'The target-payoff mode solves for the regular repayment needed over the shorter target horizon and verifies it through the same repayment ledger.'},
        {label:'Country convention',body:r.common.convention==='canada-fixed'?'Canadian fixed-rate mode converts the nominal annual rate using semi-annual compounding before deriving the payment-period rate.':'The standard model divides the entered nominal annual rate by the number of scheduled repayment periods per year.'}
      ],
      terminology:[
        {label:'Scheduled repayment',body:'The normal contractual-style repayment modeled by Carrowmont. It is separate from any optional extra / part-prepayment.'},
        {label:'Part-prepayment / overpayment',body:'An optional amount paid above the normal scheduled repayment to reduce principal earlier.'},
        {label:'Planning view',body:'Monthly View or Pay Cycle View changes affordability presentation only; it does not alter the amortization cadence.'},
        {label:'Payoff / foreclosure estimate',body:'A modelled planning amount, not the lender\'s legally binding settlement or payoff statement.'}
      ],
      assumptions:`The annual rate is held constant. Carrowmont does not model variable-rate resets, lender-specific penalty formulas, offset/redraw accounts, escrow, taxes, insurance or refinancing. Entered charges are used only when supplied by the user. Selected scheduled repayment frequency: ${freqLabel(i.paymentFrequency)}.`,
      disclaimer:'This report is an educational planning illustration, not individualized credit, financial, tax or legal advice. Actual lender calculations can differ because of daily interest, rounding, settlement dates, fees, loan contracts and local rules. Confirm any prepayment, overpayment, foreclosure or payoff amount with the lender before acting.',
      methodologyMeta:`${T().nounCap} payoff / prepayment methodology v1.0.0`,
      methodologyUrl:'carrowmont.com/mortgage-payoff-calculator/#methodology'
    });
  }

  async function generate(model){
    if(!P()||!RS())throw new Error('PDF helpers unavailable');
    const canvases=[summaryPage(model),balancePage(model),detailPage(model),guide(model),RS().continuePlanningPage({currentTool:'housing',intro:'Continue planning with Carrowmont after reviewing your housing debt. Explore cash flow, recurring investment, retirement, inflation, goals and financial independence with the same country-aware planning ecosystem.'})];
    return P().downloadCanvases(canvases,{filename:'carrowmont-mortgage-payoff-report.pdf',quality:.93});
  }
  window.CarrowmontMortgagePdfRenderer={generate};
})();
