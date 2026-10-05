/* Nouha Smaali — interactions du site (sans dépendance) */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     Scroll fluide vers une ancre de la page
     ------------------------------------------------------------------ */
  function scrollToTarget(target) {
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    // Déplace le focus pour les lecteurs d'écran / clavier sans re-scroller
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }

  function samePageTarget(link) {
    var href = link.getAttribute("href");
    if (!href || href.indexOf("#") === -1) return null;
    var url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname) return null;
    if (!url.hash || url.hash === "#") return null;
    return document.getElementById(decodeURIComponent(url.hash.slice(1)));
  }

  /* ------------------------------------------------------------------
     Menu plein écran
     ------------------------------------------------------------------ */
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");
  var lastFocus = null;

  function focusables() {
    var list = [burger].concat(
      Array.prototype.slice.call(menu.querySelectorAll("a[href], button:not([disabled])"))
    );
    return list.filter(function (el) { return el.offsetParent !== null || el === burger; });
  }

  function openMenu() {
    lastFocus = document.activeElement;
    root.classList.add("menu-open");
    menu.removeAttribute("inert");
    menu.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Fermer le menu");
    var first = menu.querySelector(".menu__link");
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 250);
  }

  function closeMenu(restoreFocus) {
    root.classList.remove("menu-open");
    menu.setAttribute("inert", "");
    menu.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Ouvrir le menu");
    if (restoreFocus !== false && lastFocus) lastFocus.focus({ preventScroll: true });
  }

  if (burger && menu) {
    burger.addEventListener("click", function () {
      if (root.classList.contains("menu-open")) closeMenu();
      else openMenu();
    });

    document.addEventListener("keydown", function (e) {
      if (!root.classList.contains("menu-open")) return;
      if (e.key === "Escape") { closeMenu(); return; }
      if (e.key === "Tab") {
        var items = focusables();
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    menu.addEventListener("click", function (e) {
      var link = e.target.closest("a");
      if (!link) return;
      var target = samePageTarget(link);
      if (target) {
        e.preventDefault();
        closeMenu(false);
        history.pushState(null, "", "#" + target.id);
        // on laisse le panneau se refermer avant de défiler
        setTimeout(function () { scrollToTarget(target); }, reduceMotion ? 0 : 380);
        if (target.id === "rendez-vous") loadCalendly();
      } else {
        closeMenu(false);
      }
    });
  }

  /* Liens d'ancre de la page (hors menu) : scroll fluide + chargement Calendly */
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[href*='#']");
    if (!link || (menu && menu.contains(link))) return;
    var target = samePageTarget(link);
    if (!target) return;
    e.preventDefault();
    if (target.id === "rendez-vous") loadCalendly();
    history.pushState(null, "", "#" + target.id);
    scrollToTarget(target);
  });

  /* ------------------------------------------------------------------
     Apparition au scroll
     ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ------------------------------------------------------------------
     Calendly intégré (chargé à l'approche de la section)
     ------------------------------------------------------------------ */
  var calendlyLoaded = false;
  var widgets = document.querySelectorAll(".calendly-inline-widget");

  function markLoaded(widget) {
    if (widget.querySelector("iframe")) widget.classList.add("is-loaded");
  }

  function loadCalendly() {
    if (calendlyLoaded || !widgets.length) return;
    calendlyLoaded = true;

    widgets.forEach(function (widget) {
      new MutationObserver(function () { markLoaded(widget); })
        .observe(widget, { childList: true, subtree: true });
    });

    var s = document.createElement("script");
    s.src = "https://assets.calendly.com/assets/external/widget.js";
    s.async = true;
    s.onload = function () {
      // Le script initialise les widgets présents ; filet de sécurité sinon.
      setTimeout(function () {
        widgets.forEach(function (widget) {
          if (!widget.querySelector("iframe") && window.Calendly) {
            window.Calendly.initInlineWidget({
              url: widget.getAttribute("data-url"),
              parentElement: widget,
              resize: true
            });
          }
        });
      }, 400);
    };
    s.onerror = function () {
      widgets.forEach(function (widget) {
        var p = widget.querySelector(".calendly-placeholder p");
        if (p) p.textContent = "Le calendrier n'a pas pu se charger. Utilise le lien ci-dessous pour réserver.";
        var loader = widget.querySelector(".loader");
        if (loader) loader.remove();
      });
    };
    document.body.appendChild(s);
  }

  if (widgets.length) {
    if ("IntersectionObserver" in window) {
      var cio = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) {
          loadCalendly();
          cio.disconnect();
        }
      }, { rootMargin: "1200px 0px" });
      widgets.forEach(function (w) { cio.observe(w); });
    } else {
      loadCalendly();
    }
    // Arrivée directe sur /#rendez-vous
    if (window.location.hash === "#rendez-vous") loadCalendly();
  }

  /* ------------------------------------------------------------------
     Lecteurs audio (play/pause + waveform cliquable)
     ------------------------------------------------------------------ */
  var players = [];

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  // Générateur pseudo-aléatoire déterministe pour une waveform stable
  function seeded(seed) {
    var x = seed || 7;
    return function () {
      x = (x * 16807) % 2147483647;
      return (x - 1) / 2147483646;
    };
  }

  function fakePeaks(n, seed) {
    var rand = seeded(seed);
    var peaks = [];
    for (var i = 0; i < n; i++) {
      var env = 0.55 + 0.45 * Math.sin((i / n) * Math.PI);
      peaks.push(Math.max(0.12, Math.min(1, (0.25 + rand() * 0.75) * env)));
    }
    return peaks;
  }

  function realPeaks(url, n) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || !window.fetch) return Promise.reject();
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
      .then(function (buf) {
        var ctx = new Ctx();
        return new Promise(function (res, rej) { ctx.decodeAudioData(buf, res, rej); })
          .then(function (audio) { if (ctx.close) ctx.close(); return audio; });
      })
      .then(function (audio) {
        var data = audio.getChannelData(0);
        var size = Math.floor(data.length / n);
        var peaks = [];
        var max = 0;
        for (var i = 0; i < n; i++) {
          var sum = 0;
          for (var j = 0; j < size; j++) sum += Math.abs(data[i * size + j]);
          var v = sum / size;
          peaks.push(v);
          if (v > max) max = v;
        }
        return peaks.map(function (p) { return Math.max(0.1, max ? p / max : 0.1); });
      });
  }

  document.querySelectorAll("[data-audio]").forEach(function (el, idx) {
    var audio = el.querySelector("audio");
    var btn = el.querySelector(".audio__play");
    var wave = el.querySelector(".audio__wave");
    var time = el.querySelector(".audio__time");
    var bars = parseInt(el.getAttribute("data-bars"), 10) || 44;
    var seed = parseInt(el.getAttribute("data-seed"), 10) || idx + 3;

    function draw(peaks) {
      wave.innerHTML = "";
      peaks.forEach(function (p) {
        var b = document.createElement("i");
        b.style.setProperty("--h", p.toFixed(3));
        wave.appendChild(b);
      });
      paint();
    }

    function paint() {
      var ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      var list = wave.children;
      var cut = Math.round(ratio * list.length);
      for (var i = 0; i < list.length; i++) list[i].classList.toggle("is-played", i < cut);
      time.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration || parseFloat(el.getAttribute("data-duration")) || 0);
      wave.setAttribute("aria-valuenow", Math.round(ratio * 100));
      wave.setAttribute("aria-valuetext", fmt(audio.currentTime));
    }

    draw(fakePeaks(bars, seed));
    // Waveform réelle calculée à partir du fichier quand c'est possible
    realPeaks(audio.currentSrc || audio.getAttribute("src"), bars).then(draw).catch(function () {});

    btn.addEventListener("click", function () {
      if (audio.paused) {
        players.forEach(function (a) { if (a !== audio) a.pause(); });
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        audio.pause();
      }
    });

    audio.addEventListener("play", function () { el.classList.add("is-playing"); btn.setAttribute("aria-label", "Mettre en pause"); });
    audio.addEventListener("pause", function () { el.classList.remove("is-playing"); btn.setAttribute("aria-label", btn.getAttribute("data-label")); });
    audio.addEventListener("ended", function () { audio.currentTime = 0; paint(); });
    audio.addEventListener("timeupdate", paint);
    audio.addEventListener("loadedmetadata", paint);
    btn.setAttribute("data-label", btn.getAttribute("aria-label"));

    function seekFromEvent(e) {
      var rect = wave.getBoundingClientRect();
      var ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      if (audio.duration) { audio.currentTime = ratio * audio.duration; paint(); }
    }
    var dragging = false;
    wave.addEventListener("pointerdown", function (e) {
      dragging = true;
      wave.setPointerCapture(e.pointerId);
      seekFromEvent(e);
    });
    wave.addEventListener("pointermove", function (e) { if (dragging) seekFromEvent(e); });
    wave.addEventListener("pointerup", function () { dragging = false; });
    wave.addEventListener("keydown", function (e) {
      if (!audio.duration) return;
      if (e.key === "ArrowRight") { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); e.preventDefault(); }
      if (e.key === "ArrowLeft") { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
      if (e.key === " " || e.key === "Enter") { btn.click(); e.preventDefault(); }
      paint();
    });

    players.push(audio);
  });

  /* ------------------------------------------------------------------
     Modal vidéo
     ------------------------------------------------------------------ */
  var modal = document.getElementById("video-modal");
  if (modal && typeof modal.showModal === "function") {
    var frame = modal.querySelector(".video-modal__frame");
    var caption = modal.querySelector(".video-modal__caption");
    var closeBtn = modal.querySelector(".video-modal__close");

    function cleanup() {
      frame.querySelectorAll("video, iframe").forEach(function (n) {
        if (n.pause) n.pause();
        n.remove();
      });
    }

    document.querySelectorAll("[data-video], [data-embed]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        cleanup();
        var node;
        var embed = trigger.getAttribute("data-embed");
        if (embed) {
          node = document.createElement("iframe");
          node.src = embed;
          node.allow = "autoplay; fullscreen; picture-in-picture";
          node.allowFullscreen = true;
          node.title = trigger.getAttribute("data-title") || "Vidéo";
        } else {
          node = document.createElement("video");
          node.src = trigger.getAttribute("data-video");
          node.controls = true;
          node.autoplay = true;
          node.playsInline = true;
          if (trigger.hasAttribute("data-portrait")) node.classList.add("is-portrait");
          var poster = trigger.querySelector("img");
          if (poster) node.poster = poster.currentSrc || poster.src;
        }
        frame.appendChild(node);
        caption.textContent = trigger.getAttribute("data-title") || "";
        players.forEach(function (a) { a.pause(); });
        modal.showModal();
        closeBtn.focus();
      });
    });

    closeBtn.addEventListener("click", function () { modal.close(); });
    modal.addEventListener("close", cleanup);
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.close(); });
  }

  /* ------------------------------------------------------------------
     Trait fin qui traverse le site (home)
     Le tracé est calculé à partir de la mise en page réelle : il passe
     dans les espaces entre les mots du hero, puis descend dans les marges
     latérales et change de côté dans les espaces entre les sections.
     ------------------------------------------------------------------ */
  var thread = document.getElementById("page-thread");
  if (thread) {
    var drawn = {};
    var threadTimer = null;

    var box = function (el) {
      var r = el.getBoundingClientRect();
      return { l: r.left + window.scrollX, r: r.right + window.scrollX, t: r.top + window.scrollY, b: r.bottom + window.scrollY };
    };
    var f = function (n) { return Math.round(n * 10) / 10; };
    var tw = function (k) { return document.querySelector('[data-tw="' + k + '"]'); };
    var isDark = function (el) {
      var c = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (!c || (c[3] !== undefined && +c[3] === 0)) return false;
      return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) < 110;
    };
    // vertical run with a gentle sway, from (x, y0) to (x, y1)
    var run = function (x, y0, y1, sway) {
      var n = Math.max(1, Math.round((y1 - y0) / 420));
      var d = "", step = (y1 - y0) / n;
      for (var i = 0; i < n; i++) {
        var a = y0 + step * i, b = a + step, s = (i % 2 ? -1 : 1) * sway;
        d += " C" + f(x + s) + "," + f(a + step / 3) + " " + f(x - s) + "," + f(a + 2 * step / 3) + " " + f(x) + "," + f(b);
      }
      return d;
    };

    var buildThread = function () {
      var hero = document.querySelector(".hero2");
      var words = ["deviens", "evidence", "esprit", "des", "personnes"].map(tw);
      if (!hero || words.some(function (w) { return !w; }) || window.innerWidth < 768) {
        thread.style.display = "none";
        return;
      }
      thread.style.display = "";
      thread.innerHTML = "";

      var vw = document.documentElement.clientWidth;
      var cont = hero.querySelector(".container");
      var cs = getComputedStyle(cont), cb = box(cont);
      var cL = cb.l + parseFloat(cs.paddingLeft), cR = cb.r - parseFloat(cs.paddingRight);
      var gut = { L: cL / 2, R: cR + (vw - cR) / 2 };
      var sway = Math.min(14, cL / 4);

      var dv = box(words[0]), ev = box(words[1]), es = box(words[2]), de = box(words[3]), pe = box(words[4]);
      var title = box(hero.querySelector(".hero2__title"));
      var aside = box(hero.querySelector(".hero2__aside"));
      var pitch = box(hero.querySelector(".hero2__pitch"));
      var proof = box(hero.querySelector(".proof"));
      var heroB = box(hero).b;

      // 1. Hero: entre « Deviens » et « l'évidence », puis à gauche de « dans l'esprit »
      var x1 = (dv.r + ev.l) / 2;
      var gap1 = ev.l - dv.r;
      var xL = Math.max(cL * 0.6, (cL + de.l) / 2);          // à gauche de « des »
      if (de.l - cL < 40) xL = gut.L;
      var d = "M" + f(x1) + ",0";
      d += " C" + f(x1 + gap1 * 0.28) + "," + f(dv.t * 0.45) + " " + f(x1 - gap1 * 0.3) + "," + f(dv.t * 0.9) + " " + f(x1) + "," + f((dv.t + dv.b) / 2);
      // petite boucle dans l'espace entre les deux mots
      var lr = Math.min(gap1 * 0.3, 34);
      d += " C" + f(x1) + "," + f(dv.b) + " " + f(x1 + lr) + "," + f(dv.b - lr) + " " + f(x1 + lr * 0.4) + "," + f(dv.b - lr * 1.4);
      d += " C" + f(x1 - lr * 0.6) + "," + f(dv.b - lr * 1.9) + " " + f(x1 - lr) + "," + f(dv.b) + " " + f(x1) + "," + f(dv.b + 4);
      // descente en diagonale dans le vide à gauche de « dans l'esprit », jusqu'à gauche de « des »
      var esH = es.b - es.t;
      var yRow3 = es.b - esH * 0.12;
      d += " C" + f(x1) + "," + f(dv.b + (es.b - dv.b) * 0.45) + " " + f(xL) + "," + f(es.t + esH * 0.35) + " " + f(xL) + "," + f(yRow3);

      // 2. Sous le titre : vers l'espace entre le paragraphe et la preuve sociale
      var below = Math.max(title.b, aside.b > title.b ? aside.b : 0);
      var topBottom = Math.min(pitch.t, proof.t);
      var yM = (below + topBottom) / 2;
      var sideBySide = proof.l - pitch.r > 50 && proof.t < pitch.b;
      var xG = sideBySide ? (pitch.r + proof.l) / 2 : gut.L;
      d += run(xL, yRow3, yM - 30, 0);
      d += " C" + f(xL) + "," + f(yM) + " " + f(xG) + "," + f(yM) + " " + f(xG) + "," + f(yM + 30);

      // 3. Sections suivantes : descente dans les marges, changement de côté entre deux sections
      var sections = Array.prototype.slice.call(document.querySelectorAll("main > section")).filter(function (s) { return s !== hero; });
      var footer = document.querySelector(".site-footer");
      if (footer) sections.push(footer);

      var segs = [{ d: d, el: hero }];
      var x = xG, y = yM + 30, side = "L", h = 56;
      sections.forEach(function (sec, i) {
        var yb = box(sec).t, xb = gut[side];
        segs[segs.length - 1].d += run(x, y, yb - h, x === xG ? 0 : sway);
        // courbe en S coupée à la frontière (moitié dans chaque section)
        segs[segs.length - 1].d += " C" + f(x) + "," + f(yb - h / 2) + " " + f((3 * x + xb) / 4) + "," + f(yb - h / 4) + " " + f((x + xb) / 2) + "," + f(yb);
        segs.push({ d: "M" + f((x + xb) / 2) + "," + f(yb) + " C" + f((x + 3 * xb) / 4) + "," + f(yb + h / 4) + " " + f(xb) + "," + f(yb + h / 2) + " " + f(xb) + "," + f(yb + h), el: sec });
        x = xb; y = yb + h; side = side === "L" ? "R" : "L";
      });
      var last = segs[segs.length - 1];
      last.d += run(x, y, box(last.el).b - 2, sway);

      var maxB = box(last.el).b;
      thread.setAttribute("width", vw);
      thread.setAttribute("height", Math.ceil(maxB));
      thread.style.height = Math.ceil(maxB) + "px";

      segs.forEach(function (sg, i) {
        var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", sg.d);
        p.setAttribute("pathLength", "1");
        p.setAttribute("stroke", isDark(sg.el) ? "rgba(254, 250, 224, 0.75)" : "rgba(30, 59, 39, 0.8)");
        p.dataset.seg = i;
        if (drawn[i] || reduceMotion) p.classList.add("is-drawn");
        thread.appendChild(p);
        sg.p = p;
      });

      // dessin progressif : chaque morceau se trace quand sa section entre à l'écran
      if ("IntersectionObserver" in window) {
        var tio = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            segs.forEach(function (sg, i) {
              if (sg.el === en.target && !drawn[i]) {
                drawn[i] = true;
                requestAnimationFrame(function () { sg.p.classList.add("is-drawn"); });
              }
            });
            tio.unobserve(en.target);
          });
        }, { rootMargin: "0px 0px -15% 0px" });
        segs.forEach(function (sg, i) { if (!drawn[i]) tio.observe(sg.el); });
      } else {
        segs.forEach(function (sg) { sg.p.classList.add("is-drawn"); });
      }
    };

    var scheduleThread = function (delay) {
      clearTimeout(threadTimer);
      threadTimer = setTimeout(buildThread, delay || 150);
    };
    scheduleThread(60);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleThread(60); });
    window.addEventListener("load", function () { scheduleThread(60); });
    setTimeout(function () { scheduleThread(0); }, 1400); // après les apparitions du hero
    window.addEventListener("resize", function () { scheduleThread(200); });
    if ("ResizeObserver" in window) {
      var lastH = 0;
      new ResizeObserver(function () {
        var hgt = document.querySelector("main").offsetHeight;
        if (Math.abs(hgt - lastH) > 4) { lastH = hgt; scheduleThread(250); }
      }).observe(document.querySelector("main"));
    }
  }

  /* ------------------------------------------------------------------
     Divers
     ------------------------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
