// Nakupko · skupno za vse strani: jezik, navigacija, pojavljanje, ozadje, prikaz aplikacije
(function () {
  var root = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // jezik
  function setLang(l) {
    root.lang = l;
    document.getElementById("lang").textContent = l === "sl" ? "EN" : "SL";
    document.querySelectorAll("#gal img").forEach(function (im) { im.src = "img/" + l + "-" + im.dataset.n + ".webp"; });
    try { localStorage.setItem("lang", l); } catch (e) { /* nič */ }
  }
  var saved = null;
  try { saved = localStorage.getItem("lang"); } catch (e) { /* nič */ }
  var start = new URLSearchParams(location.search).get("lang") || saved || ((navigator.language || "sl").slice(0, 2) === "sl" ? "sl" : "en");

  // galerija in ticker
  var gal = document.getElementById("gal"), gh = "";
  if (gal) {
    for (var r = 0; r < 6; r++) for (var i = 1; i <= 4; i++) gh += '<img data-n="' + i + '" alt="" loading="lazy">';
    gal.innerHTML = gh;
  }
  var words = ["Hofer", "Lidl", "Spar", "Mercator", "Tuš", "Jager", "Eurospin", "Baby Center", "OBI", "Bauhaus", "Merkur", "Mr. Pet"];
  if (document.getElementById("tick")) document.getElementById("tick").innerHTML = words.concat(words, words, words).map(function (w) { return "<span>" + w + "</span>"; }).join("");
  var st1 = document.querySelector(".stores[data-src]") || document.querySelector(".hero-grid .stores");
  if (document.getElementById("stores2") && st1) document.getElementById("stores2").innerHTML = st1.innerHTML;

  setLang(start);
  document.getElementById("lang").onclick = function () { setLang(root.lang === "sl" ? "en" : "sl"); };

  // navigacija
  var nav = document.getElementById("nav");
  function onScroll() { nav.classList.toggle("solid", scrollY > 30); }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // pojavljanje + števci
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.querySelectorAll(".cu").forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: .15 });
  document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
  function countUp(el) {
    var to = +el.dataset.to, t0 = null;
    if (reduce || !to) { el.textContent = to.toLocaleString(root.lang === "en" ? "en-US" : "sl-SI"); return; }
    requestAnimationFrame(function f(t) {
      t0 = t0 || t; var k = Math.min(1, (t - t0) / 1400); k = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * k).toLocaleString(root.lang === "en" ? "en-US" : "sl-SI");
      if (k < 1) requestAnimationFrame(f);
    });
  }

  // svetlobni sij za korake
  document.querySelectorAll(".step").forEach(function (s) {
    s.addEventListener("pointermove", function (e) {
      var b = s.getBoundingClientRect();
      s.style.setProperty("--mx", (e.clientX - b.left) + "px"); s.style.setProperty("--my", (e.clientY - b.top) + "px");
    });
  });

  // nagib telefona
  var dev = document.getElementById("device");
  if (dev && !reduce && matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", function (e) {
      var x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      dev.style.transform = "rotateY(" + (x * 14) + "deg) rotateX(" + (-y * 10) + "deg)";
    });
  }

  // tok delcev v ozadju (REMAKO)
  var cv = document.getElementById("flow"), cx = cv && cv.getContext("2d"), W, H, P = [], dpr = Math.min(2, devicePixelRatio || 1);
  var cols = ["167,139,250", "236,72,153", "245,158,11", "139,92,246"];
  function size() {
    W = cv.width = cv.offsetWidth * dpr; H = cv.height = cv.offsetHeight * dpr;
    P = []; var n = Math.min(900, Math.round(W * H / (9000 * dpr)));
    for (var i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, c: cols[i % 4], l: Math.random() * 200 });
    cx.fillStyle = "#07060b"; cx.fillRect(0, 0, W, H);
  }
  if (cv) { size(); addEventListener("resize", size); }
  var tt = 0, mx = -1e4, my = -1e4, heroOn = true;
  addEventListener("pointermove", function (e) { mx = e.clientX * dpr; my = e.clientY * dpr; });
  if (cv) new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting; }).observe(cv);
  function flow() {
    requestAnimationFrame(flow);
    if (!heroOn) return;
    tt += .0016;
    cx.fillStyle = "rgba(7,6,11,.09)"; cx.fillRect(0, 0, W, H);
    for (var i = 0; i < P.length; i++) {
      var p = P[i], s = .0016 / dpr;
      var a = Math.sin(p.x * s + tt) * 1.6 + Math.cos(p.y * s * 1.3 - tt * 1.4) * 1.6;
      var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (d2 < 22000 * dpr * dpr) a += Math.atan2(dy, dx) * .9;
      var ox = p.x, oy = p.y;
      p.x += Math.cos(a) * 1.3 * dpr; p.y += Math.sin(a) * 1.3 * dpr; p.l--;
      if (p.l < 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) { p.x = Math.random() * W; p.y = Math.random() * H; p.l = 120 + Math.random() * 200; continue; }
      cx.strokeStyle = "rgba(" + p.c + ",.5)"; cx.lineWidth = dpr;
      cx.beginPath(); cx.moveTo(ox, oy); cx.lineTo(p.x, p.y); cx.stroke();
    }
  }
  if (cv && !reduce) flow();

  // živ prikaz aplikacije
  var ITEMS = [["milk-carton", "Mleko", "Milk"], ["bread", "Kruh", "Bread"], ["egg", "Jajca", "Eggs"], ["banana", "Banane", "Bananas"], ["tomato", "Paradižnik", "Tomatoes"], ["cheese-wedge", "Sir", "Cheese"]];
  var NEW = ["butter", "Maslo", "Butter"];
  var MORE = [["red-apple", "Jabolka", "Apples"], ["carrot", "Korenje", "Carrots"]];
  function row(it, cls) {
    return '<div class="it ' + (cls || "") + '"><img src="img/i/' + it[0] + '.svg" alt=""><span class="nm2"><span data-sl>' + it[1] + '</span><span data-en>' + it[2] + '</span></span><span class="ck"></span></div>';
  }
  var $ = function (id) { return document.getElementById(id); };
  var timers = [];
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function type(word, cb) {
    var el = $("typ"), i = 0; el.classList.add("typing"); el.textContent = "";
    (function step() { el.textContent = word.slice(0, ++i); if (i < word.length) setTimeout(step, 110); else setTimeout(cb, 350); })();
  }
  function resetTyp() { var el = $("typ"); el.classList.remove("typing"); el.innerHTML = '<span data-sl>Kaj moraš kupiti?</span><span data-en>What do you need?</span>'; }
  function prog(n, all) {
    $("bar").style.width = (n / all * 100) + "%";
    $("prog").innerHTML = '<span data-sl>' + n + ' od ' + all + ' v košarici</span><span data-en>' + n + ' of ' + all + ' in basket</span>';
  }
  function clock() { var d = new Date(); $("clock").textContent = d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); }
  if (!dev) return;
  clock(); setInterval(clock, 30000);
  function loop() {
    timers.forEach(clearTimeout); timers = [];
    $("vHome").classList.remove("off"); $("vStore").classList.add("off");
    $("notif").classList.remove("on"); $("sheet").classList.remove("on"); $("doneAll").classList.remove("on");
    $("homeList").innerHTML = ITEMS.slice(0, 5).map(function (x) { return row(x); }).join("") + row(NEW, "new");
    $("cnt").textContent = "5"; resetTyp();
    if (reduce) return;
    at(1200, function () {
      type(root.lang === "sl" ? NEW[1] : NEW[2], function () {
        resetTyp(); $("cnt").textContent = "6";
        var n = $("homeList").querySelector(".new"); if (n) n.classList.remove("new");
      });
    });
    at(3800, function () { $("notif").classList.add("on"); });
    at(6000, function () {
      $("notif").classList.remove("on");
      var all = ITEMS.slice(0, 5).concat([NEW], MORE);
      $("storeList").innerHTML = all.map(function (x) { return row(x); }).join("");
      prog(0, all.length);
      $("vHome").classList.add("off"); $("vStore").classList.remove("off");
      var rows = $("storeList").querySelectorAll(".it");
      [0, 2, 1, 4].forEach(function (k, j) { at(7000 + j * 900, function () { rows[k].classList.add("done"); prog(j + 1, all.length); }); });
      at(10800, function () { $("sheet").classList.add("on"); });
      at(13200, function () { $("sheet").classList.remove("on"); });
      at(13800, function () { rows[3].classList.add("done"); prog(5, all.length); });
      at(14300, function () { rows[5].classList.add("done"); prog(6, all.length); });
      at(14800, function () { rows[6].classList.add("done"); rows[7].classList.add("done"); prog(8, all.length); });
      at(15500, function () { $("doneAll").classList.add("on"); });
    });
    at(18200, loop);
  }
  loop();
})();
