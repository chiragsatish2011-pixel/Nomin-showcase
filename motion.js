/* =============================================================================
   Nomin Code — behaviour

   Written to be cheap. The page previously animated a large blur-filtered SVG
   and wrote inline styles on every pointermove; both are gone. What is left:
     · scroll reveal via IntersectionObserver, with a scroll fallback so
       nothing can be stranded invisible after an anchor jump
     · install tabs, language tabs, copy-to-clipboard
     · disclosure panels animated by explicit px height
     · the composer demo, typing into a FIXED-height field

   Everything checks prefers-reduced-motion and degrades to static content.
   ============================================================================= */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
     1. Scroll reveal
   * ------------------------------------------------------------------ */

  var groups = [
    '.section-head', '.figs .fig', '.steps .step', '.grid .card',
    '.showcase .show', '.split__copy', '.term', '.disclosures .disc',
    '.cta__inner', '.footer__cols'
  ];

  var targets = [];
  groups.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (node, i) {
      node.classList.add('reveal');
      node.style.setProperty('--reveal-delay', Math.min(i, 6) * 55 + 'ms');
      targets.push(node);
    });
  });

  function revealAll() {
    targets.forEach(function (n) { n.classList.add('is-in'); });
    targets.length = 0;
  }

  if (reduced || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var sweep = function () {
      var h = window.innerHeight || document.documentElement.clientHeight;
      for (var i = targets.length - 1; i >= 0; i--) {
        var n = targets[i];
        if (n.classList.contains('is-in') || n.getBoundingClientRect().top < h * 0.93) {
          n.classList.add('is-in');
          targets.splice(i, 1);
        }
      }
    };

    // Time-based throttle, deliberately NOT requestAnimationFrame. rAF is
    // paused in background tabs and under power saving; an rAF-gated flag
    // would latch on and the fallback would never run again, stranding
    // content at opacity 0 permanently.
    var lastRun = 0;
    var onScroll = function () {
      var now = Date.now();
      if (now - lastRun < 100) return;
      lastRun = now;
      sweep();
    };

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
        var i = targets.indexOf(e.target);
        if (i > -1) targets.splice(i, 1);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0 });

    targets.slice().forEach(function (n) { io.observe(n); });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('hashchange', function () { setTimeout(sweep, 60); });
    // A tab restored from the background may have missed every signal.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') sweep();
    });

    sweep();
    setTimeout(sweep, 400);
    // Hard backstop: nothing may stay invisible, whatever went wrong above.
    setTimeout(revealAll, 3000);
  }

  /* ------------------------------------------------------------------ *
     2. Generic pill tab strip
   * ------------------------------------------------------------------ */

  function tabs(selector, onPick) {
    var list = Array.prototype.slice.call(document.querySelectorAll(selector));
    list.forEach(function (tab) {
      tab.addEventListener('click', function () {
        list.forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
        tab.setAttribute('aria-selected', 'true');
        onPick(tab);
      });
    });
    return list;
  }

  /* --- Install commands ---------------------------------------------- */

  var cmdEl = document.getElementById('install-cmd');
  if (cmdEl) {
    tabs('.install__tab', function (tab) { cmdEl.textContent = tab.dataset.cmd; });
  }

  /* --- Copy ----------------------------------------------------------- */

  var copyBtn = document.querySelector('.copy');
  if (copyBtn && cmdEl) {
    copyBtn.addEventListener('click', function () {
      var text = cmdEl.textContent;
      var done = function () {
        copyBtn.classList.add('is-done');
        setTimeout(function () { copyBtn.classList.remove('is-done'); }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        // Older browsers: fall back to a throwaway textarea.
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:absolute;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  }

  /* --- Language tabs --------------------------------------------------- */

  var panes = {
    'Python': document.getElementById('code-python'),
    'TypeScript': document.getElementById('code-typescript'),
    'cURL': document.getElementById('code-curl')
  };

  if (panes.Python) {
    tabs('.code__tab', function (tab) {
      var name = tab.textContent.trim();
      Object.keys(panes).forEach(function (k) {
        if (panes[k]) panes[k].hidden = (k !== name);
      });
      // The panel settles to height:auto once open, so swapping panes of
      // different sizes needs no re-measure.
    });
  }

  /* ------------------------------------------------------------------ *
     3. Disclosures
   * ------------------------------------------------------------------ */

  var DISC_MS = 280;   // must match the height transition in styles.css

  document.querySelectorAll('.disc').forEach(function (disc) {
    var btn = disc.querySelector('.disc__btn');
    var panel = disc.querySelector('.disc__panel');
    if (!btn || !panel) return;

    var inner = panel.firstElementChild;
    var settle = null;

    function open() {
      btn.setAttribute('aria-expanded', 'true');
      if (settle) clearTimeout(settle);

      if (reduced) {           // transitions are off — go straight to auto
        panel.style.height = 'auto';
        return;
      }

      panel.style.height = inner.offsetHeight + 'px';
      // Settle to auto on a timer rather than on transitionend. transitionend
      // does not fire if the transition is skipped, interrupted or the tab is
      // throttled, and relying on it left panels stuck at a fixed px height.
      settle = setTimeout(function () {
        if (btn.getAttribute('aria-expanded') === 'true') panel.style.height = 'auto';
      }, DISC_MS + 40);
    }

    function close() {
      btn.setAttribute('aria-expanded', 'false');
      if (settle) clearTimeout(settle);
      // Going from auto straight to 0 does not animate, so pin the current
      // pixel height for one frame first.
      panel.style.height = panel.offsetHeight + 'px';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { panel.style.height = '0px'; });
      });
    }

    if (btn.getAttribute('aria-expanded') === 'true') {
      panel.style.height = 'auto';
    }

    btn.addEventListener('click', function () {
      if (btn.getAttribute('aria-expanded') === 'true') close(); else open();
    });
  });

  /* ------------------------------------------------------------------ *
     4. Composer demo
        Types into a fixed-height field, so the page never reflows while the
        text grows. Picking a starter takes over, exactly like the product.
   * ------------------------------------------------------------------ */

  var typedEl = document.querySelector('.composer__field .typed');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.starter'));

  var BRIEFS = {
    'Landing page': 'A dark, typographic landing page for a private strength gym in Bengaluru — for people who train seriously.',
    'Web app': 'A booking app for four lakeside cabins. Calm, editorial, nothing scheduled that does not need to be.',
    'Dashboard': 'A dashboard tracking build sessions — plans approved, tests run, and anything still marked unverified.',
    'Mini game': 'A small browser game played entirely with the keyboard. Dark, fast, one screen, no menus.',
    'Personal site': 'A dark, gilded page for a concert pianist touring Berlin, Vienna and Tokyo in the 2026 season.'
  };

  if (typedEl && chips.length) {
    var manual = false;
    var timer = null;
    var order = chips.map(function (c) { return c.textContent.trim(); });
    var cursor = 0;

    function select(chip) {
      chips.forEach(function (c) { c.setAttribute('aria-selected', 'false'); });
      chip.setAttribute('aria-selected', 'true');
    }

    function type(text, done) {
      var i = 0;
      (function step() {
        if (manual) return;
        typedEl.textContent = text.slice(0, ++i);
        if (i < text.length) timer = setTimeout(step, 18 + Math.random() * 24);
        else timer = setTimeout(done, 2600);
      })();
    }

    function erase(text, done) {
      var i = text.length;
      (function step() {
        if (manual) return;
        typedEl.textContent = text.slice(0, --i);
        if (i > 0) timer = setTimeout(step, 8);
        else timer = setTimeout(done, 300);
      })();
    }

    function cycle() {
      if (manual) return;
      var brief = BRIEFS[order[cursor % order.length]];
      select(chips[cursor % chips.length]);
      type(brief, function () {
        erase(brief, function () { cursor++; cycle(); });
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        manual = true;
        if (timer) clearTimeout(timer);
        select(chip);
        typedEl.textContent = BRIEFS[chip.textContent.trim()] || '';
      });
    });

    if (reduced) {
      select(chips[0]);
      typedEl.textContent = BRIEFS[order[0]];
    } else if ('IntersectionObserver' in window) {
      // Only run while the composer is actually on screen.
      var started = false;
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !started) { started = true; cycle(); cio.disconnect(); }
        });
      }, { threshold: 0.25 });
      cio.observe(typedEl.parentElement);
    } else {
      cycle();
    }
  }

  /* ------------------------------------------------------------------ *
     5. 3D pointer interaction

     Writes CSS custom properties only, so the browser animates them on the
     compositor. Reads are batched into one rAF per pointer burst — but the
     rAF flag is cleared inside the callback AND guarded by a timestamp, so
     it can never latch on if rAF is paused (the bug that stranded the
     scroll reveal earlier).
   * ------------------------------------------------------------------ */

  var lite = document.documentElement.classList.contains('perf-lite');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!reduced && !lite && fine) {

    /* --- The mark follows the pointer across the whole hero ---------- */

    var mark = document.querySelector('.logo3d');
    var spin = mark && mark.querySelector('.logo3d__spin');
    var hero = document.querySelector('.hero');

    if (mark && spin && hero) {
      var idle = null;

      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width  - 0.5;   // -0.5 .. 0.5
        var ny = (e.clientY - r.top)  / r.height - 0.5;

        mark.classList.add('is-live');
        spin.style.setProperty('--ry', (nx * 52).toFixed(2) + 'deg');
        spin.style.setProperty('--rx', (-ny * 30).toFixed(2) + 'deg');

        // Hand the mark back to its idle animation once the pointer leaves.
        if (idle) clearTimeout(idle);
        idle = setTimeout(function () {
          mark.classList.remove('is-live');
          spin.style.removeProperty('--rx');
          spin.style.removeProperty('--ry');
        }, 2000);
      }, { passive: true });
    }

    /* --- Cards tilt toward the pointer -------------------------------- */

    var pending = null;
    var lastMove = 0;

    // Card tilt removed — the 3D wobble is gone from the design.
    [].forEach.call([], function (el) {
      el.addEventListener('pointermove', function (e) {
        var now = Date.now();
        if (now - lastMove < 16) return;      // timestamp guard, not a latch
        lastMove = now;

        if (pending) cancelAnimationFrame(pending);
        pending = requestAnimationFrame(function () {
          pending = null;
          var r = el.getBoundingClientRect();
          var nx = (e.clientX - r.left) / r.width  - 0.5;
          var ny = (e.clientY - r.top)  / r.height - 0.5;
          el.style.setProperty('--ty', (nx * 7).toFixed(2) + 'deg');
          el.style.setProperty('--tx', (-ny * 7).toFixed(2) + 'deg');
        });
      }, { passive: true });

      el.addEventListener('pointerleave', function () {
        el.style.removeProperty('--tx');
        el.style.removeProperty('--ty');
      });
    });
  }
})();

