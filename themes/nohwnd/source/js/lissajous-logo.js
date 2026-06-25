/*
 * lissajous-logo.js — subtle oscilloscope motion for the jakubjares.com logo.
 *
 * The header logo is an exact 1:3 Lissajous curve:
 *     x(u) = 116.287 + 35.885 * cos(u)
 *     y(u) =  37.5   + 37.5   * cos(3u + delta),   delta = -135deg
 *
 * On a real oscilloscope two oscillators are never perfectly locked, so the
 * relative phase delta drifts slowly and the figure gently morphs. This script
 * reproduces that by re-sampling the curve every frame with a wandering delta
 * and writing it back into the existing <path id="Path-7"> as its "d".
 *
 * Progressive enhancement:
 *   - No JS  -> the original static path stays (unchanged markup = current logo).
 *   - JS     -> the path breathes subtly at rest.
 *   - Hover/tap -> plays ONE random trick and resolves back to the N.
 *   - Idle      -> autoplays a random trick every ~16–34 s.
 *   - prefers-reduced-motion -> motion is disabled, logo stays exact.
 *
 * Drop-in: just include this file. It looks for #Path-7 (the id already in the
 * site markup). No other changes needed. Small API (for preview / tuning):
 *   window.lissajousLogo.play("tumble");  .names;  .random();
 */
