(() => {
  'use strict';
  const STORAGE_KEY = 'carrowmontMortgageDecisionV1';
  const SCHEMA_VERSION = 1;
  const ALLOWED_FREQUENCIES = new Set(['monthly','biweekly','fortnightly','weekly']);

  function finite(value){ const n=Number(value); return Number.isFinite(n)?n:null; }
  function safeGet(){ try{return localStorage.getItem(STORAGE_KEY);}catch(_){return null;} }
  function safeSet(value){ try{localStorage.setItem(STORAGE_KEY,value);return true;}catch(_){return false;} }
  function safeRemove(){ try{localStorage.removeItem(STORAGE_KEY);return true;}catch(_){return false;} }

  function validate(raw){
    if(!raw || typeof raw!=='object') return null;
    const balance=finite(raw.balance), annualRatePct=finite(raw.annualRatePct), remainingYears=finite(raw.remainingYears), remainingMonths=finite(raw.remainingMonths);
    const paymentFrequency=String(raw.paymentFrequency||'');
    const currentPayment=raw.useCurrentPayment?finite(raw.currentPayment):null;
    if(raw.schemaVersion!==SCHEMA_VERSION || !(balance>0) || annualRatePct==null || annualRatePct<0 || annualRatePct>50) return null;
    if(remainingYears==null || remainingMonths==null || remainingYears<0 || remainingMonths<0 || remainingMonths>11 || (remainingYears===0 && remainingMonths===0)) return null;
    if(!ALLOWED_FREQUENCIES.has(paymentFrequency)) return null;
    if(raw.useCurrentPayment && !(currentPayment>0)) return null;
    return {
      schemaVersion:SCHEMA_VERSION,
      savedAt:typeof raw.savedAt==='string'?raw.savedAt:new Date().toISOString(),
      country:String(raw.country||'OTHER'),
      currency:String(raw.currency||'USD'),
      balance,
      annualRatePct,
      remainingYears,
      remainingMonths,
      paymentFrequency,
      useCurrentPayment:Boolean(raw.useCurrentPayment),
      currentPayment:raw.useCurrentPayment?currentPayment:null
    };
  }

  function read(){
    const text=safeGet(); if(!text)return null;
    try{return validate(JSON.parse(text));}catch(_){return null;}
  }
  function write(values={}){
    const payload=validate({schemaVersion:SCHEMA_VERSION,savedAt:new Date().toISOString(),...values});
    if(!payload)return {ok:false,error:'invalid-profile'};
    return {ok:safeSet(JSON.stringify(payload)),profile:payload};
  }
  function clear(){ return safeRemove(); }

  window.CarrowmontMortgageDecisionProfile={STORAGE_KEY,SCHEMA_VERSION,validate,read,write,clear};
})();
