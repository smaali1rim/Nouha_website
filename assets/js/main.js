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
  function showRevealContent() {
    root.classList.remove("reveal-ready");
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    var io;
    try {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
      // Only hide content once its observer has been attached successfully.
      root.classList.add("reveal-ready");
    } catch (e) {
      if (io) io.disconnect();
      showRevealContent();
    }
  } else {
    showRevealContent();
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
     Carrousel des avis (façon « coverflow »)
     La carte active est centrée et en avant ; ses voisines sont réduites et
     resserrées autour d'elle. Boucle infinie : les avis sont recopiés avant
     et après la rangée, et on revient en douce sur les vrais avis à la fin
     de chaque glissement. Flèches, points, clic sur une carte de côté,
     clavier, glisser au doigt, défilement automatique (en pause au survol,
     au clavier et hors écran).
     ------------------------------------------------------------------ */
  document.querySelectorAll("[data-carousel]").forEach(function (carousel) {
    var viewport = carousel.querySelector(".carousel__viewport");
    var track = carousel.querySelector(".carousel__track");
    var controls = carousel.querySelector(".carousel__controls");
    var dotsWrap = carousel.querySelector(".carousel__dots");
    var slides = Array.prototype.slice.call(track.children);
    var n = slides.length;
    var DELAY = 6000;
    var SIDE_SCALE = 0.84; // taille des cartes de côté
    if (n < 2) return;

    function copy(slide) {
      var c = slide.cloneNode(true);
      ["role", "aria-roledescription", "aria-label"].forEach(function (a) { c.removeAttribute(a); });
      c.setAttribute("aria-hidden", "true");
      c.querySelectorAll("[id]").forEach(function (el) { el.removeAttribute("id"); });
      c.querySelectorAll("[aria-labelledby]").forEach(function (el) { el.removeAttribute("aria-labelledby"); });
      return c;
    }
    slides.forEach(function (s) { track.appendChild(copy(s)); });
    slides.slice().reverse().forEach(function (s) { track.insertBefore(copy(s), track.firstChild); });

    var all = Array.prototype.slice.call(track.children); // [copies][vrais avis][copies]
    var pos = n;                                          // carte au centre (index dans `all`)

    var dots = slides.map(function (s, k) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "carousel__dot";
      d.setAttribute("aria-label", "Avis " + (k + 1) + " sur " + n);
      d.addEventListener("click", function () {
        // vers la copie de cet avis la plus proche, pour glisser le moins possible
        goTo([k, n + k, 2 * n + k].reduce(function (a, b) { return Math.abs(b - pos) < Math.abs(a - pos) ? b : a; }));
        restart();
      });
      dotsWrap.appendChild(d);
      return d;
    });
    controls.hidden = false;
    carousel.classList.add("is-ready");

    // décalage de la rangée pour centrer la carte `p` dans l'écran
    function shift(p) {
      var slide = all[p];
      return viewport.clientWidth / 2 - (slide.offsetLeft - all[0].offsetLeft + slide.offsetWidth / 2);
    }

    function render(animate) {
      track.classList.toggle("no-anim", !animate);
      track.style.transform = "translate3d(" + shift(pos) + "px,0,0)";
      // cartes de côté : réduites et rapprochées de la carte active
      var w = all[0].offsetWidth;
      var step = all.length > 1 ? all[1].offsetLeft - all[0].offsetLeft : w;
      var gap = step - w;
      all.forEach(function (slide, i) {
        var d = i - pos;
        var dist = Math.abs(d);
        var x = 0;
        if (dist) {
          var visual = w / 2 + gap + (w * SIDE_SCALE) / 2 + (dist - 1) * (w * SIDE_SCALE + gap);
          x = (d > 0 ? 1 : -1) * (visual - dist * step);
        }
        slide.style.setProperty("--x", x.toFixed(1) + "px");
        slide.style.setProperty("--s", dist ? SIDE_SCALE : 1);
        slide.classList.toggle("is-active", !dist);
      });
      if (!animate) void track.offsetWidth; // applique la position avant de réactiver l'animation
      var cur = pos % n;
      dots.forEach(function (d, k) {
        if (k === cur) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
    }

    // revient sur les vrais avis (même carte affichée, sans animation)
    function recenter() {
      if (pos >= n && pos < 2 * n) return;
      pos = (pos % n) + n;
      render(false);
    }

    function goTo(p) {
      pos = Math.max(0, Math.min(all.length - 1, p));
      render(!reduceMotion);
      if (reduceMotion) recenter();
    }

    function step(dir) {
      if (pos + dir < 0 || pos + dir >= all.length) recenter();
      goTo(pos + dir);
    }

    track.addEventListener("transitionend", function (e) {
      if (e.target === track && e.propertyName === "transform") recenter();
    });

    carousel.querySelector(".carousel__btn--prev").addEventListener("click", function () { step(-1); restart(); });
    carousel.querySelector(".carousel__btn--next").addEventListener("click", function () { step(1); restart(); });
    carousel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { step(-1); restart(); e.preventDefault(); }
      if (e.key === "ArrowRight") { step(1); restart(); e.preventDefault(); }
    });

    /* Clic sur une carte de côté : elle passe au centre */
    var lastDrag = 0;
    viewport.addEventListener("click", function (e) {
      if (Date.now() - lastDrag < 300) return;
      var slide = e.target.closest(".carousel__slide");
      var i = all.indexOf(slide);
      if (i < 0 || i === pos) return;
      goTo(i);
      restart();
    });

    /* Glisser au doigt ou à la souris (le défilement vertical de la page reste libre) */
    var startX = null, startY = 0, dx = 0, dragging = false;
    viewport.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      recenter();
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dragging = false;
    });
    viewport.addEventListener("pointermove", function (e) {
      if (startX === null) return;
      dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < 8) return;
        if (Math.abs(e.clientY - startY) > Math.abs(dx)) { startX = null; return; }
        dragging = true;
        carousel.classList.add("is-dragging");
        try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
        stop();
      }
      track.style.transform = "translate3d(" + (shift(pos) + dx) + "px,0,0)";
    });
    function endDrag() {
      if (startX === null) return;
      startX = null;
      if (!dragging) return;
      dragging = false;
      lastDrag = Date.now();
      carousel.classList.remove("is-dragging");
      var width = all[1].offsetLeft - all[0].offsetLeft;
      var moved = Math.round(-dx / width);
      if (!moved && Math.abs(dx) > 40) moved = dx < 0 ? 1 : -1;
      goTo(pos + moved);
      restart();
    }
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("dragstart", function (e) { e.preventDefault(); }); // pas de glisser natif des images

    /* Trackpad (glisser à deux doigts) ou Maj + molette : une carte par geste */
    var wheelSum = 0, wheelLock = 0, wheelReset = null;
    viewport.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // défilement vertical : on laisse la page défiler
      e.preventDefault();
      clearTimeout(wheelReset);
      wheelReset = setTimeout(function () { wheelSum = 0; }, 200);
      if (Date.now() < wheelLock) return;
      wheelSum += e.deltaX * (e.deltaMode === 1 ? 16 : 1); // Firefox compte en lignes
      if (Math.abs(wheelSum) < 40) return;
      step(wheelSum > 0 ? 1 : -1);
      restart();
      wheelSum = 0;
      wheelLock = Date.now() + 650;
    }, { passive: false });

    /* Défilement automatique */
    var timer = null, hovered = false, focused = false, onScreen = false;
    function stop() { clearInterval(timer); timer = null; }
    function restart() {
      stop();
      if (reduceMotion || hovered || focused || !onScreen || document.hidden) return;
      timer = setInterval(function () { step(1); }, DELAY);
    }
    carousel.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { hovered = true; stop(); } });
    carousel.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { hovered = false; restart(); } });
    // pause quand on navigue au clavier dans le carrousel (pas après un simple clic)
    carousel.addEventListener("focusin", function (e) {
      var kb = true;
      try { kb = e.target.matches(":focus-visible"); } catch (err) {}
      if (!kb) return;
      focused = true;
      stop();
    });
    carousel.addEventListener("focusout", function (e) {
      if (carousel.contains(e.relatedTarget)) return;
      focused = false;
      restart();
    });
    document.addEventListener("visibilitychange", restart);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        restart();
      }, { threshold: 0.35 }).observe(carousel);
    } else {
      onScreen = true;
    }

    // la largeur des cartes change avec l'écran : on recale la rangée
    var refresh = function () { recenter(); render(false); };
    window.addEventListener("resize", refresh);
    window.addEventListener("load", refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    render(false);
    restart();
  });

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
