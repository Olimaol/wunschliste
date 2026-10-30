# Wunschliste – Hinweise für Claude

Familien-Wunschlisten für Geschenke (Emil, Fabi, beide zusammen) als statische
Seite auf GitHub Pages: https://olimaol.github.io/wunschliste/ . Verwandte haken
ab, was sie schenken wollen; die Häkchen liegen in einer Firebase Realtime
Database und erscheinen sofort bei allen. Dateien, Datenformat und Befehle stehen
in `README.md`. Hier steht, wie in diesem Repo gearbeitet wird.

## Zusammenarbeit

- Oliver hat die komplette technische Umsetzung an Claude abgegeben: selbst
  entscheiden und bauen, ihn nur einbeziehen, wo nur er handeln oder entscheiden
  kann (Logins, Push-Freigaben, Inhalte der Listen). Er schreibt Deutsch.
- Muss kostenlos bleiben: Firebase Spark-Tarif, GitHub Pages. Nichts vorschlagen,
  was laufende Kosten oder eine hinterlegte Zahlungsart braucht.
- Statische Seite ohne Build-Schritt und ohne Frameworks; dabei bleiben.
- Besucher sind Verwandte, viele älter, meist am Handy: gut lesbar, große
  Tippflächen, einfache deutsche Texte.
- Gestaltung laut Oliver: „gemütlich weihnachtlich, ein wenig festlich, aber
  nichts zu extravagantes oder partymäßiges, eher gemäßigt“. Also warme Farben,
  wenige ruhige Deko-Elemente, Bewegung nur als Antwort aufs Antippen; kein
  Schneefall, kein Glitzer, keine Lade-Animationen. Vor allem Auffälligen fragen.

## Vor jeder Änderung

`git pull --ff-only` – Oliver ändert Seiten manchmal direkt auf github.com.

## Lokal testen, nie an den echten Daten

- `.claude/launch.json` startet „datenbank-emulator“ (Firebase-Emulator, Port
  9000) und „wunschliste“ (Seite auf http://127.0.0.1:8000). Unter `localhost`
  bzw. `127.0.0.1` spricht `wunschliste.js` von selbst mit dem Emulator.
- Testdaten laden:
  `curl -X PUT -H "Authorization: Bearer owner" --data-binary @datei.json "http://127.0.0.1:9000/.json?ns=wunschliste24-ad8d0-default-rtdb"`.
  Die echten Listen sind öffentlich lesbar (`<Datenbank-Adresse aus wunschliste.js>/emil_geschenke.json`)
  und taugen als Testdaten.
- Breiten 320, 375, 390, 768 und 1280 px prüfen; nichts darf seitlich scrollen.
- Für Urteile übers Aussehen ganzseitige Screenshots mit dem Playwright-MCP
  machen; die Browser-Ansicht der App ist dafür zu klein. Playwright schreibt nach
  `.playwright-mcp/` (lokal in `.git/info/exclude`); den Ordner danach löschen.
- Regeln prüfen (braucht Java):
  `npx --yes firebase-tools@15.34.0 emulators:exec --only database "node tests/rules.test.mjs"`.

## Veröffentlichen

- Push auf `master` ist sofort live. GitHub Pages baut etwa eine Minute (Lauf
  „pages-build-deployment“, z. B. mit `gh run watch`); Browser halten alte
  Dateien bis zu 10 Minuten. Live mit angehängtem `?v=<commit>` prüfen.
- Lehnt Olivers Push-Schutz einen Push ab, pusht Oliver selbst. Die Freigabeliste
  des Schutzes nie selbst ändern.
- Regeln erst testen, dann `npx --yes firebase-tools@15.34.0 deploy --only database`.
- Braucht neuer Code neue Daten: erst Code pushen und den Deploy abwarten, dann
  die Daten ändern.

## Listen bearbeiten – die Geschenke stehen nur in der Datenbank

- Werkzeug: `npx --yes firebase-tools@15.34.0 database:get|update ...` (Projekt
  aus `.firebaserc`). Fehlt die Anmeldung, Oliver bitten,
  `npx --yes firebase-tools@15.34.0 login` selbst auszuführen; nie selbst anmelden.
- Vorher immer sichern:
  `database:get / --output backups/datenbank-<datum>-<anlass>.json`.
  `backups/` ist in `.gitignore` und darf nie ins öffentliche Repo.
- Vorher nachsehen, ob schon jemand abgehakt hat; beim Umbauen keine Häkchen
  verlieren.
- Änderungen als ein einziges `database:update` mit Pfad-Schlüsseln (`null`
  löscht), vorher am Emulator mit denselben Ausgangsdaten durchspielen.
- Live nie echte Häkchen setzen oder entfernen, auch nicht zum Testen; die
  Verwandten sehen das sofort. Schreibtests live nur mit dem Wert, den das Feld
  schon hat.
- Oliver schickt Listen gern als Samsung-Notes-Datei (`.sdocx`): ein ZIP, der
  Text steht als UTF-16LE in `note.note`.
- Seine Texte übernehmen, nur offensichtliche Tippfehler und Schreibweise glätten
  und Werbe-Parameter wie `gclid` oder `gbraid` aus Links entfernen. Jede solche
  Änderung im Bericht nennen.

## Sicherheit – so lassen

- Kein `apiKey` im Code; die Seite braucht nur die Datenbank-Adresse.
- `database.rules.json`: Knoten `*_geschenke` sind öffentlich lesbar, schreibbar
  ist nur `checked` (true/false) bei vorhandenen Geschenken. Neue Listen müssen
  auf `_geschenke` enden.
- Links nur mit `http(s)` als Knopf und mit `rel="noopener noreferrer"`; Texte
  aus der Datenbank nur über `textContent` einsetzen.
- Das Repo ist öffentlich: keine Zugangsdaten, keine E-Mail-Adressen, keine
  Datenbank-Sicherungen einchecken.

## Versionen

Firebase JS SDK 12.19.0 (von gstatic, in `wunschliste.js`) und firebase-tools
15.34.0 (über npx) sind fest eingetragen. Nur bewusst anheben, danach lokal testen.

## Commits und Sprache

- Commit-Nachrichten im Format des `commit`-Skills; Bereich `code` für die Seite,
  `meta` für Repo-Pflege.
- Mit Oliver Deutsch; Commit-Nachrichten und Code-Kommentare Englisch.
