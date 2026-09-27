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
     Divers
     ------------------------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