// 3D Hero Tilt — REMOVED.
// This wrote `perspective(1200px) rotateY() rotateX() translateZ(30px)` onto
// .hero__inner on every mousemove, which warped the headline as the cursor
// moved. That was the "bend" on the title.

// --- ULTRA PREMIUM UI INTERACTIONS ---

(function() {
  // 1. Mouse Spotlight Effect for all glass cards
  document.querySelectorAll('.card, .pane, .mock, .bento, .mini').forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', x + 'px');
      card.style.setProperty('--mouse-y', y + 'px');
    });
  });

  // 2. Magnetic Buttons (pulls slightly towards cursor)
  document.querySelectorAll('.btn, .nav__bar a').forEach(function(btn) {
    btn.addEventListener('mousemove', function(e) {
      var rect = btn.getBoundingClientRect();
      var h = rect.width / 2;
      var v = rect.height / 2;
      var x = e.clientX - rect.left - h;
      var y = e.clientY - rect.top - v;
      btn.style.transform = 'translate(' + (x * 0.15) + 'px, ' + (y * 0.15) + 'px)';
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.transform = 'translate(0px, 0px)';
    });
  });

  // 3. Floating Nav Dock on scroll
  var navBar = document.querySelector('.nav__bar');
  if (navBar) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        navBar.classList.add('nav-scrolled');
      } else {
        navBar.classList.remove('nav-scrolled');
      }
    });
  }
})();

