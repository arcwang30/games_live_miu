(function (BM) {
  const TAU = Math.PI * 2;

  const M = BM.M = {
    TAU,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    wrapAngle(a) {
      while (a > Math.PI) a -= TAU;
      while (a < -Math.PI) a += TAU;
      return a;
    },
    lerpAngle(a, b, t) { return a + M.wrapAngle(b - a) * t; },
    smoothstep(t) { t = M.clamp(t, 0, 1); return t * t * (3 - 2 * t); },
    easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    // 補零：pad(42, 7) -> "0000042"
    pad: (n, digits) => String(Math.max(0, Math.floor(n))).padStart(digits, '0'),
    bezier(p0, p1, p2, p3, u) {
      const v = 1 - u;
      const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
      return {
        x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
        y: a * p0.y + b * p1.y + c * p2.y + d * p3.y
      };
    }
  };
})(window.BM = window.BM || {});
