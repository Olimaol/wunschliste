// Shared logic for all pages. Each list page names its list in the database
// with <div id="item-list" data-list="...">. The start page has no list; there
// the script only shows what this visitor chose.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getDatabase, connectDatabaseEmulator, ref, onValue, set, runTransaction } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

// The database address is all the page needs. Who may read or change what is
// decided by the database rules (database.rules.json), not by this file.
const app = initializeApp({
    databaseURL: "https://wunschliste24-ad8d0-default-rtdb.europe-west1.firebasedatabase.app",
});
const db = getDatabase(app);

// Opened from a local test server: use the local emulator, not the live data.
if (["localhost", "127.0.0.1"].includes(location.hostname)) {
    connectDatabaseEmulator(db, "127.0.0.1", 9000);
}

// Every list and whom it is for, in the order of the start page.
// A new list needs a line here as well.
const LISTS = {
    fabi_geschenke: "für Fabi",
    emil_geschenke: "für Emil",
    beide_geschenke: "für beide",
};

const itemList = document.getElementById("item-list");
const unlockSwitch = document.getElementById("unlock-switch");
const listName = itemList?.dataset.list ?? null;  // null on the start page
// Heading of the box with the most important wishes, e.g. "Ganz oben auf Emils Wunschzettel"
const importantHeading = itemList?.dataset.importantHeading ?? "Ganz oben auf dem Wunschzettel";

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function showMessage(text) {
    itemList.replaceChildren(el("p", "message", text));
}

// Name outside the list, e.g. "Playmobil Knights: Anführer Drachenritter" for a
// suggestion whose own name does not say which wish it belongs to
function giftName(item) {
    const group = typeof item.group === "string" ? item.group : "";
    return group && !item.name.startsWith(group) ? `${group}: ${item.name}` : item.name;
}

// ---------- What this visitor chose ----------

// Kept only in this browser, never in the database: nobody else learns who
// gives what. Paths like "emil_geschenke/roller", each with the gift's name.
const MINE_KEY = "wunschliste-von-mir";
const EXPLAINED_KEY = "wunschliste-erklaert";  // First reservation was explained

function readStored(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function store(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage blocked (private mode): the reservation still counts, this page just forgets it
    }
}

const storedMine = readStored(MINE_KEY, {});
const mine = storedMine && typeof storedMine === "object" ? storedMine : {};
const pending = new Set();  // Being reserved right now
const lost = new Map();     // Chosen here, but no longer reserved: path -> name, shown once
let lastReserved = null;    // Row that says "Für dich reserviert." under its name

function saveMine() {
    store(MINE_KEY, mine);
}

const isMine = (path) => path in mine || pending.has(path);

