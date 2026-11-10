// What lies under the cards and the sidebar: a wash of soft colour, a few
// blurred pools of pastel light on a pale ground — or, in the dark, deep
// tints on a near-black one — placed afresh each day by a seed from the
// date, and lit by the hour: warmer while the sun is low, cooler when it's
// high. One of the pools is the tint's. Drawn with WebGL (a fragment shader
// over one triangle), CSS gradients where there's none.
//
// After Manifold's BackdropView: the same seed, the same placing, the same
// light.

import { cast as daylightCast, neutralCast } from '../theme/daylight.js';
import { calibratedHSB } from '../theme/themes.js';

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 u_size;
uniform vec3 u_stops[4];
uniform vec4 u_pool[2];      // x, y (down, px), radius (px), alpha
uniform vec3 u_poolColor[2];
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 px = vec2(gl_FragCoord.x, u_size.y - gl_FragCoord.y);
  vec2 uv = px / u_size;
  // From the upper left to the lower right.
  float t = clamp((uv.x + uv.y) * 0.5, 0.0, 1.0);
  vec3 c = t < 0.4 ? mix(u_stops[0], u_stops[1], t / 0.4)
         : t < 0.75 ? mix(u_stops[1], u_stops[2], (t - 0.4) / 0.35)
         : mix(u_stops[2], u_stops[3], (t - 0.75) / 0.25);
  for (int i = 0; i < 2; i++) {
    float d = distance(px, u_pool[i].xy) / max(u_pool[i].z, 1.0);
    float a = u_pool[i].w * (1.0 - clamp(d, 0.0, 1.0));
    c = mix(c, u_poolColor[i], a);
  }
  // A grain finer than a step of colour, against banding.
  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;

/** A small deterministic generator, seeded by the day (Manifold's, to the bit). */
function seeded(day) {
  const M = (1n << 64n) - 1n;
  let state = (BigInt(day) * 2654435761n + 97n) & M;
  return () => {
    state = (state * 6364136223846793005n + 1442695040888963407n) & M;
    return Number(state >> 11n) / 2 ** 53;
  };
}

export function parseColor(css) {
  if (Array.isArray(css)) return css;
  let m = /^#([0-9a-f]{6})$/i.exec(css);
  if (m) {
    const v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  m = /rgba?\(([^)]+)\)/.exec(css);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return [r / 255, g / 255, b / 255];
  }
  return [0.5, 0.5, 0.5];
}