(function () {
  "use strict";

  var P = {
    cx: 116.287, ax: 35.885,   // horizontal centre / amplitude
    cy: 37.5,    ay: 37.5,     // vertical   centre / amplitude
    nx: 1,       ny: 3,        // frequency ratio 1:3
    base: -135 * Math.PI / 180 // brand phase
  };

  // --- rest motion (deliberately subtle, but perceptible) ---
  var EXCURSION = 14 * Math.PI / 180; // how far delta wanders from brand at rest
  var SPEED     = 0.45;               // rest phase-hunt rate
  var SAMPLES   = 260;                // polyline resolution (smooth at logo size)
  var TAU = Math.PI * 2;
  var AUTO_MIN = 16000, AUTO_MAX = 34000;  // idle: autoplay a random trick every 16–34 s
  var HOVER_GAP = 550;                     // while hovering: gap (ms) between back-to-back tricks

  function eIO(p){ return p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2, 2)/2; }   // easeInOut

  function build(path) {
    var reduce = window.matchMedia &&
                 window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var force  = (window.LISSAJOUS_FORCE_MOTION === true);
    var original = path.getAttribute("d");
    var svg = path.ownerSVGElement || path.closest("svg");

    // sample the curve -> "d", with optional amplitude scale and frequency override
    function dFor(delta, sx, sy, ny, nx, smp) {
      sx = sx || 1; sy = sy || 1; ny = ny || P.ny; nx = nx || P.nx;
      var N = smp || SAMPLES, d = "M";
      for (var i = 0; i <= N; i++) {
        var u = (i / N) * TAU;
        var x = P.cx + P.ax * sx * Math.cos(nx * u);
        var y = P.cy + P.ay * sy * Math.cos(ny * u + delta);
        d += (i ? "L" : "") + x.toFixed(3) + "," + y.toFixed(3);
      }
      return d + "Z";
    }

    // static (reduced motion): render exact brand shape once and stop.
    // Set window.LISSAJOUS_FORCE_MOTION = true to preview motion anyway.
    if (reduce && !force) { path.setAttribute("d", dFor(P.base)); return; }

    // round stroke for the live version: no miter spikes, curved hole/dash ends
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");

    var NS = "http://www.w3.org/2000/svg";
    var STROKE = path.getAttribute("stroke") || "#fff";
    var SW = path.getAttribute("stroke-width") || "4";   // keep the brand thickness
    var GLOW = "drop-shadow(0 0 1.3px rgba(255,255,255,.6)) drop-shadow(0 0 3.5px rgba(255,255,255,.28))";

    // phosphor echo trails (behind the stroke), used by tumble / spin
    var ECHO_N = 11, ECHO_SAMPLES = 130, echoes = [], echoG = null;
    function ensureEchoes() {
      if (echoG || !svg) return;
      echoG = document.createElementNS(NS, "g");
      echoG.setAttribute("fill", "none"); echoG.setAttribute("stroke", STROKE);
      echoG.setAttribute("stroke-width", SW);
      echoG.setAttribute("stroke-linecap", "round"); echoG.setAttribute("stroke-linejoin", "round");
      echoG.style.filter = "blur(0.4px)";
      for (var j = 0; j < ECHO_N; j++) {
        var e = document.createElementNS(NS, "path"); e.style.opacity = "0";
        echoes.push(e); echoG.appendChild(e);
      }
      svg.insertBefore(echoG, path);          // behind the main stroke
    }

    // bright comet (the electron beam) drawn over a dimmed trace
    var beamArc = null, beamDot = null;
    function ensureBeam() {
      if (beamArc || !svg) return;
      beamArc = document.createElementNS(NS, "path");
      beamArc.setAttribute("fill", "none"); beamArc.setAttribute("stroke", "#fff");
      beamArc.setAttribute("stroke-width", SW); beamArc.setAttribute("stroke-linecap", "round");
      beamArc.style.filter = GLOW; beamArc.style.opacity = "0";
      beamDot = document.createElementNS(NS, "circle");
      beamDot.setAttribute("r", "3.4"); beamDot.setAttribute("fill", "#fff");
      beamDot.style.filter = GLOW; beamDot.style.opacity = "0";
      svg.appendChild(beamArc); svg.appendChild(beamDot);   // on top
    }

    // ---------- the repertoire: each trick resolves back to the N ----------
    // lock:true  -> shape held at the N, the stroke is decorated (dash/beam)
    // (no lock)  -> the shape itself morphs and returns
    var tricks = [
      { name:"hole", dur:1.8, lock:true, fn:function(p,L){            // a hole races round
          var gap = 0.09*L*Math.sin(Math.PI*p);
          return { dash:(L-gap)+" "+gap, off:-eIO(p)*1.6*L };
      }},
      { name:"twoHoles", dur:1.8, lock:true, fn:function(p,L){        // two holes chase
          var seg = L/2, gap = 0.06*L*Math.sin(Math.PI*p);
          return { dash:(seg-gap)+" "+gap, off:-eIO(p)*1.3*L };
      }},
      { name:"beam", dur:1.9, lock:true, comet:true, fn:function(p){  // beam laps once
          return { pos:eIO(p), env:Math.sin(Math.PI*p) };
      }},
      { name:"draw", dur:1.7, lock:true, fn:function(p,L){            // erase then redraw
          var q = p < 0.5 ? p/0.5 : 1-(p-0.5)/0.5;                    // 0 -> 1 -> 0
          return { dash:L+" "+L, off:-eIO(q)*L };
      }},
      { name:"march", dur:1.5, lock:true, fn:function(p,L){           // marching ants
          var env = Math.sin(Math.PI*p);
          return { dash:(0.05*L*env+0.001)+" "+(0.035*L*env+0.001), off:-p*0.5*L };
      }},
      { name:"tumble", dur:2.4, trail:true, fn:function(p){           // fast tumble & back
          var b = Math.sin(Math.PI*p); return { delta:P.base + 2.5*TAU*b*b };
      }},
      { name:"spin", dur:2.0, trail:true, fn:function(p){             // one full spin to N
          return { delta:P.base + TAU*eIO(p) };
      }},
      { name:"spring", dur:1.7, fn:function(p){                       // springy wobble
          return { delta:P.base + (24*Math.PI/180)*Math.exp(-3.2*p)*Math.sin(TAU*3.5*p) };
      }},
      { name:"flip", dur:1.8, fn:function(p){                         // mirror flip & back
          var b = Math.sin(Math.PI*p); return { delta:P.base + Math.PI*b*b };
      }}
    ];

    var rest = 0, cur = null, curStart = 0, curL = 0, lastName = "", lastNow = performance.now();
    var lastDelta = P.base, blendFrom = 0, blendAt = null, BLEND = 0.5;   // eased hand-off
    var hovering = false, nextAt = 0;                                    // autoplay / hover scheduling

    function startTrick(t) {
      cur = t; lastName = t.name; curStart = performance.now(); blendAt = null;
      if (t.lock)  { path.setAttribute("d", dFor(P.base)); curL = path.getTotalLength(); }
      if (t.trail) ensureEchoes();
      if (t.comet) ensureBeam();
    }
    function trigger() {                       // hover/tap -> one random trick (no repeat)
      if (cur) return;
      var t; do { t = tricks[(Math.random()*tricks.length)|0]; }
      while (tricks.length > 1 && t.name === lastName);
      startTrick(t);
    }
    function clearOverlay() {
      path.style.strokeDasharray = ""; path.style.strokeDashoffset = ""; path.style.opacity = "";
      if (svg) svg.style.filter = "";
      if (beamArc) { beamArc.style.opacity = "0"; beamDot.style.opacity = "0"; }
      for (var j = 0; j < echoes.length; j++) echoes[j].style.opacity = "0";
    }
    function wrap(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
    function armNext() {   // schedule the next unattended trick: soon while hovering, long when idle
      nextAt = performance.now() + (hovering ? HOVER_GAP : AUTO_MIN + Math.random() * (AUTO_MAX - AUTO_MIN));
    }

    function tick(now) {
      var dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
      if (document.hidden) { requestAnimationFrame(tick); return; }

      // the rest wander runs on its own clock the whole time
      rest += dt * SPEED;
      var w = (Math.sin(rest) + 0.45*Math.sin(rest*0.37+1.3) + 0.20*Math.sin(rest*1.9+0.6)) / 1.65;
      var restDelta = P.base + EXCURSION * w;

      if (cur) {
        var p = (now - curStart) / (cur.dur * 1000);
        if (p >= 1) { blendFrom = lastDelta; blendAt = now; cur = null; clearOverlay(); armNext(); }
        else {
          var st = cur.fn(p, curL) || {};
          var d = (st.delta != null) ? st.delta : P.base;
          lastDelta = d;
          path.setAttribute("d", dFor(d, st.sx, st.sy, st.ny, st.nx));

          if (st.dash != null) { path.style.strokeDasharray = st.dash; path.style.strokeDashoffset = (st.off||0)+""; }
          else { path.style.strokeDasharray = ""; path.style.strokeDashoffset = ""; }

          if (cur.comet && beamArc) {                       // bright beam over a dimmed trace
            path.style.opacity = (0.24 + 0.08*(1-(st.env||0))) + "";
            var L = curL, arc = 0.14*L, head = (st.pos||0)*L;
            beamArc.setAttribute("d", path.getAttribute("d"));
            beamArc.style.strokeDasharray = arc + " " + (L - arc);
            beamArc.style.strokeDashoffset = (arc - head) + "";
            beamArc.style.opacity = (st.env||0) + "";
            var pt = path.getPointAtLength(head % L);
            beamDot.setAttribute("cx", pt.x); beamDot.setAttribute("cy", pt.y);
            beamDot.style.opacity = (st.env||0) + "";
          }

          if (cur.trail) {                                  // phosphor echoes + bloom
            svg.style.filter = GLOW;
            var env2 = Math.sin(Math.PI*p), lag = 0.30 / cur.dur;
            for (var k = 0; k < ECHO_N; k++) {
              var pe = p - (k+1)/ECHO_N * lag;
              if (pe <= 0) { echoes[k].style.opacity = "0"; continue; }
              var se = cur.fn(pe, curL) || {};
              echoes[k].setAttribute("d", dFor(se.delta!=null?se.delta:P.base, se.sx, se.sy, se.ny, se.nx, ECHO_SAMPLES));
              echoes[k].style.opacity = (0.5 * Math.pow(1-(k+1)/(ECHO_N+1), 1.4) * env2) + "";
            }
          }
          requestAnimationFrame(tick); return;
        }
      }

      // unattended: kick off the next trick (hover = soon, idle = on the long interval)
      if (!cur && now >= nextAt) { trigger(); requestAnimationFrame(tick); return; }

      // rest, with a short eased hand-off after a trick (no jump back into the wander)
      var dd = restDelta;
      if (blendAt != null) {
        var bt = (now - blendAt) / (BLEND * 1000);
        if (bt < 1) dd = restDelta + wrap(blendFrom - restDelta) * (1 - eIO(bt));
        else blendAt = null;
      }
      path.setAttribute("d", dFor(dd));
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    armNext();                                 // first idle autoplay is one long interval away

    // triggers: hover plays a trick; keep hovering -> more, back to back
    var hot = svg || path;
    hot.style.cursor = "pointer";
    hot.addEventListener("pointerenter", function () { hovering = true; trigger(); });
    hot.addEventListener("pointerleave", function () { hovering = false; armNext(); });
    hot.addEventListener("click", trigger);

    // small API for preview / tuning
    window.lissajousLogo = {
      names: tricks.map(function(t){ return t.name; }),
      play: function(name){ for (var i=0;i<tricks.length;i++) if (tricks[i].name===name){ startTrick(tricks[i]); return; } },
      random: trigger
    };

    // safety: if anything throws, leave the original logo intact
    window.addEventListener("error", function () { path.setAttribute("d", original); });
  }

  function init() {
    var path = document.getElementById("Path-7") ||
               document.querySelector("header svg path");
    if (path) build(path);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
