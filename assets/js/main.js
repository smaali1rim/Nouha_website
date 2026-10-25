/* Nouha Smaali — interactions du site (sans dépendance) */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Photos des témoignages : conserver les initiales si la photo est absente. */
  document.querySelectorAll("[data-avatar-photo]").forEach(function (photo) {
    function showInitials() { photo.hidden = true; }
    photo.addEventListener("error", showInitials);
    if (photo.complete && photo.naturalWidth === 0) showInitials();
  });

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

  // Intégration directe en iframe (sans le script widget.js de Calendly) :
  // rien à bloquer pour les bloqueurs de pub, hauteur fixe et défilement
  // à l'intérieur du cadre, donc aucune étape (créneaux, formulaire) n'est coupée.
  function loadCalendly() {
    if (calendlyLoaded || !widgets.length) return;
    calendlyLoaded = true;

    widgets.forEach(function (widget) {
      var url;
      try { url = new URL(widget.getAttribute("data-url")); } catch (e) { return; }
      url.searchParams.set("embed_domain", window.location.host || "localhost");
      url.searchParams.set("embed_type", "Inline");

      var frame = document.createElement("iframe");
      frame.src = url.toString();
      frame.title = "Prendre rendez-vous avec Nouha Smaali (Calendly)";
      frame.setAttribute("frameborder", "0");
      frame.setAttribute("allow", "payment");
      frame.addEventListener("load", function () { widget.classList.add("is-loaded"); });
      widget.appendChild(frame);

      // si rien ne s'affiche au bout de 15 s, on propose le lien direct
      setTimeout(function () {
        if (widget.classList.contains("is-loaded")) return;
        var p = widget.querySelector(".calendly-placeholder p");
        if (p) p.textContent = "Le calendrier met du temps à charger. Tu peux aussi réserver avec le lien ci-dessous.";
      }, 15000);
    });
  }

  // Calendly envoie la hauteur de sa page : le cadre prend exactement cette
  // hauteur (pas de vide, pas de défilement interne), à chaque étape.
  window.addEventListener("message", function (e) {
    if (!/^https:\/\/([a-z0-9-]+\.)?calendly\.com$/.test(e.origin)) return;
    var data = e.data;
    if (!data || data.event !== "calendly.page_height" || !data.payload) return;
    var h = parseInt(data.payload.height, 10);
    if (!h || h < 300) return;
    widgets.forEach(function (widget) {
      var frame = widget.querySelector("iframe");
      if (frame && frame.contentWindow === e.source) {
        widget.style.height = h + "px";
        widget.classList.add("is-sized");
      }
    });
  });

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
     Trait fin qui traverse tout le site (home)
     Le hero garde sa ligne d'origine (#hero-thread). Le trait reprend là
     où elle s'arrête et descend jusqu'en bas en balayant la page.
     Statique, placé en arrière-plan de chaque section (sous les cartes
     et les textes), clair sur fond foncé et foncé sur fond clair.
     ------------------------------------------------------------------ */
  var heroThread = document.getElementById("hero-thread");
  if (heroThread) {
    var NS = "http://www.w3.org/2000/svg";
    var threadTimer = null;
    var f = function (n) { return Math.round(n * 10) / 10; };
    var pageBox = function (el) {
      var r = el.getBoundingClientRect();
      return { l: r.left + window.scrollX, t: r.top + window.scrollY, w: r.width, h: r.height, b: r.bottom + window.scrollY };
    };
    var isDark = function (el) {
      var c = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (!c || (c[3] !== undefined && +c[3] === 0)) return false;
      return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) < 110;
    };

    var buildThread = function () {
      document.querySelectorAll(".sec-thread").forEach(function (n) { n.remove(); });
      var footer = document.querySelector(".site-footer");
      var hero = heroThread.closest("section");
      if (!footer || !hero || window.innerWidth < 768) return;

      var W = document.documentElement.clientWidth;
      var blocks = Array.prototype.slice.call(document.querySelectorAll("main > section"));
      blocks.push(footer);
      var H = pageBox(footer).b;

      // point d'arrivée de la ligne du hero (x = 42 % du dessin, bas du dessin)
      var hb = pageBox(heroThread);
      var x = hb.l + hb.w * 0.42, y = hb.b;
      var d = "M" + f(x) + "," + f(y);

      // descente en grandes courbes d'un côté à l'autre, avec quelques boucles
      var xs = [0.16, 0.84, 0.3, 0.9, 0.08, 0.66, 0.2, 0.88, 0.42, 0.94, 0.12];
      var step = Math.max(560, Math.min(900, window.innerHeight * 0.9));
      var k = 0;
      // direction de fin de la ligne du hero (dernier segment : 380,780 → 420,1000 dans son dessin)
      var tdx = 40 * hb.w / 1000, tdy = 220 * hb.h / 1000;
      while (y < H - 10) {
        var ny = Math.min(H + 20, y + step);
        var nx = W * xs[k % xs.length];
        var lead = (ny - y) * 0.55;
        // le premier segment part dans le prolongement exact de la ligne du hero
        var c1x = k === 0 ? x + tdx * (lead / tdy) : x;
        d += " C" + f(c1x) + "," + f(y + lead) + " " + f(nx) + "," + f(ny - (ny - y) * 0.55) + " " + f(nx) + "," + f(ny);
        if (k % 3 === 1 && ny < H - 160) {
          var r = 26 + (k % 2) * 10, dir = nx > W / 2 ? -1 : 1;
          d += " C" + f(nx) + "," + f(ny + r * 0.9) + " " + f(nx + dir * r * 1.3) + "," + f(ny + r * 0.6) + " " + f(nx + dir * r * 1.1) + "," + f(ny - r * 0.3);
          d += " C" + f(nx + dir * r * 0.9) + "," + f(ny - r * 1.2) + " " + f(nx - dir * r * 0.2) + "," + f(ny - r * 0.6) + " " + f(nx) + "," + f(ny + r * 0.4);
          ny += r * 0.4;
        }
        x = nx; y = ny; k++;
      }

      // un calque par section, sous son contenu
      blocks.forEach(function (el) {
        var b = pageBox(el);
        var svg = document.createElementNS(NS, "svg");
        svg.setAttribute("class", "sec-thread");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("width", f(b.w));
        svg.setAttribute("height", f(b.h));
        var g = document.createElementNS(NS, "g");
        g.setAttribute("transform", "translate(" + f(-b.l) + "," + f(-b.t) + ")");
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("stroke", isDark(el) ? "rgba(254, 250, 224, 0.75)" : "rgba(30, 59, 39, 0.75)");
        g.appendChild(p);
        svg.appendChild(g);
        el.insertBefore(svg, el.firstChild);
      });
    };

    var scheduleThread = function (delay) {
      clearTimeout(threadTimer);
      threadTimer = setTimeout(buildThread, delay || 150);
    };
    scheduleThread(60);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleThread(60); });
    window.addEventListener("load", function () { scheduleThread(60); });
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
