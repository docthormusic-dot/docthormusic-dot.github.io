/* DOCTHOR v2 — overlay menu, logo reveal, lazy media, GSAP choreography */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- nav scrolled state ---------- */
  var nav = document.querySelector("[data-nav]");
  function onScrollNav() {
    nav.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- full-screen menu ---------- */
  var burger = document.querySelector("[data-burger]");
  var menuLinks = Array.prototype.slice.call(document.querySelectorAll("[data-menu-link]"));
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  burger.addEventListener("click", function () {
    setMenu(!document.body.classList.contains("menu-open"));
  });
  menuLinks.forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      setMenu(false);
      burger.focus();
    }
  });

  /* ---------- active section in menu ---------- */
  var sections = menuLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if ("IntersectionObserver" in window) {
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        menuLinks.forEach(function (a) {
          a.setAttribute("aria-current", a.getAttribute("href") === "#" + entry.target.id ? "true" : "false");
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { sectionObs.observe(s); });
  }

  /* ---------- hero flashlight reveal ---------- */
  var stage = document.querySelector("[data-logo-stage]");
  if (stage) {
    var stageRect = null;
    var moveFlashlight = function (e) {
      if (!stageRect) stageRect = stage.getBoundingClientRect();
      stage.style.setProperty("--mx", (e.clientX - stageRect.left) + "px");
      stage.style.setProperty("--my", (e.clientY - stageRect.top) + "px");
    };
    var hideFlashlight = function () {
      stage.style.setProperty("--mx", "-999px");
      stage.style.setProperty("--my", "-999px");
    };
    stage.addEventListener("pointerenter", function (e) {
      stageRect = stage.getBoundingClientRect();
      moveFlashlight(e);
    });
    stage.addEventListener("pointermove", moveFlashlight);
    stage.addEventListener("pointerleave", hideFlashlight);
    stage.addEventListener("pointercancel", hideFlashlight);
    /* rect shifts with resize and hero parallax */
    window.addEventListener("resize", function () { stageRect = null; });
    window.addEventListener("scroll", function () { stageRect = null; }, { passive: true });
  }

  /* ---------- lazy music embeds ---------- */
  var shells = document.querySelectorAll("[data-embed]");
  function inject(shell) {
    if (shell.dataset.done) return;
    shell.dataset.done = "1";
    var iframe = document.createElement("iframe");
    iframe.src = shell.dataset.src;
    iframe.height = shell.dataset.height;
    iframe.title = shell.dataset.title;
    iframe.loading = "lazy";
    iframe.setAttribute("allow", "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture");
    shell.replaceChildren(iframe);
  }
  if ("IntersectionObserver" in window) {
    var embedObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          inject(entry.target);
          embedObs.unobserve(entry.target);
        }
      });
    }, { rootMargin: "400px 0px" });
    shells.forEach(function (s) { embedObs.observe(s); });
  } else {
    shells.forEach(inject);
  }

  /* ---------- background videos: load only when it makes sense ---------- */
  var mqWide = window.matchMedia("(min-width: 768px)");
  function makeVideoLoader(video) {
    return function () {
      if (!video) return;
      var conn = navigator.connection || {};
      if (reducedMotion || conn.saveData || !mqWide.matches) return;
      var source = video.querySelector("source[data-src]");
      if (!source || source.getAttribute("src")) return;
      source.src = source.dataset.src;
      video.load();
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* poster remains */ });
    };
  }
  var loadHero = makeVideoLoader(document.querySelector("[data-hero-video]"));
  var loadFlow = makeVideoLoader(document.querySelector("[data-flow-video]"));
  function loadVideos() { loadHero(); loadFlow(); }
  if (document.readyState === "complete") loadVideos();
  else window.addEventListener("load", loadVideos);
  if (mqWide.addEventListener) mqWide.addEventListener("change", loadVideos);
  window.addEventListener("resize", loadVideos);

  /* ---------- footer: slides up only while on the Booking section ---------- */
  var footer = document.querySelector(".footer");
  var bookingSection = document.querySelector("#booking");
  var mqDesk = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");

  function setFooter(open) {
    footer.classList.toggle("visible", open);
    document.body.classList.toggle("footer-open", open);
  }
  function onBookingSection() {
    if (!bookingSection) return false;
    var r = bookingSection.getBoundingClientRect();
    var vc = window.innerHeight / 2;
    return r.top <= vc && r.bottom >= vc; /* booking holds the viewport centre */
  }

  if (footer) {
    var setFooterHeight = function () {
      document.body.style.setProperty("--footer-h", (footer.offsetHeight + 14) + "px");
    };
    setFooterHeight();
    window.addEventListener("resize", setFooterHeight);

    document.addEventListener("mousemove", function (e) {
      if (!mqDesk.matches) return;
      if (!onBookingSection()) {
        if (!footer.contains(document.activeElement)) setFooter(false);
        return;
      }
      var fromBottom = window.innerHeight - e.clientY;
      if (fromBottom < 110) setFooter(true);
      else if (fromBottom > 190) setFooter(false); /* hysteresis: no flicker */
    }, { passive: true });

    /* close when scrolling away from booking */
    window.addEventListener("scroll", function () {
      if (mqDesk.matches && footer.classList.contains("visible") && !onBookingSection()) setFooter(false);
    }, { passive: true });

    /* keyboard access mirrors the CSS :focus-within reveal */
    footer.addEventListener("focusin", function () { setFooter(true); });
    footer.addEventListener("focusout", function () { setFooter(false); });

    /* touch devices: footer is static in flow after booking — when it scrolls
       into view, mark it open so the back-to-top button steps aside */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (mqDesk.matches) return;
        document.body.classList.toggle("footer-open", entries[0].isIntersecting);
      }, { threshold: 0.05 }).observe(footer);
    }
  }

  /* ---------- back to top ---------- */
  var toTop = document.querySelector("[data-to-top]");
  if (toTop) {
    toTop.hidden = false;
    var updateToTop = function () {
      toTop.classList.toggle("show", window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener("scroll", updateToTop, { passive: true });
    updateToTop();
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- footer year ---------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- GSAP choreography ---------- */
  function initGsap() {
    if (reducedMotion || typeof gsap === "undefined") return;
    if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

    /* hero entrance */
    var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from("[data-logo-stage]", { opacity: 0, y: 34, scale: .97, duration: 1.1 })
      .from("[data-hero-tag]", { opacity: 0, y: 14, duration: .6 }, "-=0.55")
      .from("[data-hero-cta] .btn", { opacity: 0, y: 16, duration: .5, stagger: .09 }, "-=0.35")
      .from(".scroll-cue", { opacity: 0, duration: .6 }, "-=0.2");

    if (typeof ScrollTrigger === "undefined") return;

    /* hero parallax (video slower than content) */
    gsap.to("[data-hero-video]", {
      yPercent: 16,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to("[data-hero-core]", {
      yPercent: 9,
      opacity: .35,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });

    /* scroll cue: gone within the first quarter of the hero, so the
       parallax-pushed CTAs never collide with it mid-transition.
       immediateRender: false — the entrance timeline owns the cue's
       opacity until the first real scroll render */
    gsap.fromTo(".scroll-cue", { opacity: 1 }, {
      opacity: 0,
      ease: "none",
      immediateRender: false,
      scrollTrigger: { trigger: ".hero", start: "top top", end: "25% top", scrub: true }
    });

    /* batched scroll reveals */
    gsap.set("[data-reveal]", { opacity: 0, y: 26 });
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 88%",
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, duration: .55, stagger: .08, ease: "power2.out", overwrite: true });
      }
    });

    /* refresh once media has loaded (embed heights, fonts) */
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  if (document.readyState !== "loading") initGsap();
  else document.addEventListener("DOMContentLoaded", initGsap);
})();
