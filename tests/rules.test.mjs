// Checks database.rules.json against the local Firebase emulator.
// Run (from the repo root):
//   npx --yes firebase-tools@15.34.0 emulators:exec --only database "node tests/rules.test.mjs"

const BASE = "http://127.0.0.1:9000";
const NS = "wunschliste24-ad8d0-default-rtdb";

async function request(method, path, body, admin = false) {
    const headers = admin ? { Authorization: "Bearer owner" } : {};
    const response = await fetch(`${BASE}/${path}.json?ns=${NS}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
}

let failures = 0;

async function expect(description, method, path, body, shouldPass) {
    const { status } = await request(method, path, body);
    const passed = status === 200;
    const ok = passed === shouldPass;
    if (!ok) failures++;
    console.log(`${ok ? "ok  " : "FAIL"}  ${description} (HTTP ${status})`);
}

const seed = {
    emil_geschenke: {
        a1: { name: "Laufrad", checked: false, link: "https://example.com/laufrad" },
        a2: { name: "Buch", checked: true },
        a3: { name: "Neu, noch ohne Haken" },
    },
    privat: { notiz: "nicht öffentlich" },
};
await request("PUT", "", seed, true);

const ALLOW = true;
const DENY = false;

await expect("Liste lesen", "GET", "emil_geschenke", undefined, ALLOW);
await expect("ganze Datenbank lesen", "GET", "", undefined, DENY);
await expect("anderen Bereich lesen", "GET", "privat", undefined, DENY);

await expect("Haken setzen", "PUT", "emil_geschenke/a1/checked", true, ALLOW);
await expect("Haken entfernen", "PUT", "emil_geschenke/a1/checked", false, ALLOW);
await expect("ersten Haken bei Eintrag ohne 'checked' setzen", "PUT", "emil_geschenke/a3/checked", true, ALLOW);
await expect("Haken per update() setzen (alter Seitencode)", "PATCH", "emil_geschenke/a1", { checked: true }, ALLOW);

await expect("Haken auf Text setzen", "PUT", "emil_geschenke/a1/checked", "ja", DENY);
await expect("Haken löschen", "DELETE", "emil_geschenke/a1/checked", undefined, DENY);
await expect("Namen ändern", "PUT", "emil_geschenke/a1/name", "Gehackt", DENY);
await expect("Link ändern", "PUT", "emil_geschenke/a1/link", "javascript:alert(1)", DENY);
await expect("Haken + Link in einem update()", "PATCH", "emil_geschenke/a1", { checked: true, link: "https://evil.example" }, DENY);
await expect("Eintrag löschen", "DELETE", "emil_geschenke/a1", undefined, DENY);
await expect("Eintrag hinzufügen", "PUT", "emil_geschenke/neu", { name: "Spam", checked: false }, DENY);
await expect("Haken bei nicht vorhandenem Eintrag", "PUT", "emil_geschenke/neu/checked", true, DENY);
await expect("neue Liste anlegen", "PUT", "spam_geschenke/x/checked", true, DENY);
await expect("ganze Liste löschen", "DELETE", "emil_geschenke", undefined, DENY);
await expect("anderen Bereich schreiben", "PUT", "privat/notiz", "x", DENY);
await expect("ganze Datenbank überschreiben", "PUT", "", {}, DENY);

const { data } = await request("GET", "emil_geschenke", undefined, true);
const intact = data.a1.name === "Laufrad" && data.a1.link === "https://example.com/laufrad" && !data.neu;
if (!intact) failures++;
console.log(`${intact ? "ok  " : "FAIL"}  Namen und Links sind unverändert`);

console.log(failures ? `\n${failures} Test(s) fehlgeschlagen` : "\nAlle Tests bestanden");
process.exit(failures ? 1 : 0);
