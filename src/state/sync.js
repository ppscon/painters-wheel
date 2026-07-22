/* Cross-device sync, no accounts: the user holds an unguessable code
   (20 chars from a 30-letter alphabet ≈ 98 bits) that is both the
   identity and the secret. Server side is a single RLS-locked table
   reachable only through two RPCs that require the exact code, so
   codes cannot be enumerated. Whole-blob last-write-wins; the payload
   is the same shape as the localStorage blob and is re-sanitised by
   persist.js on the way in. Images never sync — pins, palette,
   paintbox and the shopping list do. */
const SYNC_URL = "https://vibfxzcemiysnhegufrm.supabase.co/rest/v1/rpc";
const SYNC_KEY = "sb_publishable_wvdQZQLdbtaFXjF_vg9kEQ_Pdpnx40B";
const CODE_STORE_KEY = "painters-wheel-sync-code";

/* No 0/O/1/I/L/U to survive being read aloud or written on a paint rag. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

function makeSyncCode() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (let i = 0; i < 20; i++) raw += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return raw.match(/.{5}/g).join("-");
}

function normaliseSyncCode(input) {
  const raw = String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length !== 20) return null;
  return raw.match(/.{5}/g).join("-");
}

function getStoredSyncCode() {
  try { return window.localStorage.getItem(CODE_STORE_KEY); } catch (e) { return null; }
}

function storeSyncCode(code) {
  try {
    if (code) window.localStorage.setItem(CODE_STORE_KEY, code);
    else window.localStorage.removeItem(CODE_STORE_KEY);
  } catch (e) { /* best effort */ }
}

async function rpc(name, body) {
  const res = await fetch(`${SYNC_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SYNC_KEY,
      Authorization: `Bearer ${SYNC_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

/* Returns the server timestamp of the write. */
function syncPut(code, data) {
  return rpc("pw_sync_put", { sync_id: code, payload: data });
}

/* Returns { data, updated_at } or null if the code has no data yet. */
function syncGet(code) {
  return rpc("pw_sync_get", { sync_id: code });
}

export { makeSyncCode, normaliseSyncCode, getStoredSyncCode, storeSyncCode, syncPut, syncGet };
