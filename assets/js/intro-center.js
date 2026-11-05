/* Opening animation: the logo appears large in the centre, copper stems
   branch out from its edges, then the logo glides into the header and the
   page appears. Runs only when the <head> snippet has added "intro-c". */
(function () {
  "use strict";
  var doc = document.documentElement;
  if (!doc.classList.contains("intro-c")) return;

  var NS = "http://www.w3.org/2000/svg";
  var finished = false, overlay = null, timers = [];

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  function finish(instant) {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (t) {
      window.removeEventListener(t, skip, true);
    });
    try { sessionStorage.setItem("jw-intro", "1"); } catch (e) {}
    if (!instant) doc.classList.add("intro-c-reveal");
    doc.classList.remove("intro-c");
    if (overlay) overlay.remove();
    setTimeout(function () { doc.classList.remove("intro-c-reveal"); }, 1200);
  }
  function skip() { finish(true); }

  function draw(path, delay, dur) {
    var len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: dur, delay: delay, easing: "cubic-bezier(.55,0,.2,1)", fill: "forwards" });
  }
  function pulse(path, delay, dur) {
    var len = path.getTotalLength(), seg = Math.min(40, len * 0.3);
    path.style.strokeDasharray = seg + " " + (len + seg);
    path.style.strokeDashoffset = seg;
    path.style.opacity = 0;
    path.animate([{ strokeDashoffset: seg, opacity: 1 }, { strokeDashoffset: -len, opacity: 1 }],
      { duration: dur, delay: delay, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
  }

  function run() {
    var mark = document.querySelector(".brand-mark");
    var src = mark && mark.querySelector("svg");
    if (!mark || !src || window.scrollY > 40 || typeof Element.prototype.animate !== "function") { finish(true); return; }

    var W = window.innerWidth, H = window.innerHeight;
    var size = Math.round(Math.min(132, Math.max(88, Math.min(W, H) * 0.17)));
    var cx = W / 2, cy = H * 0.46, half = size / 2;
    var reach = Math.min(W, H) / 640;          // scales stem lengths to the screen

    overlay = document.createElement("div");
    overlay.className = "introc-overlay";
    overlay.setAttribute("aria-hidden", "true");
    var svg = svgEl("svg", { "class": "stems" }, overlay);
    var logo = document.createElement("div");
    logo.className = "introc-logo";
    logo.style.width = size + "px";
    logo.style.height = size + "px";
    logo.style.left = (cx - half) + "px";
    logo.style.top = (cy - half) + "px";
    logo.appendChild(src.cloneNode(true));
    overlay.appendChild(logo);
    document.body.appendChild(overlay);

    // 1) Logo appears
    logo.animate([{ opacity: 0, transform: "translate(" + half * 0.08 + "px," + half * 0.08 + "px) scale(0.92)" }, { opacity: 1, transform: "none" }],
      { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" });

    // 2) Stems branch out from each edge: out, 45° bend away from centre, then straight
    var stems = [];
    var sideOffsets = [-0.62, -0.22, 0.22, 0.62];       // positions along each edge (fraction of half-size)
    var lengths = [190, 260, 230, 150];
    var dirs = [
      { ox: 1, oy: 0 },  { ox: -1, oy: 0 },              // right, left
      { ox: 0, oy: -1 }, { ox: 0, oy: 1 }                 // top, bottom
    ];
    dirs.forEach(function (dir, si) {
      var vertical = dir.oy !== 0;
      var offs = vertical ? [-0.4, 0.4] : sideOffsets;
      offs.forEach(function (f, i) {
        var along = f * half;
        var sx = cx + dir.ox * (half + 2) + (vertical ? along : 0);
        var sy = cy + dir.oy * (half + 2) + (vertical ? 0 : along);
        var out1 = (18 + Math.abs(f) * 26) * reach;
        var bend = (26 + Math.abs(f) * 40) * reach;
        var tail = (vertical ? 90 : lengths[i]) * reach;
        var sgn = f < 0 ? -1 : 1;
        var pts = [[sx, sy]];
        var x = sx, y = sy;
        if (!vertical) {
          x += dir.ox * out1; pts.push([x, y]);
          x += dir.ox * bend; y += sgn * bend; pts.push([x, y]);
          x += dir.ox * tail; pts.push([x, y]);
        } else {
          y += dir.oy * out1; pts.push([x, y]);
          x += sgn * bend; y += dir.oy * bend; pts.push([x, y]);
          y += dir.oy * tail; pts.push([x, y]);
        }
        var d = "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L");
        stems.push({ d: d, end: pts[pts.length - 1], order: si * 4 + i });
      });
    });
    stems.forEach(function (s, k) {
      var delay = 240 + (k % 4) * 35 + Math.floor(k / 4) * 20;
      var p = svgEl("path", { d: s.d, "class": "trace" }, svg);
      draw(p, delay, 560);
      var v = svgEl("circle", { cx: s.end[0], cy: s.end[1], r: 3.4, "class": "via" }, svg);
      v.style.opacity = 0;
      v.animate([{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: 200, delay: delay + 520, easing: "cubic-bezier(.2,.8,.2,1.3)", fill: "forwards" });
      if (k % 3 === 0) pulse(svgEl("path", { d: s.d, "class": "pulse" }, svg), delay + 380, 420);
    });

    // 3) Stems fade, logo glides into the header, page appears
    svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay: 1080, fill: "forwards" });
    var target = mark.getBoundingClientRect();
    var scale = target.width / size;
    var dx = target.left - (cx - half), dy = target.top - (cy - half);
    logo.animate([{ transform: "none" }, { transform: "translate(" + dx + "px," + dy + "px) scale(" + scale + ")" }],
      { duration: 520, delay: 1080, easing: "cubic-bezier(.65,0,.25,1)", fill: "forwards" });

    var freeze = /[?&]freeze=(\d+)/.exec(location.search);
    if (freeze) {
      overlay.getAnimations({ subtree: true }).forEach(function (a) { a.pause(); a.currentTime = +freeze[1]; });
      return;
    }
    later(function () { doc.classList.add("intro-c-reveal"); }, 1250);
    later(function () { finish(false); }, 1620);
  }

  ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (t) {
    window.addEventListener(t, skip, true);
  });
  function start() {
    if (document.visibilityState === "hidden") { finish(true); return; }
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var go = function () {
      if (finished || !doc.classList.contains("intro-c")) { finish(true); return; }
      run();
    };
    Promise.race([ready, new Promise(function (r) { setTimeout(r, 600); })]).then(go, go);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
