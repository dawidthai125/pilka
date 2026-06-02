# PIORUN VISUAL DNA

**Źródło prawdy:** [Piorun Wawrzeńczyce — Facebook](https://www.facebook.com/profile.php?id=61560486822886)  
**Data audytu:** 31 maja 2026  
**Zakres:** warstwa wizualna i komunikacyjna marki — bez layoutu strony WWW

---

## 1. Co wyróżnia wizualnie Piorun?

### Kolorystyka

| Element | Obserwacja |
|---------|------------|
| **Zielony klubowy** | Dominujący kolor w grafikach meczowych, tłach postów i emoji (💚). Odpowiada `#0B3D2E` w `website_settings`. |
| **Złoty / żółty akcent** | Drugi kolor identyfikacji (`#F4C430`) — używany na napisach, obramowaniach, wyróżnieniach VS. |
| **Biel** | Tło herbów rywali, kontrast na ciemnozielonych grafikach. |
| **Czerń / ciemne tło** | Częste w AI-grafikach zapowiedzi meczów — dramatyczny, „stadion nocą” klimat. |

Na Facebooku kolory są **mocniejsze i bardziej nasycone** niż na stronie — grafiki AI dodają gradienty, błyski i efekty „premium sport”.

### Typografia i układ grafik

- **Zapowiedzi meczów:** układ **VS** — herb Pioruna po lewej, rywal po prawej, data/godzina/liga na dole.
- **Nagłówki CAPS:** `PRZED NAMI KOLEJNE WYZWANIE!`, `WSPÓŁPRACA`, `DZIĘKUJEMY` — krótkie, krzykliwe, jak plakat.
- **Fonty:** grube sans-serif (Impact-style) na grafikach AI; w postach tekstowych — standard FB, krótkie akapity.
- **Herb klubu:** okrągły lub na tle zielonym; często obok logo rywala i logo ligi (np. DZPN).

### Motywy przewodnie

| Motyw | Jak występuje |
|-------|----------------|
| **Mecz jako wydarzenie** | Zapowiedzi z datą, godziną, ligą, emoji ⚽🔥🆚 |
| **Akademia / młodzież** | Zdjęcia dzieci w strojach, treningi na boisku, grupowe ujęcia |
| **Lokalność** | GLKS Mietków, Wawrzeńczyce, IV Liga Okręgowa Młodzików |
| **Wspólnota** | „Wspieraj nas na boisku”, „razem tworzymy Pioruna” |
| **Sponsorzy** | Grafiki podziękowań, logo partnerów w tle postów |

### Rodzaj zdjęć

**Autentyczne (preferowane na WWW):**

- Drużyna na boisku (zdjęcie grupowe w strojach)
- Dzieci z akademii podczas treningu
- Boisko klubowe, trybuny, kibice
- Ujęcia z meczów (celebracja, akcja)

**Grafiki AI / szablony (charakterystyczne dla FB):**

- Zapowiedzi meczów z syntetycznym tłem
- Kolaże z herbami i efektami świetlnymi
- Banery „VS” z wygenerowanymi stadionami

Na profilu FB **miks** — ok. połowa postów to grafiki szablonowe, reszta to realne fotografie z boiska.

### Sposób eksponowania herbu

- Herb zawsze **czytelny**, min. 15% szerokości grafiki
- Na zapowiedziach: herb Pioruna = strona „domowa” (lewa)
- W zdjęciach grupowych: herb na koszulce, czasem watermark

### Sposób eksponowania sponsorów

- Osobne posty podziękowań z logo sponsora
- Logo w rogu grafiki meczowej (mniejsze)
- Tekst: „Dziękujemy za wsparcie”, „Partner meczu” — ciepły, nie korporacyjny

### Styl komunikacji (wizualnie powiązany)

- Emoji: 💚⚽🔥🆚 — zawsze na początku/końcu, nigdy w środku zdania
- CAPS w nagłówkach, normalna pisownia w treści
- Ton: energiczny, rodzinny, lokalny — **nie** urzędowy

---

## 2. Jakie elementy należy przenieść na stronę WWW?

| Element | Jak przenieść (treść/media, bez layoutu) |
|---------|-------------------------------------------|
| **Kolory zielony + złoty** | Już w CMS — utrzymać, ewentualnie lekko nasycić akcenty |
| **Hasło klubu** | „Od Skrzata do Seniora — jedna rodzina, jeden klub” (z FB/CMS) |
| **Realne zdjęcia z FB** | Import przez `scripts/import-piorun-facebook.mjs` → `public/club-media/` |
| **Logo klubu** | Upload w `/website/branding` — herb z FB profilu |
| **Okładka (cover)** | Zdjęcie boiska/drużyny z FB — upload jako „Grafika hero” |
| **Ton postów meczowych** | CAPS nagłówek + krótka treść + wezwanie do kibiców |
| **Zdjęcia akademii** | Sloty `academy/kids`, `academy/training` — prawdziwe foty dzieci |
| **Telefon kontaktowy** | `+48 663 595 991` (z FB — już w migracji) |
| **Link FB** | `https://www.facebook.com/profile.php?id=61560486822886` |
| **Nazewnictwo drużyn** | Skrzaty → Seniorzy (z bazy, zgodne z FB) |
| **VS / mecz jako hero content** | Treść zapowiedzi — tak; szablon AI grafiki — tylko jako inspiracja kolorystyczna |

---

## 3. Jakich elementów NIE kopiować z Facebooka?

| Element FB | Dlaczego nie na WWW |
|------------|---------------------|
| **Layout feedu FB** | Strona to portal klubowy, nie klon Facebooka |
| **Grafiki AI z efektami** | Wyglądają jak stock; na profesjonalnej stronie lepsze są realne foty |
| **Nadmierne CAPS w całej treści** | Na WWW: CAPS tylko w tytule/H1, treść normalna |
| **Emoji co drugie słowo** | Max 1–2 na post aktualności |
| **Hashtagi `#PiorunWawrzeńczyce`** | SEO description zamiast hashtag spam |
| **„Shared with Public” / metadane FB** | Artefakty platformy |
| **Sztuczne URL social** | Seed ma instagram/tiktok/youtube — nie publikować bez realnych profili |
| **Powtarzalne te same zdjęcia** | FB używa 10–12 fotek w kółko — WWW wymaga różnorodności |
| **VS-grafiki jako cover** | Cover = autentyczne boisko/drużyna, nie plakat meczowy |
| **UI Facebooka** | Przyciski Like, Przypięty post jako layout — tylko treść, nie forma |

---

## 4. Jak zachować charakter marki przy profesjonalnej stronie?

### Zasada: „Klub redaguje, system nie mówi”

```
Facebook (energia)  →  Strona WWW (profesjonalizm)
─────────────────────────────────────────────────
CAPS + emoji        →  Mocny tytuł + 1 emoji max
AI grafika VS       →  Realne zdjęcie + tekst zapowiedzi
10 zdjęć w kółko    →  Galeria 30+ unikalnych fotek
Post ad hoc         →  Aktualność z datą, kategorią, SEO
Komentarze kibiców  →  Link „Obserwuj nas na FB”
```

### Trzy filary tożsamości na stronie

1. **Rodzina** — „Od Skrzata do Seniora”, zdjęcia wszystkich grup wiekowych
2. **Mecz** — terminarz, wyniki, zapowiedzi z prawdziwymi rywalami (Silesia Mietków, nie KS Orzeł z seeda)
3. **Wspólnota** — kibice, sponsorzy lokalni, boisko w Wawrzeńczyce

### Checklist wizualna przed publikacją każdej sekcji

- [ ] Czy widać **prawdziwe** boisko / stroje / herb klubu?
- [ ] Czy tekst brzmi jak **post od zarządu**, nie jak opis modułu CRM?
- [ ] Czy kolory to **zielony + złoty**, nie domyślny szary SaaS?
- [ ] Czy sponsorzy to **realni partnerzy**, nie Budmax z seeda?
- [ ] Czy kontakt to **numer z FB**, nie `+48 12 345 67 89`?

---

## Powiązane dokumenty

- [`real-content-sprint-report.md`](./real-content-sprint-report.md) — pełny audyt sprintu
- [`piorun-brand-content-guide.md`](./piorun-brand-content-guide.md) — jak pisać treści
- [`content-backlog.md`](./content-backlog.md) — priorytety wdrożenia
