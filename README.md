# Wunschliste

Kleine Webseite für Geschenk-Wunschlisten, veröffentlicht über GitHub Pages:
https://olimaol.github.io/wunschliste/

Verwandte öffnen eine Liste und haken ab, was sie schenken wollen. Die Häkchen
liegen in einer Firebase Realtime Database (kostenloser Spark-Tarif) und
erscheinen sofort bei allen, die die Seite gerade offen haben. Was jemand
selbst gewählt hat, merkt sich nur sein eigener Browser (siehe „Eigene Auswahl
und Merkzettel“).

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Übersicht: ein Geschenkanhänger pro Liste; darunter „Das schenkst du“, sobald man etwas gewählt hat |
| `emil.html`, `fabi.html`, `beide.html` | je eine Liste: Anhänger mit Namen, Hinweistexte, der Name der Liste in der Datenbank (`data-list="..."`) und die Überschrift für die wichtigsten Wünsche (`data-important-heading="..."`) |
| `wunschliste.js` | gemeinsamer Code: lädt die Liste live, fragt vor dem Abhaken nach, merkt sich die eigene Auswahl und baut den Merkzettel; oben in `LISTS` stehen alle Listen mit „für wen“ |
| `wunschliste.css` | gemeinsames Aussehen (weihnachtlich: Anhänger an Bäckergarn auf grünem Geschenkpapier) |
| `fonts/` | Schriften Playwrite DE LA (Handschrift) und Fraunces, mit Lizenz (SIL Open Font License); liegen auf der Seite selbst statt bei Google |
| `img/` | Strohsterne im Hintergrund und vor den wichtigsten Wünschen, Tannenzweige, Symbol im Browser-Tab, Vorschaubilder für geteilte Links (`vorschau*.jpg`) |
| `tools/vorschaubild.html` | Vorlage für die Vorschaubilder; wie man sie erzeugt, steht oben in der Datei |
| `database.rules.json` | Zugriffsregeln der Datenbank |
| `firebase.json`, `.firebaserc` | Einstellungen für das Firebase-Kommandozeilenwerkzeug |
| `tests/rules.test.mjs` | prüft die Zugriffsregeln an einer lokalen Test-Datenbank |

## Daten in der Datenbank

Jede Liste ist ein Knoten `<name>_geschenke` mit einem Eintrag pro Geschenk:

```
emil_geschenke
  <beliebiger Schlüssel>
    name:    "Laufrad"        Text, Pflicht
    links:   ["https://...", ...]   optional; ein Link ergibt „Ansehen“,
                                    mehrere ergeben „Vorschlag 1“, „Vorschlag 2“, …
    checked: false                  true = jemand schenkt es
    important: true                 optional; true = steht oben im Kasten
```

Statt `links` geht auch ein einzelnes Textfeld `link` (bequemer beim Eintragen
von Hand in der Konsole).

Mehrere Vorschläge zu einem Wunsch (z. B. verschiedene Brio-Wagen) sind
einzelne Geschenke mit eigenem Häkchen und demselben Feld `group: "Brio"`.
Die Seite zeigt sie als eine aufklappbare Zeile „Brio (15 Vorschläge,
2 vergeben)“.

Wünsche mit `important: true` stehen oben in einem Kasten mit goldenem Rahmen.
Seine Überschrift steht in der Listenseite (`data-important-heading`, z. B.
„Ganz oben auf Emils Wunschzettel“); alle anderen Wünsche folgen darunter unter
„Weitere Ideen“. Eine Gruppe kommt in den Kasten, sobald einer ihrer Vorschläge
wichtig ist. Soll nur ein einzelner Vorschlag nach oben, wird er ein eigener
Wunsch ohne `group` (z. B. „Brio Bauernhofzug“). Ohne wichtige Wünsche gibt es
weder Kasten noch Überschriften.

