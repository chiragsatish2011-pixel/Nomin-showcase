/* =============================================================================
   Globe — a vanilla port of the Originkit "Globe Study" component.

   The original is React/TSX; this site has no build step and no React, so the
   component is ported to a plain IIFE. The rendering maths, the land bitmap
   and the interaction model are unchanged — only the React scaffolding
   (useRef / useEffect / props) is replaced by a mount function reading
   data-* attributes.

   It is an ELEMENT on the page, not a background: it mounts into .globe and
   is clipped by that container.

   Budget, consistent with the rest of the site:
     · devicePixelRatio capped at 2
     · the loop only runs while the globe is on screen
     · skipped entirely under .perf-lite; a static caption is shown instead
   ============================================================================= */

(function () {
  'use strict';

  var host = document.querySelector('.globe');
  if (!host) return;

  var canvas = host.querySelector('canvas');
  if (!canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lite = document.documentElement.classList.contains('perf-lite');
  if (lite) { host.classList.add('is-static'); return; }

  var ctx = canvas.getContext('2d');
  if (!ctx) { host.classList.add('is-static'); return; }

  var MAX_DPR = 2;
  var FACE = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
  var QA = Math.PI / 36;
  var MW = 288;
  var MH = 144;

  var LAND_B64 =
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPcBAOD/HwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA" +
    "//+P//f/LwgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4/v/4/////wcAAAAEAPABAAAAfAAAAAAAAAAAAAAAAAAAAADg9w/4" +
    "/////wEAAP4AAAAAAAAA+AAAAAAAAAAAAAAAAAAAAIAG+Of//////wAAAHwGAAAAAAAAAAMAAAAAAAAAAAAAAACABwAc/4P/////" +
    "/wAAADAAAAAAQAAAAD4AAAAAAAAAAAAAAAAAfMbDcQAA/v///wAAAAAAAADABwAA//8HAMAPAAAAAAAAAABgAAAAAAAA/P///wAA" +
    "AAAAAABwAADg//8AAAAAAAAAAAAAAADwG457dwcA8P//HwAAAAAAAAAYAAD///9/eAAAAAAAAAAAAAD4/g0H/w8A8P//PwAAAAAA" +
    "AAAOgOv/////fwD/AAAAAAA/AAAA/B84/v8A8P//LwAAAAD4AAAA4PP//////////wAAAOD///H/+D/3cPgDoP//DwAAAID/BwAA" +
    "x/v/////////P4AA/P///////////////////////w8AAOcBAAgAAAAAAAAAAAAAgP///////////////////////wcAACYAAAQA" +
    "AAAAAAAAAAAAgf///////////////////////wMM8AAAAAAAAAAAAAAAAAAAIID/////////e+wPwH8AgA8AAP/5z///////////" +
    "//////8/ANH///////9/AIALgD8AAAAAwH/+//////////////////9/APj///////8fADwAAD8AAAAA8D/+////////////////" +
    "//sPAPC/+f////8fAPwAADgAAAAA8D/+////////////////D/wBAMCfAP////8PAPwYAAAAAAAA8H/4//////////////9/DgcA" +
    "AAAcAOD///8/APw/AAAAAAAQAB7w//////////////8BgAMAAAACAMD/////Afh/AAAAAAA4gBz+/////////////38A4AMAAMAA" +
    "AMD/////B/z/AAAAAABwwAb+/////////////x8A8AEAAAAAAAD/////P///AwAAAADmgOH//////////////z8A4AAAAAAAAAD+" +
    "////P/7/BwAAAAD28P////////////////8D4AAAAAAAAAD8////f/7/BwAAAADz+f////////////////8HIAAAAAAAAAD6////" +
    "////BAAAAABw/v////////////////8EAAAAAAAAAADo//////8jHgAAAACA//////////////////8MAAAAAAAAAADQ//////8O" +
    "PgAAAADw//////////////////8AAAAAAAAAAADg//////+PIAAAAADA////v////////////38EAAAAAAAAAADg////////AAAA" +
    "AACA//v/zD/8/////////z8AAAAAAAAAAADg//////8bAAAAAACA//N/gD///////////x8GAAAAAAAAAADw//////8AAAAAAAD+" +
    "B8c/AD/+/////////wcPAAAAAAAAAADg//////8AAAAAAAD+gx4/DH74/////////wABAAAAAAAAAADg/////x8AAAAAAAD+gbCn" +
    "///8////////fQABAAAAAAAAAADg/////w8AAAAAAAD/gCDn///4//////9/MgADAAAAAAAAAADA/////w8AAAAAAAD+AADm/3/4" +
    "//////8/cIABAAAAAAAAAADA/////wcAAAAAAAA44AHC///5////////4+ABAAAAAAAAAACA/////wcAAAAAAACI/wEA4P//////" +
    "////4OgAAAAAAAAAAAAA/////wMAAAAAAAD4/wAA4P//////////ADYAAAAAAAAAAAAA/P///wEAAAAAAAD+/wEA8P//////////" +
    "AQcAAAAAAAAAAAAA+P//fwAAAAAAAAD//w8P8P//////////AQEAAAAAAAAAAAAAyP//fwAAAAAAAAD//3//////////////AQAA" +
    "AAAAAAAAAAAA0P+PYQAAAAAAAAD//////z//////////AwAAAAAAAAAAAAAAoP8HwAAAAAAAAMD/////83/+////////AQAAAAAA" +
    "AAAAAAAAIP8DwAAAAAAAAOD/////5//I////////AAAAAAAAAAAAAAAAQP4DgAAAAAAAAPD/////z/+A////////AAAAAAAAAAAA" +
    "AAAAAPwDAAIAAAAAAPD/////z/8ZwP////9/AQAAAAAAAAAAAAAAAPgDQAAAAAAAAPj/////j/9/gP////8fAQAAAAAAAAAAAAAA" +
    "APADEAMAAAAAAPz/////v///AP9//P8DAAAAAAAAAAAAAAAAAPADAwwAAAAAAPj/////P/9/APw//B8AAAAAAAAAAAAIAAAAAPCH" +
    "A8AAAAAAAPj/////P/4/APwP+J8BAAAAAAAAAAAAAAAAAMD/A0YEAAAAAPj/////f/4fAPwH+B8AAwAAAAAAAAAAAAAAAAD/AQAA" +
    "AAAAAPj/////f/wHAPgD8D8AAwAAAAAAAAAAAAAAAADgHwAAAAAAAPj///////wDAPgAwH8AAQAAAAAAAAAAAAAAAADAHwAAAAAA" +
    "APz//////30AAPAAwH8AAAAAAAAAAAAAAAAAAAAAHAAAAAAAAPj//////wsAAPAAgH4AAQAAAAAAAAAAAAAAAAAAGEAAAAAAAPj/" +
    "/////wMBAPAAgHwAAAAAAAAAAAAAAAAAAAAAGPAhAAAAAPD///////cBAOAAgDiABAAAAAAAAAAAAAAAAAAAIPl/AAAAAOD/////" +
    "//8AAGABABBAFAAAAAAAAAAAAAAAAAAAgP7/AQAAAMD///////8AAAABgAAAHAAAAAAAAAAAAAAAAAAAAPz/AQAAAID///////8A" +
    "AAABAAEgCAAAAAAAAAAAAAAAAAAAAPz/HwAAAAD/8P///38AAAAAAANgAAAAAAAAAAAAAAAAAAAAAPz/fwAAAAAAoP///z8AAAAA" +
    "YAd4AAAAAAAAAAAAAAAAAAAAAPz/fwAAAAAAAP///x8AAAAAwAY8AAAAAAAAAAAAAAAAAAAAAP7//wAAAAAAAP///w8AAAAAgAc+" +
    "AAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAP///wcAAAAAgIM/TwAAAAAAAAAAAAAAAAAAAP///wEAAAAAgP///wMAAAAAAIc/QAQA" +
    "AAAAAAAAAAAAAAAAgP///w8AAAAAgP///wEAAAAAAA6fAUQAAAAAAAAAAAAAAAAAAP////8AAAAAAP///wAAAAAAAB6ewuwDAgAA" +
    "AAAAAAAAAAAAgP////8DAAAAAP7//wAAAAAAABwAAvAPAgAAAAAAAAAAAAAAgP////8PAAAAAPz/fwAAAAAAABAAAMCfAQAAAAAA" +
    "AAAAAAAAAP////8PAAAAAPz//wAAAAAAAOADAIA/MAAAAAAAAAAAAAAAAP7///8PAAAAAPz/fwAAAAAAAAAPAMBngAAAAAAAAAAA" +
    "AAAAAP7///8PAAAAAPz//wAAAAAAAAAACABAAAAAAAAAAAAAAAAAAPz///8HAAAAAPj//wAAAAAAAAAAAAAAAAIAAAAAAAAAAAAA" +
    "APz///8DAAAAAPj//wAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAPj///8BAAAAAPz//4AAAAAAAAAAAB8GAAAAAAAAAAAAAAAAAPj/" +
    "//8BAAAAAPz//8EAAAAAAAAAIB8OAAAAAAAAAAAAAAAAAPD///8BAAAAAP7//+AAAAAAAAAA+B8OACAAAAAAAAAAAAAAAMD///8B" +
    "AAAAAP7/f/gAAAAAAAAA/H8eAAAAAAAAAAAAAAAAAID///8AAAAAAP7/H/gAAAAAAAAA/P8fAABAAAAAAAAAAAAAAAD///8AAAAA" +
    "APz/D3AAAAAAAAAA/v8/AAAAAAAAAAAAAAAAAAD///8AAAAAAPj/D3gAAAAAAADA//9/AAgAAAAAAAAAAAAAAAD//38AAAAAAPj/" +
    "DzgAAAAAAADw////AAAAAAAAAAAAAAAAAAD//x8AAAAAAPD/DzgAAAAAAAD4////AQAAAAAAAAAAAAAAAAD//wMAAAAAAPD/DzgA" +
    "AAAAAAD4////AwAAAAAAAAAAAAAAAID//wEAAAAAAPD/AwAAAAAAAAD4////AwAAAAAAAAAAAAAAAID//wEAAAAAAPD/AwAAAAAA" +
    "AAD4////BwAAAAAAAAAAAAAAAID//wEAAAAAAOD/AwAAAAAAAAD4////BwAAAAAAAAAAAAAAAID//wAAAAAAAOD/AQAAAAAAAADw" +
    "////BwAAAAAAAAAAAAAAAID//wAAAAAAAMD/AAAAAAAAAADw////AwAAAAAAAAAAAAAAAID/fwAAAAAAAIB/AAAAAAAAAADgf/z/" +
    "AwAAAAAAAAAAAAAAAID/PwAAAAAAAIA/AAAAAAAAAADgB/D/AQAAAAAAAAAAAAAAAMD/HQAAAAAAAIABAAAAAAAAAADwAND/AQAA" +
    "AAAAAAAAAAAAAMD/AwAAAAAAAAAAAAAAAAAAAAAAAID/AAAIAAAAAAAAAAAAAMD/BwAAAAAAAAAAAAAAAAAAAAAAAAD/AAAQAAAA" +
    "AAAAAAAAAOD/AwAAAAAAAAAAAAAAAAAAAAAAAAA+AABwAAAAAAAAAAAAAOA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAA" +
    "AAAAAOA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAOAPAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAGAAAAAAAAAAAA" +
    "AMAPAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAADAAAAAAAAAAAAAPAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABAAAAAAAAAAAAAPAD" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAOABAAAAAAAAAAAAAPAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAHAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPADAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAPABAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPCBAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGABAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAA" +
    "AAAAAAAAAAAAAAAcAAAAAAAAAAAAAAA+AABAAJ8//j8PAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAPD/fwD///////8/AAAAAAAA" +
    "AAAAAAAAAIA+AAAAAAAAAAAAPP///8D/////////HwAAAAAAAAAAAAAAAIA9AAAAAAAA8Pz/////P/j//////////wMAAAAAAAAA" +
    "AMAAAPB9AAAAAID/////////P/7///////////8BAAAAAAAAAOABAwB/AAAAAPD///////////////////////8AAAAAAFACPoD/" +
    "//9/AAAAAPD//////////////////////x8AAAAA+P////////8HAAAAAP///////////////////////wcAAAAA/v///////wMA" +
    "AAAA/v///////////////////////wcAAAD8/////////w8AAA7w/////////////////////////w8AAMAB/////////wMAgB84" +
    "/////////////////////////wEAAAAA/P///////3/w4AcA/////////////////////////wAAAADg//////////8/gM//////" +
    "/////////////////////wMAAADg/////////////f///////////////////////////z8A7wMA/v//////////////////////" +
    "//////////////////8/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAA";

  /* ---- helpers --------------------------------------------------------- */

  function clampN(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function parseRGB(input, fb) {
    if (!input) return fb;
    var str = String(input).trim();
    if (str.charAt(0) === '#') {
      var hex = str.slice(1);
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      if (hex.length >= 6) {
        var r = parseInt(hex.slice(0, 2), 16),
            g = parseInt(hex.slice(2, 4), 16),
            b = parseInt(hex.slice(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
      }
      return fb;
    }
    var m = str.match(/[\d.]+/g);
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
    return fb;
  }

  /* ---- configuration, read off the element ----------------------------- */

  var baseColor = host.dataset.color || '#C9B4FF';
  var phrase = (host.dataset.phrase || 'describetheoutcomenominplansitbuildsitandverifiesit').toLowerCase();

  var V = {
    density: 0.53,
    glyphSize: parseFloat(host.dataset.glyph) || 1.15,
    speed: reduced ? 0 : 1,
    hover: 1,
    radius: parseFloat(host.dataset.radius) || 1.38,
    drift: reduced ? 0 : 2.1,
    letters: 1,
    zoom: 1,
    light: 1.4,
    pins: 7
  };

  /* ---- land bitmap ------------------------------------------------------ */

  var land = null;
  try {
    var bin = atob(LAND_B64);
    land = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) land[i] = bin.charCodeAt(i);
  } catch (e) { land = null; }

  function isLand(lon, lat) {
    if (!land) return false;
    var gx = Math.floor(((lon + 180) / 360) * MW);
    var gy = Math.floor(((90 - lat) / 180) * MH);
    if (gx < 0 || gx >= MW || gy < 0 || gy >= MH) return false;
    var b = gy * MW + gx;
    return ((land[b >> 3] >> (b & 7)) & 1) === 1;
  }

  /* ---- node field -------------------------------------------------------- */

  var nodes = [];
  var builtKey = '';

  function build(dens, letterK, text) {
    var step = 3.05 / dens;
    nodes = [];
    var k = 0, run = 0, sea3 = 0;
    var every = letterK <= 0 ? 0 : Math.max(1, Math.round(2 / letterK));
    for (var lat = -86; lat <= 86; lat += step) {
      var rl = Math.cos((lat * Math.PI) / 180);
      var n = Math.max(1, Math.round(98 * dens * rl));
      for (var i = 0; i < n; i++) {
        var lon = -180 + (360 * i) / n;
        var l = isLand(lon, lat);
        if (!l && sea3++ % 2) continue;
        var letter = '';
        if (l && every && run++ % every === 0) letter = text.charAt(k++ % text.length);
        nodes.push({ lat: (lat * Math.PI) / 180, lon: (lon * Math.PI) / 180, land: l, c: letter });
      }
    }
    builtKey = dens + '|' + letterK + '|' + text;
  }

  /* ---- state ------------------------------------------------------------- */

  var pins = [];
  var view = { cx: 0, cy: 0, R: 1, cs: 1, sn: 0, ct: 1, st: 0 };
  var ptr = { on: 0, x: -1e9, y: -1e9, dragging: 0, dx: 0, dy: 0, moved: 0, click: 0 };

  var raf = 0, last = performance.now(), clock = 0;
  var spin = 2.1, vel = 0.16, tilt = -0.36, vtilt = 0;
  var zoom = 1, zoomT = 1, seenClick = 0;
  var sea = [], soil = [], land8 = [];
  var running = false;

  function unproject(px, py) {
    var x1 = (px - view.cx) / view.R;
    var y2 = (view.cy - py) / view.R;
    var q = 1 - x1 * x1 - y2 * y2;
    if (q <= 0.002) return null;
    var z2 = Math.sqrt(q);
    var y0 = y2 * view.ct + z2 * view.st;
    var z1 = -y2 * view.st + z2 * view.ct;
    var x0 = x1 * view.cs + z1 * view.sn;
    var z0 = -x1 * view.sn + z1 * view.cs;
    return { lat: Math.asin(clampN(y0, -1, 1)), lon: Math.atan2(z0, x0) };
  }

  /* ---- render ------------------------------------------------------------ */

  function render(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var sp = V.speed;
    clock += dt * sp;

    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var rect = canvas.getBoundingClientRect();
    var cw = rect.width || canvas.clientWidth || 600;
    var ch = rect.height || canvas.clientHeight || 400;
    var bw = Math.max(1, Math.round(cw * dpr));
    var bh = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    var key = V.density + '|' + V.letters + '|' + phrase;
    if (key !== builtKey) build(V.density, V.letters, phrase);

    var u = Math.min(cw, ch);
    var hv = V.hover * (ptr.on ? 1 : 0);

    zoom += (zoomT - zoom) * Math.min(1, dt / 0.18);

    var cx = cw / 2;
    var cy = ch / 2 + u * 0.035;
    var R = u * 0.318 * zoom * V.radius;
    var fs = u * 0.0275 * Math.pow(zoom, 0.72) * V.glyphSize;

    if (ptr.dragging) {
      var dspin = (ptr.dx * u) / R;
      var dtilt = (-ptr.dy * u) / R;
      ptr.dx = 0; ptr.dy = 0;
      spin += dspin;
      tilt = clampN(tilt + dtilt, -1.15, 1.15);
      var k2 = Math.min(1, dt / 0.07);
      var inv = 1 / Math.max(dt, 1 / 240);
      vel += (clampN(dspin * inv, -9, 9) - vel) * k2;
      vtilt += (clampN(dtilt * inv, -9, 9) - vtilt) * k2;
    } else {
      var idle = 0.16 * V.drift * (hv > 0 ? 0.28 : 1);
      vel += (idle - vel) * Math.min(1, (dt * sp) / 0.9);
      vtilt *= Math.exp(-dt * sp * 6.6);
      tilt = clampN(tilt + vtilt * dt * sp, -1.15, 1.15);
      tilt += (-0.36 - tilt) * Math.min(1, (dt * sp) / 4);
      spin += vel * dt * sp;
    }

    if (ptr.click !== seenClick) {
      seenClick = ptr.click;
      var g = unproject(ptr.x, ptr.y);
      if (g && V.pins > 0) {
        pins.push({ lat: g.lat, lon: g.lon, t: clock });
        while (pins.length > V.pins) pins.shift();
      }
    }

    var cs = Math.cos(spin), sn = Math.sin(spin);
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    view.cx = cx; view.cy = cy; view.R = R;
    view.cs = cs; view.sn = sn; view.ct = ct; view.st = st;

    var lightK = V.light * hv;
    var lx = lightK > 0 && !ptr.dragging ? ptr.x : -1e9;
    var ly = lightK > 0 && !ptr.dragging ? ptr.y : -1e9;
    var lr = u * 0.2, lr2 = lr * lr;

    var ink = parseRGB(baseColor, [201, 180, 255]);
    var rgb = ink[0] + ',' + ink[1] + ',' + ink[2];
    function tone(a) { return 'rgba(' + rgb + ',' + clampN(a, 0, 1).toFixed(3) + ')'; }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    sea.length = 0; soil.length = 0;
    for (var bi = 0; bi < 8; bi++) if (land8[bi]) land8[bi].length = 0;

    for (var i2 = 0; i2 < nodes.length; i2++) {
      var nd = nodes[i2];
      var cl = Math.cos(nd.lat);
      var x0 = cl * Math.cos(nd.lon);
      var y0 = Math.sin(nd.lat);
      var z0 = cl * Math.sin(nd.lon);
      var x1b = x0 * cs - z0 * sn;
      var z1b = x0 * sn + z0 * cs;
      var y2b = y0 * ct - z1b * st;
      var z2b = y0 * st + z1b * ct;
      if (z2b <= 0.02) continue;

      var px = cx + x1b * R;
      var py = cy - y2b * R;
      var ddx = px - lx, ddy = py - ly;
      var glow = ddx * ddx + ddy * ddy < lr2 ? (1 - Math.sqrt(ddx * ddx + ddy * ddy) / lr) * lightK : 0;

      if (!nd.land) { sea.push(px, py, Math.min(0.999, z2b + glow * 0.55)); continue; }
      if (!nd.c)    { soil.push(px, py, Math.min(0.999, z2b + glow * 0.55)); continue; }

      var tx0 = -Math.sin(nd.lon), tz0 = Math.cos(nd.lon);
      var tx1 = tx0 * cs - tz0 * sn;
      var tz1 = tx0 * sn + tz0 * cs;
      var ang = Math.round(Math.atan2(tz1 * st, tx1) / QA) * QA;
      var b2 = Math.min(7, Math.max(0, (Math.min(0.999, z2b + glow * 0.6) * 7.99) | 0));
      (land8[b2] || (land8[b2] = [])).push(px, py, ang, i2);
    }

    var dmin = Math.max(0.7, u * 0.0029);
    function dots(list, baseA, gain, grow) {
      for (var lvl = 0; lvl < 6; lvl++) {
        var z = (lvl + 0.5) / 6;
        var dsz = dmin * grow * (0.55 + 0.75 * z);
        ctx.fillStyle = tone(baseA + gain * z);
        ctx.beginPath();
        for (var q = 0; q < list.length; q += 3) {
          var lv = list[q + 2] >= 1 ? 5 : (list[q + 2] * 6) | 0;
          if (lv !== lvl) continue;
          ctx.rect(list[q] - dsz / 2, list[q + 1] - dsz / 2, dsz, dsz);
        }
        ctx.fill();
      }
    }
    dots(sea, 0.1, 0.22, 1.0);
    dots(soil, 0.34, 0.46, 1.7);

    for (var bi2 = 0; bi2 < 8; bi2++) {
      var arr = land8[bi2];
      if (!arr || !arr.length) continue;
      var zb = (bi2 + 0.5) / 8;
      ctx.font = 'bold ' + (fs * (0.42 + 0.58 * zb)).toFixed(2) + 'px ' + FACE;
      ctx.fillStyle = tone(0.28 + 0.72 * Math.pow(zb, 0.6));
      for (var t2 = 0; t2 < arr.length; t2 += 4) {
        ctx.save();
        ctx.translate(arr[t2], arr[t2 + 1]);
        ctx.rotate(arr[t2 + 2]);
        ctx.fillText(nodes[arr[t2 + 3]].c, 0, 0);
        ctx.restore();
      }
    }

    // Circumference. The limb was only implied by where the dot field ran
    // out, which read as a vague smudge rather than a sphere. An explicit
    // rim plus a thin inner falloff gives the globe a readable edge.
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = tone(0.30);
    ctx.lineWidth = Math.max(1, u * 0.0018);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.995, 0, Math.PI * 2);
    ctx.strokeStyle = tone(0.10);
    ctx.lineWidth = Math.max(2, u * 0.006);
    ctx.stroke();

    for (var pi = 0; pi < pins.length; pi++) {
      var pn = pins[pi];
      var pcl = Math.cos(pn.lat);
      var ax = pcl * Math.cos(pn.lon), ay = Math.sin(pn.lat), az = pcl * Math.sin(pn.lon);
      var bx1 = ax * cs - az * sn;
      var bz1 = ax * sn + az * cs;
      var by2 = ay * ct - bz1 * st;
      var bz2 = ay * st + bz1 * ct;
      if (bz2 <= 0.02) continue;
      var ppx = cx + bx1 * R, ppy = cy - by2 * R;
      var age = clock - pn.t;
      var pop = Math.min(1, age / 0.22);
      var rr2 = u * 0.016 * (0.4 + 0.6 * pop) * (0.55 + 0.45 * bz2);
      ctx.beginPath(); ctx.arc(ppx, ppy, rr2, 0, Math.PI * 2);
      ctx.strokeStyle = tone(0.3 + 0.55 * bz2);
      ctx.lineWidth = Math.max(0.7, u * 0.0022); ctx.stroke();
      ctx.beginPath(); ctx.arc(ppx, ppy, Math.max(0.7, rr2 * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = tone(0.45 + 0.55 * bz2); ctx.fill();
      if (age < 0.9) {
        var w2 = 1 - age / 0.9;
        ctx.beginPath(); ctx.arc(ppx, ppy, rr2 + (1 - w2) * u * 0.05, 0, Math.PI * 2);
        ctx.strokeStyle = tone(0.55 * w2 * w2);
        ctx.lineWidth = Math.max(0.6, u * 0.0016); ctx.stroke();
      }
    }

    host.classList.add('is-ready');
    raf = requestAnimationFrame(render);
  }

  /* ---- interaction -------------------------------------------------------- */

  var lastX = 0, lastY = 0;

  function localPoint(e) {
    var r = canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function track(e) {
    var p = localPoint(e); if (!p) return;
    ptr.on = 1;
    if (ptr.dragging) {
      var r = canvas.getBoundingClientRect();
      var u = Math.min(r.width, r.height);
      ptr.dx += (p.x - lastX) / u;
      ptr.dy += (p.y - lastY) / u;
      ptr.moved = 1;
    }
    ptr.x = p.x; ptr.y = p.y; lastX = p.x; lastY = p.y;
  }
  function onDown(e) {
    var p = localPoint(e); if (!p) return;
    ptr.dragging = 1; ptr.moved = 0;
    ptr.x = p.x; ptr.y = p.y; lastX = p.x; lastY = p.y;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onUp() {
    if (ptr.dragging && !ptr.moved) ptr.click++;
    ptr.dragging = 0;
  }
  function onLeave() { if (!ptr.dragging) ptr.on = 0; }
  function onCancel() { ptr.dragging = 0; ptr.on = 0; }

  canvas.addEventListener('pointermove', track);
  canvas.addEventListener('pointerenter', track);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  // Deliberately NO wheel handler: hijacking the page scroll to zoom a
  // decorative element is hostile on a landing page.

  /* ---- only run while on screen ------------------------------------------ */

  function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(render); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
    }, { threshold: 0.05 }).observe(host);
  } else {
    start();
  }
})();
