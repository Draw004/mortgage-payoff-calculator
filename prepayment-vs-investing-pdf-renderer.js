(() => {
  'use strict';
  const P=()=>window.CarrowmontPdfExport;
  const RS=()=>window.CarrowmontReportStandard;
  const L=()=>window.CarrowmontLocale;
  const M=()=>window.CarrowmontMortgageCore;
  const W=794,H=1123,MG=42,CW=W-MG*2;
  const C={ink:'#102945',teal:'#0e827a',tealDark:'#08736c',muted:'#4b637b',line:'#c9d9e2',pale:'#e8f6f3',light:'#f7fafb',amber:'#fff7e8',white:'#ffffff'};
  function page(){return P().createPage({width:W,height:H,scale:2.6,background:'#fff'});}
  function card(ctx,x,y,w,h,fill=C.white,stroke=C.line){P().roundRect(ctx,x,y,w,h,10,fill,stroke,1);}
  function money(v,d=0){return L().formatMoney(Number(v)||0,{maximumFractionDigits:d,minimumFractionDigits:d});}
  function pct(v){return v==null?'—':`${Number(v).toFixed(2)}%`;}
  function dateLabel(iso){if(!iso)return '—';const d=new Date(`${iso}T00:00:00Z`);try{return new Intl.DateTimeFormat(L().getLocale(),{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(d);}catch(_){return iso;}}
  function duration(periods,freq){return M().durationLabel(periods,freq);}
  function header(ctx,title,subtitle){P().text(ctx,'CARROWMONT',MG,54,{size:15,weight:900,color:C.teal});P().text(ctx,title,MG,94,{size:27,weight:900,color:C.ink});P().wrappedText(ctx,subtitle,MG,119,CW,{size:9.6,lineHeight:13.2,weight:550,color:C.muted,maxLines:2});P().line(ctx,MG,145,W-MG,145,C.line,1);}
  function footer(ctx,text='Carrowmont · Mortgage Decision Centre · Educational planning report'){P().line(ctx,MG,H-48,W-MG,H-48,C.line,1);P().text(ctx,text,MG,H-27,{size:7.8,weight:650,color:C.muted});P().text(ctx,'carrowmont.com',W-MG,H-27,{size:7.8,weight:650,color:C.muted,align:'right'});}
  function metric(ctx,x,y,w,label,value,note,fill=C.white){card(ctx,x,y,w,100,fill,C.line);P().text(ctx,label.toUpperCase(),x+14,y+22,{size:8.2,weight:900,color:C.muted});P().text(ctx,value,x+14,y+51,{size:18,weight:900,color:C.ink});if(note)P().wrappedText(ctx,note,x+14,y+72,w-28,{size:8,lineHeight:10.5,weight:550,color:C.muted,maxLines:2});}
  function row(ctx,y,label,value,alt=false){if(alt){ctx.fillStyle='#fbfdfe';ctx.fillRect(MG,y,CW,34);}P().text(ctx,label,MG+9,y+21,{size:8.5,weight:750,color:C.muted});P().text(ctx,value,W-MG-9,y+21,{size:8.8,weight:850,color:C.ink,align:'right'});P().line(ctx,MG,y+34,W-MG,y+34,C.line,1);return y+34;}

  function summaryPage(model){
    const pg=page(),ctx=pg.ctx,r=model.result,i=r.input;
    header(ctx,`${model.identity.product} Decision Report`,'Break-even return, common-horizon values and the mortgage impact from the same deterministic result used on screen.');
    card(ctx,MG,166,CW,126,'#102945','#102945');P().text(ctx,'BREAK-EVEN EFFECTIVE ANNUAL INVESTMENT RETURN',MG+18,191,{size:9,weight:900,color:'#a6ddd8'});P().text(ctx,r.comparison.breakEvenReturnPct==null?'No modeled crossing':pct(r.comparison.breakEvenReturnPct),MG+18,235,{size:34,weight:900,color:'#fff'});P().wrappedText(ctx,r.comparison.breakEvenReturnPct==null?'No break-even return was found inside the supported solver range; Carrowmont does not extrapolate a threshold.':`At about ${pct(r.comparison.breakEvenReturnPct)} effective annually, both paths finish at approximately the same modeled value at the original mortgage payoff date.`,MG+18,261,CW-36,{size:9,lineHeight:12.4,weight:550,color:'#dce8f1',maxLines:2});
    const gap=12,col=(CW-gap)/2;metric(ctx,MG,310,col,'Interest avoided',money(r.prepay.interestAvoided),'Before the separately entered prepayment charge.',C.pale);metric(ctx,MG+col+gap,310,col,'Time saved',duration(r.prepay.periodsSaved,i.paymentFrequency),`Prepay payoff: ${dateLabel(r.prepay.payoffDate)}`,C.pale);
    metric(ctx,MG,424,col,'Common horizon',dateLabel(r.comparison.commonHorizonDate),'Original scheduled mortgage payoff date.');metric(ctx,MG+col+gap,424,col,'Prepayment charge',money(i.prepaymentCharge),'User-entered amount; no automatic lender-rule calculation.');
    P().text(ctx,'MODELED OUTCOME AT YOUR ASSUMED RETURN',MG,555,{size:9,weight:900,color:C.tealDark});
    if(r.comparison.assumedReturnPct==null){card(ctx,MG,572,CW,108,C.light,C.line);P().text(ctx,'No assumed investment return was entered.',MG+16,602,{size:14,weight:900,color:C.ink});P().wrappedText(ctx,'The break-even threshold and mortgage effects are still calculated. Enter an effective annual return in the tool when you want to compare modeled ending values.',MG+16,628,CW-32,{size:9,lineHeight:12.4,weight:550,color:C.muted,maxLines:3});}
    else {const diff=r.comparison.pathDifference;const higher=r.comparison.higherModeledPath==='prepay'?'Prepay path':r.comparison.higherModeledPath==='invest'?'Invest path':'Paths';card(ctx,MG,572,CW,108,C.light,C.line);P().text(ctx,`${pct(r.comparison.assumedReturnPct)} modeled return`,MG+16,600,{size:12,weight:900,color:C.tealDark});P().text(ctx,r.comparison.higherModeledPath==='approximately-equal'?'Approximately equal':`${higher} ${money(Math.abs(diff))} higher`,MG+16,628,{size:20,weight:900,color:C.ink});P().text(ctx,`Prepay ${money(r.prepay.endingNetValue)} · Invest ${money(r.invest.endingValue)}`,MG+16,654,{size:9.5,weight:750,color:C.muted});}
    P().text(ctx,'LOAN & EXTRA-MONEY ASSUMPTIONS',MG,716,{size:9,weight:900,color:C.tealDark});let y=731;[
      ['Outstanding balance',money(i.balance)],['Annual mortgage / home-loan rate',pct(i.annualRatePct)],['Remaining term',`${i.remainingYears} years ${i.remainingMonths} months`],['Scheduled repayment frequency',i.paymentFrequency],['Baseline scheduled repayment',money(r.baseline.payment,2)],['Extra-money mode',i.extraMode==='lump'?'One-time lump sum':'Recurring extra amount'],['Extra amount',money(i.extraAmount)]
    ].forEach((e,idx)=>{y=row(ctx,y,e[0],e[1],idx%2===1);});
    card(ctx,MG,y+18,CW,86,C.amber,'#ead7a5');P().text(ctx,'UNCERTAINTY',MG+14,y+40,{size:8.5,weight:900,color:'#7a5b13'});P().wrappedText(ctx,'Mortgage interest avoided is comparatively predictable once the modeled loan terms and charges are correct. Investment returns are uncertain and can be lower, higher or negative. This report does not recommend an investment product or a mortgage action.',MG+14,y+61,CW-28,{size:8.7,lineHeight:11.5,weight:550,color:C.muted,maxLines:4});footer(ctx);return pg.canvas;
  }

  function comparisonPage(model){
    const pg=page(),ctx=pg.ctx,r=model.result,i=r.input;header(ctx,'Loan & equal-cash-flow comparison','Both paths use the same planned cash through the original scheduled mortgage payoff date.');
    const gap=12,col=(CW-gap)/2;card(ctx,MG,168,col,178,C.pale,'#b8ddd8');P().text(ctx,'PREPAY PATH',MG+14,193,{size:9,weight:900,color:C.tealDark});P().text(ctx,dateLabel(r.prepay.payoffDate),MG+14,228,{size:18,weight:900,color:C.ink});P().text(ctx,`Payoff ${duration(r.prepay.periodsSaved,i.paymentFrequency)} sooner`,MG+14,253,{size:9,weight:750,color:C.muted});P().wrappedText(ctx,'Extra cash reduces principal. After payoff, scheduled mortgage cash that would otherwise have continued — plus continuing recurring extra cash — is invested through the common horizon.',MG+14,281,col-28,{size:8.6,lineHeight:11.4,weight:550,color:C.muted,maxLines:5});
    card(ctx,MG+col+gap,168,col,178,C.light,C.line);P().text(ctx,'INVEST PATH',MG+col+gap+14,193,{size:9,weight:900,color:C.muted});P().text(ctx,dateLabel(r.baseline.payoffDate),MG+col+gap+14,228,{size:18,weight:900,color:C.ink});P().text(ctx,'Original mortgage schedule continues',MG+col+gap+14,253,{size:9,weight:750,color:C.muted});P().wrappedText(ctx,'The same planned extra cash is invested on its planned dates instead of reducing principal. The mortgage reaches payoff on the original schedule.',MG+col+gap+14,281,col-28,{size:8.6,lineHeight:11.4,weight:550,color:C.muted,maxLines:5});
    P().text(ctx,'ENDING VALUE AT THE COMMON HORIZON',MG,386,{size:9,weight:900,color:C.tealDark});
    if(r.comparison.assumedReturnPct==null){card(ctx,MG,404,CW,94,C.light,C.line);P().wrappedText(ctx,'No assumed investment return was entered, so ending investment values are intentionally not shown. The break-even solver remains available without a market-return assumption.',MG+14,435,CW-28,{size:9.2,lineHeight:12.6,weight:650,color:C.muted,maxLines:3});}
    else {const max=Math.max(1,Math.max(0,r.prepay.endingNetValue),Math.max(0,r.invest.endingValue));const x=MG+160,w=CW-190;P().text(ctx,'Prepay',MG,428,{size:9,weight:850,color:C.ink});ctx.fillStyle='#e8eef1';ctx.fillRect(x,414,w,18);ctx.fillStyle=C.teal;ctx.fillRect(x,414,w*Math.max(0,r.prepay.endingNetValue)/max,18);P().text(ctx,money(r.prepay.endingNetValue),W-MG,428,{size:9,weight:900,color:C.ink,align:'right'});P().text(ctx,'Invest',MG,470,{size:9,weight:850,color:C.ink});ctx.fillStyle='#e8eef1';ctx.fillRect(x,456,w,18);ctx.fillStyle='#6c8397';ctx.fillRect(x,456,w*Math.max(0,r.invest.endingValue)/max,18);P().text(ctx,money(r.invest.endingValue),W-MG,470,{size:9,weight:900,color:C.ink,align:'right'});P().text(ctx,`Assumed effective annual return: ${pct(r.comparison.assumedReturnPct)}`,MG,493,{size:8.2,weight:650,color:C.muted});}
    P().text(ctx,'EQUAL-CASH-FLOW CHECK',MG,538,{size:9,weight:900,color:C.tealDark});card(ctx,MG,555,CW,112,C.white,C.line);P().text(ctx,'Planned budget each period',MG+14,581,{size:9.4,weight:900,color:C.ink});P().wrappedText(ctx,'Baseline scheduled mortgage cash + planned extra cash = Prepay mortgage cash actually required + Prepay investment contribution. The prepayment charge is separately identified.',MG+14,605,CW-28,{size:8.8,lineHeight:11.8,weight:550,color:C.muted,maxLines:3});P().text(ctx,`Maximum accounting identity error: ${Number(r.accounting.maxIdentityError).toExponential(2)}`,MG+14,649,{size:8.2,weight:750,color:C.tealDark});
    P().text(ctx,'MODELED MORTGAGE COMPARISON',MG,714,{size:9,weight:900,color:C.tealDark});let y=730;[
      ['Baseline payoff',dateLabel(r.baseline.payoffDate)],['Prepay payoff',dateLabel(r.prepay.payoffDate)],['Baseline total interest',money(r.baseline.totalInterest)],['Prepay total interest',money(r.prepay.totalInterest)],['Interest avoided before charge',money(r.prepay.interestAvoided)],['Entered prepayment charge',money(i.prepaymentCharge)],['First modeled prepayment event',dateLabel(r.accounting.firstPrepaymentDate)]
    ].forEach((e,idx)=>{y=row(ctx,y,e[0],e[1],idx%2===1);});
    card(ctx,MG,y+18,CW,94,C.amber,'#ead7a5');P().wrappedText(ctx,'The home itself is treated as the same asset in both paths, so Carrowmont does not add a speculative home-value forecast. Taxes, investment fees, lender restrictions, variable rates, offset/redraw features and product-specific legal rules can change real outcomes.',MG+14,y+46,CW-28,{size:8.7,lineHeight:11.5,weight:550,color:C.muted,maxLines:4});footer(ctx);return pg.canvas;
  }

  function guidePage(model){
    const r=model.result,i=r.input;
    return RS().guidePage({
      reportTitle:`${model.identity.product} Decision Report`,preparedFrom:`Prepared from Carrowmont Mortgage Decision Centre · ${model.identity.product}`,
      howToRead:'Start with the break-even return, then review the modeled outcome at your own effective annual return if you entered one. The comparison uses the same planned cash and the original mortgage payoff date so an earlier payoff does not receive a hidden cash-flow advantage.',
      methodology:[
        {label:'Common horizon',body:`Both paths are compared at the original scheduled mortgage payoff date: ${dateLabel(r.comparison.commonHorizonDate)}.`},
        {label:'Effective annual return',body:'Each modeled investment cash flow compounds from its actual event date to the common horizon using the user-entered effective annual return. No market-return preset is supplied.'},
        {label:'Prepayment charge',body:`The user-entered charge of ${money(i.prepaymentCharge)} is treated as an additional Prepay-path cash cost on the first prepayment event and carried to the common horizon at the same modeled return.`},
        {label:'Break-even solver',body:r.comparison.breakEvenReturnPct==null?'No finite crossing was found in the supported numerical search range. Carrowmont does not invent or extrapolate a break-even number.':`The deterministic solver found an approximate crossing at ${pct(r.comparison.breakEvenReturnPct)} effective annually.`}
      ],
      terminology:[
        {label:'Prepay path',body:'Extra cash reduces principal first. Cash released by early payoff and continuing planned recurring extra cash are invested through the common horizon.'},
        {label:'Invest path',body:'The original mortgage schedule continues and the same planned extra cash is invested instead.'},
        {label:'Learn article',body:'Mortgage prepayment vs investing: how to compare the trade-off · carrowmont.com/mortgage-prepayment-vs-investing.html'},
        {label:'Decision Centre',body:'Continue the mortgage journey at carrowmont.com/mortgage-payoff-calculator/decision-centre.html'}
      ],
      assumptions:`The entered mortgage rate is held constant. Investment returns are modeled as one deterministic effective annual assumption, not a volatility path. Carrowmont does not automatically calculate investment tax, mortgage-interest tax effects, lender penalties, offset/redraw accounts, variable-rate resets, home-price changes or refinance economics. Scheduled repayment frequency: ${i.paymentFrequency}.`,
      disclaimer:'This report is educational planning software, not individualized investment, lending, tax or legal advice. Preserve appropriate liquidity and emergency reserves and consider high-cost debt before treating all spare cash as available for either path. Confirm lender charges and restrictions from actual loan documents.',
      methodologyMeta:'Mortgage Decision Centre MDC1A methodology v1.0.0',methodologyUrl:'carrowmont.com/mortgage-payoff-calculator/prepayment-vs-investing.html#methodology'
    });
  }

  async function generate(model){if(!P()||!RS())throw new Error('PDF helpers unavailable');const canvases=[summaryPage(model),comparisonPage(model),guidePage(model)];return P().downloadCanvases(canvases,{filename:'carrowmont-prepayment-vs-investing-decision-report.pdf',quality:.93});}
  window.CarrowmontPrepayInvestPdfRenderer={generate};
})();
