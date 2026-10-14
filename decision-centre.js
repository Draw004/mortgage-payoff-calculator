(() => {
  'use strict';
  const L=window.CarrowmontLocale, P=window.CarrowmontMortgageDecisionProfile;
  const $=id=>document.getElementById(id);
  function populateLocale(){
    const regions=Object.entries(L.regions).sort((a,b)=>{if(a[0]==='OTHER')return 1;if(b[0]==='OTHER')return -1;return a[1].label.localeCompare(b[1].label,'en');});
    $('regionSelect').innerHTML=regions.map(([code,p])=>`<option value="${code}">${p.label}</option>`).join('');
    $('currencySelect').innerHTML=Object.entries(L.currencies).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,c])=>`<option value="${code}">${code} · ${c.label}</option>`).join('');
  }
  function identity(region=L.getRegion()){
    const map={
      IN:{hub:'Home Loan decisions',payoff:'Payoff / Prepayment',invest:'Prepay vs Invest',refi:'Balance Transfer',stress:'EMI Rate Rise Stress'},
      US:{hub:'Mortgage decisions',payoff:'Payoff / Prepayment',invest:'Prepay vs Invest',refi:'Refinance',stress:'Rate Rise / Payment Stress'},
      CA:{hub:'Mortgage decisions',payoff:'Payoff / Prepayment',invest:'Prepay vs Invest',refi:'Refinance',stress:'Renewal Payment Stress'},
      GB:{hub:'Mortgage decisions',payoff:'Payoff / Overpayment',invest:'Overpay vs Invest',refi:'Remortgage / Product Switch',stress:'Rate Rise / Payment Stress'},
      IE:{hub:'Mortgage decisions',payoff:'Payoff / Overpayment',invest:'Overpay vs Invest',refi:'Refinance',stress:'Rate Rise / Payment Stress'},
      AU:{hub:'Home Loan decisions',payoff:'Payoff / Extra Repayments',invest:'Extra Repayments vs Invest',refi:'Refinance',stress:'Rate Rise Stress'},
      NZ:{hub:'Home Loan decisions',payoff:'Payoff / Extra Repayments',invest:'Extra Repayments vs Invest',refi:'Refinance',stress:'Rate Rise Stress'}
    };
    return map[region]||{hub:'Mortgage / Home Loan decisions',payoff:'Payoff / Prepayment',invest:'Prepay vs Invest',refi:'Refinance',stress:'Rate Rise / Payment Stress'};
  }
  function sync(){
    $('regionSelect').value=L.getRegion();$('currencySelect').value=L.getCurrency();$('localeCurrent').textContent=`${L.getProfile().label} · ${L.getCurrency()}`;
    const id=identity();$('hubIdentity').textContent=id.hub;$('payoffCardTitle').textContent=id.payoff;$('investCardTitle').textContent=id.invest;$('refiCardTitle').textContent=id.refi;$('stressCardTitle').textContent=id.stress;
    const p=P.read();$('profileBanner').hidden=!p;
    if(p){$('profileSummary').textContent=`${L.formatMoney(p.balance,{currency:p.currency,maximumFractionDigits:0})} balance · ${p.annualRatePct.toFixed(2)}% · ${p.remainingYears}y ${p.remainingMonths}m · ${p.paymentFrequency}`;}
  }
  populateLocale();sync();
  $('regionSelect').addEventListener('change',()=>L.setRegion($('regionSelect').value));$('currencySelect').addEventListener('change',()=>L.setCurrency($('currencySelect').value));$('localeDone').addEventListener('click',()=>{$('localeMenu').open=false;});
  $('clearProfileBtn').addEventListener('click',()=>{P.clear();sync();});
  window.addEventListener('carrowmont:localechange',sync);
})();