/* --- Scramble text — GitHub Universe-style -------------------------------
   Nav links unscramble on hover; section eyebrows unscramble once when they
   scroll into view. Text nodes only, width locked, skipped under reduced
   motion. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_-+=*#';

  function scramble(el) {
    if (el._scrambling) return;
    var node = null;
    for (var i = el.childNodes.length - 1; i >= 0; i--) {
      if (el.childNodes[i].nodeType === 3 && el.childNodes[i].nodeValue.trim()) { node = el.childNodes[i]; break; }
    }
    if (!node) return;
    var target = node._orig || (node._orig = node.nodeValue);
    el._scrambling = true;
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    var frame = 0, total = Math.min(22, target.length * 2 + 6);
    var t = setInterval(function () {
      frame++;
      var settled = Math.floor((frame / total) * target.length);
      var out = '';
      for (var k = 0; k < target.length; k++) {
        var ch = target[k];
        out += (k < settled || ch === ' ') ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      node.nodeValue = out;
      if (frame >= total) {
        clearInterval(t);
        node.nodeValue = target;
        el.style.minWidth = '';
        el._scrambling = false;
      }
    }, 32);
  }

  document.querySelectorAll('.nav__bar a').forEach(function (a) {
    a.addEventListener('mouseenter', function () { scramble(a); });
    a.addEventListener('focus', function () { scramble(a); });
  });

  var eyebrows = document.querySelectorAll('.eyebrow');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { scramble(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    eyebrows.forEach(function (el) { io.observe(el); });
  }
})();
