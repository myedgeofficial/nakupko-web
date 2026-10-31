#!/usr/bin/env python3
"""Nakupko · ustvari statične strani za iskalnike in AdSense.

Iz data/recepti.json naredi:
  recept/<slug>.html          (slovensko, en recept na stran)
  recept/index.html           (vsi recepti po rubrikah)
  en/recipe/<slug>.html       (angleško)
  en/recipe/index.html
Iz tools/vodnik/*.html naredi vodnik/<ime>.html + vodnik/index.html.
Na koncu napiše sitemap.xml.

Zaženi iz korena repozitorija:  python3 tools/generiraj.py
"""
import html
import json
import os
import re
import unicodedata
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://nakupko.com"
TODAY = date.today().isoformat()
ADS = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2170388618811750" crossorigin="anonymous"></script>'
E = html.escape


def norm(s):
    return " ".join(unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode().split())


def slugify(s):
    s = unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


# ---------------------------------------------------------------- ogrodje strani
T = {
    "sl": dict(recipes="Recepti", all="Vsi recepti", guide="Vodnik", about="O nas", support="Podpora",
               privacy="Zasebnost", terms="Pogoji", privacy_u="/zasebnost.html", terms_u="/pogoji.html",
               support_u="/podpora.html", about_u="/o-nas.html", recipes_u="/recept/", guide_u="/vodnik/",
               app="Prenesi Nakupko", other="English"),
    "en": dict(recipes="Recipes", all="All recipes", guide="Guides", about="About", support="Support",
               privacy="Privacy", terms="Terms", privacy_u="/privacy.html", terms_u="/terms.html",
               support_u="/support.html", about_u="/about.html", recipes_u="/en/recipe/", guide_u="/vodnik/",
               app="Get Nakupko", other="Slovenščina"),
}


