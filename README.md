# Wunschliste

Kleine Webseite für Geschenk-Wunschlisten, veröffentlicht über GitHub Pages:
https://olimaol.github.io/wunschliste/

Verwandte öffnen eine Liste und haken ab, was sie schenken wollen. Die Häkchen
liegen in einer Firebase Realtime Database (kostenloser Spark-Tarif) und
erscheinen sofort bei allen, die die Seite gerade offen haben.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Übersicht mit Links zu den Listen |
| `emil.html`, `fabi.html`, `beide.html` | je eine Liste: Überschrift, Hinweistexte und der Name der Liste in der Datenbank (`data-list="..."`) |
| `wunschliste.js` | gemeinsamer Code: lädt die Liste live und speichert Häkchen |
| `wunschliste.css` | gemeinsames Aussehen |
| `database.rules.json` | Zugriffsregeln der Datenbank |
| `firebase.json`, `.firebaserc` | Einstellungen für das Firebase-Kommandozeilenwerkzeug |
| `tests/rules.test.mjs` | prüft die Zugriffsregeln an einer lokalen Test-Datenbank |

## Daten in der Datenbank

Jede Liste ist ein Knoten `<name>_geschenke` mit einem Eintrag pro Geschenk:

```
emil_geschenke
  <beliebiger Schlüssel>
    name:    "Laufrad"        Text, Pflicht
    links:   ["https://...", ...]   optional; ein Link ergibt „Hier bestellen“,
                                    mehrere ergeben „Vorschlag 1“, „Vorschlag 2“, …
    checked: false                  true = jemand schenkt es
```

Statt `links` geht auch ein einzelnes Textfeld `link` (bequemer beim Eintragen
von Hand in der Konsole).

Geschenke anlegen, umbenennen oder löschen geht nur in der Firebase-Konsole
(Realtime Database → Daten) oder mit dem Firebase-Kommandozeilenwerkzeug,
nicht über die Webseite.

## Sicherheit

- Der Firebase-Konfigurationsblock (`apiKey` usw.) ist laut Firebase kein
  Geheimnis. Die Seite nutzt inzwischen nur noch die Datenbank-Adresse.
- Geschützt wird die Datenbank durch `database.rules.json`: Jeder darf die
  Listen lesen und bei bestehenden Geschenken nur `checked` auf `true`/`false`
  setzen. Alles andere ist gesperrt. Die Regeln laufen nicht ab.

## Regeln testen und veröffentlichen

```bash
npx --yes firebase-tools@15.34.0 emulators:exec --only database "node tests/rules.test.mjs"
npx --yes firebase-tools@15.34.0 deploy --only database
```

Der Test braucht Java; das Veröffentlichen einmalig
`npx --yes firebase-tools@15.34.0 login`.

## Lokal ansehen

Test-Datenbank starten und die Seite lokal ausliefern. Unter `localhost` bzw.
`127.0.0.1` spricht die Seite automatisch mit der Test-Datenbank statt mit der
echten.

```bash
npx --yes firebase-tools@15.34.0 emulators:start --only database
python3 -m http.server 8000
```

## Neue Liste anlegen

1. Eine Listenseite kopieren (z. B. `emil.html`), Titel, Überschrift und
   `data-list="neu_geschenke"` anpassen. Der Name muss auf `_geschenke` enden.
2. Link in `index.html` ergänzen.
3. In der Datenbank den Knoten `neu_geschenke` mit Geschenken anlegen.
