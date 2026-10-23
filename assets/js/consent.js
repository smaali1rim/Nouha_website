/* Consentement cookies + Google Analytics 4
   - Rien n'est chargé tant que la personne n'a pas cliqué sur « Accepter ».
   - Le choix est conservé 6 mois (recommandation CNIL), puis redemandé.
   - Tout bouton ou lien portant [data-cookie-settings] rouvre le bandeau. */
(function () {
  "use strict";

  var GA_ID = "G-0LGFB6K74L";
  var KEY = "nouha-cookie-consent";
  var MAX_AGE = 1000 * 60 * 60 * 24 * 182; // ~6 mois

  function readChoice() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      if (c && (c.v === "granted" || c.v === "denied") && Date.now() - c.t < MAX_AGE) return c.v;
    } catch (e) {}
    return null;
  }

  function saveChoice(v) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: v, t: Date.now() })); } catch (e) {}
  }

  var gaLoaded = false;
  function loadAnalytics() {
    window["ga-disable-" + GA_ID] = false;
    if (gaLoaded) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }

  // Retrait du consentement : on coupe GA et on supprime ses cookies
  function stopAnalytics() {
    window["ga-disable-" + GA_ID] = true;
    var host = window.location.hostname;
    var domains = ["", host, "." + host, "." + host.split(".").slice(-2).join(".")];
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (name === "_ga" || name.indexOf("_ga_") === 0 || name === "_gid") {
        domains.forEach(function (d) {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
        });
      }
    });
  }

  var banner = null;
  function buildBanner() {
    banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Gestion des cookies");
    banner.innerHTML =
      '<p class="cookie-banner__title">Un petit cookie&nbsp;?</p>' +
      '<p class="cookie-banner__text">J\'utilise Google Analytics pour savoir combien de personnes visitent le site et ce qui les intéresse, ' +
      'uniquement si tu es d\'accord. Tu peux changer d\'avis à tout moment via « Gérer les cookies » en bas de page. ' +
      '<a href="mentions-legales.html#legal-cookies">En savoir plus</a></p>' +
      '<div class="cookie-banner__actions">' +
      '<button type="button" class="cookie-banner__btn" data-consent="denied">Refuser</button>' +
      '<button type="button" class="cookie-banner__btn cookie-banner__btn--accept" data-consent="granted">Accepter</button>' +
      "</div>";
    banner.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-consent]");
      if (!btn) return;
      var v = btn.getAttribute("data-consent");
      saveChoice(v);
      if (v === "granted") loadAnalytics(); else stopAnalytics();
      hideBanner();
    });
    document.body.appendChild(banner);
  }

  function showBanner() {
    if (!banner) buildBanner();
    banner.hidden = false;
    requestAnimationFrame(function () { banner.classList.add("is-open"); });
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove("is-open");
    setTimeout(function () { banner.hidden = true; }, 350);
  }

  function init() {
    var choice = readChoice();
    if (choice === "granted") loadAnalytics();
    else if (choice === null) showBanner();

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-cookie-settings]");
      if (!t) return;
      e.preventDefault();
      showBanner();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