def page(lang, path, title, desc, body, alt=None, ld=None, on=""):
    t = T[lang]
    other = "en" if lang == "sl" else "sl"
    alts = ""
    if alt:
        alts = (f'<link rel="alternate" hreflang="{lang}" href="{SITE}{path}">\n'
                f'<link rel="alternate" hreflang="{other}" href="{SITE}{alt}">\n')
    ldtag = f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n' if ld else ""
    nav = [("recipes", t["recipes_u"], t["recipes"])]
    if lang == "sl":
        nav.append(("guide", t["guide_u"], t["guide"]))
    nav.append(("about", t["about_u"], t["about"]))
    navh = "".join(f'<a href="{u}"{" class=on" if k == on else ""}>{E(n)}</a>' for k, u, n in nav)
    if alt:
        navh += f'<a href="{alt}" lang="{other}">{t["other"]}</a>'
    foot = (f'<a href="/">Nakupko</a><a href="{t["recipes_u"]}">{t["all"]}</a>'
            + (f'<a href="/vodnik/">{T["sl"]["guide"]}</a>' if lang == "sl" else "")
            + f'<a href="{t["about_u"]}">{t["about"]}</a><a href="{t["support_u"]}">{t["support"]}</a>'
            f'<a href="{t["privacy_u"]}">{t["privacy"]}</a><a href="{t["terms_u"]}">{t["terms"]}</a>'
            '<a href="mailto:support@remako.si">support@remako.si</a>')
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{SITE}{path}">
{alts}<meta name="theme-color" content="#07060b">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:image" content="{SITE}/img/ikona-512.png">
<meta name="apple-itunes-app" content="app-id=6818745132">
<link rel="icon" href="/img/ikona.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
{ADS}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/clanek.css">
{ldtag}</head>
<body>
<header class="top"><a class="home" href="/"><img src="/img/ikona-512.png" alt="">Nakupko</a><nav>{navh}</nav></header>
<main>
{body}
</main>
<footer><nav>{foot}</nav><div>© 2026 <a href="https://remako.si">REMAKO d.o.o.</a></div></footer>
<script src="/js/stevec.js"></script>
</body>
</html>
"""


# ---------------------------------------------------------------- recepti
R = json.load(open(os.path.join(ROOT, "data/recepti.json"), encoding="utf-8"))
K = json.load(open(os.path.join(ROOT, "data/katalog.json"), encoding="utf-8"))
BY = {}
for p in K:
    BY.setdefault(norm(p[0]), p)
EXTRA_EN = {"Goveji zrezek": "Beef steak", "Jalapeno": "Jalapeño", "Mešani morski sadeži": "Mixed seafood",
            "Nori listi": "Nori sheets", "Raca": "Duck", "Riž za suši": "Sushi rice", "Rižev kis": "Rice vinegar",
            "Solata rimska": "Romaine lettuce", "Teletina": "Veal", "Wasabi": "Wasabi", "Šparglji": "Asparagus"}
MAPE = {m[0]: (m[1], m[2]) for m in R["mape"]}
TEZ = {1: ("Enostavno", "Easy"), 2: ("Srednje zahtevno", "Medium"), 3: ("Zahtevno", "Challenging")}
CAS = [(20, "hitra jed za dneve, ko se mudi", "a quick dish for busy days"),
       (45, "jed za vsak dan", "an everyday dish"),
       (90, "jed za dan, ko imaš malo več časa", "a dish for when you have a bit more time"),
       (99999, "jed za vikend ali praznik", "a weekend or holiday dish")]

# oblike enot: 1, 2, 3–4, 5+, decimalno
UNIT_SL = {"g": ["g"] * 5, "kg": ["kg"] * 5, "ml": ["ml"] * 5, "l": ["l"] * 5, "kos": ["kos"] * 5,
           "strok": ["strok", "stroka", "stroki", "strokov", "stroka"],
           "žlica": ["žlica", "žlici", "žlice", "žlic", "žlice"],
           "žlička": ["žlička", "žlički", "žličke", "žličk", "žličke"],
           "šopek": ["šopek", "šopka", "šopki", "šopkov", "šopka"],
           "list": ["list", "lista", "listi", "listov", "lista"],
           "pločevinka": ["pločevinka", "pločevinki", "pločevinke", "pločevink", "pločevinke"],
           "kozarec": ["kozarec", "kozarca", "kozarci", "kozarcev", "kozarca"],
           "vrečka": ["vrečka", "vrečki", "vrečke", "vrečk", "vrečke"],
           "rezina": ["rezina", "rezini", "rezine", "rezin", "rezine"],
           "zavitek": ["zavitek", "zavitka", "zavitki", "zavitkov", "zavitka"]}
UNIT_EN = {"g": ("g", "g"), "kg": ("kg", "kg"), "ml": ("ml", "ml"), "l": ("l", "l"), "kos": ("", ""),
           "strok": ("clove", "cloves"), "žlica": ("tbsp", "tbsp"), "žlička": ("tsp", "tsp"),
           "šopek": ("bunch", "bunches"), "list": ("leaf", "leaves"), "pločevinka": ("can", "cans"),
           "kozarec": ("jar", "jars"), "vrečka": ("bag", "bags"), "rezina": ("slice", "slices"),
           "zavitek": ("pack", "packs")}


def num(v, lang):
    s = str(int(v)) if float(v).is_integer() else str(round(v, 2)).rstrip("0").rstrip(".")
    return s.replace(".", ",") if lang == "sl" else s


def amount(a, u, lang):
    if not a:
        return "po okusu" if lang == "sl" else "to taste"
    if lang == "sl":
        f = UNIT_SL.get(u, [u] * 5)
        if not float(a).is_integer():
            w = f[4]
        else:
            n = int(a) % 100
            w = f[0] if n == 1 else f[1] if n == 2 else f[2] if n in (3, 4) else f[3]
        return f"{num(a, lang)} {w}".strip()
    one, many = UNIT_EN.get(u, (u, u))
    return f"{num(a, lang)} {one if a == 1 else many}".strip()


def ing_name(n, lang):
    if lang == "sl":
        return n
    p = BY.get(norm(n))
    return p[1] if p else EXTRA_EN.get(n, n)


def mins(m, lang):
    if m < 60:
        return f"{m} min"
    h, r = divmod(m, 60)
    return f"{h} h" + (f" {r} min" if r else "")


def iso_dur(m):
    h, r = divmod(m, 60)
    return "PT" + (f"{h}H" if h else "") + (f"{r}M" if r or not h else "")


jedi = R["jedi"]
slugs = {"sl": [], "en": []}
for lang, idx in (("sl", 1), ("en", 2)):
    seen = set()
    for r in jedi:
        s = slugify(r[idx]) or "recept"
        base, k = s, 2
        while s in seen:
            s, k = f"{base}-{k}", k + 1
        seen.add(s)
        slugs[lang].append(s)

PREFIX = {"sl": "/recept/", "en": "/en/recipe/"}
urls = []


def recipe_page(i, lang):
    r = jedi[i]
    name = r[1] if lang == "sl" else r[2]
    cat = MAPE[r[5]][0 if lang == "sl" else 1]
    tez = TEZ[r[4]][0 if lang == "sl" else 1]
    cas = next(c for c in CAS if r[3] <= c[0])
    steps = r[7][0 if lang == "sl" else 1]
    ings = r[6]
    path = PREFIX[lang] + slugs[lang][i] + ".html"
    alt = PREFIX["en" if lang == "sl" else "sl"] + slugs["en" if lang == "sl" else "sl"][i] + ".html"
    oth = "en" if lang == "sl" else "sl"
    # podobni recepti: naslednjih 6 v isti rubriki (stabilno, brez naključja)
    cat_ids = [j for j in range(len(jedi)) if jedi[j][5] == r[5]]
    p = cat_ids.index(i)
    rel = [cat_ids[(p + k) % len(cat_ids)] for k in range(1, min(7, len(cat_ids)))]
    ing_li = "".join(f"<li><span>{E(ing_name(g[0], lang))}</span><em>{E(amount(g[1], g[2], lang))}</em></li>" for g in ings)
    st_li = "".join(f"<li>{E(s)}</li>" for s in steps)
    rel_li = "".join(
        f'<li><a href="{PREFIX[lang]}{slugs[lang][j]}.html">{E(jedi[j][1 if lang == "sl" else 2])}'
        f'<small>{mins(jedi[j][3], lang)} · {TEZ[jedi[j][4]][0 if lang == "sl" else 1]}</small></a></li>' for j in rel)
    taste = [ing_name(g[0], lang) for g in ings if not g[1]]
    if lang == "sl":
        title = f"{name} – recept za 4 osebe | Nakupko"
        desc = f"{name}: {len(ings)} sestavin, {mins(r[3], lang)}, {tez.lower()}. Sestavine s količinami za 4 osebe in postopek v {len(steps)} korakih."
        intro = (f"<p class=lead>{E(name)} spada v rubriko »{E(cat)}«. To je {cas[1]}: pripraviš jo v približno {mins(r[3], lang)}, "
                 f"recept je {'enostaven' if r[4] == 1 else 'srednje zahteven' if r[4] == 2 else 'zahtevnejši'} "
                 f"in ima {len(ings)} sestavin.</p>")
        h_ing, h_steps, h_rel = "Sestavine za 4 osebe", f"Postopek v {len(steps)} korakih", f"Še iz rubrike {cat}"
        tip = ("<p class=muted>Sestavine z oznako »po okusu« so začimbe in omake, ki jih večina ima doma. "
               "Če jih nimaš, jih dodaj na seznam.</p>" if taste else "")
        scale = ("<h2>Za več ali manj oseb</h2><p>Količine zgoraj veljajo za 4 osebe. Na strani "
                 "<a href=\"/recepti.html\">Recepti</a> izbereš od 1 do 20 oseb in Nakupko količine preračuna sam. "
                 "Odkljukaš, kar že imaš doma, ostalo gre z enim klikom na nakupovalni seznam. "
                 "V aplikaciji se ta seznam sam odpre, ko prideš v trgovino.</p>")
        cta = (f'<div class=cta><a href="/recepti.html#r={i}">Dodaj sestavine na seznam</a>'
               f'<a class=ghost href="/#prenos">Prenesi Nakupko</a></div>')
        crumbs = f'<a href="/">Nakupko</a> › <a href="/recept/">Recepti</a> › <a href="/recept/#{r[5]}">{E(cat)}</a>'
        meta = [f"⏱ {mins(r[3], lang)}", tez, f"{len(ings)} sestavin", "4 osebe"]
    else:
        title = f"{name} – recipe for 4 | Nakupko"
        desc = f"{name}: {len(ings)} ingredients, {mins(r[3], lang)}, {tez.lower()}. Ingredients with amounts for 4 people and {len(steps)} simple steps."
        intro = (f"<p class=lead>{E(name)} is {cas[2]} from our “{E(cat)}” collection. It takes about {mins(r[3], lang)}, "
                 f"the difficulty is {tez.lower()} and you need {len(ings)} ingredients.</p>")
        h_ing, h_steps, h_rel = "Ingredients for 4 people", f"Method in {len(steps)} steps", f"More {cat.lower()}"
        tip = ("<p class=muted>Items marked “to taste” are seasonings and sauces most people already have at home. "
               "If you don't, add them to your list.</p>" if taste else "")
        scale = ("<h2>Cooking for more or fewer people</h2><p>The amounts above are for 4 people. On the "
                 "<a href=\"/recepti.html?lang=en\">Recipes</a> page you can pick anything from 1 to 20 people and Nakupko "
                 "scales the amounts for you. Untick what you already have and the rest goes onto your shopping list "
                 "in one tap. In the app, that list opens by itself when you walk into a store.</p>")
        cta = (f'<div class=cta><a href="/recepti.html?lang=en#r={i}">Add ingredients to my list</a>'
               f'<a class=ghost href="/#prenos">Get Nakupko</a></div>')
        crumbs = f'<a href="/">Nakupko</a> › <a href="/en/recipe/">Recipes</a> › <a href="/en/recipe/#{r[5]}">{E(cat)}</a>'
        meta = [f"⏱ {mins(r[3], lang)}", tez, f"{len(ings)} ingredients", "Serves 4"]
    body = (f'<p class=crumbs>{crumbs}</p><article><h1>{E(name)}</h1>'
            f'<ul class=meta>{"".join(f"<li>{E(m)}</li>" for m in meta)}</ul>{intro}'
            f"<h2>{E(h_ing)}</h2><ul class=ing>{ing_li}</ul>{tip}"
            f"<h2>{E(h_steps)}</h2><ol class=steps>{st_li}</ol>{cta}{scale}</article>"
            + (f"<h2>{E(h_rel)}</h2><ul class=cards>{rel_li}</ul>" if rel_li else ""))
    ld = {"@context": "https://schema.org", "@type": "Recipe", "name": name, "inLanguage": lang,
          "description": desc, "image": f"{SITE}/img/ikona-512.png",
          "author": {"@type": "Organization", "name": "Nakupko (REMAKO d.o.o.)", "url": SITE},
          "totalTime": iso_dur(r[3]), "recipeYield": "4", "recipeCategory": cat,
          "recipeIngredient": [f"{amount(g[1], g[2], lang)} {ing_name(g[0], lang)}" for g in ings],
          "recipeInstructions": [{"@type": "HowToStep", "text": s} for s in steps]}
    write(path.lstrip("/"), page(lang, path, title, desc, body, alt=alt, ld=ld, on="recipes"))
    urls.append(path)


for i in range(len(jedi)):
    recipe_page(i, "sl")
    recipe_page(i, "en")


def recipe_index(lang):
    path = PREFIX[lang]
    alt = PREFIX["en" if lang == "sl" else "sl"]
    parts = []
    for mid, (sl, en) in MAPE.items():
        items = sorted((j for j in range(len(jedi)) if jedi[j][5] == mid), key=lambda j: norm(jedi[j][1 if lang == "sl" else 2]))
        li = "".join(f'<li><a href="{PREFIX[lang]}{slugs[lang][j]}.html">{E(jedi[j][1 if lang == "sl" else 2])}</a> '
                     f'<span class=muted>{mins(jedi[j][3], lang)}</span></li>' for j in items)
        parts.append(f'<h2 id="{mid}">{E(sl if lang == "sl" else en)} <span class=muted>({len(items)})</span></h2><ul class=links>{li}</ul>')
    toc = " · ".join(f'<a href="#{m}">{E(v[0] if lang == "sl" else v[1])}</a>' for m, v in MAPE.items())
    if lang == "sl":
        title, desc = "Vsi recepti od A do Ž | Nakupko", f"Kazalo {len(jedi)} receptov Nakupko po rubrikah: testenine, juhe, meso, ribe, jedi brez mesa, slovenska klasika, sladice in več."
        head = (f"<p class=crumbs><a href=\"/\">Nakupko</a> › Recepti</p><h1>Vsi recepti</h1>"
                f"<p class=lead>{len(jedi)} preizkušenih domačih jedi, urejenih po rubrikah. Vsak recept ima sestavine s količinami "
                "za 4 osebe in postopek po korakih. Na strani <a href=\"/recepti.html\">Recepti</a> jih filtriraš po času in zahtevnosti "
                "ter sestavine preneseš na nakupovalni seznam.</p>")
    else:
        title, desc = "All recipes A–Z | Nakupko", f"Index of all {len(jedi)} Nakupko recipes by category: pasta, soups, meat, fish, meat-free, Slovenian classics, desserts and more."
        head = (f"<p class=crumbs><a href=\"/\">Nakupko</a> › Recipes</p><h1>All recipes</h1>"
                f"<p class=lead>{len(jedi)} home-cooked dishes, sorted by category. Each recipe lists ingredients with amounts for "
                "4 people and a step-by-step method. On the <a href=\"/recepti.html?lang=en\">Recipes</a> page you can filter by time "
                "and difficulty and move the ingredients onto your shopping list.</p>")
    body = head + f"<p>{toc}</p>" + "".join(parts)
    write(path.lstrip("/") + "index.html", page(lang, path, title, desc, body, alt=alt, on="recipes"))
    urls.insert(0, path)


recipe_index("sl")
recipe_index("en")

# ---------------------------------------------------------------- vodnik
VD = os.path.join(ROOT, "tools", "vodnik")
guides = []
for fn in sorted(os.listdir(VD)):
    if not fn.endswith(".html"):
        continue
    src = open(os.path.join(VD, fn), encoding="utf-8").read()
    m = re.match(r"<!--\s*(.*?)\s*\|\s*(.*?)\s*-->\s*", src, re.S)
    title, desc = m.group(1), m.group(2)
    content = src[m.end():]
    slug = re.sub(r"^\d+-", "", fn[:-5])
    path = f"/vodnik/{slug}.html"
    body = (f'<p class=crumbs><a href="/">Nakupko</a> › <a href="/vodnik/">Vodnik</a></p><article><h1>{E(title)}</h1>'
            f'<p class=muted>Uredništvo Nakupko · posodobljeno {date.today().strftime("%-d. %-m. %Y")}</p>{content}</article>')
    guides.append((slug, title, desc, path, body))
for k, (slug, title, desc, path, body) in enumerate(guides):
    more = "".join(f'<li><a href="{g[3]}">{E(g[1])}<p>{E(g[2])}</p></a></li>' for g in guides if g[0] != slug)
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": title, "description": desc, "inLanguage": "sl",
          "dateModified": TODAY, "author": {"@type": "Organization", "name": "Nakupko (REMAKO d.o.o.)"},
          "publisher": {"@type": "Organization", "name": "REMAKO d.o.o.", "url": "https://remako.si"}}
    full = body + "<h2>Preberi še</h2><ul class=cards>" + more + "</ul>"
    write(path.lstrip("/"), page("sl", path, f"{title} | Nakupko", desc, full, ld=ld, on="guide"))
    urls.append(path)
cards = "".join(f'<li><a href="{g[3]}">{E(g[1])}<p>{E(g[2])}</p></a></li>' for g in guides)
write("vodnik/index.html", page(
    "sl", "/vodnik/", "Vodnik za pametnejše nakupovanje | Nakupko",
    "Praktični nasveti za nakupovanje, načrtovanje obrokov, shranjevanje živil in manj zavržene hrane.",
    '<p class=crumbs><a href="/">Nakupko</a> › Vodnik</p><h1>Vodnik</h1>'
    "<p class=lead>Praktični nasveti, kako nakupovati hitreje, kuhati bolj načrtno in zavreči manj hrane. "
    "Pišemo jih iz lastnih izkušenj in iz vprašanj, ki jih dobivamo od uporabnikov Nakupka.</p>"
    f"<ul class=cards>{cards}</ul>", on="guide"))
urls.insert(0, "/vodnik/")


# ---------------------------------------------------------------- o nas
write("o-nas.html", page("sl", "/o-nas.html", "O nas | Nakupko", "Kdo stoji za Nakupkom, zakaj smo ga naredili in kako nas dosežeš.",
    '<p class=crumbs><a href="/">Nakupko</a> › O nas</p><h1>O nas</h1>'
    '<p class=lead>Nakupko je slovenski nakupovalni seznam, ki se sam odpre, ko prideš v trgovino. Izdaja ga podjetje REMAKO d.o.o. iz Rač.</p>'
    '<h2>Zakaj Nakupko</h2><p>Nakupko smo naredili, ker smo se naveličali iskanja seznama po telefonu sredi trgovine in pozabljenih izdelkov. '
    'Želeli smo seznam, ki je tam, ko ga rabiš, ki ga lahko deliš z domačimi in ki pomaga pri kuhanju, ne pa še ena aplikacija, ki terja pozornost.</p>'
    '<h2>Kaj najdeš na nakupko.com</h2><ul><li><a href="/#orodja">Spletni nakupovalni seznam</a> brez prijave, ki ga s kodo QR preneseš na telefon.</li>'
    f'<li><a href="/recept/">{len(jedi)} receptov</a> s sestavinami za izbrano število oseb.</li>'
    '<li><a href="/vodnik/">Vodnik</a> s praktičnimi nasveti za nakupovanje, načrtovanje obrokov in shranjevanje živil.</li>'
    '<li>Aplikacijo Nakupko za <a href="https://apps.apple.com/si/app/nakupko/id6818745132">iPhone</a> in <a href="https://play.google.com/store/apps/details?id=si.nakupko.app">Android</a>.</li></ul>'
    '<h2>Kako nastajajo vsebine</h2><p>Recepte in članke v vodniku pripravlja ekipa Nakupka. Recepte preverimo, da so količine smiselne za 4 osebe in da so koraki razumljivi. '
    'Cen na strani ne objavljamo. Če najdeš napako, nam piši in jo popravimo.</p>'
    '<h2>Podjetje</h2><p>REMAKO d.o.o.<br>Ljubljanska cesta 63, 2327 Rače, Slovenija<br>ID za DDV: SI45736901<br>'
    'E-pošta: <a href="mailto:support@remako.si">support@remako.si</a><br>Splet: <a href="https://remako.si">remako.si</a></p>',
    alt="/about.html", on="about"))
write("about.html", page("en", "/about.html", "About | Nakupko", "Who makes Nakupko, why we built it and how to reach us.",
    '<p class=crumbs><a href="/">Nakupko</a> › About</p><h1>About</h1>'
    '<p class=lead>Nakupko is a Slovenian shopping list that opens by itself when you walk into a store. It is published by REMAKO d.o.o. from Rače, Slovenia.</p>'
    '<h2>Why Nakupko</h2><p>We built Nakupko because we were tired of digging for the list in the middle of a store and forgetting things. '
    'We wanted a list that is there when you need it, that you can share with your household and that helps with cooking.</p>'
    '<h2>What you will find here</h2><ul><li>A <a href="/?lang=en#orodja">web shopping list</a> with no sign-up, sent to your phone with a QR code.</li>'
    f'<li><a href="/en/recipe/">{len(jedi)} recipes</a> with ingredients scaled to the number of people.</li>'
    '<li>The Nakupko app for <a href="https://apps.apple.com/si/app/nakupko/id6818745132">iPhone</a> and <a href="https://play.google.com/store/apps/details?id=si.nakupko.app">Android</a>.</li></ul>'
    '<h2>How our content is made</h2><p>Recipes are prepared by the Nakupko team and checked so the amounts make sense for 4 people and the steps are clear. We do not publish prices. If you spot a mistake, write to us.</p>'
    '<h2>Company</h2><p>REMAKO d.o.o.<br>Ljubljanska cesta 63, 2327 Rače, Slovenia<br>VAT ID: SI45736901<br>'
    'Email: <a href="mailto:support@remako.si">support@remako.si</a><br>Web: <a href="https://remako.si">remako.si</a></p>',
    alt="/o-nas.html", on="about"))

# ---------------------------------------------------------------- sitemap
static = ["/", "/recepti.html", "/o-nas.html", "/about.html", "/podpora.html", "/support.html",
          "/zasebnost.html", "/privacy.html", "/pogoji.html", "/terms.html"]
sm = "".join(f"<url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod></url>\n" for u in static + urls)
write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{sm}</urlset>\n')
print(f"recepti: {len(jedi)} × 2, vodnik: {len(guides)}, sitemap: {len(static) + len(urls)} naslovov")
