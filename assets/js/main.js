/* Justin Worachek — portfolio scripts. No dependencies. */
(function () {
  "use strict";

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Case-study table of contents: highlight current section ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove("active"); });
          var link = byId[entry.target.id];
          if (link) link.classList.add("active");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /* ---------- Lightbox for gallery images ---------- */
  var zoomables = document.querySelectorAll(".gallery img, img[data-zoom]");
  if (zoomables.length) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Enlarged image");
    var big = document.createElement("img");
    big.alt = "";
    box.appendChild(big);
    document.body.appendChild(box);
    var close = function () { box.classList.remove("open"); big.removeAttribute("src"); };
    box.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    zoomables.forEach(function (img) {
      img.setAttribute("tabindex", "0");
      var open = function () {
        big.src = img.getAttribute("data-full") || img.currentSrc || img.src;
        big.alt = img.alt;
        box.classList.add("open");
      };
      img.addEventListener("click", open);
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    });
  }

  /* ---------- Generic segmented-control stepper ----------
     <div data-stepper="name"> with buttons [data-step="key"] and
     a JSON <script type="application/json" data-steps> holding {key: {title, body, chips}} */
  document.querySelectorAll("[data-stepper]").forEach(function (root) {
    var dataEl = root.querySelector("script[data-steps]");
    if (!dataEl) return;
    var steps = JSON.parse(dataEl.textContent);
    var title = root.querySelector("[data-panel-title]");
    var body = root.querySelector("[data-panel-body]");
    var chips = root.querySelector("[data-panel-chips]");
    var buttons = root.querySelectorAll("[data-step]");
    function show(key) {
      var s = steps[key];
      if (!s) return;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-step") === key ? "true" : "false"); });
      if (title) title.textContent = s.title;
      if (body) body.innerHTML = s.body;
      if (chips) {
        chips.innerHTML = "";
        (s.chips || []).forEach(function (c) {
          var li = document.createElement("li");
          var span = document.createElement("span");
          span.className = "chip";
          span.textContent = c;
          li.appendChild(span);
          chips.appendChild(li);
        });
      }
      root.dispatchEvent(new CustomEvent("stepchange", { detail: key }));
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-step")); });
    });
    root._show = show;
    show(buttons[0].getAttribute("data-step"));
  });

  /* ---------- Robot state machine: link SVG nodes to the stepper + fake serial monitor ---------- */
  var fsm = document.querySelector("[data-stepper='fsm']");
  if (fsm) {
    var nodes = fsm.querySelectorAll(".node[data-state]");
    nodes.forEach(function (n) {
      n.setAttribute("tabindex", "0");
      n.setAttribute("role", "button");
      var go = function () { fsm._show(n.getAttribute("data-state")); };
      n.addEventListener("click", go);
      n.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
    var current = null;
    fsm.addEventListener("stepchange", function (e) {
      current = e.detail;
      nodes.forEach(function (n) { n.classList.toggle("active", n.getAttribute("data-state") === current); });
    });
    // Re-sync now that the listener exists
    var pressed = fsm.querySelector("[data-step][aria-pressed='true']");
    if (pressed) fsm._show(pressed.getAttribute("data-step"));

    // Serial monitor: prints lines in the same format as the robot's own print() calls
    var serial = fsm.querySelector(".serial");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (serial) {
      // Distance ranges (cm) that put the final controller (AE 1 Task 4.py) in each state
      var ranges = {
        AVOIDING: { f: [3, 14.9], s: [8, 19] },
        AWAY_FROM_WALL: { f: [26, 60], s: [3, 6.9] },
        TOWARD_WALL: { f: [26, 60], s: [10.1, 18] },
        WALL_FOLLOWING: { f: [26, 60], s: [7.1, 10] },
        END: { f: [51, 100], s: [51, 100] }
      };
      var rnd = function (r) { return (r[0] + Math.random() * (r[1] - r[0])).toFixed(1); };
      var lines = [];
      var tick = function () {
        var st = current || "WALL_FOLLOWING";
        var r = ranges[st];
        if (!r) return;
        lines.push('State: <span class="st">' + st + "</span> | Front: " + rnd(r.f) + "cm | Side: " + rnd(r.s) + "cm" + (st === "END" ? "<br>end" : ""));        while (lines.join("<br>").split("<br>").length > 5) lines.shift();
        serial.innerHTML = lines.join("<br>");
      };
      tick();
      if (!reduce) setInterval(tick, 700);
    }
  }
})();