function hueSaturation([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { hue: h, saturation: s };
}

/** The colours and places of a day's backdrop: what the shader is given.
 *  `wash`: {stops: [[h,s,b]×4], pool: {saturation, brightness}, tintPool: {…}}. */
export function compose(wash, { tint = '#0A84FF', day = Math.floor(Date.now() / 86400000), cast = neutralCast } = {}) {
  const r = seeded(day);
  const turn = (r() - 0.5) * 0.06;
  // A colour in the light: each channel, linearized, taken by the cast.
  const lit = ([cr, cg, cb]) => [
    Math.pow(Math.pow(cr, 2.2) * cast.red, 1 / 2.2),
    Math.pow(Math.pow(cg, 2.2) * cast.green, 1 / 2.2),
    Math.pow(Math.pow(cb, 2.2) * cast.blue, 1 / 2.2),
  ];
  // (The wash's colours are calibrated — Generic RGB — as AppKit has them.)
  const turned = (h) => (((h + turn + 1) % 1) + 1) % 1;
  const stops = wash.stops.map(([h, s, b]) => lit(calibratedHSB(turned(h), s, b)));
  const t = hueSaturation(parseColor(tint));
  const pools = [];
  for (let pool = 0; pool < 2; pool++) {
    const hue = turned(wash.stops[Math.floor(r() * 3)][0]);
    // The first pool is the tint's — a little more coloured than the wash's own.
    const color = pool === 0
      ? calibratedHSB(t.hue, wash.tintPool.saturation * t.saturation, wash.tintPool.brightness)
      : calibratedHSB(hue, wash.pool.saturation, wash.pool.brightness);
    // Its centre across and up; its radius of the longer side.
    pools.push({ x: r(), y: r(), r: 0.3 + 0.3 * r(), color: lit(color), alpha: 0.5 });
  }
  return { stops, pools };
}

const css255 = (c) => `rgb(${c.map((v) => Math.round(Math.min(Math.max(v, 0), 1) * 255)).join(' ')})`;

/** The same backdrop as CSS, for where WebGL isn't. */
export function composeCSS(scene, width, height) {
  const long = Math.max(width, height, 1);
  const pools = scene.pools.map((p) => {
    const [r, g, b] = p.color.map((v) => Math.round(v * 255));
    return `radial-gradient(circle ${p.r * long}px at ${p.x * 100}% ${(1 - p.y) * 100}%, rgba(${r},${g},${b},${p.alpha}), rgba(${r},${g},${b},0))`;
  });
  const s = scene.stops;
  return [...pools.reverse(), `linear-gradient(to bottom right,${css255(s[0])} 0%, ${css255(s[1])} 40%, ${css255(s[2])} 75%, ${css255(s[3])} 100%)`].join(', ');
}

export class Backdrop {
  /**
   * @param {object} options
   *   wash      the theme's wash for the appearance in use (see `compose`)
   *   tint      the accent, as a CSS colour
   *   place     {latitude, longitude} for the light; none: the time zone's
   *   daylight  false to leave the wash unlit
   *   webgl     false to draw with CSS gradients
   */
  constructor({ wash, tint, place, daylight = true, webgl = true, clock = null } = {}) {
    this.el = document.createElement('div');
    this.el.className = 'mf-backdrop';
    this.wash = wash;
    this.tint = tint;
    this.place = place;
    this.daylight = daylight;
    this.clock = clock;
    this.scene = null;
    this.shown = null;
    if (webgl) this.#initGL();
    this.resize = new ResizeObserver(() => this.#draw());
    this.resize.observe(this.el);
    // The light looked at again every five minutes, and eased into.
    this.timer = setInterval(() => this.relight(true), 300000);
    this.onVisible = () => { if (!document.hidden) this.relight(true); };
    document.addEventListener('visibilitychange', this.onVisible);
    this.set({ wash, tint }, false);
  }

  #initGL() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) return;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.gl = gl;
    this.canvas = canvas;
    this.uniforms = {
      size: gl.getUniformLocation(prog, 'u_size'),
      stops: gl.getUniformLocation(prog, 'u_stops'),
      pool: gl.getUniformLocation(prog, 'u_pool'),
      poolColor: gl.getUniformLocation(prog, 'u_poolColor'),
    };
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => { this.gl = null; this.canvas.remove(); this.#initGL(); this.#draw(); });
    this.el.append(canvas);
  }

  #cast() {
    if (!this.daylight) return neutralCast;
    return daylightCast(this.clock ?? new Date(), this.place);
  }

  /** Another wash (a theme, an appearance) or tint: cross-faded. */
  set({ wash = this.wash, tint = this.tint } = {}, fade = true) {
    this.wash = wash;
    this.tint = tint;
    this.lastCast = this.#cast();
    this.#go(compose(wash, { tint, cast: this.lastCast, day: Math.floor((this.clock ?? new Date()).getTime() / 86400000) }), fade ? 600 : 0);
  }

  /** The light looked at again; redrawn if it has moved, eased into over a
   *  few seconds so the change is never seen happening. */
  relight(fade = true) {
    const now = this.#cast();
    const was = this.lastCast;
    if (was && now.red === was.red && now.green === was.green && now.blue === was.blue) return;
    this.lastCast = now;
    this.#go(compose(this.wash, { tint: this.tint, cast: now, day: Math.floor((this.clock ?? new Date()).getTime() / 86400000) }), fade ? 4000 : 0);
  }

  #go(scene, duration) {
    cancelAnimationFrame(this.raf);
    const from = this.shown;
    this.scene = scene;
    if (!from || !duration) {
      this.shown = scene;
      return this.#draw();
    }
    const start = performance.now();
    const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const step = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      this.shown = {
        stops: from.stops.map((s, i) => mix(s, scene.stops[i], t)),
        pools: from.pools.map((p, i) => {
          const q = scene.pools[i];
          return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, r: p.r + (q.r - p.r) * t, alpha: p.alpha, color: mix(p.color, q.color, t) };
        }),
      };
      this.#draw();
      if (t < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  #draw() {
    const scene = this.shown;
    if (!scene) return;
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    const gl = this.gl;
    if (!gl || gl.isContextLost()) {
      this.el.style.background = composeCSS(scene, w, h);
      return;
    }
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(w * scale), ch = Math.round(h * scale);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      gl.viewport(0, 0, cw, ch);
    }
    const long = Math.max(cw, ch);
    gl.uniform2f(this.uniforms.size, cw, ch);
    gl.uniform3fv(this.uniforms.stops, new Float32Array(scene.stops.flat()));
    gl.uniform4fv(this.uniforms.pool, new Float32Array(scene.pools.flatMap((p) => [p.x * cw, (1 - p.y) * ch, p.r * long, p.alpha])));
    gl.uniform3fv(this.uniforms.poolColor, new Float32Array(scene.pools.flatMap((p) => p.color)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destroy() {
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    document.removeEventListener('visibilitychange', this.onVisible);
    this.el.remove();
  }
}
