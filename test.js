const activeDebts = [
  { currentBalance: 110000, annualRate: 15.60, accruedInterest: 104.93, lastInterestDate: '2026-03-09' },
  { currentBalance: 79866.67, annualRate: 11.53, accruedInterest: 57.74, lastInterestDate: '2026-03-09' }
];

const InterestEngine = {
  dailyAccrual(balance, annualRatePercent, days) {
      return (balance * (annualRatePercent / 100 / 365)) * days;
  },
  daysBetween(date1, date2) {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      return Math.max(0, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
  }
};

const Utils = {
  today() {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      return now.toISOString().slice(0, 16);
  }
};

let totalAccruedNow = 0;
let totalDailyInterest = 0;

// PRE-REFRESH LOGIC (Midnight base)
activeDebts.forEach(d => {
  const daysSince = InterestEngine.daysBetween(d.lastInterestDate, Utils.today());
  const newInterest = InterestEngine.dailyAccrual(d.currentBalance, d.annualRate, daysSince);
  let accrued = d.accruedInterest + newInterest;
  totalAccruedNow += accrued;
});
console.log('Total Accrued (Midnight Base):', totalAccruedNow); // Should be around 162.67

// TICKER LOGIC (Elapsed base)
const now = new Date();
const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const elapsedSeconds = (Date.now() - midnight.getTime()) / 1000;

console.log('Elapsed Seconds:', elapsedSeconds);

let liveTotal = totalAccruedNow;
activeDebts.forEach(d => {
  const ratePerSecond = d.currentBalance * (d.annualRate / 100 / 365 / 86400);
  liveTotal += (ratePerSecond * elapsedSeconds);
});
console.log('Total Accrued (Live):', liveTotal); // Should be around 231
