// Shared logic for all wish list pages. Each page names its list in the
// database with <div id="item-list" data-list="...">.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getDatabase, connectDatabaseEmulator, ref, onValue, set } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

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

const itemList = document.getElementById("item-list");
const unlockSwitch = document.getElementById("unlock-switch");
const listName = itemList.dataset.list;

let items = null;  // Latest state of the list, kept for re-rendering

function showMessage(text) {
    const message = document.createElement("p");
    message.className = "message";
    message.textContent = text;
    itemList.replaceChildren(message);
}

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

function renderItems() {
    const locked = !unlockSwitch.checked;  // Checked items stay locked unless unlocked
    const entries = Object.entries(items ?? {})
        .filter(([, item]) => typeof item?.name === "string")
        .sort(([, a], [, b]) => a.name.localeCompare(b.name, "de"));

    if (entries.length === 0) {
        showMessage("Hier stehen gerade keine Wünsche.");
        return;
    }

    itemList.replaceChildren(...entries.map(([key, item]) => {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "item-" + key;
        checkbox.checked = item.checked === true;
        checkbox.disabled = checkbox.checked && locked;
        checkbox.addEventListener("change", () => {
            set(ref(db, `${listName}/${key}/checked`), checkbox.checked).catch(() => {
                alert("Das Häkchen konnte nicht gespeichert werden. Bitte später nochmal versuchen.");
            });
        });

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.textContent = item.name;

        // Name and shop buttons wrap together next to the checkbox
        const text = document.createElement("div");
        text.className = "item-text";
        text.append(label);

        const links = giftLinks(item);
        links.forEach((link, index) => {
            const orderButton = document.createElement("a");
            orderButton.className = "order-button";
            orderButton.href = link;
            orderButton.target = "_blank";
            orderButton.rel = "noopener noreferrer";  // The shop page gets no handle on this tab
            orderButton.textContent = links.length === 1 ? "Hier bestellen" : `Vorschlag ${index + 1}`;
            text.append(orderButton);
        });

        const row = document.createElement("div");
        row.className = "item-container";
        row.append(checkbox, text);
        return row;
    }));
}

// Runs once on load and again whenever anyone changes the list (live update)
onValue(ref(db, listName), (snapshot) => {
    items = snapshot.val();
    renderItems();
}, () => {
    showMessage("Die Wunschliste konnte gerade nicht geladen werden. Bitte später nochmal versuchen.");
});

unlockSwitch.addEventListener("change", renderItems);