Geschenke anlegen, umbenennen oder löschen geht nur in der Firebase-Konsole
(Realtime Database → Daten) oder mit dem Firebase-Kommandozeilenwerkzeug,
nicht über die Webseite.

## Eigene Auswahl und Merkzettel

- Antippen eines freien Geschenks fragt „Möchtest du das schenken?“. Erst
  „Ja, das schenke ich“ setzt `checked`, und zwar als Transaktion: nur solange
  es noch frei ist. Tippen zwei Leute gleichzeitig, bekommt der Zweite „Schade –
  das hat gerade jemand anderes ausgewählt“.
- Was jemand gewählt hat, steht nur in seinem Browser (`localStorage`, Schlüssel
  `wunschliste-von-mir`; `wunschliste-erklaert` merkt sich, dass der Hinweis
  beim ersten Mal schon kam). Die Datenbank erfährt nie, wer was schenkt.
- Eigene Geschenke haben einen roten Haken und „von dir“; nochmal antippen fragt
  „Doch nicht schenken?“. Häkchen anderer bleiben gesperrt, bis man den Schalter
  unter der Liste umlegt; auch dann fragt die Seite vor dem Entfernen.
- Der Kasten „Das schenkst du“ steht oben auf jeder Liste und auf der
  Startseite. Sein Knopf „Merkzettel an mich schicken“ öffnet WhatsApp
  (`https://wa.me/?text=…`) mit der Liste und einem Link wie
  `https://olimaol.github.io/wunschliste/#meine=emil:roller,rucksack;fabi:puppe`.
  Dieser Link bringt die Auswahl auf jedes Gerät zurück.
- Ist ein eigenes Geschenk nicht mehr abgehakt (jemand hat das Häkchen entfernt,
  oder es steht nicht mehr auf der Liste), sagt der Kasten das einmal und vergisst
  es dann.
- Safari auf dem iPhone löscht diese Browserdaten, wenn man die Seite etwa eine
  Woche lang nicht öffnet. Dann hilft der Link im Merkzettel.

## Sicherheit

- Der Firebase-Konfigurationsblock (`apiKey` usw.) ist laut Firebase kein
  Geheimnis. Die Seite nutzt inzwischen nur noch die Datenbank-Adresse.
- Geschützt wird die Datenbank durch `database.rules.json`: Jeder darf die
  Listen lesen und bei bestehenden Geschenken nur `checked` auf `true`/`false`
  setzen. Alles andere ist gesperrt. Die Regeln laufen nicht ab.
- Wer was schenkt, steht nur im Browser der Verwandten, nie in der Datenbank.

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

1. Eine Listenseite kopieren (z. B. `emil.html`), Titel, Überschrift,
   `data-list="neu_geschenke"` und `data-important-heading` anpassen. Der Name
   muss auf `_geschenke` enden.
2. In `index.html` einen Anhänger ergänzen (eine Zeile `<a class="tag" ...>` kopieren).
3. In `wunschliste.js` bei `LISTS` eine Zeile ergänzen, z. B.
   `neu_geschenke: "für Neu",` (für den Kasten „Das schenkst du“ und den Merkzettel).
4. In der Datenbank den Knoten `neu_geschenke` mit Geschenken anlegen.
5. Vorschaubild für geteilte Links: `tools/vorschaubild.html?name=Neu` als
   `img/vorschau-neu.jpg` speichern und in der neuen Seite die Zeilen
   `og:title`, `og:url`, `og:image` und `og:image:alt` anpassen.

## Link-Vorschau (WhatsApp usw.)

Jede Seite hat im Kopf `og:`-Zeilen mit Titel, Beschreibung und Vorschaubild.
Die Adressen darin müssen vollständig sein (`https://olimaol.github.io/...`);
zieht die Seite um, müssen sie mit. WhatsApp merkt sich Vorschauen eine Weile.
Zeigt ein Link noch die alte Vorschau, hilft beim Teilen ein angehängtes `?1`.
