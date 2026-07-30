// One-off utility: calls POST /api/admin/verify-authors repeatedly for one
// institution until `remaining` hits 0. Not part of the app - run manually
// with `bun scripts/verify-until-done.mjs <institution> [baseUrl] [limit]`.

const institution = process.argv[2];
const baseUrl = process.argv[3] ?? "http://localhost:8787";
const limit = process.argv[4] ?? "40";

if (!institution) {
  console.error("Usage: bun scripts/verify-until-done.mjs <institution> [baseUrl] [limit]");
  process.exit(1);
}

let round = 0;
let totalConfirmed = 0;
let totalRejected = 0;
let totalPendingReview = 0;

while (true) {
  round += 1;
  const url = `${baseUrl}/api/admin/verify-authors?institution=${encodeURIComponent(institution)}&limit=${limit}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Round ${round}: HTTP ${res.status} - ${body}`);
    process.exit(1);
  }

  const { data } = await res.json();
  totalConfirmed += data.confirmedInternal;
  totalRejected += data.rejected;
  totalPendingReview += data.pendingReview;

  console.log(
    `Round ${round}: checked=${data.checked} confirmed=${data.confirmedInternal} rejected=${data.rejected} pendingReview=${data.pendingReview} remaining=${data.remaining}`
  );

  if (data.remaining === 0 || data.checked === 0) break;
}

console.log(
  `\nDone for "${institution}" after ${round} round(s). Totals: confirmed=${totalConfirmed} rejected=${totalRejected} pendingReview=${totalPendingReview}`
);
if (totalPendingReview > 0) {
  console.log(
    `${totalPendingReview} author(s) had no resolvable current affiliation on Scopus and were left NULL - review/whitelist them manually if needed.`
  );
}
