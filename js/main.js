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
  /* iOS swallows programmatic scrolls while mandatory scroll snapping is
     active on the root (the snap engine reverts the jump, so taps appear
     to do nothing): lift snapping, jump, jump again once the style recalc
     has settled, then restore. Every target is itself a snap point, so
     restoring snap doesn't move the page. */
  var jumpWithoutSnap = function (jump) {
    var root = document.documentElement;
    root.style.scrollSnapType = "none";
    jump();               /* immediately… */
    setTimeout(function () {
      jump();             /* …and again after iOS finishes the overflow/style recalc */
      root.style.scrollSnapType = "";
    }, 90);
  };
  menuLinks.forEach(function (a) {
    /* close first, then jump: navigating while the menu's overflow:hidden
       is being torn down makes iOS land on the hero instead of the target */
    a.addEventListener("click", function (e) {
      e.preventDefault();
      setMenu(false);
      var href = a.getAttribute("href");
      var target = document.querySelector(href);
      if (target) {
        jumpWithoutSnap(function () {
          target.scrollIntoView({ behavior: "auto", block: "start" });
        });
      }
      history.replaceState(null, "", href);
    });
  });
  /* every other in-page anchor (hero CTAs, scroll cue, #top links, dots)
     takes the same snap-lifted path — native fragment jumps are just as
     vulnerable to iOS eating the scroll under mandatory snapping.
     Excluded: menu links (own handler above) and the skip link (must move
     focus natively for keyboard/screen-reader users). */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute("data-menu-link") || a.classList.contains("skip-link")) return;
    var href = a.getAttribute("href");
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    jumpWithoutSnap(function () {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    });
    history.replaceState(null, "", href === "#top" ? window.location.pathname : href);
  });
  /* logo → hero: closes the menu like a link, but stays out of the
     active-section observer (its #top target is the whole body) */
  Array.prototype.forEach.call(document.querySelectorAll("[data-menu-close]"), function (el) {
    el.addEventListener("click", function () { setMenu(false); });
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
  var dotEls = Array.prototype.slice.call(document.querySelectorAll("[data-dot]"));
  var navEyebrow = document.querySelector("[data-nav-eyebrow]");
  if ("IntersectionObserver" in window) {
    var activeSection = "";
    var markActive = function (id) {
      activeSection = id;
      menuLinks.forEach(function (a) {
        a.setAttribute("aria-current", a.getAttribute("href") === "#" + id ? "true" : "false");
      });
      dotEls.forEach(function (d) {
        var on = d.getAttribute("href") === "#" + id;
        d.classList.toggle("is-active", on);
        d.setAttribute("aria-current", on ? "true" : "false");
      });
      if (navEyebrow) {
        /* the bar carries the section eyebrow on phones (the in-section
           ones are display:none there); text comes from the section's own
           eyebrow so the wording lives in one place */
        var src = id && document.querySelector("#" + id + " .eyebrow");
        navEyebrow.textContent = src ? src.textContent : "";
      }
    };
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          markActive(entry.target.id);
        } else if (activeSection === entry.target.id) {
          /* the active section left the band with no successor —
             we're back in the hero (or between sections): clear */
          markActive("");
        }
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
    /* touch: finger down = flashlight on (touch-action: none in CSS lets
       pointermove track the drag); lifting the finger clears it */
    stage.addEventListener("pointerdown", function (e) {
      stageRect = stage.getBoundingClientRect();
      moveFlashlight(e);
    });
    stage.addEventListener("pointermove", moveFlashlight);
    stage.addEventListener("pointerup", function (e) {
      if (e.pointerType !== "mouse") hideFlashlight();
    });
    stage.addEventListener("pointerleave", hideFlashlight);
    stage.addEventListener("pointercancel", hideFlashlight);
    /* rect shifts with resize and hero parallax */
    window.addEventListener("resize", function () { stageRect = null; });
    window.addEventListener("scroll", function () { stageRect = null; }, { passive: true });
  }

  /* ---------- custom SoundCloud player ----------
     Privacy gate: NOTHING contacts SoundCloud until the visitor presses
     "Load SoundCloud player" (TDDDG s25(1) / Art. 6(1)(a) GDPR consent).
     The choice is stored in localStorage under "docthor-soundcloud-consent"
     (value "granted", kept until withdrawn via the button in the player or
     by clearing site data). After consent, the official widget iframe does
     the playback; the Widget API remote-controls it while our own UI
     renders cover, transport and track list. If the API can't load, the
     card flips to fallback mode and shows SoundCloud's player directly. */
  var player = document.querySelector("[data-player]");
  if (player) {
    var CONSENT_KEY = "docthor-soundcloud-consent";
    var consentGranted = function () {
      try { return localStorage.getItem(CONSENT_KEY) === "granted"; }
      catch (e) { return false; }
    };
    var pArt = player.querySelector("[data-player-art]");
    var pTitle = player.querySelector("[data-player-title]");
    var pArtist = player.querySelector("[data-player-artist]");
    var pFill = player.querySelector("[data-player-fill]");
    var pProgress = player.querySelector("[data-player-progress]");
    var pTime = player.querySelector("[data-player-time]");
    var pDur = player.querySelector("[data-player-dur]");
    var pPlay = player.querySelector("[data-player-play]");
    var pList = player.querySelector("[data-player-list]");
    var pCount = player.querySelector("[data-player-count]");
    var fallbackArt = pArt.getAttribute("src");
    var widget = null;
    var rows = [];
    var durationMs = 0;
    var playerStarted = false;

    var fmtTime = function (ms) {
      if (!ms && ms !== 0) return "–:––";
      var s = Math.round(ms / 1000);
      var h = Math.floor(s / 3600);
      var m = Math.floor(s / 60) % 60;
      var sec = String(s % 60).padStart(2, "0");
      return h ? h + ":" + String(m).padStart(2, "0") + ":" + sec
               : m + ":" + sec; /* DJ sets run past an hour */
    };

    var showFallback = function () {
      player.classList.add("player-fallback");
    };

    var setActive = function (index) {
      rows.forEach(function (r, i) {
        r.classList.toggle("is-active", i === index);
      });
      var active = rows[index];
      if (!active) return;
      /* scroll the LIST only — scrollIntoView also scrolls ancestors, which
         dragged the whole page back to the player whenever a track changed
         while the visitor was in another section */
      var rowTop = active.offsetTop - pList.offsetTop; /* both offset against .player */
      var viewTop = pList.scrollTop;
      var viewBottom = viewTop + pList.clientHeight;
      if (rowTop < viewTop || rowTop + active.offsetHeight > viewBottom) {
        /* instant, not smooth: smooth container scrolls are rAF-driven and
           get silently dropped in hidden tabs / off-screen containers */
        pList.scrollTop = rowTop - (pList.clientHeight - active.offsetHeight) / 2;
      }
    };

    var setNow = function (sound) {
      if (!sound) return;
      pTitle.textContent = sound.title || "Untitled";
      if (pArtist) {
        pArtist.textContent = (sound.publisher_metadata && sound.publisher_metadata.artist) ||
          (sound.user && sound.user.username) || "";
      }
      durationMs = sound.duration || 0;
      pDur.textContent = fmtTime(durationMs);
      var art = sound.artwork_url || (sound.user && sound.user.avatar_url) || fallbackArt;
      pArt.src = art ? art.replace("-large", "-t500x500") : fallbackArt;
    };

    var setPlaying = function (playing) {
      /* toggleAttribute, not .hidden — SVG elements don't have the
         HTMLElement hidden property, assignments to it do nothing */
      pPlay.querySelector(".ic-play").toggleAttribute("hidden", playing);
      pPlay.querySelector(".ic-pause").toggleAttribute("hidden", !playing);
      pPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
      var active = pList.querySelector(".player-row.is-active");
      if (active) active.classList.toggle("is-paused", !playing);
    };

    var buildList = function (sounds) {
      pList.textContent = "";
      rows = [];
      sounds.forEach(function (sound, i) {
        var li = document.createElement("li");
        var row = document.createElement("button");
        row.type = "button";
        row.className = "player-row";

        var num = document.createElement("span");
        num.className = "row-num";
        num.textContent = String(i + 1).padStart(2, "0");

        var title = document.createElement("span");
        title.className = "row-title";
        title.textContent = sound.title || "Untitled";

        var eq = document.createElement("span");
        eq.className = "row-eq";
        eq.setAttribute("aria-hidden", "true");
        eq.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));

        var dur = document.createElement("span");
        dur.className = "row-dur";
        dur.textContent = sound.duration ? fmtTime(sound.duration) : "–:––";

        row.append(num, title, eq, dur);
        row.addEventListener("click", function () {
          widget.skip(i); /* skip() jumps to the sound and plays it */
        });
        li.appendChild(row);
        pList.appendChild(li);
        rows.push(row);
      });
      pCount.textContent = "/ " + String(sounds.length).padStart(2, "0");
      if (sounds.length) {
        setNow(sounds[0]);
        setActive(0);
        setPlaying(false);
      }
    };

    var wireWidget = function () {
      var E = SC.Widget.Events;
      widget.bind(E.READY, function () {
        widget.getSounds(function (sounds) {
          if (sounds && sounds.length) buildList(sounds);
          else showFallback();
        });
      });
      widget.bind(E.PLAY, function () {
        setPlaying(true);
        widget.getCurrentSoundIndex(function (i) { setActive(i); });
        widget.getCurrentSound(function (s) { setNow(s); });
      });
      widget.bind(E.PAUSE, function () { setPlaying(false); });
      widget.bind(E.PLAY_PROGRESS, function (e) {
        pFill.style.width = (e.relativePosition * 100) + "%";
        pTime.textContent = fmtTime(e.currentPosition);
        pProgress.setAttribute("aria-valuenow", Math.round(e.relativePosition * 100));
      });

      pPlay.addEventListener("click", function () { widget.toggle(); });
      player.querySelector("[data-player-prev]").addEventListener("click", function () { widget.prev(); });
      player.querySelector("[data-player-next]").addEventListener("click", function () { widget.next(); });

      var seekTo = function (frac) {
        if (durationMs) widget.seekTo(Math.max(0, Math.min(1, frac)) * durationMs);
      };
      /* tap OR drag to seek (pointer capture keeps the drag alive when the
         finger strays off the slim bar; touch-action: none in CSS stops
         the page from scrolling instead) */
      var seeking = false;
      var seekFromEvent = function (e) {
        var r = pProgress.getBoundingClientRect();
        var frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        pFill.style.width = (frac * 100) + "%"; /* live feedback before the widget echoes back */
        seekTo(frac);
      };
      pProgress.addEventListener("pointerdown", function (e) {
        seeking = true;
        if (pProgress.setPointerCapture) pProgress.setPointerCapture(e.pointerId);
        seekFromEvent(e);
      });
      pProgress.addEventListener("pointermove", function (e) {
        if (seeking) seekFromEvent(e);
      });
      pProgress.addEventListener("pointerup", function () { seeking = false; });
      pProgress.addEventListener("pointercancel", function () { seeking = false; });
      pProgress.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        widget.getPosition(function (pos) {
          if (durationMs) seekTo((pos + (e.key === "ArrowRight" ? 5000 : -5000)) / durationMs);
        });
      });
    };

    var applyConsentUI = function () {
      var granted = consentGranted();
      player.classList.toggle("awaiting-consent", !granted);
      var consentBlock = player.querySelector("[data-player-consent]");
      if (consentBlock) consentBlock.hidden = granted;
      var withdraw = player.querySelector("[data-consent-withdraw]");
      if (withdraw) withdraw.hidden = !granted;
      if (granted) {
        /* the reveal batch may have run while these were display:none */
        Array.prototype.forEach.call(player.querySelectorAll(".player-stage, .player-listwrap"), function (el) {
          el.style.opacity = 1;
          el.style.transform = "none";
        });
      }
    };

    var initPlayer = function () {
      if (playerStarted || !consentGranted()) return;
      playerStarted = true;

      var iframe = document.createElement("iframe");
      iframe.title = "SoundCloud player — DOCTHOR";
      iframe.setAttribute("allow", "autoplay");
      iframe.src = "https://w.soundcloud.com/player/?url=" +
        encodeURIComponent(player.dataset.scUrl) +
        "&color=%23ff544f&auto_play=false&hide_related=true&show_comments=false" +
        "&show_user=false&show_reposts=false&show_teaser=false&visual=false";
      player.querySelector("[data-player-widget]").appendChild(iframe);

      /* if the API never arrives (offline, blocked), show the raw widget */
      var guard = setTimeout(showFallback, 10000);

      var script = document.createElement("script");
      script.src = "https://w.soundcloud.com/player/api.js";
      script.onload = function () {
        clearTimeout(guard);
        widget = SC.Widget(iframe);
        wireWidget();
      };
      script.onerror = function () {
        clearTimeout(guard);
        showFallback();
      };
      document.head.appendChild(script);
    };

    /* consent controls: grant loads the player immediately; withdrawal
       clears the stored choice and reloads so no SoundCloud resource
       survives in the page */
    var loadBtn = player.querySelector("[data-consent-load]");
    if (loadBtn) {
      loadBtn.addEventListener("click", function () {
        try { localStorage.setItem(CONSENT_KEY, "granted"); } catch (e) { /* still load this visit */ }
        player.classList.remove("awaiting-consent");
        var consentBlock = player.querySelector("[data-player-consent]");
        if (consentBlock) consentBlock.hidden = true;
        applyConsentUI();
        initPlayer();
      });
    }
    var withdrawBtn = player.querySelector("[data-consent-withdraw]");
    if (withdrawBtn) {
      withdrawBtn.addEventListener("click", function () {
        try { localStorage.removeItem(CONSENT_KEY); } catch (e) {}
        window.location.reload();
      });
    }

    applyConsentUI();

    /* lazy init only applies once consent exists (this visit or stored) */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting && consentGranted()) {
          initPlayer();
          obs.disconnect();
        }
      }, { rootMargin: "400px 0px" }).observe(player);
    } else {
      initPlayer();
    }
  }

  /* ---------- background videos: full quality on desktop, lightweight
     720p encodes on narrow viewports (data-src-mobile) ---------- */
  var mqWide = window.matchMedia("(min-width: 768px)");
  function makeVideoLoader(video) {
    return function () {
      if (!video) return;
      var conn = navigator.connection || {};
      if (reducedMotion || conn.saveData) return;
      var sources = video.querySelectorAll("source[data-src]");
      if (!sources.length || sources[0].getAttribute("src")) return;
      Array.prototype.forEach.call(sources, function (source) {
        /* browser picks the first type it can play */
        source.src = (!mqWide.matches && source.dataset.srcMobile) || source.dataset.src;
      });
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

  /* ---------- back to top + section dots (same reveal condition) ---------- */
  var toTop = document.querySelector("[data-to-top]");
  var dotsNav = document.querySelector("[data-dots]");
  if (dotsNav) dotsNav.hidden = false;
  if (toTop) {
    toTop.hidden = false;
    var updateToTop = function () {
      var show = window.scrollY > window.innerHeight * 0.6;
      toTop.classList.toggle("show", show);
      if (dotsNav) dotsNav.classList.toggle("show", show);
    };
    window.addEventListener("scroll", updateToTop, { passive: true });
    updateToTop();
    toTop.addEventListener("click", function () {
      /* phones/tablets: smooth scrolling fights snap-stop:always on iOS
         (stalls at the next section) — instant jump with snapping lifted */
      if (reducedMotion || window.matchMedia("(max-width: 1023px)").matches) {
        jumpWithoutSnap(function () { window.scrollTo(0, 0); });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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

    /* platform links reveal with the player card, not on their own scroll
       position — otherwise they trail in only after extra scrolling */
    gsap.from("#music .platform", {
      opacity: 0,
      y: 26,
      duration: .55,
      stagger: .08,
      ease: "power2.out",
      scrollTrigger: { trigger: "#music .player", start: "top 88%", once: true }
    });

    /* mid-page entry (hash link, reload scroll restoration, programmatic
       jump): once-triggers that are already past their start at refresh
       can be killed without firing, leaving content invisible — reveal
       anything already at/above the fold directly */
    var revealEarly = function () {
      var limit = window.innerHeight * 0.88;
      var els = document.querySelectorAll("[data-reveal], #music .platform");
      Array.prototype.forEach.call(els, function (el) {
        if (el.getBoundingClientRect().top < limit) {
          gsap.to(el, { opacity: 1, y: 0, duration: .45, ease: "power2.out", overwrite: true });
        }
      });
    };
    revealEarly();
    window.addEventListener("load", function () {
      revealEarly();
      setTimeout(revealEarly, 300); /* scroll restoration can land after load */
    });

    /* refresh once media has loaded (embed heights, fonts) */
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  if (document.readyState !== "loading") initGsap();
  else document.addEventListener("DOMContentLoaded", initGsap);
})();
