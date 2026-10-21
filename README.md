# RE:VIVE Studio

Webbplats för RE:VIVE Studio – privata second hand-släpp med olika teman i Göteborg. Kunden väljer ett släpp, bokar en tid för 1–3 personer och betalar 99 kr för att säkra platsen. Den hemliga adressen visas först i bokningsbekräftelsen.

## Sidor

| Fil | Innehåll |
|---|---|
| `index.html` | Startsida |
| `slapp.html` | Kommande släpp med datum och lediga tider |
| `tema-*.html` | Temasidor: Scandinavian Style, Y2K Streetwear, Vintage & Designer, Japanese Vintage |
| `boka.html` | Bokning och betalning (4 steg) |
| `bekraftelse.html` | Bokningsbekräftelse med hemlig adress |
| `om-oss.html`, `blogg.html`, `faq.html`, `kontakt.html`, `tjanster.html` | Om oss, Inspiration, Vanliga frågor, Kontakt, Sälj dina plagg |

## Struktur

- `css/style.css` – all design (vinrött och cremevitt, Helvetica)
- `js/data.js` – släppdata: datum, tider, status och adresser. Ändra här så uppdateras släpp-, tema- och bokningssidan.
- `js/app.js` – meny, tidsväljare, bokningsflöde, bekräftelse och formulär
- `assets/images/` – bilder

## Köra lokalt

Öppna `index.html` i webbläsaren. Inget byggsteg behövs.

## Att göra innan sidan går live

- Betalningen är en demo – koppla till riktig betalning (t.ex. Stripe eller Swish Handel).
- Fullbokade tider är simulerade – ersätt med data från ett bokningssystem.
- Adresserna i `js/data.js` är påhittade – byt mot de riktiga platserna.
