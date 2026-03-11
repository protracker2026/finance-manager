const Dexie = require('./server/node_modules/dexie');

// We have to mock the browser env slightly to read IndexedDB from node if it's stored locally
// Since Dexie in the browser uses IndexedDB, we can't easily read it from node this way without polyfills.
// Let's print out the exact date math with different parsing scenarios.
const Utils = {
  today() {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      return now.toISOString().slice(0, 16);
  }
};

const InterestEngine = {
  daysBetween(date1, date2) {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      return Math.max(0, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
  }
};

const d_last = "2026-03-09T00:00:00.000Z"; // Assuming it was stored as UTC
const d_today = Utils.today(); // "2026-03-11T20:39" (Local time string)
console.log("DB Date (UTC string):", d_last);
console.log("Utils.today (Local string):", d_today);

const diff1 = InterestEngine.daysBetween(d_last, d_today);
console.log("Days Between:", diff1);

const d_last_local = "2026-03-09T10:00:00"; // Assuming local string
const diff2 = InterestEngine.daysBetween(d_last_local, d_today);
console.log("Days Between (if local string in DB):", diff2);

const d_last_date_only = "2026-03-10"; // Only date
const diff3 = InterestEngine.daysBetween(d_last_date_only, d_today);
console.log("Days Between (if date only in DB):", diff3);

const d_today_utc = new Date().toISOString();
console.log("Today UTC:", d_today_utc);
console.log("Days between (UTC to UTC):", InterestEngine.daysBetween(d_last, d_today_utc));
console.log("Days between (Date only to UTC):", InterestEngine.daysBetween(d_last_date_only, d_today_utc));
