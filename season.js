/* Shivtej Footwear - season animations.
   ShivtejSeason.play(key)                -> plays the season over the whole screen for about 8 seconds, then removes itself.
   ShivtejSeason.play(key, {host: el})    -> plays inside one box (admin preview).
   ShivtejSeason.LIST                     -> the seasons, in calendar order (same keys in the web admin and the owner app).
   Sound: soft, made in the browser (no sound files). Browsers allow sound only after the visitor touches the page,
   so on the website the sound starts with the first tap while the animation is running. */
(function () {
  "use strict";

  var LIST = [
    { key: "sankranti", hi: "मकर संक्रांति", en: "Makar Sankranti", what: "पतंगें, हवा की आवाज़" },
    { key: "republic", hi: "गणतंत्र / स्वतंत्रता दिवस", en: "Republic & Independence Day", what: "तिरंगे की पंखुड़ियाँ, ढोल और घंटी" },
    { key: "holi", hi: "होली", en: "Holi", what: "उड़ता गुलाल, ढोल" },
    { key: "padwa", hi: "गुढी पाडवा", en: "Gudi Padwa", what: "आम के पत्ते और गेंदे का तोरण, घंटी" },
    { key: "summer", hi: "गर्मी", en: "Summer", what: "धूप, तितलियाँ, चिड़ियों की आवाज़" },
    { key: "eid", hi: "ईद", en: "Eid", what: "चाँद, तारे, कंदील, घंटियाँ" },
    { key: "monsoon", hi: "बरसात", en: "Monsoon", what: "बारिश, बिजली, बारिश की आवाज़" },
    { key: "ganesh", hi: "गणपति", en: "Ganesh Chaturthi", what: "जास्वंद और गेंदे के फूल, ढोल-ताशा, घंटी" },
    { key: "navratri", hi: "नवरात्रि / दसरा", en: "Navratri & Dussehra", what: "रंगीन पंखुड़ियाँ, सुनहरी चमक, डांडिया" },
    { key: "diwali", hi: "दिवाली", en: "Diwali", what: "दीये, आकाश कंदील, आतिशबाज़ी, पटाखे" },
    { key: "winter", hi: "सर्दी", en: "Winter", what: "बर्फ़, ठंडी हवा" },
    { key: "christmas", hi: "क्रिसमस", en: "Christmas", what: "रंगीन लाइटें, बर्फ़, घंटियाँ" },
    { key: "newyear", hi: "नया साल", en: "New Year", what: "कंफ़ेटी, सुनहरी आतिशबाज़ी" }
  ];

  var TAU = Math.PI * 2;
  function R(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------------- small cached pictures (sprites) ---------------- */
  var cache = {};
  function sprite(id, size, draw) {
    if (cache[id]) return cache[id];
    var c = document.createElement("canvas");
    c.width = c.height = size;
    draw(c.getContext("2d"), size);
    return (cache[id] = c);
  }
  function glow(color, size) {
    return sprite("g" + color + size, size, function (g, s) {
      var r = s / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.18, color);
      gr.addColorStop(0.5, color.replace(/,\s*[\d.]+\)$/, ",0.35)"));
      gr.addColorStop(1, color.replace(/,\s*[\d.]+\)$/, ",0)"));
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  }
  function soft(color, size) {
    return sprite("s" + color + size, size, function (g, s) {
      var r = s / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, color);
      gr.addColorStop(0.55, color.replace(/,\s*[\d.]+\)$/, ",0.45)"));
      gr.addColorStop(1, color.replace(/,\s*[\d.]+\)$/, ",0)"));
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  }
  function marigold(size, hue) {
    return sprite("m" + size + hue, size, function (g, s) {
      var r = s / 2;
      g.translate(r, r);
      var rings = [[0.95, 18, hue === "y" ? "#e3a008" : "#d9480f"], [0.75, 15, hue === "y" ? "#f5b800" : "#f76707"], [0.52, 12, hue === "y" ? "#ffd43b" : "#ff922b"], [0.3, 9, hue === "y" ? "#ffe066" : "#ffa94d"]];
      rings.forEach(function (ring, k) {
        for (var i = 0; i < ring[1]; i++) {
          var a = i / ring[1] * TAU + k * 0.3;
          g.save(); g.rotate(a);
          g.fillStyle = ring[2];
          g.beginPath(); g.ellipse(r * ring[0] * 0.55, 0, r * ring[0] * 0.42, r * ring[0] * 0.2, 0, 0, TAU); g.fill();
          g.restore();
        }
      });
      g.fillStyle = "rgba(120,40,0,.35)"; g.beginPath(); g.arc(0, 0, r * 0.12, 0, TAU); g.fill();
    });
  }

  /* ---------------- shapes ---------------- */
  function petalPath(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.75, -s * 0.55, s * 0.55, s * 0.6, 0, s);
    ctx.bezierCurveTo(-s * 0.55, s * 0.6, -s * 0.75, -s * 0.55, 0, -s);
  }
  function leafPath(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.36, -s * 0.1, 0, s);
    ctx.quadraticCurveTo(-s * 0.36, -s * 0.1, 0, -s);
  }

  /* falling pieces that tumble like real petals and leaves (3D flip by squeezing one side) */
  function Flutter(st, kinds, n, opt) {
    opt = opt || {};
    var list = [];
    function make(first) {
      var k = pick(kinds), near = Math.random();
      return {
        k: k, x: R(-20, st.W + 20), y: first ? R(-st.H * (opt.spread || 0.6), st.H * 0.15) : R(-60, -10),
        s: (k.size || 9) * (0.65 + near * 0.7), vy: (opt.speed || 1.3) * (0.6 + near * 0.8),
        vx: R(-0.3, 0.3), rot: R(0, TAU), vr: R(-0.04, 0.04), fp: R(0, TAU), vf: R(0.04, 0.09),
        sw: R(0, TAU), swA: R(0.4, 1.2), a: 0.75 + near * 0.25
      };
    }
    for (var i = 0; i < n; i++) list.push(make(true));
    return function (ctx) {
      var dt = st.dt, wind = Math.sin(st.t * 0.0007) * 0.6;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        p.sw += 0.03 * dt; p.fp += p.vf * dt; p.rot += p.vr * dt;
        p.x += (p.vx + wind + Math.sin(p.sw) * p.swA) * dt;
        p.y += p.vy * dt * (0.75 + 0.25 * Math.abs(Math.cos(p.fp)));
        if (p.y > st.H + 30) { if (st.spawn) list[i] = make(false); else { p.y = 1e9; } continue; }
        if (p.y > 1e8) continue;
        var f = Math.cos(p.fp);
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.max(0.12, Math.abs(f)), 1);
        ctx.globalAlpha = p.a * st.fade;
        p.k.draw(ctx, p.s, f);
        ctx.restore();
      }
    };
  }
  function petalKind(colors, size) {
    return {
      size: size || 9,
      draw: function (ctx, s, f) {
        var c = this.c || (this.c = colors);
        var col = c[Math.floor(Math.abs(s * 100)) % c.length];
        var g = ctx.createLinearGradient(-s, -s, s, s);
        g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
        ctx.fillStyle = g; petalPath(ctx, s); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, s * 0.8); ctx.stroke();
        if (f < 0) { ctx.fillStyle = "rgba(0,0,0,.12)"; petalPath(ctx, s); ctx.fill(); }
      }
    };
  }
  function leafKind(size) {
    return {
      size: size || 14,
      draw: function (ctx, s, f) {
        var g = ctx.createLinearGradient(-s * 0.3, 0, s * 0.3, 0);
        g.addColorStop(0, f > 0 ? "#2b7a2f" : "#3f8f3a"); g.addColorStop(1, f > 0 ? "#5aa246" : "#2f6f2a");
        ctx.fillStyle = g; leafPath(ctx, s); ctx.fill();
        ctx.strokeStyle = "rgba(220,255,200,.55)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(0, s * 0.95); ctx.stroke();
      }
    };
  }
  var MARIGOLD = [["#ffb000", "#f08c00"], ["#ff8c1a", "#e8590c"], ["#ffc93c", "#f59f00"]];
  var HIBISCUS = [["#e03131", "#a51111"], ["#f03e3e", "#c92a2a"]];

  /* garland (toran) across the top: marigold flowers on a sagging string, mango leaves hanging between */
  function Toran(st, withLeaves) {
    return function (ctx) {
      var W = st.W, n = Math.max(3, Math.round(W / 220)), seg = W / n, drop = Math.min(1, st.t / 900);
      ctx.save(); ctx.globalAlpha = st.fade;
      ctx.translate(0, -30 * (1 - drop));
      for (var s = 0; s < n; s++) {
        var x0 = s * seg, sag = 26;
        var count = Math.max(6, Math.round(seg / 17));
        for (var i = 0; i <= count; i++) {
          var u = i / count, x = x0 + u * seg, y = 4 + Math.sin(u * Math.PI) * sag + Math.sin(st.t * 0.002 + s) * 1.5;
          if (withLeaves && i % 3 === 1) {
            ctx.save(); ctx.translate(x, y + 8); ctx.rotate(Math.sin(st.t * 0.0025 + i) * 0.12);
            leafKind(13).draw(ctx, 13, 1); ctx.restore();
          }
          var spr = marigold(30, i % 2 ? "y" : "o");
          ctx.drawImage(spr, x - 9, y - 9, 18, 18);
        }
      }
      ctx.restore();
    };
  }

  /* ---------------- fireworks (Diwali, New Year) ---------------- */
  function Fireworks(st, snd, opt) {
    var rockets = [], parts = [], smoke = [], next = opt.first || 300;
    var palettes = opt.palettes;
    function launch() {
      var x = R(st.W * 0.12, st.W * 0.88);
      rockets.push({ x: x, y: st.H + 10, vx: R(-0.6, 0.6), vy: -R(st.H / 70, st.H / 52), ty: R(st.H * 0.1, st.H * 0.42), trail: [] });
      snd.rocket && snd.rocket();
    }
    function burst(r) {
      var pal = pick(palettes), type = pick(opt.types || ["peony", "willow", "crackle"]);
      var n = type === "willow" ? 70 : 90, base = clamp(st.W / 120, 2.6, 4.6);
      for (var i = 0; i < n; i++) {
        var a = i / n * TAU + R(-0.05, 0.05), sp = base * (type === "peony" ? R(0.75, 1) : R(0.5, 1));
        parts.push({
          x: r.x, y: r.y, px: r.x, py: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: type === "willow" ? R(120, 160) : R(70, 100), age: 0, c: pick(pal),
          drag: type === "willow" ? 0.955 : 0.965, g: type === "willow" ? 0.035 : 0.05, crackle: type === "crackle"
        });
      }
      parts.push({ flash: true, x: r.x, y: r.y, age: 0, life: 10 });
      for (var k = 0; k < 4; k++) smoke.push({ x: r.x + R(-20, 20), y: r.y + R(-10, 20), r: R(20, 40), age: 0, life: R(140, 200) });
      snd.burst && snd.burst(type);
    }
    return function (ctx) {
      var dt = st.dt;
      if (st.spawn && st.t > next) { launch(); if (Math.random() < 0.35) launch(); next = st.t + R(opt.gap[0], opt.gap[1]); }
      // smoke
      for (var s = smoke.length - 1; s >= 0; s--) {
        var m = smoke[s]; m.age += dt; m.r += 0.25 * dt; m.y -= 0.08 * dt;
        if (m.age > m.life) { smoke.splice(s, 1); continue; }
        ctx.globalAlpha = 0.16 * (1 - m.age / m.life) * st.fade;
        ctx.drawImage(soft("rgba(150,140,150,1)", 64), m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
      }
      // rockets with a sparkly trail
      for (var i = rockets.length - 1; i >= 0; i--) {
        var r = rockets[i];
        r.x += r.vx * dt; r.y += r.vy * dt; r.vy *= Math.pow(0.992, dt);
        r.trail.push([r.x, r.y]); if (r.trail.length > 12) r.trail.shift();
        for (var t = 0; t < r.trail.length; t++) {
          ctx.globalAlpha = (t / r.trail.length) * 0.8 * st.fade;
          var tp = r.trail[t], sz = 2 + t * 0.35;
          ctx.drawImage(glow("rgba(255,190,90,1)", 16), tp[0] - sz + R(-1, 1), tp[1] - sz, sz * 2, sz * 2);
        }
        if (r.y <= r.ty || r.vy > -1.2) { rockets.splice(i, 1); burst(r); }
      }
      // burst sparks with motion streaks
      ctx.lineCap = "round";
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j]; p.age += dt;
        if (p.age >= p.life) { parts.splice(j, 1); continue; }
        if (p.flash) {
          ctx.globalAlpha = (1 - p.age / p.life) * 0.9 * st.fade;
          ctx.drawImage(glow("rgba(255,240,200,1)", 64), p.x - 50, p.y - 50, 100, 100);
          continue;
        }
        p.px = p.x; p.py = p.y;
        var d = Math.pow(p.drag, dt);
        p.vx *= d; p.vy = p.vy * d + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        var k = 1 - p.age / p.life;
        if (p.crackle && p.age > p.life * 0.55) {
          if (Math.random() < 0.3) { ctx.globalAlpha = k * st.fade; ctx.drawImage(glow("rgba(255,255,255,1)", 16), p.x - 4, p.y - 4, 8, 8); }
          continue;
        }
        ctx.globalAlpha = k * st.fade;
        ctx.strokeStyle = p.c; ctx.lineWidth = 1.8 * k + 0.4;
        ctx.beginPath(); ctx.moveTo(p.px - p.vx * 2, p.py - p.vy * 2); ctx.lineTo(p.x, p.y); ctx.stroke();
        var gs = 6 + 4 * k;
        ctx.drawImage(glow(p.c.replace("rgb(", "rgba(").replace(")", ",1)"), 24), p.x - gs / 2, p.y - gs / 2, gs, gs);
      }
      ctx.globalAlpha = 1;
    };
  }

  /* night tint at the top of the screen, so lights stand out */
  function Night(st, strength, rgb) {
    return function (ctx) {
      var g = ctx.createLinearGradient(0, 0, 0, st.H * 0.7);
      g.addColorStop(0, "rgba(" + rgb + "," + strength * st.fade + ")");
      g.addColorStop(1, "rgba(" + rgb + ",0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, st.W, st.H * 0.7);
    };
  }
  function Twinkles(st, n, colors, area) {
    var list = [];
    for (var i = 0; i < n; i++) list.push({ x: R(0, st.W), y: R(0, st.H * (area || 1)), s: R(1.5, 4), ph: R(0, TAU), v: R(0.04, 0.09), c: pick(colors) });
    return function (ctx) {
      for (var i = 0; i < list.length; i++) {
        var p = list[i]; p.ph += p.v * st.dt;
        var k = Math.max(0, Math.sin(p.ph)), s = p.s * (0.6 + k);
        ctx.globalAlpha = k * st.fade;
        ctx.drawImage(glow(p.c, 32), p.x - s * 2, p.y - s * 2, s * 4, s * 4);
        ctx.strokeStyle = p.c; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(p.x - s * 2.2, p.y); ctx.lineTo(p.x + s * 2.2, p.y); ctx.moveTo(p.x, p.y - s * 2.2); ctx.lineTo(p.x, p.y + s * 2.2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
  }
  function Rising(st, n, color, speed) {
    var list = [];
    function make(first) { return { x: R(0, st.W), y: first ? R(st.H * 0.3, st.H + 40) : st.H + R(5, 40), s: R(1.5, 3.8), v: R(0.6, 1.4) * (speed || 1), ph: R(0, TAU) }; }
    for (var i = 0; i < n; i++) list.push(make(true));
    return function (ctx) {
      for (var i = 0; i < list.length; i++) {
        var p = list[i]; p.y -= p.v * st.dt; p.ph += 0.05 * st.dt; p.x += Math.sin(p.ph) * 0.4;
        if (p.y < -10) { if (st.spawn) list[i] = make(false); continue; }
        ctx.globalAlpha = (0.5 + 0.5 * Math.sin(p.ph * 2)) * st.fade;
        ctx.drawImage(glow(color, 32), p.x - p.s * 2, p.y - p.s * 2, p.s * 4, p.s * 4);
      }
      ctx.globalAlpha = 1;
    };
  }

  /* ---------------- scenes ---------------- */
  var SCENES = {};

  /* 7. Monsoon: three depths of rain, splashes, drops on the glass, one lightning flash */
  SCENES.monsoon = {
    dur: 8500,
    make: function (st, snd) {
      var drops = [], splash = [], glass = [], flash = 0, flashed = false;
      var area = st.W * st.H, n = clamp(Math.round(area / 1100), 120, 420);
      function make(first) {
        var z = Math.random(), layer = z < 0.5 ? 0 : z < 0.85 ? 1 : 2;
        var spec = [[0.9, 9, 15, 7, 10, 0.3], [1.4, 16, 24, 11, 14, 0.52], [2.2, 26, 40, 16, 21, 0.72]][layer];
        return { x: R(-60, st.W + 60), y: first ? R(-st.H, st.H) : R(-80, -20), w: spec[0], len: R(spec[1], spec[2]), v: R(spec[3], spec[4]), a: spec[5] * R(0.8, 1.15), layer: layer };
      }
      for (var i = 0; i < n; i++) drops.push(make(true));
      for (var g = 0; g < 9; g++) glass.push({ x: R(10, st.W - 10), y: R(10, st.H * 0.85), r: R(4, 9), v: 0, born: R(400, 5200) });
      return function (el) {
        var ctx = st.ctx, dt = st.dt, wind = -1.2 + Math.sin(el * 0.0006) * 0.8;
        // stormy sky
        var sky = ctx.createLinearGradient(0, 0, 0, st.H * 0.55);
        sky.addColorStop(0, "rgba(28,40,62," + 0.34 * st.fade + ")"); sky.addColorStop(1, "rgba(28,40,62,0)");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, st.W, st.H * 0.55);
        ctx.fillStyle = "rgba(40,60,90," + 0.07 * st.fade + ")"; ctx.fillRect(0, 0, st.W, st.H);
        // rain
        ctx.lineCap = "round";
        for (var i = 0; i < drops.length; i++) {
          var d = drops[i];
          d.y += d.v * dt; d.x += wind * (d.layer + 1) * 0.5 * dt;
          if (d.y - d.len > st.H) {
            if (d.layer > 0 && Math.random() < 0.6) {
              var gy = st.H - R(2, 26);
              splash.push({ x: d.x, y: gy, r: 1, a: 0.5, ring: true });
              for (var k = 0; k < 3; k++) splash.push({ x: d.x, y: gy, vx: R(-1.6, 1.6), vy: -R(1.5, 3.2), a: 0.55, life: 0, ring: false });
            }
            if (st.spawn) drops[i] = make(false); else d.y = 1e9;
            continue;
          }
          if (d.y > 1e8) continue;
          var tx = d.x - wind * d.len / d.v * 0.9, ty = d.y - d.len;
          var gr = ctx.createLinearGradient(tx, ty, d.x, d.y);
          gr.addColorStop(0, "rgba(120,150,195,0)");
          gr.addColorStop(1, "rgba(" + (d.layer === 2 ? "165,190,225" : "110,140,190") + "," + d.a * st.fade + ")");
          ctx.strokeStyle = gr; ctx.lineWidth = d.w;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(d.x, d.y); ctx.stroke();
        }
        // splashes: a small ring and a few droplets jumping up
        for (var s = splash.length - 1; s >= 0; s--) {
          var p = splash[s];
          if (p.ring) {
            p.r += 0.8 * dt; p.a -= 0.028 * dt;
            if (p.a <= 0) { splash.splice(s, 1); continue; }
            ctx.strokeStyle = "rgba(120,150,195," + p.a * st.fade + ")"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 2, p.r * 0.55, 0, 0, TAU); ctx.stroke();
          } else {
            p.life += dt; p.vy += 0.25 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.life > 18) { splash.splice(s, 1); continue; }
            ctx.fillStyle = "rgba(140,170,210," + p.a * (1 - p.life / 18) * st.fade + ")";
            ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, TAU); ctx.fill();
          }
        }
        // big drops on the glass that slide down slowly
        for (var q = 0; q < glass.length; q++) {
          var b = glass[q];
          if (el < b.born) continue;
          var age = Math.min(1, (el - b.born) / 300);
          if (Math.random() < 0.01) b.v = R(1, 3);
          b.y += b.v * dt; b.v *= 0.96;
          ctx.globalAlpha = age * st.fade;
          var lg = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
          lg.addColorStop(0, "rgba(255,255,255,.85)"); lg.addColorStop(0.4, "rgba(190,210,235,.35)"); lg.addColorStop(1, "rgba(70,95,130,.45)");
          ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.9, b.r, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }
        // one lightning flash with a distant bolt, then thunder
        if (!flashed && el > 2300) { flashed = true; flash = 1; snd.thunder && snd.thunder(); }
        if (flash > 0) {
          var f = flash * (Math.random() < 0.3 ? 0.5 : 1);
          ctx.fillStyle = "rgba(235,240,255," + 0.45 * f * st.fade + ")"; ctx.fillRect(0, 0, st.W, st.H);
          if (flash > 0.55) {
            ctx.strokeStyle = "rgba(255,255,255," + f + ")"; ctx.lineWidth = 2; ctx.shadowColor = "rgba(190,210,255,1)"; ctx.shadowBlur = 14;
            ctx.beginPath(); var bx = st.W * 0.72, by = 0; ctx.moveTo(bx, by);
            for (var z = 0; z < 7; z++) { bx += R(-26, 26); by += st.H * 0.045; ctx.lineTo(bx, by); }
            ctx.stroke(); ctx.shadowBlur = 0;
          }
          flash -= 0.045 * dt;
        }
      };
    },
    sound: function (S, t, dur, api) {
      S.ambient(t, dur, { type: "bandpass", f: 1600, q: 0.45, g: 0.42 });
      S.ambient(t, dur, { type: "lowpass", f: 420, q: 0.3, g: 0.26 });
      for (var i = 0; i < 70; i++) S.tone(t + R(0.2, dur - 0.5), R(2400, 4200), 0.03, { g: R(0.01, 0.035) });
      api.thunder = function () { var n = S.now(); S.noise(n + 0.7, 3.2, { type: "lowpass", f: 200, f2: 55, q: 0.6, g: 0.55, a: 0.25 }); };
    }
  };

  /* 10. Diwali: diyas along the bottom, sky lanterns rising, fireworks bursting */
  SCENES.diwali = {
    dur: 9000,
    make: function (st, snd) {
      var night = Night(st, 0.42, "14,8,32");
      var fw = Fireworks(st, snd, {
        gap: [650, 1200], first: 350,
        palettes: [["rgb(255,200,70)", "rgb(255,150,40)"], ["rgb(255,90,150)", "rgb(255,220,120)"], ["rgb(120,220,140)", "rgb(255,240,190)"], ["rgb(255,80,80)", "rgb(255,190,60)"], ["rgb(170,120,255)", "rgb(255,210,120)"]]
      });
      var dust = Twinkles(st, 26, ["rgba(255,210,110,1)"], 0.7);
      var lanterns = [];
      for (var i = 0; i < Math.max(3, Math.round(st.W / 150)); i++) lanterns.push({ x: R(st.W * 0.08, st.W * 0.92), y: st.H + R(20, st.H * 0.35), s: R(18, 30), v: R(0.75, 1.25), ph: R(0, TAU) });
      var diyaCount = clamp(Math.round(st.W / 70), 5, 18);
      function diya(ctx, x, y, s, fl) {
        ctx.globalAlpha = st.fade;
        ctx.drawImage(soft("rgba(255,170,60,0.75)", 96), x - s * 1.6, y - s * 2.1, s * 3.2, s * 3.2);
        var fg = ctx.createLinearGradient(x, y - s * 1.05, x, y - s * 0.2);
        fg.addColorStop(0, "#fff7cc"); fg.addColorStop(0.45, "#ffc300"); fg.addColorStop(1, "#ff5a00");
        ctx.fillStyle = fg; ctx.beginPath();
        ctx.moveTo(x + s * 0.04 + fl * s * 0.05, y - s * (0.98 + fl * 0.1));
        ctx.quadraticCurveTo(x + s * 0.26, y - s * 0.45, x, y - s * 0.22);
        ctx.quadraticCurveTo(x - s * 0.26, y - s * 0.45, x + s * 0.04 + fl * s * 0.05, y - s * (0.98 + fl * 0.1)); ctx.fill();
        var bg = ctx.createLinearGradient(x, y - s * 0.22, x, y + s * 0.3);
        bg.addColorStop(0, "#d9682a"); bg.addColorStop(1, "#6e240a");
        ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(x, y - s * 0.16, s * 0.66, s * 0.4, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = "#f2b134"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.16, s * 0.66, s * 0.11, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#7a2c0c"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.16, s * 0.5, s * 0.07, 0, 0, TAU); ctx.fill();
      }
      function lantern(ctx, L) {
        var x = L.x + Math.sin(L.ph) * 8, y = L.y, s = L.s;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(L.ph) * 0.06);
        ctx.globalAlpha = st.fade * clamp((y + 40) / (st.H * 0.35), 0, 1);
        ctx.drawImage(soft("rgba(255,160,50,0.8)", 96), -s * 1.8, -s * 1.6, s * 3.6, s * 3.6);
        var g = ctx.createRadialGradient(0, s * 0.3, s * 0.1, 0, 0, s * 1.1);
        g.addColorStop(0, "#fff1b8"); g.addColorStop(0.45, "#ffae34"); g.addColorStop(1, "#d9480f");
        ctx.fillStyle = g; ctx.beginPath();
        ctx.moveTo(-s * 0.55, -s * 0.9); ctx.quadraticCurveTo(0, -s * 1.15, s * 0.55, -s * 0.9);
        ctx.quadraticCurveTo(s * 0.8, 0, s * 0.42, s * 0.85); ctx.lineTo(-s * 0.42, s * 0.85);
        ctx.quadraticCurveTo(-s * 0.8, 0, -s * 0.55, -s * 0.9); ctx.fill();
        ctx.strokeStyle = "rgba(150,50,0,.35)"; ctx.lineWidth = 0.8;
        for (var k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * s * 0.25, -s * 0.98); ctx.quadraticCurveTo(k * s * 0.42, 0, k * s * 0.2, s * 0.85); ctx.stroke(); }
        ctx.drawImage(glow("rgba(255,220,120,1)", 32), -s * 0.3, s * 0.6, s * 0.6, s * 0.6);
        ctx.restore();
      }
      return function (el) {
        var ctx = st.ctx;
        night(ctx); dust(ctx); fw(ctx);
        for (var i = 0; i < lanterns.length; i++) {
          var L = lanterns[i]; L.y -= L.v * st.dt; L.ph += 0.02 * st.dt;
          if (L.y < -60) continue;
          lantern(ctx, L);
        }
        var s = clamp(st.W / 32, 18, 30);
        for (var d = 0; d < diyaCount; d++) {
          var x = (d + 0.5) * st.W / diyaCount, rise = clamp(el / 900 - d * 0.06, 0, 1);
          diya(ctx, x, st.H - 6 + (1 - rise) * 40, s, Math.sin(el * 0.02 + d * 1.7) * 0.6 + Math.sin(el * 0.047 + d) * 0.4);
        }
        ctx.globalAlpha = 1;
      };
    },
    sound: function (S, t, dur, api) {
      api.rocket = function () { S.whoosh(S.now()); };
      api.burst = function (type) {
        var n = S.now() + 0.05;
        S.boom(n, type === "willow" ? 0.35 : 0.5);
        S.crackle(n + 0.15, type === "crackle" ? 40 : 16, type === "crackle" ? 1.4 : 0.8);
      };
      for (var i = 0; i < 6; i++) S.crackle(t + R(0.5, dur - 1), 10, 0.5, 0.05);
    }
  };

  /* 13. New Year: confetti from both bottom corners, gold and silver fireworks */
  SCENES.newyear = {
    dur: 8500,
    make: function (st, snd) {
      var night = Night(st, 0.3, "10,12,30");
      var fw = Fireworks(st, snd, { gap: [900, 1500], first: 1300, types: ["peony", "willow"], palettes: [["rgb(255,215,90)", "rgb(255,245,200)"], ["rgb(220,225,235)", "rgb(255,255,255)"], ["rgb(255,200,60)", "rgb(255,120,160)"]] });
      var conf = [], COLS = ["#ff3d6e", "#ffd23f", "#3ec1ff", "#7cdc6b", "#b06cff", "#ff8a3d", "#ffffff"];
      function cannon(left, n) {
        for (var i = 0; i < n; i++) {
          var a = left ? R(-1.35, -0.75) : R(-2.4, -1.8), sp = R(st.H / 70, st.H / 38);
          conf.push({ x: left ? -5 : st.W + 5, y: st.H + 5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: R(5, 10), h: R(3, 5), rot: R(0, TAU), vr: R(-0.2, 0.2), fp: R(0, TAU), vf: R(0.12, 0.3), c: pick(COLS), ribbon: Math.random() < 0.15 });
        }
      }
      var shots = [[150, true], [300, false], [2600, true], [2750, false], [5200, true], [5300, false]];
      return function (el) {
        var ctx = st.ctx, dt = st.dt;
        night(ctx); fw(ctx);
        while (shots.length && el > shots[0][0]) { var s = shots.shift(); cannon(s[1], 70); snd.pop && snd.pop(); }
        for (var i = conf.length - 1; i >= 0; i--) {
          var p = conf[i];
          p.vx *= Math.pow(0.975, dt); p.vy = p.vy * Math.pow(0.975, dt) + 0.12 * dt;
          if (p.vy > 2.2) p.vy = 2.2;
          p.x += (p.vx + Math.sin(p.fp) * 0.6) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.fp += p.vf * dt;
          if (p.y > st.H + 20) { conf.splice(i, 1); continue; }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.fp));
          ctx.globalAlpha = st.fade; ctx.fillStyle = p.c;
          if (p.ribbon) { ctx.fillRect(-1.5, -9, 3, 18); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.fillStyle = "rgba(0,0,0," + (0.18 * (1 - Math.abs(Math.cos(p.fp)))) + ")"; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      };
    },
    sound: function (S, t, dur, api) {
      api.pop = function () { S.pop(S.now()); };
      api.rocket = function () { S.whoosh(S.now()); };
      api.burst = function () { var n = S.now() + 0.05; S.boom(n, 0.4); S.crackle(n + 0.1, 14, 0.8); };
    }
  };

  /* 11. Winter: snow in three depths, big soft flakes close to the eye, frosty corners */
  function snowScene(st, opt) {
    var flakes = [], n = clamp(Math.round(st.W * st.H / (opt.density || 4500)), 60, 260);
    function make(first) {
      var z = Math.random(), layer = z < 0.55 ? 0 : z < 0.9 ? 1 : 2;
      return { x: R(0, st.W), y: first ? R(-st.H, st.H * 0.9) : R(-40, -5), s: [R(1.2, 2.2), R(2.5, 4), R(6, 11)][layer], v: [0.5, 1, 1.7][layer] * R(0.8, 1.2), ph: R(0, TAU), layer: layer, crystal: layer === 1 && Math.random() < 0.35, rot: R(0, TAU) };
    }
    for (var i = 0; i < n; i++) flakes.push(make(true));
    return function (ctx) {
      var dt = st.dt, wind = Math.sin(st.t * 0.0005) * 0.7 + 0.2;
      if (opt.frost) {
        var fr = ctx.createRadialGradient(st.W / 2, st.H / 2, Math.min(st.W, st.H) * 0.35, st.W / 2, st.H / 2, Math.max(st.W, st.H) * 0.75);
        fr.addColorStop(0, "rgba(220,235,250,0)"); fr.addColorStop(1, "rgba(205,225,245," + 0.55 * st.fade + ")");
        ctx.fillStyle = fr; ctx.fillRect(0, 0, st.W, st.H);
      }
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.ph += 0.02 * dt; f.rot += 0.01 * dt;
        f.y += f.v * dt; f.x += (wind * (f.layer + 1) * 0.5 + Math.sin(f.ph) * 0.5) * dt;
        if (f.y > st.H + 15) { if (st.spawn) flakes[i] = make(false); else f.y = 1e9; continue; }
        if (f.y > 1e8) continue;
        var a = (f.layer === 2 ? 0.55 : 0.9) * st.fade;
        if (f.crystal) {
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = a;
          ctx.strokeStyle = "rgba(120,150,190,.7)"; ctx.lineWidth = 2.2; star6(ctx, f.s * 1.6);
          ctx.strokeStyle = "rgba(255,255,255,1)"; ctx.lineWidth = 1; star6(ctx, f.s * 1.6);
          ctx.restore();
        } else {
          ctx.globalAlpha = a;
          ctx.drawImage(soft("rgba(140,165,200,0.55)", 32), f.x - f.s * 1.25, f.y - f.s * 1.25, f.s * 2.5, f.s * 2.5);
          ctx.drawImage(soft("rgba(255,255,255,1)", 32), f.x - f.s, f.y - f.s, f.s * 2, f.s * 2);
        }
      }
      ctx.globalAlpha = 1;
    };
  }
  function star6(ctx, r) {
    ctx.beginPath();
    for (var k = 0; k < 6; k++) {
      var a = k * Math.PI / 3, x = Math.cos(a) * r, y = Math.sin(a) * r;
      ctx.moveTo(0, 0); ctx.lineTo(x, y);
      ctx.moveTo(x * 0.55 + Math.cos(a + 0.6) * r * 0.25, y * 0.55 + Math.sin(a + 0.6) * r * 0.25); ctx.lineTo(x * 0.55, y * 0.55);
      ctx.lineTo(x * 0.55 + Math.cos(a - 0.6) * r * 0.25, y * 0.55 + Math.sin(a - 0.6) * r * 0.25);
    }
    ctx.stroke();
  }
  SCENES.winter = {
    dur: 8500,
    make: function (st) { var snow = snowScene(st, { density: 3800, frost: true }); return function () { snow(st.ctx); }; },
    sound: function (S, t, dur) { S.wind(t, dur, 0.35); }
  };

  /* 12. Christmas: a string of coloured lights across the top, gentle snow, twinkling stars */
  SCENES.christmas = {
    dur: 8500,
    make: function (st) {
      var snow = snowScene(st, { density: 6500 });
      var stars = Twinkles(st, 16, ["rgba(255,215,100,1)"], 0.5);
      var COLS = ["rgba(255,70,70,1)", "rgba(80,220,120,1)", "rgba(255,200,60,1)", "rgba(80,160,255,1)"];
      return function (el) {
        var ctx = st.ctx; stars(ctx); snow(ctx);
        var n = Math.max(3, Math.round(st.W / 200)), seg = st.W / n, per = Math.max(5, Math.round(seg / 30));
        ctx.globalAlpha = st.fade;
        ctx.strokeStyle = "rgba(40,60,40,.85)"; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var s = 0; s < n; s++) { ctx.moveTo(s * seg, 2); ctx.quadraticCurveTo(s * seg + seg / 2, 44, (s + 1) * seg, 2); }
        ctx.stroke();
        var idx = 0;
        for (var s2 = 0; s2 < n; s2++) {
          for (var i = 1; i < per; i++, idx++) {
            var u = i / per, x = s2 * seg + u * seg, y = 2 + 2 * u * (1 - u) * 42;
            var c = COLS[idx % COLS.length], on = 0.55 + 0.45 * Math.sin(el * 0.004 + idx * 1.3);
            ctx.globalAlpha = st.fade * on;
            ctx.drawImage(glow(c, 48), x - 13, y - 5, 26, 26);
            ctx.globalAlpha = st.fade;
            ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y + 8, 3, 5, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = "#3a3a3a"; ctx.fillRect(x - 2, y + 1, 4, 3);
          }
        }
        ctx.globalAlpha = 1;
      };
    },
    sound: function (S, t, dur) {
      for (var b = 0.3; b < dur - 0.6; b += 0.42) S.jingle(t + b, 0.05);
      var notes = [1318, 1175, 1046, 1175, 1318, 1318, 1318];
      notes.forEach(function (f, i) { S.chime(t + 1 + i * 0.45, f, 0.07); });
    }
  };

  /* 1. Makar Sankranti: kites rising with long tails, strings down to the ground, a warm sun */
  SCENES.sankranti = {
    dur: 8500,
    make: function (st) {
      var kites = [], PAIRS = [["#e63946", "#ffd166"], ["#118ab2", "#ef476f"], ["#06d6a0", "#ffd166"], ["#8338ec", "#ff9f1c"], ["#ff006e", "#3a86ff"], ["#f77f00", "#2a9d8f"]];
      var n = clamp(Math.round(st.W / 110), 4, 10);
      for (var i = 0; i < n; i++) kites.push({ x: (i + 0.5) * st.W / n + R(-20, 20), y: st.H + R(30, st.H * 0.6), ty: R(st.H * 0.1, st.H * 0.5), s: R(18, 32), ph: R(0, TAU), col: pick(PAIRS), tail: [], ax: R(0.2, 0.8) * st.W });
      return function () {
        var ctx = st.ctx, dt = st.dt;
        var sun = ctx.createRadialGradient(st.W * 0.85, st.H * 0.05, 0, st.W * 0.85, st.H * 0.05, st.W * 0.5);
        sun.addColorStop(0, "rgba(255,214,120," + 0.5 * st.fade + ")"); sun.addColorStop(1, "rgba(255,214,120,0)");
        ctx.fillStyle = sun; ctx.fillRect(0, 0, st.W, st.H);
        for (var i = 0; i < kites.length; i++) {
          var k = kites[i];
          k.ph += 0.025 * dt;
          if (k.y > k.ty) k.y -= Math.max(0.6, (k.y - k.ty) * 0.012) * dt;
          var x = k.x + Math.sin(k.ph) * 14, y = k.y + Math.cos(k.ph * 1.3) * 6, tilt = Math.sin(k.ph) * 0.25;
          k.tail.push([x, y + k.s]); if (k.tail.length > 26) k.tail.shift();
          ctx.globalAlpha = st.fade;
          ctx.strokeStyle = "rgba(60,60,60,.35)"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(x, y + k.s * 0.3); ctx.quadraticCurveTo((x + k.ax) / 2 + 40, (y + st.H) / 2 + 30, k.ax, st.H + 20); ctx.stroke();
          ctx.strokeStyle = k.col[1]; ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (var t = k.tail.length - 1, w = 0; t >= 0; t--, w++) {
            var p = k.tail[t], tx = p[0] + Math.sin(k.ph * 2 + w * 0.5) * w * 0.6, ty = p[1] + w * 2.6;
            if (w === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
          }
          ctx.stroke();
          ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
          var s = k.s;
          ctx.fillStyle = k.col[0]; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, s); ctx.closePath(); ctx.fill();
          ctx.fillStyle = k.col[1]; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(-s * 0.8, 0); ctx.lineTo(0, s); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(90,60,30,.7)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(-s * 0.8, 0); ctx.quadraticCurveTo(0, -s * 0.35, s * 0.8, 0); ctx.stroke();
          ctx.fillStyle = k.col[1]; ctx.beginPath(); ctx.moveTo(0, s * 0.85); ctx.lineTo(s * 0.25, s * 1.2); ctx.lineTo(-s * 0.25, s * 1.2); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      };
    },
    sound: function (S, t, dur) { S.wind(t, dur, 0.3); for (var i = 0; i < 6; i++) S.flutter(t + R(0.5, dur - 1)); }
  };

  /* 2. Republic & Independence Day: saffron, white and green petals, a tricolour glow at the top */
  SCENES.republic = {
    dur: 8500,
    make: function (st) {
      var petals = Flutter(st, [petalKind([["#ff9933", "#e8771a"]], 9), petalKind([["#ffffff", "#e7e7e7"]], 9), petalKind([["#1c9a1c", "#0f6e0f"]], 9)], clamp(Math.round(st.W * st.H / 5000), 55, 170), { speed: 1.9 });
      return function () {
        var ctx = st.ctx;
        var h = 46, g1 = ctx.createLinearGradient(0, 0, 0, h * 3);
        g1.addColorStop(0, "rgba(255,153,51," + 0.5 * st.fade + ")"); g1.addColorStop(0.33, "rgba(255,255,255," + 0.35 * st.fade + ")");
        g1.addColorStop(0.66, "rgba(19,136,8," + 0.3 * st.fade + ")"); g1.addColorStop(1, "rgba(19,136,8,0)");
        ctx.fillStyle = g1; ctx.fillRect(0, 0, st.W, h * 3);
        petals(ctx);
        ctx.globalAlpha = 1;
      };
    },
    sound: function (S, t, dur) {
      for (var i = 0; i < 18; i++) S.snare(t + 0.2 + i * (0.09 - i * 0.002), 0.06 + i * 0.006);
      S.thump(t + 1.85, 0.5);
      [523, 659, 784, 1046].forEach(function (f, i) { S.chime(t + 2.2 + i * 0.3, f, 0.09); });
    }
  };

  /* 3. Holi: clouds of gulal bursting and drifting, fine powder flying out (blends into the page like real colour) */
  SCENES.holi = {
    dur: 8500,
    blend: "multiply",
    make: function (st, snd) {
      var COLS = ["255,45,149", "255,214,10", "34,197,94", "59,130,246", "168,85,247", "255,122,0"];
      var puffs = [], dust = [], next = 100;
      function puff() {
        var c = pick(COLS), x = R(st.W * 0.05, st.W * 0.95), y = R(st.H * 0.08, st.H * 0.85), big = R(0.7, 1.3) * Math.min(st.W, st.H) * 0.28;
        for (var i = 0; i < 6; i++) puffs.push({ x: x + R(-big * 0.3, big * 0.3), y: y + R(-big * 0.3, big * 0.3), r: big * R(0.25, 0.45), g: big * R(0.6, 1.1), c: c, age: 0, life: R(110, 170), vx: R(-0.6, 0.6), vy: R(-0.6, -0.1) });
        for (var k = 0; k < 40; k++) { var a = R(0, TAU), sp = R(2, 7); dust.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: c, age: 0, life: R(40, 80), s: R(1, 2.6) }); }
        snd.puff && snd.puff();
      }
      return function (el) {
        var ctx = st.ctx, dt = st.dt;
        if (st.spawn && el > next) { puff(); next = el + R(380, 700); }
        for (var i = puffs.length - 1; i >= 0; i--) {
          var p = puffs[i]; p.age += dt;
          if (p.age > p.life) { puffs.splice(i, 1); continue; }
          var u = p.age / p.life, r = p.r + (p.g - p.r) * (1 - Math.pow(1 - u, 3));
          p.x += p.vx * dt; p.y += p.vy * dt;
          ctx.globalAlpha = 0.55 * Math.min(1, u * 6) * (1 - u) * st.fade;
          ctx.drawImage(soft("rgba(" + p.c + ",1)", 128), p.x - r, p.y - r, r * 2, r * 2);
        }
        for (var j = dust.length - 1; j >= 0; j--) {
          var d = dust[j]; d.age += dt;
          if (d.age > d.life) { dust.splice(j, 1); continue; }
          d.vx *= Math.pow(0.93, dt); d.vy = d.vy * Math.pow(0.93, dt) + 0.03 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
          ctx.globalAlpha = (1 - d.age / d.life) * 0.9 * st.fade;
          ctx.fillStyle = "rgb(" + d.c + ")"; ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
    },
    sound: function (S, t, dur, api) {
      var beat = 0.36;
      for (var b = 0, i = 0; b < dur - 0.6; b += beat, i++) {
        if (i % 4 === 0 || i % 4 === 3) S.thump(t + b, 0.42); else S.slap(t + b, 0.16);
      }
      api.puff = function () { var n = S.now(); S.noise(n, 0.5, { type: "bandpass", f: 900, f2: 300, q: 0.6, g: 0.12, a: 0.03 }); };
    }
  };

  /* 4. Gudi Padwa: a toran of mango leaves and marigolds at the top, leaves and petals drifting down */
  SCENES.padwa = {
    dur: 8500,
    make: function (st) {
      var toran = Toran(st, true);
      var fall = Flutter(st, [leafKind(15), leafKind(12), petalKind(MARIGOLD, 8), petalKind(MARIGOLD, 7)], clamp(Math.round(st.W * st.H / 7000), 40, 130), { speed: 1.7 });
      var dust = Rising(st, 18, "rgba(255,200,90,1)", 0.7);
      return function () { var ctx = st.ctx; dust(ctx); fall(ctx); toran(ctx); ctx.globalAlpha = 1; };
    },
    sound: function (S, t, dur) {
      for (var b = 0.3; b < dur - 1; b += 2.3) S.bell(t + b, 560, 0.2);
      [784, 880, 1046, 1175].forEach(function (f, i) { S.chime(t + 1.2 + i * 0.35, f, 0.06); });
    }
  };

  /* 5. Summer: warm sunlight with slow rays and lens flare, light motes, butterflies */
  SCENES.summer = {
    dur: 8500,
    make: function (st) {
      var motes = Rising(st, 30, "rgba(255,230,150,1)", 0.4);
      var flies = [], COLS = [["#ff9f1c", "#ffbf69"], ["#4cc9f0", "#a0e9ff"], ["#f15bb5", "#fee440"]];
      for (var i = 0; i < 3; i++) flies.push({ x: -40 - i * 120, y: R(st.H * 0.25, st.H * 0.8), v: R(1.2, 2), ph: R(0, TAU), c: COLS[i], s: R(10, 15) });
      return function (el) {
        var ctx = st.ctx, dt = st.dt, sx = st.W * 0.92, sy = st.H * 0.04;
        var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(st.W, st.H) * 0.75);
        g.addColorStop(0, "rgba(255,236,170," + 0.75 * st.fade + ")"); g.addColorStop(0.25, "rgba(255,200,90," + 0.28 * st.fade + ")"); g.addColorStop(1, "rgba(255,190,80,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, st.W, st.H);
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(el * 0.00008);
        for (var r = 0; r < 12; r++) {
          ctx.rotate(TAU / 12);
          ctx.fillStyle = "rgba(255,225,140," + 0.07 * st.fade + ")";
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.max(st.W, st.H) * 1.2, -18); ctx.lineTo(Math.max(st.W, st.H) * 1.2, 18); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        var fx = st.W / 2 - sx, fy = st.H / 2 - sy;
        [[0.5, 22, "255,200,120"], [0.8, 12, "255,170,200"], [1.15, 34, "180,220,255"], [1.4, 9, "255,230,160"]].forEach(function (f) {
          ctx.globalAlpha = 0.22 * st.fade;
          ctx.drawImage(soft("rgba(" + f[2] + ",1)", 64), sx + fx * f[0] * 1.6 - f[1], sy + fy * f[0] * 1.6 - f[1], f[1] * 2, f[1] * 2);
        });
        ctx.globalAlpha = 1;
        motes(ctx);
        for (var i = 0; i < flies.length; i++) {
          var b = flies[i]; b.ph += 0.35 * dt; b.x += b.v * dt; b.y += Math.sin(b.ph * 0.13) * 1.2 * dt;
          if (b.x > st.W + 40) continue;
          var flap = Math.abs(Math.sin(b.ph)), s = b.s;
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(0.25); ctx.globalAlpha = st.fade;
          [-1, 1].forEach(function (side) {
            ctx.save(); ctx.scale(side * (0.25 + flap * 0.75), 1);
            ctx.fillStyle = b.c[0]; ctx.beginPath(); ctx.ellipse(s * 0.55, -s * 0.35, s * 0.6, s * 0.45, -0.5, 0, TAU); ctx.fill();
            ctx.fillStyle = b.c[1]; ctx.beginPath(); ctx.ellipse(s * 0.45, s * 0.3, s * 0.4, s * 0.3, 0.4, 0, TAU); ctx.fill();
            ctx.restore();
          });
          ctx.fillStyle = "#2b2b2b"; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.1, s * 0.5, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      };
    },
    sound: function (S, t, dur) {
      S.wind(t, dur, 0.12);
      for (var b = 0.4; b < dur - 0.8; b += R(0.5, 1.3)) S.chirp(t + b, 0.07);
    }
  };

  /* 6. Eid: night sky with a crescent moon, twinkling stars, hanging lanterns that swing */
  SCENES.eid = {
    dur: 8500,
    make: function (st) {
      var night = Night(st, 0.5, "12,20,48");
      var stars = Twinkles(st, 34, ["rgba(255,240,200,1)", "rgba(255,255,255,1)"], 0.55);
      var moon = sprite("moon", 160, function (g, s) {
        var r = s * 0.3, cx = s / 2, cy = s / 2;
        var gl = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, s / 2);
        gl.addColorStop(0, "rgba(255,240,190,.55)"); gl.addColorStop(1, "rgba(255,240,190,0)");
        g.fillStyle = gl; g.fillRect(0, 0, s, s);
        g.fillStyle = "#ffe9a8"; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
        g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(cx + r * 0.42, cy - r * 0.2, r * 0.88, 0, TAU); g.fill();
      });
      var n = clamp(Math.round(st.W / 160), 3, 8), lan = [];
      for (var i = 0; i < n; i++) lan.push({ x: (i + 0.5) * st.W / n, len: R(40, 110), s: R(13, 20), ph: R(0, TAU) });
      return function (el) {
        var ctx = st.ctx;
        night(ctx); stars(ctx);
        var ms = Math.min(st.W, st.H) * 0.32;
        ctx.globalAlpha = st.fade; ctx.drawImage(moon, st.W * 0.78 - ms / 2, st.H * 0.04, ms, ms);
        for (var i = 0; i < lan.length; i++) {
          var L = lan[i], drop = clamp(el / 900, 0, 1), sw = Math.sin(el * 0.0016 + L.ph) * 0.12;
          ctx.save(); ctx.translate(L.x, -10); ctx.rotate(sw);
          var y = L.len * drop, s = L.s;
          ctx.strokeStyle = "rgba(200,170,90," + st.fade + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, y); ctx.stroke();
          ctx.globalAlpha = st.fade * (0.8 + 0.2 * Math.sin(el * 0.01 + i));
          ctx.drawImage(soft("rgba(255,180,60,0.85)", 96), -s * 2, y + s * 0.2 - s * 2 + s, s * 4, s * 4);
          ctx.globalAlpha = st.fade;
          ctx.fillStyle = "#b8862b"; ctx.beginPath(); ctx.moveTo(-s * 0.5, y + s * 0.2); ctx.quadraticCurveTo(0, y - s * 0.6, s * 0.5, y + s * 0.2); ctx.fill();
          var lg = ctx.createLinearGradient(-s * 0.6, 0, s * 0.6, 0);
          lg.addColorStop(0, "#c2410c"); lg.addColorStop(0.5, "#ffd166"); lg.addColorStop(1, "#c2410c");
          ctx.fillStyle = lg; ctx.beginPath();
          ctx.moveTo(-s * 0.5, y + s * 0.2); ctx.lineTo(s * 0.5, y + s * 0.2); ctx.lineTo(s * 0.62, y + s * 1.2); ctx.lineTo(s * 0.35, y + s * 1.8); ctx.lineTo(-s * 0.35, y + s * 1.8); ctx.lineTo(-s * 0.62, y + s * 1.2); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#7c4a12"; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = "#b8862b"; ctx.fillRect(-s * 0.38, y + s * 1.8, s * 0.76, s * 0.18);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      };
    },
    sound: function (S, t, dur) {
      var scale = [784, 880, 1046, 1175, 1318, 1568];
      for (var b = 0.3; b < dur - 0.8; b += R(0.35, 0.8)) S.chime(t + b, pick(scale), 0.05);
    }
  };

  /* 8. Ganesh Chaturthi: marigold toran, red hibiscus and marigold petals, a soft golden glow at the top */
  SCENES.ganesh = {
    dur: 8500,
    make: function (st) {
      var toran = Toran(st, false);
      var fall = Flutter(st, [petalKind(HIBISCUS, 11), petalKind(MARIGOLD, 8), petalKind(MARIGOLD, 7)], clamp(Math.round(st.W * st.H / 5500), 50, 160), { speed: 1.8 });
      return function (el) {
        var ctx = st.ctx;
        var g = ctx.createRadialGradient(st.W / 2, -st.H * 0.05, 0, st.W / 2, -st.H * 0.05, st.H * 0.6);
        g.addColorStop(0, "rgba(255,190,70," + 0.45 * st.fade + ")"); g.addColorStop(1, "rgba(255,190,70,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, st.W, st.H);
        fall(ctx); toran(ctx); ctx.globalAlpha = 1;
      };
    },
    sound: function (S, t, dur) {
      var beat = 0.3;
      for (var b = 0, i = 0; b < dur - 0.6; b += beat, i++) {
        if (i % 2 === 0) S.thump(t + b, 0.4);
        S.tasha(t + b, 0.07); S.tasha(t + b + beat / 2, 0.05);
      }
      for (var k = 0.5; k < dur - 1; k += 2.6) S.bell(t + k, 620, 0.18);
    }
  };

  /* 9. Navratri & Dussehra: petals in many colours, golden sparks rising */
  SCENES.navratri = {
    dur: 8500,
    make: function (st) {
      var fall = Flutter(st, [petalKind([["#e03131", "#a51111"]], 9), petalKind(MARIGOLD, 9), petalKind([["#2f9e44", "#1b6e2c"]], 8), petalKind([["#e64980", "#a61e4d"]], 9), petalKind([["#7048e8", "#4c2bb3"]], 8), petalKind([["#fab005", "#e67700"]], 8)], clamp(Math.round(st.W * st.H / 5500), 50, 160), { speed: 1.7 });
      var sparks = Rising(st, 40, "rgba(255,200,80,1)", 1.2);
      var glowTop = Twinkles(st, 14, ["rgba(255,210,120,1)"], 0.4);
      return function () { var ctx = st.ctx; sparks(ctx); glowTop(ctx); fall(ctx); ctx.globalAlpha = 1; };
    },
    sound: function (S, t, dur) {
      var beat = 0.32;
      for (var b = 0, i = 0; b < dur - 0.6; b += beat, i++) {
        if (i % 4 !== 3) S.click(t + b, 0.22);
        if (i % 4 === 0) S.thump(t + b, 0.3);
      }
    }
  };

  /* ---------------- sound ---------------- */
  var AC = null, NOISE = null, VOL = 0.5;
  function makeSounds(ac, out) {
    if (!NOISE) {
      NOISE = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      var d = NOISE.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    function env(gn, t, dur, g, a) {
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t + Math.max(0.002, a));
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    function noise(t, dur, o) {
      o = o || {};
      var src = ac.createBufferSource(); src.buffer = NOISE; src.loop = true;
      var fl = ac.createBiquadFilter(); fl.type = o.type || "bandpass"; fl.frequency.setValueAtTime(o.f || 1000, t); fl.Q.value = o.q == null ? 1 : o.q;
      if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
      var gn = ac.createGain();
      env(gn, t, dur, o.g == null ? 0.3 : o.g, o.a == null ? 0.01 : o.a);
      src.connect(fl); fl.connect(gn); gn.connect(out);
      src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
      return fl;
    }
    function tone(t, f, dur, o) {
      o = o || {};
      var os = ac.createOscillator(); os.type = o.type || "sine"; os.frequency.setValueAtTime(f, t);
      if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
      var gn = ac.createGain(); env(gn, t, dur, o.g == null ? 0.2 : o.g, o.a == null ? 0.005 : o.a);
      os.connect(gn); gn.connect(out); os.start(t); os.stop(t + dur + 0.05);
    }
    // a steady sound (rain, wind) that fades in and out
    function ambient(t, dur, o) {
      var src = ac.createBufferSource(); src.buffer = NOISE; src.loop = true;
      var fl = ac.createBiquadFilter(); fl.type = o.type; fl.frequency.value = o.f; fl.Q.value = o.q;
      var gn = ac.createGain();
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(o.g, t + 0.8);
      gn.gain.setValueAtTime(o.g, Math.max(t + 0.8, t + dur - 1.2)); gn.gain.linearRampToValueAtTime(0, t + dur);
      src.connect(fl); fl.connect(gn); gn.connect(out); src.start(t); src.stop(t + dur + 0.1);
      return fl;
    }
    return {
      now: function () { return ac.currentTime; },
      noise: noise, tone: tone, ambient: ambient,
      wind: function (t, dur, g) {
        var fl = ambient(t, dur, { type: "bandpass", f: 500, q: 1.1, g: g });
        var lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.18; lg.gain.value = 260;
        lfo.connect(lg); lg.connect(fl.frequency); lfo.start(t); lfo.stop(t + dur);
      },
      bell: function (t, base, g) { [1, 2.0, 2.76, 4.07].forEach(function (m, i) { tone(t, base * m, 2.8 / (i + 1), { g: g / (i + 1.2) }); }); },
      chime: function (t, f, g) { tone(t, f, 1.6, { g: g }); tone(t, f * 2.01, 0.8, { g: g * 0.35 }); },
      whoosh: function (t) { noise(t, 1, { f: 450, f2: 2600, q: 1.3, g: 0.16, a: 0.3 }); },
      boom: function (t, g) { noise(t, 1.8, { type: "lowpass", f: 300, f2: 80, q: 0.7, g: g, a: 0.006 }); tone(t, 75, 0.8, { g: g * 0.45, f2: 38 }); },
      crackle: function (t, n, spread, g) { for (var i = 0; i < n; i++) noise(t + Math.random() * spread, 0.03, { type: "highpass", f: 2600, q: 0.5, g: (g || 0.14) * R(0.4, 1.2), a: 0.002 }); },
      thump: function (t, g) { tone(t, 150, 0.45, { g: g, f2: 52 }); noise(t, 0.1, { f: 700, q: 1, g: g * 0.2, a: 0.002 }); },
      slap: function (t, g) { noise(t, 0.12, { f: 1200, q: 1.5, g: g, a: 0.002 }); tone(t, 320, 0.12, { g: g * 0.6, f2: 200 }); },
      tasha: function (t, g) { noise(t, 0.07, { type: "highpass", f: 2500, q: 0.8, g: g, a: 0.001 }); },
      click: function (t, g) { noise(t, 0.05, { f: 1900, q: 7, g: g, a: 0.001 }); noise(t + 0.09, 0.05, { f: 2100, q: 7, g: g * 0.8, a: 0.001 }); },
      snare: function (t, g) { noise(t, 0.12, { type: "highpass", f: 1800, q: 0.6, g: g, a: 0.002 }); },
      chirp: function (t, g) { for (var i = 0; i < 3; i++) tone(t + i * 0.09, R(2500, 3100), 0.07, { g: g, f2: R(4000, 4700) }); },
      pop: function (t) { noise(t, 0.3, { type: "highpass", f: 1100, q: 0.7, g: 0.3, a: 0.002 }); tone(t, 360, 0.15, { g: 0.14, f2: 150 }); },
      jingle: function (t, g) { for (var i = 0; i < 5; i++) noise(t + i * 0.035 + Math.random() * 0.02, 0.1, { f: R(7000, 9500), q: 9, g: g, a: 0.002 }); },
      flutter: function (t) { for (var i = 0; i < 8; i++) noise(t + i * 0.05, 0.05, { f: 900, q: 2, g: 0.04, a: 0.003 }); }
    };
  }
  function Sound(def, DUR, enabled) {
    var api = { stop: function () {} };
    var AudioC = window.AudioContext || window.webkitAudioContext;
    if (!enabled || !def.sound || !AudioC) return api;
    try { AC = AC || new AudioC(); } catch (e) { return api; }
    var ac = AC, master = ac.createGain(), started = false, stopped = false, t0 = performance.now();
    master.gain.value = 0; master.connect(ac.destination);
    var S = makeSounds(ac, master);
    // every event a browser counts as the visitor "touching" the page (a tap anywhere starts the sound)
    var evs = ["pointerdown", "pointerup", "mousedown", "touchend", "keydown", "click"];
    function begin() {
      if (started || stopped) return;
      var left = (DUR - (performance.now() - t0)) / 1000;
      if (left < 1.5) return;
      started = true;
      var n = ac.currentTime;
      master.gain.setValueAtTime(0, n); master.gain.linearRampToValueAtTime(VOL, n + 0.5);
      master.gain.setValueAtTime(VOL, n + left - 1.3); master.gain.linearRampToValueAtTime(0, n + left);
      def.sound(S, n + 0.05, left, api);
    }
    function tryStart() {
      if (stopped) return;
      if (ac.state === "running") begin();
      else { try { ac.resume().then(function () { if (ac.state === "running") begin(); }, function () {}); } catch (e) {} }
    }
    function gesture() { evs.forEach(function (e) { window.removeEventListener(e, gesture, true); }); tryStart(); }
    evs.forEach(function (e) { window.addEventListener(e, gesture, true); });
    tryStart();
    api.stop = function () {
      stopped = true;
      evs.forEach(function (e) { window.removeEventListener(e, gesture, true); });
      try { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0, ac.currentTime, 0.12); } catch (e) {}
      setTimeout(function () { try { master.disconnect(); } catch (e) {} }, 900);
    };
    return api;
  }

  /* ---------------- player ---------------- */
  var current = null;
  function play(key, opt) {
    opt = opt || {};
    stop();
    var def = SCENES[key];
    if (!def) return null;
    if (!opt.force && window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
    var host = opt.host || document.body, full = host === document.body;
    var cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:" + (full ? "fixed" : "absolute") + ";left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:" + (opt.z || 45) + (def.blend ? ";mix-blend-mode:" + def.blend : "");
    if (!full && getComputedStyle(host).position === "static") host.style.position = "relative";
    host.appendChild(cv);
    var ctx = cv.getContext("2d");
    var st = { ctx: ctx, W: 0, H: 0, t: 0, dt: 1, fade: 0, spawn: true };
    function size() {
      var w = full ? window.innerWidth : host.clientWidth, h = full ? window.innerHeight : host.clientHeight;
      var d = Math.min(1.75, window.devicePixelRatio || 1);
      st.W = w; st.H = h; cv.width = Math.max(1, Math.round(w * d)); cv.height = Math.max(1, Math.round(h * d));
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    size(); window.addEventListener("resize", size);
    var DUR = opt.duration || def.dur || 8500, FADE = 1500;
    var snd = Sound(def, DUR, opt.sound !== false);
    var scene = def.make(st, snd);
    var t0 = null, last = 0, raf = 0, dead = false;
    function frame(now) {
      if (dead) return;
      if (t0 === null) { t0 = now; last = now; }
      var el = now - t0;
      st.dt = Math.min(3, (now - last) / 16.667); last = now; st.t = el;
      st.fade = el > DUR - FADE ? Math.max(0, (DUR - el) / FADE) : Math.min(1, el / 500);
      st.spawn = el < DUR - FADE - 900;
      ctx.setTransform(Math.min(1.75, window.devicePixelRatio || 1), 0, 0, Math.min(1.75, window.devicePixelRatio || 1), 0, 0);
      ctx.clearRect(0, 0, st.W, st.H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      scene(el);
      if (el >= DUR) { end(); return; }
      raf = requestAnimationFrame(frame);
    }
    function end() {
      if (dead) return;
      dead = true; cancelAnimationFrame(raf); window.removeEventListener("resize", size);
      if (cv.parentNode) cv.parentNode.removeChild(cv);
      snd.stop();
      if (current === end) current = null;
    }
    raf = requestAnimationFrame(frame);
    current = end;
    return end;
  }
  function stop() { if (current) current(); }

  /* ---------------- automatic season by date ----------------
     Festivals that move every year come from this table (month-day). Add a new year's line when needed;
     a year without a line still gets the fixed-date festivals and summer / monsoon / winter. */
  var FEST = {
    2026: { holi: "03-03", padwa: "03-20", eid: ["03-21", "05-28"], ganesh: "09-14", navratri: "10-11", dussehra: "10-21", diwali: "11-08" },
    2027: { holi: "03-22", padwa: "04-07", eid: ["03-10", "05-17"], ganesh: "09-04", navratri: "09-30", dussehra: "10-09", diwali: "10-29" },
    2028: { holi: "03-11", padwa: "03-27", eid: ["02-27", "05-06"], ganesh: "08-23", navratri: "09-19", dussehra: "09-27", diwali: "10-17" },
    2029: { holi: "03-01", padwa: "04-14", eid: ["02-15", "04-25"], ganesh: "09-11", navratri: "10-08", dussehra: "10-16", diwali: "11-05" },
    2030: { eid: ["02-05", "04-14"], diwali: "10-26" }
  };
  function dayOf(y, md) { var p = md.split("-"); return new Date(y, +p[0] - 1, +p[1]); }
  function inRange(d, y, md, before, after) {
    var c = dayOf(y, md), a = new Date(c), b = new Date(c);
    a.setDate(a.getDate() - before); b.setDate(b.getDate() + after);
    return d >= a && d <= b;
  }
  /* The season for a date (or "" when none). Festivals come first, then the weather seasons. */
  function auto(date) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate(), md = m * 100 + day, f = FEST[y] || {};
    if (f.diwali && inRange(d, y, f.diwali, 8, 3)) return "diwali";
    if (f.navratri && f.dussehra) {
      var ns = dayOf(y, f.navratri), de = dayOf(y, f.dussehra);
      ns.setDate(ns.getDate() - 1); de.setDate(de.getDate() + 1);
      if (d >= ns && d <= de) return "navratri";
    }
    if (f.ganesh && inRange(d, y, f.ganesh, 1, 10)) return "ganesh";
    if (f.holi && inRange(d, y, f.holi, 3, 1)) return "holi";
    if (f.padwa && inRange(d, y, f.padwa, 3, 1)) return "padwa";
    if (f.eid && f.eid.some(function (e) { return inRange(d, y, e, 2, 2); })) return "eid";
    if (md >= 1228 || md <= 102) return "newyear";
    if (md >= 1220) return "christmas";
    if (md >= 110 && md <= 116) return "sankranti";
    if ((md >= 122 && md <= 127) || (md >= 811 && md <= 816)) return "republic";
    if (md >= 301 && md <= 607) return "summer";
    if (md >= 608 && md <= 930) return "monsoon";
    if (md >= 1115 || md <= 228 || (m === 2 && day === 29)) return "winter";
    return "";
  }
  /* What plays now: setting "auto" (or nothing saved) = by the calendar. A season chosen by hand (or "" = off)
     holds only until the calendar season changes after it was chosen; then the calendar takes over again,
     so a forgotten choice never stays for months. setAt = when the website settings were last saved. */
  function pickSeason(setting, setAt, now) {
    now = now || new Date();
    var cal = auto(now);
    if (setting == null || setting === "auto") return cal;
    if (setAt && !isNaN(new Date(setAt)) && auto(new Date(setAt)) !== cal) return cal;
    return setting;
  }
  function name(key) { for (var i = 0; i < LIST.length; i++) if (LIST[i].key === key) return LIST[i]; return null; }

  window.ShivtejSeason = { LIST: LIST, play: play, stop: stop, auto: auto, current: pickSeason, name: name };
})();