// A Merkzettel link ends in "#meine=emil:roller,rucksack;fabi:puppe" and brings
// that choice to whichever device opens it
function takeMineFromLink() {
    const match = location.hash.match(/^#meine=(.+)$/);
    if (!match) return;
    let value = "";
    try {
        value = decodeURIComponent(match[1]);
    } catch {
        // Broken link: ignore it
    }
    for (const part of value.split(";")) {
        const [short, keys = ""] = part.split(":");
        const list = `${short}_geschenke`;
        if (!(list in LISTS)) continue;
        for (const key of keys.split(",")) {
            if (/^[\w-]+$/.test(key)) mine[`${list}/${key}`] ??= "";
        }
    }
    saveMine();
    history.replaceState(null, "", location.pathname + location.search);
}
takeMineFromLink();

// ---------- Live data ----------

const lists = {};  // List name -> its gifts; undefined while loading

// Gifts of this visitor that are no longer reserved (someone removed the tick,
// or the gift left the list) are mentioned once and then forgotten
function checkMine(list) {
    let changed = false;
    for (const [path, name] of Object.entries(mine)) {
        const [pathList, key] = path.split("/");
        if (pathList !== list || pending.has(path)) continue;
        const item = lists[list][key];
        const currentName = typeof item?.name === "string" ? giftName(item) : name;
        if (item?.checked !== true) {
            if (currentName) lost.set(path, currentName);
            delete mine[path];
            changed = true;
        } else if (currentName !== name) {
            mine[path] = currentName;  // Renamed, or first seen through a Merkzettel link
            changed = true;
        }
    }
    if (changed) saveMine();
}

// Runs once on load and again whenever anyone changes the list (live update)
function watch(list) {
    if (list in lists) return;
    lists[list] = undefined;
    onValue(ref(db, list), (snapshot) => {
        lists[list] = snapshot.val() ?? {};
        checkMine(list);
        render();
    }, () => {
        if (list === listName) {
            showMessage("Die Wunschliste konnte gerade nicht geladen werden. Bitte später nochmal versuchen.");
        }
    });
}

// ---------- Dialog for questions and notes ----------

const dialog = el("dialog", "ask");
dialog.setAttribute("aria-labelledby", "ask-title");
document.body.append(dialog);
let answer = () => {};
dialog.addEventListener("close", () => answer(false));

// Resolves true when the first button is tapped, false when the dialog closes otherwise
function showDialog({ title, done = false, gift, forWhom, note, texts = [], links = [], yes, no }) {
    answer(false);
    const heading = el("h2", done ? "ask-title done" : "ask-title", title);
    heading.id = "ask-title";
    const parts = [heading];
    if (gift) {
        const giftLine = el("p", "ask-gift", gift);
        if (forWhom) giftLine.append(el("span", "ask-for", forWhom));
        parts.push(giftLine);
    }
    if (note) parts.push(el("p", "ask-note", note));
    for (const text of texts) parts.push(el("p", "ask-text", text));

    const buttons = el("div", "ask-buttons");
    for (const link of links) {
        const button = el("a", "primary", link.text);
        button.href = link.href;
        button.target = "_blank";
        button.rel = "noopener noreferrer";
        button.addEventListener("click", () => dialog.close());
        buttons.append(button);
    }
    const yesButton = el("button", links.length > 0 ? "secondary" : "primary", yes);
    yesButton.type = "button";
    buttons.append(yesButton);
    if (no) {
        const noButton = el("button", "secondary", no);
        noButton.type = "button";
        noButton.addEventListener("click", () => dialog.close());
        buttons.append(noButton);
    }
    parts.push(buttons);

    dialog.replaceChildren(...parts);
    if (!dialog.open) dialog.showModal();
    return new Promise((resolve) => {
        answer = (value) => {
            answer = () => {};
            resolve(value);
        };
        yesButton.addEventListener("click", () => {
            answer(true);
            if (!no) dialog.close();
        });
    });
}

// While the database answers: buttons off, the main button says what happens
function showBusy(text) {
    for (const button of dialog.querySelectorAll("button")) button.disabled = true;
    const main = dialog.querySelector(".primary");
    main.textContent = text;
    return setTimeout(() => {
        main.textContent = "Das dauert gerade länger … Bitte die Internetverbindung prüfen.";
    }, 8000);
}

function showProblem(problem) {
    return showDialog(problem === "taken" ? {
        title: "Schon vergeben",
        texts: ["Schade – das hat gerade jemand anderes ausgewählt."],
        yes: "OK",
    } : {
        title: "Nicht gespeichert",
        texts: ["Das hat gerade nicht geklappt. Bitte prüfe die Internetverbindung und versuche es nochmal."],
        yes: "OK",
    });
}

// ---------- Reserving and releasing ----------

// Ticks a gift only while it is still free, so of two people tapping at the
// same moment exactly one gets it
async function reserve(path, name) {
    pending.add(path);
    render();
    try {
        const { committed } = await runTransaction(ref(db, `${path}/checked`),
            (checked) => (checked === true ? undefined : true));
        if (!committed) return "taken";
        mine[path] = name;
        lost.delete(path);
        saveMine();
        return "ok";
    } catch {
        return "error";
    } finally {
        pending.delete(path);
        render();
    }
}

async function release(path, own) {
    const name = mine[path];
    delete mine[path];
    saveMine();
    if (lastReserved === path) lastReserved = null;
    try {
        await set(ref(db, `${path}/checked`), false);
        return true;
    } catch {
        if (own) {
            mine[path] = name;
            saveMine();
        }
        return false;
    } finally {
        render();
    }
}

async function tapFree(path, item) {
    lastReserved = null;
    render();
    const yes = await showDialog({
        title: "Möchtest du das schenken?",
        gift: giftName(item),
        forWhom: LISTS[listName],
        texts: ["Dann steht es für alle anderen als „vergeben“ auf der Liste."],
        yes: "Ja, das schenke ich",
        no: "Nein, zurück",
    });
    if (!yes) return;
    const slow = showBusy("Wird reserviert …");
    const result = await reserve(path, giftName(item));
    clearTimeout(slow);
    if (result !== "ok") {
        await showProblem(result);
        return;
    }
    lastReserved = path;
    render();
    // The first time, say how to find one's own gifts again
    if (!readStored(EXPLAINED_KEY, false)) {
        store(EXPLAINED_KEY, true);
        await showDialog({
            title: "Für dich reserviert",
            done: true,
            texts: [
                "Alle anderen sehen jetzt „vergeben“.",
                "Deine Geschenke stehen mit „von dir“ auf der Liste und oben unter „Das schenkst du“. Dort kannst du dir auch einen Merkzettel schicken.",
            ],
            yes: "Verstanden",
        });
    } else {
        dialog.close();
    }
}

async function tapTaken(path, item, own) {
    lastReserved = null;
    render();
    const yes = await showDialog(own ? {
        title: "Doch nicht schenken?",
        gift: giftName(item),
        forWhom: LISTS[listName],
        texts: ["Dann ist es wieder frei, und andere können es auswählen."],
        yes: "Ja, wieder freigeben",
        no: "Nein, zurück",
    } : {
        title: "Häkchen entfernen?",
        gift: giftName(item),
        forWhom: LISTS[listName],
        texts: ["Das hat jemand anderes ausgewählt. Entferne das Häkchen nur, wenn es ein Versehen war."],
        yes: "Ja, Häkchen entfernen",
        no: "Nein, zurück",
    });
    if (!yes) return;
    const slow = showBusy("Wird freigegeben …");
    const released = await release(path, own);
    clearTimeout(slow);
    if (released) dialog.close();
    else await showProblem("error");
}

// ---------- The list ----------

// Only normal web links get a button, so a link can never run code on this page
function webLink(url) {
    try {
        const parsed = new URL(url);
        return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : null;
    } catch {
        return null;
    }
}

// Shop links of a gift: "links" holds one or more, "link" is the older single field
function giftLinks(item) {
    const links = item.links && typeof item.links === "object" ? Object.values(item.links) : [item.links];
    return [item.link, ...links].map(webLink).filter(Boolean);
}

// One gift: checkbox, name and shop buttons. Tapping asks first; the
// checkbox only shows what the database says.
function renderItem(key, item, locked) {
    const path = `${listName}/${key}`;
    const taken = item.checked === true || pending.has(path);
    const own = taken && isMine(path);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "item-" + key;
    checkbox.checked = taken;
    checkbox.disabled = taken && !own && locked;  // Others' ticks stay locked unless unlocked
    checkbox.addEventListener("click", (event) => {
        event.preventDefault();
        if (taken) tapTaken(path, item, own);
        else tapFree(path, item);
    });

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = item.name;

    // Name and shop buttons wrap together next to the checkbox
    const text = el("div", "item-text");
    text.append(label);

    const links = giftLinks(item);
    if (links.length > 0) {
        const orderLinks = el("span", "order-links");
        links.forEach((link, index) => {
            const orderButton = el("a", "order-button", links.length === 1 ? "Ansehen" : `Vorschlag ${index + 1}`);
            orderButton.href = link;
            orderButton.target = "_blank";
            orderButton.rel = "noopener noreferrer";  // The shop page gets no handle on this tab
            orderLinks.append(orderButton);
        });
        text.append(orderLinks);
    }

    if (own && path === lastReserved) text.append(el("p", "row-note", "Für dich reserviert."));

    const row = el("div", own ? "item-container mine" : "item-container");
    row.append(checkbox, text);
    return row;
}

const openGroups = new Set();  // Groups this visitor opened; they stay open across live updates

// Gifts sharing the same "group" value: one line that opens on tap
function renderGroup(name, members, locked) {
    const group = el("details", "item-group");
    group.open = openGroups.has(name);
    group.addEventListener("toggle", () => {
        if (group.open) openGroups.add(name);
        else openGroups.delete(name);
    });

    const isTaken = ([key, item]) => item.checked === true || pending.has(`${listName}/${key}`);
    const own = members.filter((member) => isTaken(member) && isMine(`${listName}/${member[0]}`)).length;
    const taken = members.filter(isTaken).length - own;
    const status = [`${members.length} ${members.length === 1 ? "Vorschlag" : "Vorschläge"}`];
    if (own > 0) status.push(`${own} von dir`);
    if (taken > 0) status.push(taken === members.length ? "alle vergeben" : `${taken} vergeben`);
    const summary = el("summary");
    summary.append(el("span", "group-name", name), " ", el("span", "group-count", status.join(", ")));

    group.append(summary, ...members.map(([key, item]) => renderItem(key, item, locked)));
    return group;
}

// Heading inside the list: above the important wishes, or above the rest
function listHeading(text) {
    return el("h2", "list-heading", text);
}

function renderItems() {
    const items = lists[listName];
    if (items === undefined) return;  // Still loading
    const locked = !unlockSwitch.checked;  // Checked items stay locked unless unlocked
    const entries = Object.entries(items)
        .filter(([, item]) => typeof item?.name === "string")
        .sort(([, a], [, b]) => a.name.localeCompare(b.name, "de"));

    if (entries.length === 0) {
        showMessage("Hier stehen gerade keine Wünsche.");
        return;
    }

    // One line per single gift and one per group, all sorted by name
    const lines = [];
    const groups = new Map();
    for (const [key, item] of entries) {
        const groupName = typeof item.group === "string" ? item.group : "";
        if (!groupName) {
            lines.push({ name: item.name, members: [[key, item]], render: () => renderItem(key, item, locked) });
        } else if (groups.has(groupName)) {
            groups.get(groupName).push([key, item]);
        } else {
            const members = [[key, item]];
            groups.set(groupName, members);
            lines.push({ name: groupName, members, render: () => renderGroup(groupName, members, locked) });
        }
    }
    lines.sort((a, b) => a.name.localeCompare(b.name, "de"));

    // Important wishes go into a box at the top, the rest under "Weitere Ideen".
    // A group counts as important once one of its suggestions is. A list with
    // only one kind of wish looks as before.
    const isImportant = (line) => line.members.some(([, item]) => item.important === true);
    const important = lines.filter(isImportant);
    const others = lines.filter((line) => !isImportant(line));
    if (important.length === 0 || others.length === 0) {
        itemList.replaceChildren(...lines.map((line) => line.render()));
        return;
    }
    const box = el("section", "top-wishes");
    box.append(listHeading(importantHeading), ...important.map((line) => line.render()));
    itemList.replaceChildren(box, listHeading("Weitere Ideen"), ...others.map((line) => line.render()));
}

// ---------- "Das schenkst du": this visitor's gifts from all lists ----------

const listOrder = Object.keys(LISTS);

function giftEntry(path, name) {
    const [list, key] = path.split("/");
    const item = lists[list]?.[key];
    return {
        list, key,
        name: typeof item?.name === "string" ? giftName(item) : name,
        forWhom: LISTS[list] ?? "",
    };
}

const byListAndName = (a, b) => listOrder.indexOf(a.list) - listOrder.indexOf(b.list) || a.name.localeCompare(b.name, "de");

// Link back to the start page that shows these gifts again, also on another device
function merkzettelLink(entries) {
    const keys = new Map();
    for (const entry of entries) {
        const short = entry.list.replace(/_geschenke$/, "");
        keys.set(short, [...(keys.get(short) ?? []), entry.key]);
    }
    const value = [...keys].map(([short, listKeys]) => `${short}:${listKeys.join(",")}`).join(";");
    return new URL(`./#meine=${value}`, location.href).href;
}

function sendMerkzettel(entries) {
    const lines = entries.map((entry) => `• ${entry.name} (${entry.forWhom})`);
    const text = [
        "Mein Merkzettel – das schenke ich:",
        ...lines,
        "",
        "Auf der Wunschliste ist das für mich reserviert:",
        merkzettelLink(entries),
    ].join("\n");
    showDialog({
        title: "Dein Merkzettel",
        note: ["Mein Merkzettel – das schenke ich:", ...lines, "+ Link zur Wunschliste"].join("\n"),
        texts: ["Schick ihn dir selbst, dann hast du ihn immer dabei."],
        links: [{ text: "Per WhatsApp schicken", href: "https://wa.me/?text=" + encodeURIComponent(text) }],
        yes: "Zurück",
    });
}

function renderMyGifts() {
    let box = document.getElementById("my-gifts");
    const kept = Object.entries(mine)
        .map(([path, name]) => giftEntry(path, name))
        .filter((entry) => entry.name)  // From a Merkzettel link, still loading
        .sort(byListAndName);
    const gone = [...lost].map(([path, name]) => giftEntry(path, name)).sort(byListAndName);
    if (kept.length === 0 && gone.length === 0) {
        box?.remove();
        return;
    }
    if (!box) {
        // At the top of the list sheet; on the start page under the gift tags
        box = el("section", "my-gifts");
        box.id = "my-gifts";
        box.setAttribute("aria-labelledby", "my-gifts-heading");
        const sheet = document.querySelector(".sheet");
        if (sheet) sheet.prepend(box);
        else document.querySelector(".tags").after(box);
    }

    const heading = el("h2", "my-heading", "Das schenkst du");
    heading.id = "my-gifts-heading";
    const parts = [heading];
    if (kept.length > 0) {
        const list = el("ul", "my-list");
        for (const entry of kept) {
            const line = el("li", "", entry.name + " ");
            line.append(el("span", "my-for", entry.forWhom));
            list.append(line);
        }
        const send = el("button", "my-send", "Merkzettel an mich schicken");
        send.type = "button";
        send.addEventListener("click", () => sendMerkzettel(kept));
        parts.push(list, send, el("p", "my-hint", "Diese Seite merkt sich deine Auswahl auf diesem Gerät."));
    }
    if (gone.length > 0) {
        const note = el("div", "my-lost");
        note.append(el("p", "", "Nicht mehr für dich reserviert:"));
        const list = el("ul", "");
        for (const entry of gone) list.append(el("li", "", `${entry.name} (${entry.forWhom})`));
        note.append(list, el("p", "", "Möchtest du es noch schenken, wähle es bitte nochmal aus."));
        parts.push(note);
    }
    box.replaceChildren(...parts);
}

function render() {
    if (listName) renderItems();
    renderMyGifts();
}

if (listName) watch(listName);
for (const path of Object.keys(mine)) watch(path.split("/")[0]);
unlockSwitch?.addEventListener("change", render);
render();
