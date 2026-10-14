(function () {
  "use strict";

  const STORAGE_REGION = "carrowmont_region_v1";
  const STORAGE_CURRENCY = "carrowmont_currency_v1";

  // Country/region profiles control locale-aware formatting plus suggested currency and frequency defaults.
  // They do not change inflation assumptions, taxes, pensions, benefits, exchange rates or calculation formulas.
  const regions = {
    IN: { label: "India", locale: "en-IN", currency: "INR", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    US: { label: "United States", locale: "en-US", currency: "USD", contributionFrequency: "biweekly", twoWeekLabel: "biweekly" },
    CA: { label: "Canada", locale: "en-CA", currency: "CAD", contributionFrequency: "biweekly", twoWeekLabel: "biweekly" },
    GB: { label: "United Kingdom", locale: "en-GB", currency: "GBP", contributionFrequency: "monthly", twoWeekLabel: "fortnightly" },
    AU: { label: "Australia", locale: "en-AU", currency: "AUD", contributionFrequency: "biweekly", twoWeekLabel: "fortnightly" },
    AT: { label: "Austria", locale: "de-AT", currency: "EUR", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    BD: { label: "Bangladesh", locale: "en-BD", currency: "BDT", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    BE: { label: "Belgium", locale: "nl-BE", currency: "EUR", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    NZ: { label: "New Zealand", locale: "en-NZ", currency: "NZD", contributionFrequency: "biweekly", twoWeekLabel: "fortnightly" },

    CL: { label: "Chile", locale: "es-CL", currency: "CLP", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    DK: { label: "Denmark", locale: "da-DK", currency: "DKK", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    CN: { label: "China", locale: "zh-CN", currency: "CNY" },
    JP: { label: "Japan", locale: "ja-JP", currency: "JPY" },
    KR: { label: "South Korea", locale: "ko-KR", currency: "KRW" },
    SG: { label: "Singapore", locale: "en-SG", currency: "SGD" },
    AE: { label: "United Arab Emirates", locale: "en-AE", currency: "AED" },
    SA: { label: "Saudi Arabia", locale: "ar-SA", currency: "SAR" },
    OM: { label: "Oman", locale: "en-OM", currency: "OMR", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    QA: { label: "Qatar", locale: "en-QA", currency: "QAR", contributionFrequency: "monthly", twoWeekLabel: "neutral" },

    DE: { label: "Germany", locale: "de-DE", currency: "EUR" },
    FR: { label: "France", locale: "fr-FR", currency: "EUR" },
    IT: { label: "Italy", locale: "it-IT", currency: "EUR" },
    ES: { label: "Spain", locale: "es-ES", currency: "EUR" },
    FI: { label: "Finland", locale: "fi-FI", currency: "EUR", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    IE: { label: "Ireland", locale: "en-IE", currency: "EUR", contributionFrequency: "monthly", twoWeekLabel: "fortnightly" },
    NL: { label: "Netherlands", locale: "nl-NL", currency: "EUR", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    NO: { label: "Norway", locale: "nb-NO", currency: "NOK", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    PL: { label: "Poland", locale: "pl-PL", currency: "PLN", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    PT: { label: "Portugal", locale: "pt-PT", currency: "EUR", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    SE: { label: "Sweden", locale: "sv-SE", currency: "SEK", contributionFrequency: "monthly", twoWeekLabel: "neutral" },
    CH: { label: "Switzerland", locale: "de-CH", currency: "CHF" },

    BR: { label: "Brazil", locale: "pt-BR", currency: "BRL" },
    MX: { label: "Mexico", locale: "es-MX", currency: "MXN" },
    ZA: { label: "South Africa", locale: "en-ZA", currency: "ZAR" },
    ID: { label: "Indonesia", locale: "id-ID", currency: "IDR" },
    MY: { label: "Malaysia", locale: "en-MY", currency: "MYR" },
    TH: { label: "Thailand", locale: "th-TH", currency: "THB" },
    PH: { label: "Philippines", locale: "en-PH", currency: "PHP", contributionFrequency: "semimonthly", twoWeekLabel: "neutral" },
    VN: { label: "Vietnam", locale: "vi-VN", currency: "VND" },
    HK: { label: "Hong Kong", locale: "zh-HK", currency: "HKD" },
    TW: { label: "Taiwan", locale: "zh-TW", currency: "TWD" },
    RU: { label: "Russia", locale: "ru-RU", currency: "RUB" },
    TR: { label: "Türkiye", locale: "tr-TR", currency: "TRY" },

    OTHER: { label: "Other / International", locale: "en-US", currency: "USD" }
  };

  const currencies = {
    INR: { label: "Indian Rupee", symbol: "₹" },
    USD: { label: "US Dollar", symbol: "$" },
    CAD: { label: "Canadian Dollar", symbol: "C$" },
    GBP: { label: "British Pound", symbol: "£" },
    AUD: { label: "Australian Dollar", symbol: "A$" },
    NZD: { label: "New Zealand Dollar", symbol: "NZ$" },
    BDT: { label: "Bangladeshi Taka", symbol: "৳", currencyDisplay: "narrowSymbol" },
    CLP: { label: "Chilean Peso", symbol: "$" },
    DKK: { label: "Danish Krone", symbol: "kr" },
    EUR: { label: "Euro", symbol: "€" },
    CNY: { label: "Chinese Yuan", symbol: "CN¥" },
    JPY: { label: "Japanese Yen", symbol: "¥" },
    KRW: { label: "South Korean Won", symbol: "₩" },
    SGD: { label: "Singapore Dollar", symbol: "S$" },
    AED: { label: "UAE Dirham", symbol: "AED" },
    SAR: { label: "Saudi Riyal", symbol: "SAR" },
    OMR: { label: "Omani Rial", symbol: "OMR" },
    QAR: { label: "Qatari Riyal", symbol: "QAR" },
    CHF: { label: "Swiss Franc", symbol: "CHF" },
    NOK: { label: "Norwegian Krone", symbol: "kr" },
    PLN: { label: "Polish Zloty", symbol: "zł" },
    SEK: { label: "Swedish Krona", symbol: "kr" },
    BRL: { label: "Brazilian Real", symbol: "R$" },
    MXN: { label: "Mexican Peso", symbol: "MX$" },
    ZAR: { label: "South African Rand", symbol: "R" },
    IDR: { label: "Indonesian Rupiah", symbol: "Rp" },
    MYR: { label: "Malaysian Ringgit", symbol: "RM" },
    THB: { label: "Thai Baht", symbol: "฿" },
    PHP: { label: "Philippine Peso", symbol: "₱" },
    VND: { label: "Vietnamese Dong", symbol: "₫" },
    HKD: { label: "Hong Kong Dollar", symbol: "HK$" },
    TWD: { label: "New Taiwan Dollar", symbol: "NT$" },
    RUB: { label: "Russian Ruble", symbol: "₽" },
    TRY: { label: "Turkish Lira", symbol: "₺" }
  };

  function detectRegion() {
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en-US"])
      .map(String);
    for (const lang of langs) {
      const upper = lang.toUpperCase().replace("_", "-");
      const parts = upper.split("-");
      const country = parts.length > 1 ? parts[parts.length - 1] : "";
      if (country === "UK") return "GB";
      if (regions[country]) return country;
    }
    return "OTHER";
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  let regionCode = safeGet(STORAGE_REGION);
  if (!regions[regionCode]) regionCode = detectRegion();

  let currencyCode = safeGet(STORAGE_CURRENCY);
  if (!currencies[currencyCode]) currencyCode = regions[regionCode].currency;

  function getRegion() { return regionCode; }
  function getCurrency() { return currencyCode; }
  function getProfile() { return regions[regionCode] || regions.OTHER; }
  function getLocale() { return getProfile().locale; }

  function setRegion(code, opts = {}) {
    if (!regions[code]) return;
    regionCode = code;
    safeSet(STORAGE_REGION, regionCode);
    if (opts.syncCurrency !== false) {
      currencyCode = regions[code].currency;
      safeSet(STORAGE_CURRENCY, currencyCode);
    }
    emitChange();
  }

  function setCurrency(code) {
    if (!currencies[code]) return;
    currencyCode = code;
    safeSet(STORAGE_CURRENCY, currencyCode);
    emitChange();
  }

  function setLocale(region, currency) {
    if (!regions[region]) return;
    regionCode = region;
    currencyCode = currencies[currency] ? currency : regions[region].currency;
    safeSet(STORAGE_REGION, regionCode);
    safeSet(STORAGE_CURRENCY, currencyCode);
    emitChange();
  }

  function emitChange() {
    window.dispatchEvent(new CustomEvent("carrowmont:localechange", {
      detail: { region: regionCode, currency: currencyCode }
    }));
  }

  function formatMoney(value, options = {}) {
    const n = Number(value) || 0;
    const currency = options.currency || currencyCode;
    const locale = options.locale || getLocale();
    const maximumFractionDigits = options.maximumFractionDigits ?? 0;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits,
        minimumFractionDigits: options.minimumFractionDigits ?? 0
      }).format(n);
    } catch (_) {
      return `${currencies[currency]?.symbol || currency} ${Math.round(n).toLocaleString(locale)}`;
    }
  }

  function formatCompactMoney(value, options = {}) {
    const n = Number(value) || 0;
    const currency = options.currency || currencyCode;
    const locale = options.locale || getLocale();
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: options.maximumFractionDigits ?? 2
      }).format(n);
    } catch (_) {
      return formatMoney(n, { currency, locale });
    }
  }

  function formatNumber(value, options = {}) {
    const n = Number(value) || 0;
    return new Intl.NumberFormat(options.locale || getLocale(), {
      maximumFractionDigits: options.maximumFractionDigits ?? 0
    }).format(n);
  }

  function currencySymbol(code = currencyCode) {
    return currencies[code]?.symbol || code;
  }

  function getMortgageTerms(region = regionCode) {
    const homeLoanMarket = ['IN', 'AU', 'NZ'].includes(region);
    const mortgageMarket = ['US', 'CA', 'GB', 'IE'].includes(region);
    const noun = homeLoanMarket ? 'home loan' : mortgageMarket ? 'mortgage' : 'mortgage / home loan';
    const nounCap = homeLoanMarket ? 'Home loan' : mortgageMarket ? 'Mortgage' : 'Mortgage / home loan';
    const familyName = homeLoanMarket ? 'Home Loan Decision Centre' : mortgageMarket ? 'Mortgage Decision Centre' : 'Mortgage / Home Loan Decision Centre';
    const familyEyebrow = homeLoanMarket ? 'HOME LOAN DECISION CENTRE' : mortgageMarket ? 'MORTGAGE DECISION CENTRE' : 'MORTGAGE / HOME LOAN DECISION CENTRE';
    const familyJourney = homeLoanMarket ? 'CONTINUE THE HOME LOAN JOURNEY' : mortgageMarket ? 'CONTINUE THE MORTGAGE JOURNEY' : 'CONTINUE THE LOAN JOURNEY';
    const nextDecision = homeLoanMarket ? 'NEXT HOME LOAN DECISION' : mortgageMarket ? 'NEXT MORTGAGE DECISION' : 'NEXT LOAN DECISION';
    const oneLoan = homeLoanMarket ? 'ONE HOME LOAN · DIFFERENT DECISIONS' : mortgageMarket ? 'ONE MORTGAGE · DIFFERENT DECISIONS' : 'ONE LOAN · DIFFERENT DECISIONS';
    const learnLabel = homeLoanMarket ? 'Home Loan Guides' : mortgageMarket ? 'Mortgage Guides' : 'Mortgage & Home Loan Guides';
    const toolsLabel = homeLoanMarket ? 'Home Loan tools' : mortgageMarket ? 'Mortgage tools' : 'Mortgage / Home Loan tools';
    const payoffFamilyLabel = homeLoanMarket ? 'Home Loan Payoff / Prepayment' : mortgageMarket ? 'Mortgage Payoff / Prepayment' : 'Mortgage / Home Loan Payoff';
    const detailsLabel = homeLoanMarket ? 'home loan details' : mortgageMarket ? 'mortgage details' : 'loan details';
    const factsLabel = homeLoanMarket ? 'Home loan facts' : mortgageMarket ? 'Mortgage facts' : 'Loan facts';
    const paymentLabel = homeLoanMarket ? 'home loan payment' : mortgageMarket ? 'mortgage payment' : 'loan payment';
    return {
      noun, nounCap, familyName, familyEyebrow, familyJourney, nextDecision, oneLoan, learnLabel, toolsLabel, payoffFamilyLabel, detailsLabel, factsLabel, paymentLabel,
      hubSavedDetails: `Saved ${detailsLabel} are available in this browser.`,
      hubSameLoan: `The same ${noun} can raise different questions. Each module uses only the assumptions needed for that decision.`,
      hubFactsReuse: `${factsLabel} can be reused`,
      hubSavedControl: `Saved ${detailsLabel} are never applied automatically. You can use them, start fresh or clear them.`,
      hubFooterDescription: `Move from a ${noun} payoff calculation to the next decision without mixing the calculations.`,
      payoffLearnIntro: homeLoanMarket ? 'New to home-loan extra repayments or prepayments? Start with the mechanics, then come back and test your own balance, rate and term.' : mortgageMarket ? 'New to mortgage prepayments or extra principal payments? Start with the mechanics, then come back and test your own balance, rate and term.' : 'New to mortgage or home-loan prepayments? Start with the mechanics, then come back and test your own balance, rate and term.',
      payoffDecisionCopy: `The companion decision tool uses equal planned cash and the original ${noun} payoff date so an earlier payoff does not receive a hidden advantage.`,
      payoffDecisionLink: `Open ${familyName} →`,
      payoffExtraFaq: `Does making extra ${noun} payments reduce interest?`,
      payoffFooterDescription: `Explore how extra principal, prepayments or an earlier payoff target could change your ${noun}.`,
      prepayHeroCopy: `Use the same planned cash and the same original ${noun} payoff date to compare both paths fairly. The result shows the modeled investment return at which the paths finish approximately equal.`,
      prepayPrivacy: `${factsLabel} can be saved in this browser for this Decision Centre only. Investment-return assumptions, charges and comparison results are not saved with those loan details.`,
      profileFromAnotherStep: `Loan details are available from another ${familyName} step.`,
      loanDetailsHeading: `1. ${nounCap} details`,
      commonDetailsCopy: `Choose how you want to use the extra money. Switching between options keeps the same ${detailsLabel}.`,
      uncertaintyCopy: `${nounCap} interest avoided is comparatively predictable once the loan terms and charges are correct. Investment returns are uncertain and can be lower, higher or negative.`,
      saveDecisionDetails: `Save ${nounCap} Details for Decision Centre`,
      clearSavedDetails: `Clear saved ${detailsLabel}`,
      behaviorHeader: `${nounCap} behavior`,
      prepayBehavior: `Extra cash reduces principal; the ${noun} may finish early.`,
      investBehavior: `Original ${noun} schedule continues.`,
      commonHorizonHeading: `Equal cash flow. One original ${noun} horizon.`,
      methodBuildSchedule: `Build the original ${noun} schedule from the balance, rate, remaining term and how often you make the regular payment.`,
      methodInvestSchedule: `In the Invest path, keep the original ${noun} schedule and invest the same planned extra cash instead.`,
      methodCompareHorizon: `Compare both options at the original scheduled ${noun} payoff date and find the annual investment return where they finish about the same.`,
      prepayFooterDescription: `Compare the same planned cash across prepayment and investing while accounting for an earlier ${noun} payoff.`,
      refiPrivacy: `Only reusable ${factsLabel.toLowerCase()} may be saved in this browser for the Decision Centre. Offer rates, switching fees, cashback, holding periods and results are not saved with those loan details.`,
      currentLoanHeading: `1. Current ${noun}`,
      stressLocaleCopy: `Choose familiar ${noun} wording and number formatting.`,
      stressPrivacy: `Only reusable current-loan facts can be saved in this browser for the ${familyName}. Future rates, reset timing, household income, expenses, money left over and results are not saved with those loan details.`,
      stressSavedDetails: `Saved ${detailsLabel} are available in this browser.`,
      stressCurrentHeading: `1. Your current ${noun}`,
      stressBudgetIntro: `The payment stress test works without household figures. Turn this on only if you want to see the monthly amount left after the ${noun} and the essential expenses you enter.`,
      stressExpensesLabel: `Monthly essential expenses excluding this ${noun}`,
      stressExpensesNote: `Income and essential expenses excluding the ${noun} are held constant. Carrowmont does not forecast wages, inflation or future household costs.`,
      stressShareLabel: `Stressed ${noun} share`,
      stressPaymentLegend: `${nounCap} payment`,
      stressAvailableLegend: `Available for ${noun}`,
      stressPayoffLink: `Use the ${payoffFamilyLabel} Calculator.`,
      stressDecisionDescription: `Return to all four live ${homeLoanMarket ? 'home loan' : mortgageMarket ? 'mortgage' : 'loan'} decisions.`,
      stressFaqHeading: `Questions about ${noun} payment stress`,
      prepayFreedCashFaq: `Why does the Prepay option start investing after the ${noun} is cleared?`,
      prepayFreedCashAnswer: `Because the regular payment would otherwise have continued until the original payoff date. Redirecting that freed-up cash keeps the same planned cash flow for both options until that date.`,
      zeroBufferExplanation: `No. It is only the rate at which the take-home income and essential expenses you entered leave exactly enough for the ${paymentLabel}, converted to a monthly amount. It is not a lender rule or a recommendation.`
    };
  }

  function applyMortgageCopy(root = document) {
    if (!root?.querySelectorAll) return;
    const terms = getMortgageTerms();
    root.querySelectorAll('[data-mortgage-copy]').forEach((el) => {
      const key = el.getAttribute('data-mortgage-copy');
      if (key && Object.prototype.hasOwnProperty.call(terms, key)) el.textContent = terms[key];
    });
  }

  window.CarrowmontLocale = {
    regions,
    currencies,
    getRegion,
    getCurrency,
    getProfile,
    getLocale,
    setRegion,
    setCurrency,
    setLocale,
    formatMoney,
    formatCompactMoney,
    formatNumber,
    currencySymbol,
    getMortgageTerms,
    applyMortgageCopy
  };
})();
