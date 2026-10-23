// Nakupko · orodja: seznam, recepti, QR, okvirno najceneje, odprte trgovine
(function () {
  var root = document.documentElement;
  var L = function () { return root.lang === "en" ? "en" : "sl"; };
  var T = function (sl, en) { return L() === "en" ? en : sl; };
  var $ = function (id) { return document.getElementById(id); };
  var norm = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var LIVE = "https://myedgeofficial.github.io/nakupko/";
  var CHAINS = { mercator: ["Mercator", "#e30613"], spar: ["Spar", "#00843d"], tus: ["Tuš", "#0055a5"], lidl: ["Lidl", "#0050aa"], eurospin: ["Eurospin", "#1d3c8f"], hofer: ["Hofer", "#00a0e2"], jager: ["Jager", "#c8102e"] };
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("on"); }, 2200); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  // zavihki
  document.querySelectorAll("[data-tool]").forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll("[data-tool]").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); $(x.dataset.tool).hidden = x !== b; });
      $(b.dataset.tool).classList.add("in");
    };
  });

  // ---------- seznam ----------
  var CAT = [], BY = {}, CATS = [];
  var CAT_EN = { "Sadje in zelenjava": "Fruit & veg", "Mlečni izdelki": "Dairy", "Meso in ribe": "Meat & fish", "Kruh in pecivo": "Bakery", "Shramba": "Pantry", "Pijače": "Drinks", "Prigrizki": "Snacks", "Zamrznjeno": "Frozen", "Gospodinjstvo": "Household", "Higiena": "Hygiene", "Brez glutena": "Gluten free", "Ljubljenčki": "Pets", "Otroci": "Kids", "Zdravje": "Health", "Športna prehrana": "Sports nutrition", "Dom in vrt": "Home & garden", "Drugo": "Other" };
  var list = store("nk-web-list") || [];
  var U = { g: ["g", "g"], kg: ["kg", "kg"], ml: ["ml", "ml"], l: ["l", "l"], kos: ["kos", "pc"], strok: ["str.", "clove"], "žlica": ["žl.", "tbsp"], "žlička": ["žlič.", "tsp"], "šopek": ["šop.", "bunch"], list: ["list.", "leaf"], "pločevinka": ["ploč.", "can"], kozarec: ["koz.", "jar"], vrečka: ["vreč.", "bag"], rezina: ["rez.", "slice"], zavitek: ["zav.", "pack"] };
  function scaleAmt(a, u, f) {
    if (!a) return null; var v = a * f;
    if (u === "kg") { v *= 1000; u = "g"; } if (u === "l") { v *= 1000; u = "ml"; }
    if (u === "g" || u === "ml") v = v < 100 ? Math.ceil(v / 5) * 5 : Math.ceil(v / 10) * 10;
    else v = Math.max(1, Math.ceil(v * 2 - 0.25) / 2);
    return [v, u];
  }
  function fmtAmt(m) {
    if (!m) return "";
    return Object.keys(m).map(function (u) {
      var v = m[u], uu = u;
      if (u === "g" && v >= 1000) { v = v / 1000; uu = "kg"; } if (u === "ml" && v >= 1000) { v = v / 1000; uu = "l"; }
      var n = (Math.round(v * 10) / 10).toString().replace(".", L() === "en" ? "." : ",");
      return n + " " + (U[uu] ? U[uu][L() === "en" ? 1 : 0] : uu);
    }).join(" + ");
  }
  function save() { store("nk-web-list", list); push(); }
  function find(name) { return BY[norm(name)]; }
  function add(name, quiet, amt) {
    name = String(name || "").trim(); if (!name) return false;
    var p = find(name), key = norm(p ? p[0] : name);
    var ex = list.filter(function (x) { return norm(x.n) === key && !x.d; })[0];
    if (ex) {
      if (amt) { ex.m = ex.m || {}; ex.m[amt[1]] = (ex.m[amt[1]] || 0) + amt[0]; save(); return true; }
      if (!quiet) toast(T("Že na seznamu", "Already on the list")); return false;
    }
    var it = { id: uid(), n: p ? p[0] : name.charAt(0).toUpperCase() + name.slice(1), d: false };
    if (amt) { it.m = {}; it.m[amt[1]] = amt[0]; }
    list.push(it); save(); return true;
  }
  function nameOf(n) { var p = find(n); return L() === "en" && p ? p[1] : n; }
  function icon(n) { var p = find(n); return "img/i/" + (p ? p[3] : "shopping-cart") + ".svg"; }
  function render() {
    var open = list.filter(function (x) { return !x.d; }).length;
    $("wlCount").textContent = open;
    $("wlIn").placeholder = T("Kaj moraš kupiti? npr. mleko", "What do you need? e.g. milk");
    $("wlActs").hidden = !list.length;
    if (!list.length) { $("wlList").innerHTML = '<div class="empty"><i>🧺</i>' + T("Seznam je prazen. Dodaj izdelek ali izberi jed.", "Your list is empty. Add an item or pick a dish.") + "</div>"; cheap(); qr(); recipes(); pill(); moji(); return; }
    var groups = {};
    list.forEach(function (x, i) { var p = find(x.n), c = p ? p[2] : "Drugo"; (groups[c] = groups[c] || []).push(i); });
    var order = CATS.concat(["Drugo"]).filter(function (c) { return groups[c]; });
    $("wlList").innerHTML = order.map(function (c) {
      return '<div class="wcat">' + esc(L() === "en" ? (CAT_EN[c] || c) : c) + '</div><div class="wgrp">' + groups[c].map(function (i) {
        var x = list[i];
        return '<div class="wrow' + (x.d ? " done" : "") + '" data-i="' + i + '"><img src="' + icon(x.n) + '" alt=""><span class="nm">' + esc(nameOf(x.n)) + '</span>' + (x.m ? '<span class="q">' + esc(fmtAmt(x.m)) + '</span>' : '') + '<button class="ck" type="button" aria-label="' + T("Kupljeno", "Bought") + '"></button><button class="x" type="button" aria-label="' + T("Odstrani", "Remove") + '">×</button></div>';
      }).join("") + "</div>";
    }).join("");
    cheap(); qr(); recipes(); pill(); moji();
  }
  $("wlList").onclick = function (e) {
    var r = e.target.closest(".wrow"); if (!r) return; var i = +r.dataset.i;
    if (e.target.classList.contains("x")) list.splice(i, 1); else list[i].d = !list[i].d;
    save(); render();
  };
  function enc(x) { var a = x.m ? Object.keys(x.m).map(function (u) { return x.m[u] + " " + u; }).join("+") : ""; return x.n + (a ? "~" + a : ""); }
  function openItems() { return list.filter(function (x) { return !x.d; }); }
  function link() { return "https://nakupko.com/#s=" + openItems().map(function (x) { return encodeURIComponent(enc(x)); }).join("|"); }
  function appLink() { return "nakupko://dodaj?i=" + encodeURIComponent(openItems().map(enc).join("|")); }
  function text() {
    return T("🛒 Nakupovalni seznam:", "🛒 Shopping list:") + "\n" + list.filter(function (x) { return !x.d; }).map(function (x) { return "• " + nameOf(x.n) + (x.m ? " (" + fmtAmt(x.m) + ")" : ""); }).join("\n") + "\n\n" + T("Odpri seznam: ", "Open the list: ") + link();
  }
  $("wlShare").onclick = function () {
    if (navigator.share) navigator.share({ title: "Nakupko", text: text() }).catch(function () {});
    else copy(link());
  };
  function copy(s) { (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(function () { toast(T("Kopirano ✓", "Copied ✓")); }, function () { prompt("", s); }); }
  $("wlCopy").onclick = function () { copy(text()); };
  $("wlDone").onclick = function () { list = list.filter(function (x) { return !x.d; }); save(); render(); };
  $("wlClear").onclick = function () { if (confirm(T("Pobrišem cel seznam?", "Clear the whole list?"))) { list = []; save(); render(); } };

  // predlogi
  var sel = -1, hits = [];
  function suggest() {
    var q = norm($("wlIn").value), box = $("sugg"); sel = -1;
    if (q.length < 1) { box.hidden = true; return; }
    hits = CAT.filter(function (p) { return p.k.indexOf(q) === 0 || p.ke.indexOf(q) === 0; })
      .concat(CAT.filter(function (p) { return p.k.indexOf(q) > 0 || p.ke.indexOf(q) > 0; })).slice(0, 6);
    if (!hits.length) { box.hidden = true; return; }
    box.innerHTML = hits.map(function (p, i) {
      return '<button type="button" data-i="' + i + '"><img src="img/i/' + p.p[3] + '.svg" alt="">' + esc(L() === "en" ? p.p[1] : p.p[0]) + "<small>" + esc(L() === "en" ? (CAT_EN[p.p[2]] || p.p[2]) : p.p[2]) + "</small></button>";
    }).join("");
    box.hidden = false;
  }
  function pick(i) { if (add(hits[i].p[0])) render(); $("wlIn").value = ""; $("sugg").hidden = true; $("wlIn").focus(); }
  $("wlIn").oninput = suggest;
  $("wlIn").onkeydown = function (e) {
    var box = $("sugg"); if (box.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length;
      box.querySelectorAll("button").forEach(function (b, i) { b.classList.toggle("act", i === sel); });
    } else if (e.key === "Escape") box.hidden = true;
  };
  $("sugg").onmousedown = function (e) { var b = e.target.closest("button"); if (b) { e.preventDefault(); pick(+b.dataset.i); } };
  $("wlForm").onsubmit = function (e) {
    e.preventDefault();
    if (!$("sugg").hidden && sel >= 0) return pick(sel);
    var v = $("wlIn").value, p = find(v) || (hits[0] && norm(L() === "en" ? hits[0].p[1] : hits[0].p[0]) === norm(v) ? hits[0].p : null);
    if (add(p ? p[0] : v)) render();
    $("wlIn").value = ""; $("sugg").hidden = true;
  };
  document.addEventListener("click", function (e) { if (!e.target.closest(".wl-add")) $("sugg").hidden = true; });

  // ---------- recepti ----------
  var REC = null, rt = null, rd = null, rm = null;
  var CASI = [["t20", 0, 20, "Do 20 minut", "Up to 20 minutes", "Ko se mudi", "When you're in a hurry"],
    ["t45", 21, 45, "Do 45 minut", "Up to 45 minutes", "Za vsak dan", "For every day"],
    ["t90", 46, 90, "Do ure in pol", "Up to 1½ hours", "Ko imaš malo več časa", "When you have a bit more time"],
    ["tvec", 91, 9999, "Več kot ura in pol", "Over 1½ hours", "Za vikend in praznike", "For weekends and holidays"]];
  var TEZ = [[1, "Enostavno", "Easy", "Zmore vsak", "Anyone can do it"], [2, "Srednje", "Medium", "Nekaj izkušenj", "Some experience"], [3, "Zahtevno", "Challenging", "Za prave kuharje", "For real cooks"]];
  function ico(k) { return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ((window.IKONE_JEDI || {})[k] || "") + "</svg>"; }
  function mins(m) { if (m < 60) return m + " min"; var h = Math.floor(m / 60), r = m % 60; return h + " h" + (r ? " " + r + " min" : ""); }
  function dots(n) { return '<span class="dots">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= n ? "on" : "") + '"></i>'; }).join("") + "</span>"; }
  function tezName(n) { var t = TEZ[n - 1]; return L() === "en" ? t[2] : t[1]; }
  function casOf(r) { return CASI.filter(function (c) { return r[3] >= c[1] && r[3] <= c[2]; })[0][0]; }
  function pool(t, d, m) { return REC.jedi.map(function (r, i) { return i; }).filter(function (i) { var r = REC.jedi[i]; return (!t || t === "vse" || casOf(r) === t) && (!d || d === "vse" || r[4] === d) && (!m || r[5] === m); }); }
  function cards(ids) {
    return '<div class="rgrid">' + ids.map(function (i, k) {
      var r = REC.jedi[i], has = r[6].every(function (x) { return list.some(function (y) { return norm(y.n) === norm(x[0]) && !y.d; }); });
      return '<button type="button" class="rc' + (has ? " added" : "") + '" data-i="' + i + '" style="animation-delay:' + Math.min(k, 14) * .03 + 's"><span class="ic">' + ico(r[0]) + '</span><span><b>' + esc(L() === "en" ? r[2] : r[1]) + '</b><span class="meta">' + mins(r[3]) + dots(r[4]) + "</span></span></button>";
    }).join("") + "</div>";
  }
  function step(k, h, body, skip) { return '<div class="rstep"><span class="k">' + k + "</span><h3>" + h + "</h3>" + body + (skip ? '<button type="button" class="rskip" data-skip="1">' + skip + "</button>" : "") + "</div>"; }
  function recipes() {
    if (!REC || !$("rflow")) return;
    $("rq").placeholder = T(innerWidth < 520 ? "Poišči jed ali sestavino" : "Poišči jed ali sestavino, npr. piscanec …", innerWidth < 520 ? "Search a dish or ingredient" : "Search a dish or ingredient, e.g. chicken …");
    var q = norm($("rq").value), words = q.split(" ").filter(Boolean), h = "", en = L() === "en";
    if (words.length) {
      var mapa = {}; REC.mape.forEach(function (m) { mapa[m[0]] = m; });
      var res = REC.jedi.map(function (r, i) { return i; }).filter(function (i) {
        var r = REC.jedi[i];
        var hay = r.hay || (r.hay = norm([r[1], r[2], mapa[r[5]][1], mapa[r[5]][2]].concat(r[6].map(function (x) { var p = find(x[0]); return x[0] + " " + (p ? p[1] : ""); })).join(" ")));
        return words.every(function (w) { return hay.indexOf(w.length >= 6 ? w.slice(0, -2) : w) >= 0; });
      });
      h = step(T("Iskanje", "Search"), res.length + " " + T(res.length === 1 ? "jed" : res.length === 2 ? "jedi" : "jedi", res.length === 1 ? "dish" : "dishes"), res.length ? cards(res) : '<p class="rnone">' + T("Ni zadetkov. Poskusi z drugo besedo, npr. »testenine« ali »juha«.", "No matches. Try another word, e.g. »pasta« or »soup«.") + "</p>");
      $("rflow").innerHTML = h; return;
    }
    var cr = [];
    if (rt) cr.push(["t", rt === "vse" ? T("Ves čas", "Any time") : (function () { var c = CASI.filter(function (c) { return c[0] === rt; })[0]; return en ? c[4] : c[3]; })()]);
    if (rd) cr.push(["d", rd === "vse" ? T("Vsa zahtevnost", "Any level") : tezName(rd)]);
    if (rm) cr.push(["m", REC.mape.filter(function (m) { return m[0] === rm; })[0][en ? 2 : 1]]);
    if (cr.length) h += '<div class="rcrumbs">' + cr.map(function (c) { return '<button type="button" data-back="' + c[0] + '">' + esc(c[1]) + "</button>"; }).join("") + "</div>";
    if (!rt) {
      h += step(T("Korak 1 od 3", "Step 1 of 3"), T("Koliko časa imaš?", "How much time do you have?"), '<div class="ropts">' + CASI.map(function (c, k) {
        var n = pool(c[0]).length;
        return '<button type="button" class="ropt" data-t="' + c[0] + '" style="animation-delay:' + k * .05 + 's"><b>' + (en ? c[4] : c[3]) + "</b><span>" + (en ? c[6] : c[5]) + "</span><small>" + n + T(" jedi", " dishes") + "</small></button>";
      }).join("") + "</div>", T("Vseeno mi je, pokaži vse", "I don't mind, show everything"));
    } else if (!rd) {
      h += step(T("Korak 2 od 3", "Step 2 of 3"), T("Kako zahtevno naj bo?", "How challenging?"), '<div class="ropts">' + TEZ.map(function (t, k) {
        var n = pool(rt, t[0]).length; if (!n) return "";
        return '<button type="button" class="ropt" data-d="' + t[0] + '" style="animation-delay:' + k * .05 + 's">' + dots(t[0]) + "<b>" + (en ? t[2] : t[1]) + "</b><span>" + (en ? t[4] : t[3]) + "</span><small>" + n + T(" jedi", " dishes") + "</small></button>";
      }).join("") + "</div>", T("Vseeno, pokaži vse", "Doesn't matter, show all"));
    } else if (!rm) {
      h += step(T("Korak 3 od 3", "Step 3 of 3"), T("Na kaj imaš danes apetit?", "What are you in the mood for?"), '<div class="rfold">' + REC.mape.map(function (m, k) {
        var ids = pool(rt, rd, m[0]); if (!ids.length) return "";
        var seen = {}, ics = ids.map(function (i) { return REC.jedi[i][0]; }).filter(function (x) { return seen[x] ? false : (seen[x] = 1); }).slice(0, 3);
        return '<button type="button" class="rf" data-m="' + m[0] + '" style="animation-delay:' + k * .04 + 's"><span class="ics">' + ics.map(ico).join("") + "</span><b>" + esc(en ? m[2] : m[1]) + "</b><span>" + ids.length + T(ids.length === 1 ? " jed" : " jedi", ids.length === 1 ? " dish" : " dishes") + "</span></button>";
      }).join("") + "</div>");
    } else {
      var mm = REC.mape.filter(function (m) { return m[0] === rm; })[0];
      h += step(T("Izberi jed", "Pick a dish"), esc(en ? mm[2] : mm[1]), cards(pool(rt, rd, rm)));
    }
    $("rflow").innerHTML = h;
  }
  if ($("rflow")) $("rflow").onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.i) { cur = REC.jedi[+b.dataset.i]; off = {}; drawModal(); $("rmodal").hidden = false; document.body.style.overflow = "hidden"; return; }
    if (b.dataset.t) rt = b.dataset.t; else if (b.dataset.d) rd = +b.dataset.d; else if (b.dataset.m) rm = b.dataset.m;
    else if (b.dataset.skip) { if (!rt) rt = "vse"; else rd = "vse"; }
    else if (b.dataset.back) { var k = b.dataset.back; if (k === "t") { rt = rd = rm = null; } else if (k === "d") { rd = rm = null; } else rm = null; }
    recipes();
    var top = $("jedi").getBoundingClientRect().top; if (top < 0) $("jedi").scrollIntoView({ behavior: "smooth" });
  };
  if ($("rq")) $("rq").oninput = recipes;
  var cur = null, servings = store("nk-osebe") || 4, off = {};
  function drawModal() {
    var r = cur, f = servings / 4;
    $("rmEm").innerHTML = ico(r[0]); $("rmTitle").textContent = L() === "en" ? r[2] : r[1];
    $("rmMeta").textContent = mins(r[3]) + " · " + tezName(r[4]) + " · " + r[6].length + T(" sestavin", " ingredients");
    $("rmN").textContent = servings;
    $("rmList").innerHTML = r[6].map(function (g, i) {
      var a = scaleAmt(g[1], g[2], f), m = {}; if (a) m[a[1]] = a[0];
      return '<div class="rmi' + (off[i] ? "" : " on") + '" data-i="' + i + '"><span class="cb"></span><img src="' + icon(g[0]) + '" alt=""><span class="nm">' + esc(nameOf(g[0])) + '</span><span class="am">' + (a ? esc(fmtAmt(m)) : T("po okusu", "to taste")) + "</span></div>";
    }).join("");
    var n = r[6].filter(function (g, i) { return !off[i]; }).length;
    $("rmAdd").textContent = T("Dodaj na seznam (" + n + ")", "Add to list (" + n + ")");
    $("rmAdd").disabled = !n;
  }
  function closeModal() { $("rmodal").hidden = true; document.body.style.overflow = ""; }
  if ($("rmClose")) $("rmClose").onclick = closeModal;
  if ($("rmodal")) $("rmodal").onclick = function (e) { if (e.target === this) closeModal(); };
  addEventListener("keydown", function (e) { if (e.key === "Escape" && $("rmodal") && !$("rmodal").hidden) closeModal(); });
  if ($("rmMinus")) $("rmMinus").onclick = function () { servings = Math.max(1, servings - 1); store("nk-osebe", servings); drawModal(); };
  if ($("rmPlus")) $("rmPlus").onclick = function () { servings = Math.min(20, servings + 1); store("nk-osebe", servings); drawModal(); };
  if ($("rmList")) $("rmList").onclick = function (e) { var r = e.target.closest(".rmi"); if (!r) return; off[+r.dataset.i] = !off[+r.dataset.i]; drawModal(); };
  if ($("rmAdd")) $("rmAdd").onclick = function () {
    var n = 0, f = servings / 4;
    cur[6].forEach(function (g, i) { if (off[i]) return; if (add(g[0], true, scaleAmt(g[1], g[2], f))) n++; });
    saveMoj(cur[1], servings);
    closeModal(); render();
    toast(T("Na seznam dodano: " + n + " sestavin za " + servings + (servings === 1 ? " osebo" : servings === 2 ? " osebi" : servings < 5 ? " osebe" : " oseb"), "Added " + n + " ingredients for " + servings));
    var pl = $("lpill"); if (pl) { pl.classList.remove("bump"); void pl.offsetWidth; pl.classList.add("bump"); }
  };
  // ---------- kuhanje po korakih ----------
  // »Moji recepti«: jedi, ki si jih dal na seznam. Po nakupu jih najdeš nad seznamom in kuhaš po korakih.
  function saveMoj(name, os) {
    var m = (store("nk-moji") || []).filter(function (x) { return x.n !== name; });
    m.unshift({ n: name, o: os, t: Date.now() }); store("nk-moji", m.slice(0, 6));
  }
  function moji() {
    var box = $("wlMoji"); if (!box) return;
    var m = (store("nk-moji") || []).filter(function (x) { return !REC || byName(x.n) >= 0; });
    box.hidden = !m.length; if (!m.length) return;
    box.innerHTML = '<span class="mk">' + T("Tvoji recepti", "Your recipes") + "</span>" + m.map(function (x, k) {
      var r = REC && REC.jedi[byName(x.n)], nm = r ? (L() === "en" ? r[2] : r[1]) : x.n;
      return '<span class="mj" role="button" tabindex="0" data-k="' + k + '">' + esc(nm) + "<b>" + T("Kuhaj ›", "Cook ›") + '</b><button type="button" class="mx" data-x="' + k + '" aria-label="' + T("Odstrani", "Remove") + '">×</button></span>';
    }).join("");
  }
  function byName(n) { if (!REC) return -1; for (var i = 0; i < REC.jedi.length; i++) if (REC.jedi[i][1] === n) return i; return -1; }
  if ($("wlMoji")) $("wlMoji").onclick = function (e) {
    var m = store("nk-moji") || [], x = e.target.closest("[data-x]");
    if (x) { m.splice(+x.dataset.x, 1); store("nk-moji", m); moji(); return; }
    var c = e.target.closest("[data-k]"); if (!c) return; var it = m[+c.dataset.k];
    if ($("kuhaj")) cook(byName(it.n), it.o); else location.href = "recepti.html#kuhaj=" + encodeURIComponent(it.n);
  };
  var ck = null, ckStep = 0, ckOs = 4, wake = null;
  function cook(i, os) {
    if (!$("kuhaj") || !REC || !REC.jedi[i]) return;
    ck = REC.jedi[i]; ckStep = 0; ckOs = os || servings;
    closeModal(); $("kuhaj").hidden = false; document.body.style.overflow = "hidden";
    // zaslon naj med kuhanjem ne ugasne
    try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(function (w) { wake = w; }).catch(function () {}); } catch (e) {}
    drawCook();
  }
  function drawCook() {
    var en = L() === "en", st = ck[7][en ? 1 : 0], n = st.length, fin = ckStep >= n, f = ckOs / 4;
    $("khName").textContent = en ? ck[2] : ck[1];
    $("khCnt").textContent = fin ? "✓" : (ckStep + 1) + " / " + n;
    $("khBar").style.width = (fin ? 100 : (ckStep + 1) / n * 100) + "%";
    $("khK").textContent = fin ? "" : T("Korak " + (ckStep + 1) + " od " + n, "Step " + (ckStep + 1) + " of " + n);
    $("khStep").textContent = fin ? T("Dober tek!", "Enjoy your meal!") : st[ckStep];
    $("khStep").classList.toggle("fin", fin);
    $("khOs").textContent = "(" + ckOs + (en ? (ckOs === 1 ? " person" : " people") : (ckOs === 1 ? " oseba" : ckOs === 2 ? " osebi" : ckOs < 5 ? " osebe" : " oseb")) + ")";
    $("khIng").innerHTML = ck[6].map(function (g) { var a = scaleAmt(g[1], g[2], f), m = {}; if (a) m[a[1]] = a[0]; return "<p>" + esc(nameOf(g[0])) + "<span>" + (a ? esc(fmtAmt(m)) : T("po okusu", "to taste")) + "</span></p>"; }).join("");
    $("khPrev").disabled = ckStep === 0;
    $("khNext").textContent = fin ? T("Končano ✓", "Done ✓") : ckStep === n - 1 ? T("Zadnji korak ✓", "Last step ✓") : T("Naprej ›", "Next ›");
  }
  function closeCook() { $("kuhaj").hidden = true; document.body.style.overflow = ""; if (wake) { wake.release().catch(function () {}); wake = null; } }
  function cookMove(d) {
    var n = ck[7][0].length;
    if (d > 0 && ckStep >= n) { store("nk-moji", (store("nk-moji") || []).filter(function (x) { return x.n !== ck[1]; })); moji(); closeCook(); return; }
    ckStep = Math.max(0, Math.min(n, ckStep + d)); drawCook();
  }
  if ($("kuhaj")) {
    $("khX").onclick = closeCook;
    $("khPrev").onclick = function () { cookMove(-1); };
    $("khNext").onclick = function () { cookMove(1); };
    $("rmCook").onclick = function () { cook(REC.jedi.indexOf(cur), servings); };
    addEventListener("keydown", function (e) { if ($("kuhaj").hidden) return; if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); cookMove(1); } else if (e.key === "ArrowLeft") cookMove(-1); else if (e.key === "Escape") closeCook(); });
    var sx = null;
    $("kuhaj").addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    $("kuhaj").addEventListener("touchend", function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 60) cookMove(dx < 0 ? 1 : -1); });
  }
  function openRecipe(i) { if (!$("rmodal") || !REC || !REC.jedi[i]) return; cur = REC.jedi[i]; off = {}; drawModal(); $("rmodal").hidden = false; document.body.style.overflow = "hidden"; }
  // trakovi: zgoraj zajtrki, v sredini kosila, spodaj večerje; vrstni red je vsakič naključen
  var ZAJTRK_SLADKO = ["Palačinke", "Mlečni riž s cimetom", "Francoski rogljički doma", "Bananin kruh", "Vaflji", "Domači kruh", "Sadna solata", "Ocvrte miške", "Kruh z ajdovo moko"];
  var OBROK = [
    function (r) { return r[5] === "zajtrk" || ZAJTRK_SLADKO.indexOf(r[1]) >= 0; },
    function (r) { return ["juhe", "meso", "klasika", "ribe", "zar"].indexOf(r[5]) >= 0; },
    function (r) { return ["testenine", "svet", "zelenjava", "solate"].indexOf(r[5]) >= 0; }
  ];
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // predlog dneva in trak jedi (recepti.html, prva stran)
  function extras() {
    var day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5), en = L() === "en";
    var pick = REC.jedi.map(function (r, i) { return i; }).filter(function (i) { return REC.jedi[i][3] <= 60; });
    var di = pick[(day * 37) % pick.length], box = $("dnevni");
    if (box) {
      var r = REC.jedi[di];
      box.dataset.i = di;
      box.innerHTML = '<span class="dk">' + T("Predlog dneva", "Dish of the day") + '</span><span class="dic">' + ico(r[0]) + "</span><b>" + esc(en ? r[2] : r[1]) + '</b><span class="dm">' + mins(r[3]) + " · " + tezName(r[4]) + " · " + r[6].length + T(" sestavin", " ingredients") + '</span><span class="dgo">' + T("Poglej recept", "View recipe") + " →</span>";
    }
    obroki();
  }
  // Zajtrk, kosilo, večerja: po 4 naključne jedi, gumb »Druge jedi« pokaže nove (brez premikanja).
  function obroki() {
    var box = $("obroki"); if (!box) return;
    var en = L() === "en", out = $("rmodal") ? "button" : "a";
    var NAMES = [["Zajtrk", "Breakfast"], ["Kosilo", "Lunch"], ["Večerja", "Dinner"]];
    box.innerHTML = NAMES.map(function (n, k) {
      var ids = shuffle(REC.jedi.map(function (r, i) { return i; }).filter(function (i) { return OBROK[k](REC.jedi[i]); })).slice(0, 4);
      return '<div class="ob"><h3>' + n[en ? 1 : 0] + "</h3>" + ids.map(function (i) {
        var r = REC.jedi[i];
        return "<" + out + (out === "a" ? ' href="recepti.html#r=' + i + '"' : ' type="button"') + ' class="obj" data-r="' + i + '"><span class="oi">' + ico(r[0]) + "</span><span><b>" + esc(en ? r[2] : r[1]) + "</b><small>" + mins(r[3]) + "</small></span></" + out + ">";
      }).join("") + "</div>";
    }).join("") + '<button type="button" class="ob-more" id="obMore">↻ ' + T("Druge jedi", "Other dishes") + "</button>";
    $("obMore").onclick = obroki;
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#dnevni, .obroki button[data-r]"); if (!b) return;
    openRecipe(+(b.dataset.i || b.dataset.r));
  });
  if ($("rflow") || $("obroki")) fetch("data/recepti.json").then(function (r) { return r.json(); }).then(function (d) {
    REC = d; recipes(); extras();
    var m = location.hash.match(/^#r=(\d+)$/); if (m) { openRecipe(+m[1]); history.replaceState(null, "", location.pathname + location.search); }
    var kh = location.hash.match(/^#kuhaj=(.+)$/); if (kh) { var mj = (store("nk-moji") || []).filter(function (x) { return x.n === decodeURIComponent(kh[1]); })[0]; cook(byName(decodeURIComponent(kh[1])), mj && mj.o); history.replaceState(null, "", location.pathname + location.search); }
    moji();
  });

  // plavajoča košarica na telefonu
  var seeKuh = false, seePanel = false;
  function pill() {
    if (!$("lpill")) return; var n = openItems().length; $("lpillN").textContent = n; var on = innerWidth <= 900 && seeKuh && !seePanel && n > 0; $("lpill").classList.toggle("on", on); document.body.classList.toggle("pill-on", on); }
  if ($("jedi")) new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.target.id === "jedi") seeKuh = x.isIntersecting; else seePanel = x.isIntersecting; }); pill(); }).observe($("jedi"));
  if ($("lpill")) new IntersectionObserver(function (es) { seePanel = es[0].isIntersecting; pill(); }).observe($("wlPanel"));
  if ($("lpill")) $("lpill").onclick = function () { $("wlPanel").scrollIntoView({ behavior: "smooth", block: "start" }); };

  // gumb na telefonu: odpre Nakupko in poveže ta seznam s seznamom v aplikaciji
  $("wlApp").onclick = function (e) {
    e.preventDefault();
    var t = setTimeout(function () { if (!document.hidden) { toast(T("Nimaš še Nakupka? Prenesi ga brezplačno.", "Don't have Nakupko yet? Get it for free.")); $("prenos").scrollIntoView({ behavior: "smooth" }); } }, 1800);
    addEventListener("pagehide", function () { clearTimeout(t); }, { once: true });
    document.addEventListener("visibilitychange", function () { if (document.hidden) clearTimeout(t); }, { once: true });
    if (SYNC) { location.href = "nakupko://dodaj"; return; }
    listenPair(); location.href = "nakupko://povezi?k=" + pair();
  };
  if ($("qrApp")) $("qrApp").onclick = $("wlApp").onclick;

  // ---------- QR koda: poveži s telefonom ----------
  function qr() {
    var box = $("qr"), side = $("qrSide"); if (!box) return;
    if (SYNC) {
      side.classList.add("linked");
      box.innerHTML = '<div class="linked-ok"><b>✓</b><strong>' + T("Povezano s telefonom", "Linked to your phone") + "</strong><span>" + T("Kar dodaš tukaj, se takoj pokaže v aplikaciji Nakupko. In obratno.", "Whatever you add here shows up in the Nakupko app right away. And the other way round.") + '</span><button type="button" id="unlink">' + T("Odklopi", "Unlink") + "</button></div>";
      $("unlink").onclick = unlink;
      return;
    }
    side.classList.remove("linked");
    if (!window.qrcode) { box.innerHTML = ""; return; }
    var q = window.qrcode(0, "M"); q.addData(pairUrl()); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }
  addEventListener("load", qr);

  // ---------- okvirno najceneje (brez cen) ----------
  var PRICES = null;
  function cheap() {
    var box = $("cheap"); if (!box) return;
    var open = list.filter(function (x) { return !x.d; });
    if (!PRICES || open.length < 2) { box.hidden = true; return; }
    var rows = open.map(function (x) { return PRICES[norm(x.n)]; }).filter(Boolean);
    if (rows.length < 2) { box.hidden = true; return; }
    var chains = {};
    rows.forEach(function (r) { Object.keys(r).forEach(function (c) { chains[c] = (chains[c] || 0) + 1; }); });
    var ok = Object.keys(chains).filter(function (c) { return chains[c] >= Math.ceil(rows.length * .6); });
    if (ok.length < 2) { box.hidden = true; return; }
    var cost = {};
    ok.forEach(function (c) {
      cost[c] = rows.reduce(function (a, r) { var mx = Math.max.apply(null, Object.keys(r).map(function (k) { return r[k]; })); return a + (r[c] != null ? r[c] : mx); }, 0);
    });
    var best = ok.sort(function (a, b) { return cost[a] - cost[b]; })[0], ch = CHAINS[best] || [best, "#6d28d9"];
    box.innerHTML = '<span class="lg" style="background:' + ch[1] + '">' + esc(ch[0].charAt(0)) + '</span><div><b>' + T("Okvirno najceneje: ", "Roughly cheapest: ") + esc(ch[0]) + "</b><span>" +
      T("Ocena za " + rows.length + " izdelkov s seznama. Le okvirna ocena; velja cena v trgovini.", "Estimate for " + rows.length + " items on your list. A rough estimate only; the store price applies.") + "</span></div>";
    box.hidden = false;
  }
  fetch(LIVE + "prices.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
    PRICES = {};
    d.izdelki.forEach(function (x) { if (!x.znamka) PRICES[norm(x.ime)] = x.cene; });
    cheap();
  }).catch(function () {});

  // ---------- prazniki in nedelje ----------
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, da);
  }
  function holidays(y) {
    var e = easter(y), add = function (n) { return new Date(y, e.getMonth(), e.getDate() + n); };
    return [[new Date(y, 0, 1), "Novo leto", "New Year"], [new Date(y, 0, 2), "Novo leto", "New Year"], [new Date(y, 1, 8), "Prešernov dan", "Prešeren Day"],
      [e, "Velika noč", "Easter Sunday"], [add(1), "Velikonočni ponedeljek", "Easter Monday"], [new Date(y, 3, 27), "Dan upora proti okupatorju", "Resistance Day"],
      [new Date(y, 4, 1), "Praznik dela", "Labour Day"], [new Date(y, 4, 2), "Praznik dela", "Labour Day"], [add(49), "Binkošti", "Whit Sunday"],
      [new Date(y, 5, 25), "Dan državnosti", "Statehood Day"], [new Date(y, 7, 15), "Marijino vnebovzetje", "Assumption Day"], [new Date(y, 9, 31), "Dan reformacije", "Reformation Day"],
      [new Date(y, 10, 1), "Dan spomina na mrtve", "Remembrance Day"], [new Date(y, 11, 25), "Božič", "Christmas"], [new Date(y, 11, 26), "Dan samostojnosti in enotnosti", "Independence Day"]];
  }
  var dkey = function (d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };
  function holidayOn(d) { var k = dkey(d); return holidays(d.getFullYear()).filter(function (h) { return dkey(h[0]) === k; })[0] || null; }
  function closedDay(d) { return d.getDay() === 0 || !!holidayOn(d); }
  function upcoming() {
    var now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return holidays(now.getFullYear()).concat(holidays(now.getFullYear() + 1)).filter(function (h) { return h[0] >= t0 && h[0].getDay() !== 0; }).slice(0, 4);
  }
  function today() {
    var now = new Date(), h = holidayOn(now), box = $("todayBox");
    if (!box) return;
    var fmt = function (d) { return d.toLocaleDateString(L() === "en" ? "en-GB" : "sl-SI", { weekday: "long", day: "numeric", month: "long" }); };
    var head = closedDay(now)
      ? '<b class="tc">' + T("Danes so trgovine večinoma zaprte", "Most stores are closed today") + "</b><span>" + (h ? esc(L() === "en" ? h[2] : h[1]) + ". " : T("Nedelja. ", "Sunday. ")) + T("Odprte so lahko bencinske črpalke in manjše trgovine.", "Petrol stations and small shops may be open.") + "</span>"
      : '<b class="to">' + T("Danes so trgovine odprte", "Stores are open today") + "</b><span>" + T("Ob nedeljah in praznikih je večina trgovin zaprta.", "Most stores close on Sundays and public holidays.") + "</span>";
    box.innerHTML = head + '<div class="hol"><small>' + T("Prihodnji prazniki, ko so trgovine zaprte", "Upcoming holidays, stores closed") + "</small>" +
      upcoming().map(function (x) { return "<div><span>" + esc(fmt(x[0])) + "</span><b>" + esc(L() === "en" ? x[2] : x[1]) + "</b></div>"; }).join("") + "</div>";
  }

  // ---------- odprte trgovine v bližini ----------
  var DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  function parseHours(h) {
    var week = [[], [], [], [], [], [], []];
    String(h || "").split(";").forEach(function (part) {
      part = part.trim(); var m = part.match(/^([A-Za-z,\- ]+?)\s+(off|closed|[\d:,\- ]+)$/); if (!m) return;
      var days = [];
      m[1].split(",").forEach(function (seg) {
        var r = seg.trim().split("-"), a = DAYS.indexOf(r[0]), b = DAYS.indexOf(r[1] || r[0]);
        if (a < 0 || b < 0) return; for (var i = a; ; i = (i + 1) % 7) { days.push(i); if (i === b) break; }
      });
      var spans = m[2] === "off" || m[2] === "closed" ? [] : m[2].split(",").map(function (s) {
        var t = s.trim().split("-").map(function (x) { var p = x.split(":"); return +p[0] * 60 + +(p[1] || 0); }); return t;
      });
      days.forEach(function (d) { week[d] = spans; });
    });
    return week;
  }
  var hm = function (min) { return Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0"); };
  function status(h) {
    var w = parseHours(h), now = new Date(), d = now.getDay(), t = now.getHours() * 60 + now.getMinutes();
    if (!closedDay(now)) for (var i = 0; i < w[d].length; i++) if (t >= w[d][i][0] && t < w[d][i][1]) return { open: true, txt: T("Odprto · zapre ob ", "Open · closes at ") + hm(w[d][i][1]) };
    for (var k = 0; k < 8; k++) {
      var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k), dd = day.getDay();
      if (closedDay(day)) continue;
      var sp = w[dd].filter(function (s) { return k > 0 || s[0] > t; })[0];
      if (sp) return { open: false, txt: T("Zaprto · odpre ", "Closed · opens ") + (k === 0 ? T("danes ob ", "today at ") : k === 1 ? T("jutri ob ", "tomorrow at ") : day.toLocaleDateString(L() === "en" ? "en-GB" : "sl-SI", { weekday: "long" }) + T(" ob ", " at ")) + hm(sp[0]) };
    }
    return { open: false, txt: T("Zaprto", "Closed") };
  }
  function dist(a, b, c, d) { var R = 6371e3, r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.sqrt(x * x + y * y) * R; }
  var STORES = null, POS = null;
  function loadStores() {
    if (STORES) return Promise.resolve(STORES);
    var conv = function (d) { return (STORES = d.trgovine.map(function (x) { return Array.isArray(x) ? x : [x.v, x.lat, x.lon, x.h]; })); };
    return fetch(LIVE + "hours.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(conv)
      .catch(function () { return fetch("data/trgovine.json").then(function (r) { return r.json(); }).then(conv); });
  }
  function showNear() {
    if (!POS || !STORES) return;
    var near = STORES.map(function (s) { return { s: s, d: dist(POS[0], POS[1], s[1], s[2]) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 8);
    $("nearBox").hidden = true; $("nearNote").hidden = false;
    $("nearList").innerHTML = near.map(function (x, i) {
      var c = CHAINS[x.s[0]] || [x.s[0], "#6d28d9"], st = status(x.s[3]);
      var km = x.d < 1000 ? Math.round(x.d / 10) * 10 + " m" : (x.d / 1000).toFixed(1).replace(".", L() === "en" ? "." : ",") + " km";
      return '<div class="srow" style="animation-delay:' + (i * .06) + 's"><span class="lg" style="background:' + c[1] + '">' + esc(c[0].charAt(0)) + '</span><div class="inf"><b>' + esc(c[0]) + " · " + km +
        '</b><span class="st ' + (st.open ? "o" : "c") + '">' + esc(st.txt) + '</span></div><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + x.s[1] + "," + x.s[2] + '">' + T("Pot", "Route") + " →</a></div>";
    }).join("");
  }
  if ($("nearBtn")) $("nearBtn").onclick = function () {
    var b = this; b.disabled = true;
    if (!navigator.geolocation) { toast(T("Brskalnik ne podpira lokacije", "Location not supported")); b.disabled = false; return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      POS = [p.coords.latitude, p.coords.longitude];
      loadStores().then(showNear).catch(function () { toast(T("Trgovin ni bilo mogoče naložiti", "Could not load stores")); b.disabled = false; });
    }, function () { toast(T("Dovoli dostop do lokacije", "Please allow location access")); b.disabled = false; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  };

  // ---------- isti seznam kot v aplikaciji (skupni seznam Nakupka) ----------
  // QR vsebuje parno kodo. Aplikacija na /h/{par}/link zapiše kodo svojega seznama,
  // splet se nato poveže na /h/{koda}/items, tako kot drug telefon v skupnem seznamu.
  var DB = "https://nakupko-8ad19-default-rtdb.europe-west1.firebasedatabase.app";
  var SYNC = store("nk-sync"), shared = null, esItems = null, esPair = null, pairTimer = 0;
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pair() {
    var k = store("nk-pair");
    if (!k || k.length !== 10) { var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = new Uint32Array(10); crypto.getRandomValues(b); k = ""; for (var i = 0; i < 10; i++) k += a[b[i] % a.length]; store("nk-pair", k); }
    return k;
  }
  function pairUrl() { return "https://nakupko.com/povezi.html#k=" + pair(); }
  function listenPair() {
    if (SYNC || esPair || !window.EventSource) return;
    var k = pair();
    esPair = new EventSource(DB + "/h/" + k + "/link.json");
    esPair.addEventListener("put", function (e) {
      var m; try { m = JSON.parse(e.data); } catch (x) { return; }
      var c = m && m.data && (m.path === "/" ? m.data.c : null);
      if (!c || !/^[A-Z0-9]{10}$/.test(c)) return;
      stopPair(); SYNC = { c: c }; store("nk-sync", SYNC); store("nk-pair", null);
      fetch(DB + "/h/" + k + ".json", { method: "DELETE" }).catch(function () {});
      shared = null; connectItems();
      toast(T("✓ Povezano s telefonom", "✓ Linked to your phone"));
    });
    clearTimeout(pairTimer); pairTimer = setTimeout(stopPair, 15 * 60000);
  }
  function stopPair() { if (esPair) { esPair.close(); esPair = null; } clearTimeout(pairTimer); }
  function toWeb(o) { return { id: o.id, n: o.name, d: !!o.done, m: o.amt || undefined, o: o }; }
  function fromShared() {
    list = Object.keys(shared).map(function (id) { return shared[id]; }).filter(function (o) { return o && o.id && o.name; })
      .sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }).map(toWeb);
    store("nk-web-list", list);
  }
  function toApp(x) {
    var p = find(x.n), o = JSON.parse(JSON.stringify(x.o || { id: x.id, brand: "", qty: 1, cat: p ? p[2] : "Drugo", addedAt: Date.now() }));
    o.id = x.id; o.name = x.n; o.done = !!x.d;
    if (x.m && Object.keys(x.m).length) o.amt = x.m; else delete o.amt;
    if (o.done && !o.doneAt) o.doneAt = Date.now(); if (!o.done) delete o.doneAt;
    return o;
  }
  function push() {
    if (!SYNC || !shared) return;
    var patch = {}, n = 0, seen = {};
    list.forEach(function (x) {
      if (!x.id) x.id = uid();
      seen[x.id] = 1; var o = toApp(x);
      if (JSON.stringify(o) !== JSON.stringify(shared[x.id])) { patch[x.id] = o; shared[x.id] = o; x.o = o; n++; }
    });
    Object.keys(shared).forEach(function (id) { if (!seen[id]) { patch[id] = null; delete shared[id]; n++; } });
    store("nk-web-list", list);
    if (n) fetch(DB + "/h/" + SYNC.c + "/items.json", { method: "PATCH", body: JSON.stringify(patch) }).catch(function () { toast(T("Ni povezave. Poskusi znova.", "No connection. Try again.")); });
  }
  function connectItems() {
    var merge = true;
    if (!SYNC || !window.EventSource) return;
    if (esItems) esItems.close();
    esItems = new EventSource(DB + "/h/" + SYNC.c + "/items.json");
    function on(kind) {
      return function (e) {
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (!m) return;
        var parts = m.path.split("/").filter(Boolean);
        if (!parts.length) {
          if (kind === "put" || !shared) shared = m.data || {};
          else Object.keys(m.data || {}).forEach(function (id) { if (m.data[id] === null) delete shared[id]; else shared[id] = m.data[id]; });
        } else if (shared) {
          var id = parts[0];
          if (parts.length === 1) { if (m.data === null) delete shared[id]; else shared[id] = m.data; }
          else if (shared[id]) { if (m.data === null) delete shared[id][parts[1]]; else shared[id][parts[1]] = m.data; }
        }
        if (!shared) return;
        if (merge) {
          // zraven gre tudi to, kar je bilo dodano samo na spletu (še ni bilo poslano)
          merge = false;
          var mine = list.filter(function (x) { return !x.o && !x.d && !Object.keys(shared).some(function (id) { var o = shared[id]; return o && !o.done && norm(o.name) === norm(x.n); }); });
          fromShared(); mine.forEach(function (x) { x.o = null; if (!x.id || shared[x.id]) x.id = uid(); list.push(x); }); push();
        } else fromShared();
        render();
      };
    }
    esItems.addEventListener("put", on("put"));
    esItems.addEventListener("patch", on("patch"));
  }
  function unlink() {
    if (esItems) esItems.close(); esItems = null; SYNC = null; shared = null; store("nk-sync", null);
    list.forEach(function (x) { delete x.o; }); store("nk-web-list", list);
    render(); listenPair();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (esItems) { esItems.close(); esItems = null; } stopPair(); }
    else if (SYNC) { connectItems(); } else if (seeQr) listenPair();
  });
  // parno kodo poslušamo samo, ko je QR na zaslonu (ali po pritisku na gumb)
  var seeQr = false;
  if ($("qr") && window.IntersectionObserver) new IntersectionObserver(function (es) { seeQr = es[0].isIntersecting; if (seeQr) listenPair(); }).observe($("qr"));
  if (SYNC) connectItems();

  // ---------- zagon ----------
  fetch("data/katalog.json").then(function (r) { return r.json(); }).then(function (k) {
    k.forEach(function (p) {
      BY[norm(p[0])] = p; BY[norm(p[1])] = BY[norm(p[1])] || p;
      CAT.push({ p: p, k: norm(p[0]), ke: norm(p[1]) });
      if (CATS.indexOf(p[2]) < 0) CATS.push(p[2]);
    });
    var m = location.hash.match(/^#s=(.*)$/);
    if (m) {
      var n = 0; m[1].split("|").map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } }).forEach(function (x) {
        var parts = x.split("~"), nm = parts[0], ok = false;
        if (parts[1]) parts[1].split("+").forEach(function (a) { var t = a.trim().split(" "); if (+t[0] && t[1]) { if (add(nm, true, [+t[0], t[1]])) ok = true; } });
        else ok = add(nm, true);
        if (ok) n++;
      });
      fromLink = true;
      history.replaceState(null, "", location.pathname + location.search);
      setTimeout(function () { var tel = matchMedia("(pointer: coarse)").matches; $(tel ? "wlPanel" : "orodja").scrollIntoView(); toast(tel ? T("Seznam odprt. Pritisni »Dodaj v Nakupko«.", "List opened. Tap »Add to Nakupko«.") : T("Seznam odprt ✓", "List opened ✓")); }, 400);
    }
    render();
  });
  var fromLink = false;
  function all() { recipes(); render(); today(); showNear(); if ($("rmodal") && !$("rmodal").hidden) drawModal(); if ($("kuhaj") && !$("kuhaj").hidden) drawCook(); if (REC) extras(); }
  new MutationObserver(all).observe(root, { attributes: true, attributeFilter: ["lang"] });
  recipes(); today();
})();
