import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Minden asset (modell, adat, fotók) az app.js helyéhez képest töltődik, így a térkép
// önállóan (web/) és beágyazva (/projekt/mvm-dome) is működik.
const asset = (rel) => new URL(rel, import.meta.url).href;
const QS = new URLSearchParams(location.search);
const SHOT = QS.has('shot');
if (SHOT) { addEventListener('error', (e) => { document.title = 'JSERR ' + e.message + ' @' + e.lineno; }); addEventListener('unhandledrejection', (e) => { document.title = 'JSREJ ' + (e.reason && e.reason.message); }); }   // képernyőkép-mód (fej nélküli böngésző): a betöltő azonnal eltűnik

// ---------- konfiguráció ----------
// 4 szint, mindegyik a saját padlóján (y = 0), az aréna középpontja az origó. A modellek a Blender showreel-fájlból
// (00_Teljes_epulet/…_showreel_v01.blend) jönnek: _Blender_Projects/00_Web_export/scripts/export_web.py + web_adat.py
const LEVELS = {
  felso:  { key: 'S3', name: 'Felső körüljáró', model: 'models/S3.glb', data: 'data/S3.json', tier: 'Felső lelátó (3xx)' },
  paholy: { key: 'S2', name: 'VIP páholy szint', model: 'models/S2.glb', data: 'data/S2.json', tier: 'Alsó lelátó (2xx)' },
  also:   { key: 'S1', name: 'Alsó körüljáró', model: 'models/S1.glb', data: 'data/S1.json', tier: 'Alsó lelátó (2xx)' },
  lobby:  { key: 'S0', name: 'Lobby és küzdőtér', model: 'models/S0.glb', data: 'data/S0.json', tier: 'Küzdőtéri lelátó (1xx)' },
};

// Pinek: funkciónként színes (a térkép-stílus palettája), az ikon fehér vagy sötét a jobb olvashatóságért
const CATS = {
  wc:         { label: 'Mosdó',           color: '#009EE2', ink: '#fff',    photo: 'img/arena.jpg',  icon: '<circle cx="6.5" cy="4" r="2"/><path d="M3.5 8h6v7H8v6H5v-6H3.5z"/><path d="M12 2v20"/><circle cx="17.5" cy="4" r="2"/><path d="M15.5 8h4l2 7h-2v6h-4v-6h-2z"/>', text: 'Női, férfi és akadálymentes mosdó. A mosdók a körüljáróról nyílnak, a szektorbejáratok közelében.' },
  baba:       { label: 'Baba-mama szoba', color: '#009EE2', ink: '#fff',    photo: 'img/arena.jpg',  icon: '<circle cx="12" cy="8" r="4"/><path d="M6 21a6 6 0 0 1 12 0"/>', text: 'Pelenkázó és szoptatóhelyiség, csendes, elkülönített térben.' },
  bar:        { label: 'Büfé, bár',       color: '#F79431', ink: '#101828', photo: 'img/pult.jpg',   icon: '<path d="M4 4h16l-6 8v6h-4v-6z"/><path d="M8 20h8"/>', text: 'Italok, snackek, kávé. Kártyás és mobilos fizetés. A rendezvény kezdete előtt egy órával nyit.' },
  ruhatar:    { label: 'Ruhatár',         color: '#F9B701', ink: '#101828', photo: 'img/arena.jpg',  icon: '<path d="M12 4a2 2 0 1 0 0 4v2"/><path d="M12 10 3 16h18z"/>', text: 'Kabát- és táskamegőrzés a rendezvény teljes ideje alatt. A ruhatárjegyet őrizd meg.' },
  lift:       { label: 'Lift',            color: '#038A8B', ink: '#fff',    photo: 'img/arena.jpg',  icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 11l3-3 3 3"/><path d="M9 14l3 3 3-3"/>', text: 'Akadálymentes közlekedés a szintek között. Kerekesszékkel és babakocsival is használható.' },
  vip:        { label: 'VIP',             color: '#038A8B', ink: '#fff',    photo: 'img/arena.jpg',  icon: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>', text: 'VIP bejárat és fogadótér a páholyvendégeknek.' },
  elsosegely: { label: 'Elsősegély',      color: '#E2384F', ink: '#fff',    photo: 'img/arena.jpg',  icon: '<path d="M12 5v14"/><path d="M5 12h14"/>', text: 'Egészségügyi ügyelet a rendezvény ideje alatt. Sürgős esetben szólj a legközelebbi teremőrnek.' },
  info:       { label: 'Információ',      color: '#FCBF20', ink: '#101828', photo: 'img/arena.jpg',  icon: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>', text: 'Információs pult: jegyügyek, elveszett tárgyak, segítség a tájékozódásban.' },
  szektor:    { label: 'Szektor',         color: '#FCBF20', ink: '#101828', photo: 'img/lelato.jpg', icon: '', text: '' },
};
// A pinek és a szűrő piktogramjai a Blenderben használt v1-es ikonok (ALAPRAJZ/v1 → textures/ikonok → img/ikonok), változatlan színnel/formával
const IKONFAJL = { wc: 'wc', baba: 'baba', bar: 'bufe', ruhatar: 'ruhatar', lift: 'lift', vip: 'vip', elsosegely: 'elsosegely', info: 'info' };
const ikonUrl = (nev) => asset(`img/ikonok/ikon_${nev}.${nev === 'info' ? 'png' : 'svg'}`);
// Szűrés: null = minden szolgáltatás látszik; egy kategória = csak az látszik (pulzálva). A szektorszámok külön kapcsolhatók.
let activeCat = null;
let showSectors = true;
const isVisible = (cat) => cat === 'szektor' ? showSectors : (activeCat ? cat === activeCat : true);

// ---------- DOM ----------
const $ = (s) => document.querySelector(s);
const loaderEl = $('#loader'), pctEl = $('#pct'), barEl = $('#barfill'), lvlNameEl = $('#lvlName');
const markersEl = $('#markers'), panel = $('#panel'), toast = $('#toast'), hint = $('#hint'), overviewBtn = $('#overviewBtn');

// ---------- Three.js alap ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
renderer.debug.onShaderError = (gl, prog, vs, fs) => { document.title = 'SHADERERR ' + (gl.getShaderInfoLog(fs) || '') + ' || ' + (gl.getShaderInfoLog(vs) || ''); };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141d2b);
scene.fog = new THREE.Fog(0x141d2b, 320, 700);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 2000);
camera.position.set(190, 170, 250);

// OrbitControls csak részletnézetben aktív (egy pont körül szabadon forgatható)
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 160;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minPolarAngle = Math.PI * 0.08;
controls.enablePan = false;
controls.enabled = false;

// Fények: alap hangulat (a sütött fény egy későbbi lépés)
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1b2333, 0.9));
const key = new THREE.DirectionalLight(0xfff1e0, 1.5);
key.position.set(120, 220, 80);
scene.add(key);
const rim = new THREE.DirectionalLight(0x8fa4ff, 0.35);
rim.position.set(-150, 120, -120);
scene.add(rim);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

let current = null;          // { key, root, anim, pois, markers, lights, data, path }
const cache = {};            // betöltött szintek (gyors visszaváltás)

// ---------- Anyag-hangolás ----------
// A színek a Blender-fájlból jönnek (sima anyagok). Itt csak: üveg ne írjon mélységet, a lelátó anyagai kapják a szektor-kiemelő shadert.
const STAND = /^W_(Lelato|TS_lelato|Szek|VIP_szek|Kuzdoter)/i;   // dupla kattintás: ezekre kattintva a szektort választja
// Szektor-kiemelés (felhasználó, 2026-11-18): csak a lelátó lépcsőfokai (felfelé néző felületek) villognak, a szektor szögtartományában,
// szintenként a saját blokkban: lobby = 1xx; alsó körüljáró = 2xx alsó + felső blokk (köztük a keresztjáró sötét marad, eltolt ütemben);
// VIP szint = csak a szektor előtti VIP-páholyrész; felső körüljáró = 3xx. Sávok: [z0, z1 (abszolút m), dr0, dr1 (a szektorszám sugarához képest)]
// – a showreel-modellből mért profil (203-as / 103-as / 303-as szektor).
const HLBANDS = {
  S0: [[0.1, 6.0, -8.0, 8.0]],
  S1: [[6.2, 7.95, -6.0, -1.0], [8.3, 10.6, -1.4, 4.5]],
  S2: [[12.0, 14.5, 4.0, 16.5]],
  S3: [[14.5, 25.0, -4.5, 9.5]],
};
const HL = { on: { value: 0 }, a0: { value: 0 }, a1: { value: 0 }, rl: { value: 0 }, k0: { value: 0 }, k1: { value: 0 },
             b0: { value: new THREE.Vector4(0, -1, 0, 0) }, b1: { value: new THREE.Vector4(0, -1, 0, 0) } };
function addSectorShader(m) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uHlOn: HL.on, uHlA0: HL.a0, uHlA1: HL.a1, uHlRl: HL.rl, uHlK0: HL.k0, uHlK1: HL.k1, uHlB0: HL.b0, uHlB1: HL.b1 });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNor = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;\nuniform float uHlOn,uHlA0,uHlA1,uHlRl,uHlK0,uHlK1;\nuniform vec4 uHlB0,uHlB1;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (uHlOn > 0.5 && vWNor.y > 0.6) {
          float a = atan(-vWPos.z, vWPos.x);
          float d0 = mod(a - uHlA0 + 6.2831853, 6.2831853), w = mod(uHlA1 - uHlA0 + 6.2831853, 6.2831853);
          if (d0 < w) {
            float dr = length(vWPos.xz) - uHlRl, y = vWPos.y;
            float k = 0.0;
            if (y > uHlB0.x && y < uHlB0.y && dr > uHlB0.z && dr < uHlB0.w) k = uHlK0;
            if (y > uHlB1.x && y < uHlB1.y && dr > uHlB1.z && dr < uHlB1.w) k = uHlK1;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.99, 0.75, 0.13), k);
          }
        }`);
  };
  m.customProgramCacheKey = () => 'szektor-hl3';
}
// Kézi felülírások (felhasználó, 2026-11-18): a lelátó sötét, ne fehér; a lelátó-bejáratok sötét számai (a fehér szektorszám
// mellett „duplának” látszottak) rejtve
const MAT = {
  W_Lelato_beton_vilagos: { color: 0x1d222b, roughness: 0.95 },
  W_Lelato_beton:         { color: 0x232831, roughness: 0.95 },
  W_Lelato_felirat_sotet: { hide: true },
  W_Hatso_teto:           { color: 0xb9b3aa, roughness: 0.9 },   // lobby: a WC-k / hátsó helyiségek túlnyúló teteje világos, megvilágított (nem fekete)
  // (a lobbyfájl duplán látszó Szektor_1xx szövegeit 2026-11-18-tól maga a modell rejti)
};
// Felső körüljáró: a teljes homlokzat (+35 m-es perem, LED-kijelző) kívülről eltakarná a folyosót → a szint mennyezeténél (padló + 5,1 m)
// elvágva, ahogy a többi szinten a modellben is a szint fölött ér véget
const FACADE = /^W_(Kulso|Kulter)/;
const FACADE_CUT = { S3: 5.1 };
function tuneMaterials(root, key) {
  const cut = FACADE_CUT[key] ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), FACADE_CUT[key])] : null;
  const done = new Set();
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (done.has(m)) continue; done.add(m);
      if (m.transparent) { m.depthWrite = false; }
      if (cut && FACADE.test(m.name || '')) m.clippingPlanes = cut;
      const t = Object.entries(MAT).find(([k]) => (m.name || '').startsWith(k))?.[1];
      if (t) {
        if (t.hide) { m.visible = false; continue; }
        if (t.color !== undefined) m.color.setHex(t.color);
        if (t.roughness !== undefined) m.roughness = t.roughness;
      }
      if (!m.transparent) addSectorShader(m);
      if (m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) m.emissiveIntensity = Math.min(m.emissiveIntensity, 2.5);
    }
  });
}

// Fényfoltok a szolgáltatások fölé – a pin színével (a végleges verzióban kisütött fény)
const LIGHT = { bar: 300, wc: 160, ruhatar: 160, lift: 120, elsosegely: 120, baba: 100, vip: 140, info: 140 };
function addPoiLights(pois) {
  const lights = [];
  for (const p of pois) {
    const I = LIGHT[p.cat]; if (!I) continue;
    const l = new THREE.PointLight(CATS[p.cat].color, I, 22, 1.9);
    l.position.set(p.x, 2.2, -p.y);   // a padló fölött, a (lealacsonyított) felső sáv alatt – különben fényfolt a sáv tetején
    scene.add(l); lights.push(l);
  }
  return lights;
}

// ---------- Markerek ----------
const ICON = (cat, nev) => `<img class="ik" src="${ikonUrl(nev || IKONFAJL[cat])}" alt="">`;
const poiWorld = (p) => new THREE.Vector3(p.x, p.z, -p.y);

function buildMarkers(pois) {
  markersEl.innerHTML = '';
  return pois.map((p) => {
    const el = document.createElement('div');
    el.className = `mk ${p.cat}`;
    el.style.setProperty('--pin', CATS[p.cat].color);
    el.style.setProperty('--ink', CATS[p.cat].ink);
    if (p.cat === 'szektor') {
      el.innerHTML = `<div class="pin">${p.name.replace('Szektor ', '')}</div>`;
    } else {
      el.innerHTML = `<div class="lbl">${p.name}</div><div class="pin">${ICON(p.cat, p.ikon)}</div><div class="stem"></div>`;
    }
    el.addEventListener('click', (e) => { e.stopPropagation(); selectPoi(p); });
    el.addEventListener('dblclick', (e) => e.stopPropagation());
    markersEl.appendChild(el);
    const world = poiWorld(p); world.y += p.cat === 'szektor' ? 1.5 : 1.2;
    return { p, el, world };
  });
}

const _v = new THREE.Vector3();
function updateMarkers() {
  if (!current) return;
  const w = innerWidth, h = innerHeight;
  const camDist = camera.position.distanceTo(controls.target);
  for (const m of current.markers) {
    if (!isVisible(m.p.cat)) { m.el.classList.add('hidden'); continue; }
    m.el.classList.toggle('focus', activeCat !== null && m.p.cat === activeCat);
    _v.copy(m.world).project(camera);
    if (_v.z > 1) { m.el.classList.add('hidden'); continue; }
    m.el.classList.remove('hidden');
    const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * h;
    const focus = activeCat !== null && m.p.cat === activeCat;
    const s = THREE.MathUtils.clamp(95 / camDist + 0.28, 0.5, 1.1) * (focus ? 1.3 : 1);
    m.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%) scale(${s})`;
  }
}

// ---------- Kamera: két mód ----------
// 'tour'   – a kamera a Blenderben beállított showreel-kamera útján halad (S1–S3: körpálya a folyosó fölött, S0: ív a lobby előtt);
//            húzással ugyanezen a pályán lehet előre-hátra tekerni, görgővel közelebb / távolabb
// 'detail' – dupla kattintás / marker után egy horgonypont körül szabadon forgatható (OrbitControls)
const TOUR = { loopSec: 95, arcSec: 34, idleMs: 14000 };
const tour = { u: 0, dir: 1, lastNow: 0, zoom: 1, drag: null, vel: 0 };
let mode = 'tour';
let anim = null;
let idleTimer = null;
let hfov = 49.6;

const v3 = (a, i) => new THREE.Vector3(a[i], a[i + 2], -a[i + 1]);
function buildPath(cam) {
  const pts = cam.path;
  const closed = !!cam.closed;
  const P = pts.map((p) => v3(p, 0)), T = pts.map((p) => v3(p, 3));
  if (closed && P.length > 2 && P[0].distanceTo(P[P.length - 1]) < 0.5) { P.pop(); T.pop(); }
  return { pos: new THREE.CatmullRomCurve3(P, closed, 'centripetal'), tgt: new THREE.CatmullRomCurve3(T, closed, 'centripetal'), closed };
}
const _p = new THREE.Vector3(), _t = new THREE.Vector3();
function pathAt(u, outP, outT) {
  const path = current.path;
  const uu = path.closed ? ((u % 1) + 1) % 1 : THREE.MathUtils.clamp(u, 0, 1);
  path.pos.getPointAt(uu, outP); path.tgt.getPointAt(uu, outT);
  outP.sub(outT).multiplyScalar(tour.zoom).add(outT);
}
function nearestU() {
  let best = 0, bd = Infinity;
  for (let i = 0; i <= 240; i++) {
    const u = i / 240; pathAt(u, _p, _t);
    const d = _p.distanceTo(camera.position); if (d < bd) { bd = d; best = u; }
  }
  return best;
}
function enterTour(dur = 1600) {
  mode = 'tour';
  controls.enabled = false;
  overviewBtn.classList.remove('show');
  clearTimeout(idleTimer);
  tour.u = nearestU(); tour.vel = 0; tour.lastNow = 0;
  const p = new THREE.Vector3(), tg = new THREE.Vector3(); pathAt(tour.u, p, tg);
  anim = { from: { p: camera.position.clone(), t: controls.target.clone() }, to: { p, t: tg }, t0: performance.now(), dur };
}
function enterDetail(anchor, distance = 34, height = 24) {
  mode = 'detail';
  controls.enabled = true;
  overviewBtn.classList.add('show');
  const from = { p: camera.position.clone(), t: controls.target.clone() };
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).setY(0).normalize();
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 1).normalize();
  const to = { t: anchor.clone(), p: anchor.clone().add(dir.multiplyScalar(distance)).add(new THREE.Vector3(0, height, 0)) };
  anim = { from, to, t0: performance.now(), dur: 1100 };
  armIdle();
}
function armIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (mode === 'detail' && !panel.classList.contains('show')) enterTour(); }, TOUR.idleMs);
}
function stepAnim(now) {
  if (!anim) return;
  let k = Math.min(1, (now - anim.t0) / anim.dur);
  k = 1 - Math.pow(1 - k, 3);
  camera.position.lerpVectors(anim.from.p, anim.to.p, k);
  controls.target.lerpVectors(anim.from.t, anim.to.t, k);
  if (k >= 1) anim = null;
}
function stepTour(now) {
  if (mode !== 'tour' || anim || !current) { tour.lastNow = now; return; }
  const dt = tour.lastNow ? Math.min(0.05, (now - tour.lastNow) / 1000) : 0;
  tour.lastNow = now;
  const closed = current.path.closed;
  if (!tour.drag) {
    // elengedés után a lendület kifut, majd folytatódik a lassú alapmozgás (az íven oda-vissza)
    tour.vel *= Math.pow(0.05, dt);
    const base = SHOT ? 0 : (closed ? 1 / TOUR.loopSec : tour.dir / TOUR.arcSec);   // képernyőkép-módban áll a kamera
    tour.u += (base + tour.vel) * dt;
    if (!closed) {
      if (tour.u >= 1) { tour.u = 1; tour.dir = -1; tour.vel = 0; }
      if (tour.u <= 0) { tour.u = 0; tour.dir = 1; tour.vel = 0; }
    }
  }
  pathAt(tour.u, camera.position, controls.target);
}

// Húzás körút-módban: csak a pálya mentén (jobbra-balra), föl-le nem
const DRAG_GAIN = 0.00055; // pálya-hossz / px
canvas.addEventListener('pointerdown', (e) => {
  hint.classList.add('hide');
  if (mode !== 'tour' || anim) return;
  tour.drag = { x: e.clientX, u: tour.u, lastX: e.clientX, lastT: performance.now(), v: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!tour.drag) return;
  const now = performance.now();
  const dx = e.clientX - tour.drag.lastX, dt = Math.max(1, now - tour.drag.lastT) / 1000;
  tour.drag.v = (-dx * DRAG_GAIN) / dt;
  tour.drag.lastX = e.clientX; tour.drag.lastT = now;
  tour.u = tour.drag.u - (e.clientX - tour.drag.x) * DRAG_GAIN;
  if (current && !current.path.closed) tour.u = THREE.MathUtils.clamp(tour.u, 0, 1);
});
const endDrag = () => { if (!tour.drag) return; tour.vel = THREE.MathUtils.clamp(tour.drag.v, -0.12, 0.12); if (tour.vel) tour.dir = Math.sign(tour.vel); tour.drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
// Görgetés körút-módban: közelebb / távolabb ugyanazon a pályán
canvas.addEventListener('wheel', (e) => {
  if (mode !== 'tour') return;
  tour.zoom = THREE.MathUtils.clamp(tour.zoom * (1 + Math.sign(e.deltaY) * 0.06), 0.55, 1.4);
}, { passive: true });
// Részletnézetben minden interakció újraindítja az üresjárati számlálót
controls.addEventListener('start', () => { clearTimeout(idleTimer); });
controls.addEventListener('end', armIdle);

// Dupla kattintás: szolgáltatás a közelben → azt választja ki; lelátóra → a legközelebbi szektor (sárgán kiemelve);
// egyébként az adott pont körül szabadon forgatható
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const azim = (x, y) => Math.atan2(y, x);
function sectorAt(point) {
  const a = Math.atan2(-point.z, point.x);
  let best = null, bd = Infinity;
  for (const s of current.pois) {
    if (s.cat !== 'szektor') continue;
    let d = Math.abs(a - azim(s.x, s.y)); if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function dblAt(clientX, clientY) {
  if (!current) return;
  ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(current.root, true).find((h) => !(h.object.material?.transparent));
  if (!hit) return;
  let best = null, bd = 7;
  for (const p of current.pois) {
    if (!isVisible(p.cat) || p.cat === 'szektor') continue;
    const d = poiWorld(p).distanceTo(hit.point);
    if (d < bd) { bd = d; best = p; }
  }
  if (best) { selectPoi(best); return; }
  const mat = hit.object.material;
  if (mat && STAND.test(mat.name || '') && hit.point.length() > 25) {
    const s = sectorAt(hit.point);
    if (s) { selectPoi(s, hit.point); return; }
  }
  closePanel(false); enterDetail(hit.point);
}
canvas.addEventListener('dblclick', (e) => dblAt(e.clientX, e.clientY));
let lastTap = 0;
canvas.addEventListener('touchend', (e) => {
  const now = performance.now();
  if (now - lastTap < 320 && e.changedTouches.length === 1) { const t = e.changedTouches[0]; dblAt(t.clientX, t.clientY); }
  lastTap = now;
});
overviewBtn.addEventListener('click', () => { closePanel(false); enterTour(); });

// ---------- Kiválasztás / infópanel ----------
let selectedEl = null;
function side(p) {
  const a = Math.atan2(p.y, p.x) * 180 / Math.PI; // Blender XY: +Y = észak (a lobby oldala), +X = kelet
  if (a >= 45 && a < 135) return 'Északi oldal';
  if (a >= 135 || a < -135) return 'Nyugati oldal';
  if (a >= -135 && a < -45) return 'Déli oldal';
  return 'Keleti oldal';
}
function nearestSectors(p, pois) {
  return pois.filter(s => s.cat === 'szektor')
    .map(s => ({ s, d: Math.hypot(s.x - p.x, s.y - p.y) }))
    .sort((a, b) => a.d - b.d).slice(0, 2).map(o => o.s.name.replace('Szektor ', ''));
}
function selectPoi(p, anchor) {
  const m = current.markers.find(x => x.p === p);
  selectedEl?.classList.remove('sel'); selectedEl = m?.el || null; selectedEl?.classList.add('sel');
  const c = CATS[p.cat];
  $('#panelPhoto').style.backgroundImage = `url(${asset(c.photo)})`;
  $('#panelCat').textContent = `${side(p)} · ${c.label}`;
  $('#panelTitle').textContent = p.name;
  $('#panelText').textContent = p.cat === 'szektor'
    ? `${LEVELS[current.level].tier}. A szektor bejárata a körüljáróról nyílik; a legközelebbi mosdó és büfé a bejárat közelében található.`
    : c.text;
  const near = nearestSectors(p, current.pois);
  $('#panelNear').innerHTML = p.cat === 'szektor' || !near.length ? '' : `Legközelebbi szektorok: <b>${near.join(', ')}</b>`;
  panel.classList.add('show'); document.body.classList.add('panel-open');
  const at = anchor ? anchor.clone() : poiWorld(p);
  enterDetail(at, p.cat === 'szektor' ? 46 : 30, p.cat === 'szektor' ? 30 : 20);
  highlightSector(p.cat === 'szektor' ? p : null);
}
function closePanel(backToTour = true) {
  panel.classList.remove('show'); document.body.classList.remove('panel-open');
  selectedEl?.classList.remove('sel'); selectedEl = null;
  highlightSector(null);
  if (backToTour) enterTour();
}
// Bezárásra azonnal vissza a körútra – onnan folytatja, ahol a kamera éppen áll
$('#panelX').addEventListener('click', () => closePanel(true));

// Szektor-kiemelés: a lelátó anyagain egy szögtartomány (a szomszéd szektorok felezőjéig) pulzál sárgán
function highlightSector(s) {
  if (!s || !current) { HL.on.value = 0; return; }
  const secs = current.pois.filter(x => x.cat === 'szektor').map(x => ({ x, a: azim(x.x, x.y) })).sort((a, b) => a.a - b.a);
  const i = secs.findIndex(o => o.x === s); const n = secs.length;
  const a = secs[i].a, prev = secs[(i - 1 + n) % n].a, next = secs[(i + 1) % n].a;
  const half = (b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d / 2; };
  HL.a0.value = a + half(prev) * 0.96; HL.a1.value = a + half(next) * 0.96;
  HL.rl.value = Math.hypot(s.x, s.y);
  const fl = current.data.padlo || 0, bands = HLBANDS[current.data.szint] || [];
  [HL.b0, HL.b1].forEach((u, j) => { const b = bands[j]; u.value.set(b ? b[0] - fl : 0, b ? b[1] - fl : -1, b ? b[2] : 0, b ? b[3] : 0); });
  HL.on.value = 1;
}

// ---------- Szűrőpanel: egy kategória kiválasztása = csak az látszik; újra kattintva vissza az összes ----------
const FILTER_COLUMNS = [
  ['wc', 'baba', 'bar', 'ruhatar'],          // szolgáltatások
  ['lift', 'elsosegely', 'info', 'szektor'], // közlekedés, biztonság, tájékozódás
];
function buildFilters() {
  const f = $('#filters');
  for (const col of FILTER_COLUMNS) {
    const wrap = document.createElement('div'); wrap.className = 'col';
    for (const k of col) {
      const c = CATS[k];
      const b = document.createElement('button');
      b.className = 'chip';
      b.style.setProperty('--col', c.color);
      b.style.setProperty('--ink', c.ink);
      if (k === 'szektor') {
        b.dataset.sectors = '1';
        b.innerHTML = `<span class="dot">#</span><span>Szektorszámok</span><span class="n" data-n="szektor"></span>`;
        b.addEventListener('click', () => { showSectors = !showSectors; syncChips(); });
      } else {
        b.dataset.cat = k;
        b.innerHTML = `<span class="dot">${ICON(k)}</span><span>${c.label}</span><span class="n" data-n="${k}"></span>`;
        b.addEventListener('click', () => { activeCat = activeCat === k ? null : k; syncChips(); });
      }
      wrap.appendChild(b);
    }
    f.appendChild(wrap);
  }
}
function syncChips() {
  document.querySelectorAll('.chip[data-cat]').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === activeCat);
    b.classList.toggle('dim', activeCat !== null && b.dataset.cat !== activeCat);
  });
  const sec = document.querySelector('.chip[data-sectors]');
  if (sec) sec.classList.toggle('off', !showSectors);
}
function fillCounts(pois) {
  document.querySelectorAll('[data-n]').forEach(el => {
    const n = pois.filter(p => p.cat === el.dataset.n).length;
    el.textContent = n;
    el.closest('.chip').classList.toggle('none', n === 0);
  });
  if (activeCat && !pois.some(p => p.cat === activeCat)) { activeCat = null; syncChips(); }
}

// ---------- Lift-animáció (lobby): saját órán, folyamatos körben – a kamerától és a húzástól független ----------
const clock = new THREE.Clock();
function setupAnim(gltf, clipTop) {
  const root = gltf.scene;
  const planes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), clipTop), new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.6)];
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) { m.clippingPlanes = planes; m.clipShadows = true; }
  });
  const mixer = new THREE.AnimationMixer(root);
  const dur = Math.max(...gltf.animations.map(a => a.duration));
  for (const clip of gltf.animations) { clip.duration = dur; mixer.clipAction(clip).setLoop(THREE.LoopRepeat).play(); }
  return { root, mixer };
}

// ---------- Szintbetöltés ----------
function showLoader(name) {
  lvlNameEl.textContent = `${name} betöltése`;
  pctEl.textContent = '0%'; barEl.style.width = '0%';
  loaderEl.classList.remove('hide');
}
function setProgress(k) { const p = Math.round(k * 100); pctEl.textContent = `${p}%`; barEl.style.width = `${p}%`; }
const loadGltf = (url, onProg) => new Promise((res, rej) => loader.load(asset(url), res, onProg, rej));

let loading = false;
async function loadLevel(level) {
  if (loading || current?.level === level) return;
  loading = true;
  const L = LEVELS[level];
  try {
    closePanel(false);
    let c = cache[level];
    if (!c) {
      const resp = await fetch(asset(L.data));
      if (!resp.ok) { showToast(`${L.name}: a modell pár percen belül érkezik.`); if (!current) setTimeout(() => loadLevel('also'), 0); return; }
      showLoader(L.name);
      const data = await resp.json();
      const gltf = await loadGltf(L.model, (xhr) => { if (xhr.total) setProgress(Math.min(0.97, xhr.loaded / xhr.total)); });
      tuneMaterials(gltf.scene, L.key);
      let animObj = null;
      if (data.anim) {
        try { animObj = setupAnim(await loadGltf(data.anim.model), data.anim.clip_top); } catch (e) { console.warn('animáció', e); }
      }
      c = cache[level] = { level, root: gltf.scene, anim: animObj, data, path: buildPath(data.camera) };
      setProgress(1);
    }
    if (current) {
      scene.remove(current.root); if (current.anim) scene.remove(current.anim.root);
      current.lights.forEach(l => scene.remove(l));
      markersEl.innerHTML = '';
    }
    scene.add(c.root); if (c.anim) scene.add(c.anim.root);
    current = { ...c, pois: c.data.pois, markers: buildMarkers(c.data.pois), lights: addPoiLights(c.data.pois) };
    hfov = 2 * Math.atan(c.data.camera.sensor / 2 / c.data.camera.lens) * 180 / Math.PI;
    resize();
    fillCounts(current.pois);
    $('#lvlSub').textContent = L.name;
    document.querySelectorAll('#levels button').forEach(b => b.classList.toggle('active', b.dataset.level === level));
    renderer.compile(scene, camera);
    setTimeout(() => { loaderEl.classList.add('hide'); if (SHOT) loaderEl.style.display = 'none'; }, 250);
    tour.zoom = 1; tour.dir = 1;
    tour.u = c.path.closed ? 0 : 0.5;
    const p = new THREE.Vector3(), t = new THREE.Vector3(); pathAt(tour.u, p, t);
    camera.position.copy(p); controls.target.copy(t);
    mode = 'tour'; controls.enabled = false; overviewBtn.classList.remove('show'); anim = null;
  } catch (e) {
    console.error(e); lvlNameEl.textContent = 'Hiba a modell betöltésekor';
  } finally { loading = false; }
}

document.querySelectorAll('#levels button').forEach(b => b.addEventListener('click', () => loadLevel(b.dataset.level)));

let toastT;
function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 2600); }

// ---------- Loop ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // a Blender-kamera vízszintes látószöge; álló képernyőn a függőleges látószög felső korláttal
  const vf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov) / 2) / Math.max(camera.aspect, 0.75));
  camera.fov = Math.min(THREE.MathUtils.radToDeg(vf), 80);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

renderer.setAnimationLoop((now) => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (current?.anim) current.anim.mixer.update(dt);
  stepAnim(now);
  stepTour(now);
  if (HL.on.value) { HL.k0.value = 0.5 + 0.32 * Math.sin(now / 320); HL.k1.value = 0.5 + 0.32 * Math.sin(now / 320 + 2.2); }
  if (mode === 'detail' && !anim) controls.update(); else camera.lookAt(controls.target);
  renderer.render(scene, camera);
  updateMarkers();
});

buildFilters();
setTimeout(() => hint.classList.add('hide'), 9000);
const start = QS.get('szint');
loadLevel(LEVELS[start] ? start : 'felso').then(() => {
  const sz = QS.get('szektor'), pid = QS.get('poi');   // mély link: ?szektor=209 vagy ?poi=lift_01
  const p = current?.pois.find(x => (sz && x.id === `szektor_${sz}`) || (pid && x.id === pid));
  if (p) { anim = null; selectPoi(p); if (SHOT && anim) { camera.position.copy(anim.to.p); controls.target.copy(anim.to.t); anim = null; controls.update(); } }
  // hibakeresés: ?pick=x,y,x,y… → a képpontok alatti anyagnevek a <title>-be (fej nélküli böngészőből olvasható)
  const pk = QS.get('pick');
  if (pk) {
    const v = pk.split(',').map(Number), out = [];
    camera.lookAt(controls.target); camera.updateMatrixWorld(true);
    for (let i = 0; i < v.length; i += 2) {
      ndc.set(v[i] * 2 - 1, -v[i + 1] * 2 + 1); raycaster.setFromCamera(ndc, camera);   // képernyő-arányok (0..1)
      const h = raycaster.intersectObject(current.root, true)[0];
      out.push(h ? `${h.object.material.name}@${h.point.toArray().map(x => x.toFixed(1)).join('/')}` : '-');
    }
    document.title = 'PICK ' + out.join(' | ');
    out.push('CAM ' + camera.position.toArray().map(x => x.toFixed(1)).join('/') + ' T ' + controls.target.toArray().map(x => x.toFixed(1)).join('/') + ' fov ' + camera.fov.toFixed(1) + ' kids ' + current.root.children.length);
    if (current.anim) { const bx = new THREE.Box3().setFromObject(current.anim.root); let n = 0; current.anim.root.traverse(o => { if (o.isMesh) n++; });
      current.anim.root.updateMatrixWorld(true);
      current.anim.root.traverse(o => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); out.push(`${o.name || o.parent.name}:${o.material.name}:op${o.material.opacity.toFixed(2)}:${b.min.toArray().map(x => x.toFixed(1))}..${b.max.toArray().map(x => x.toFixed(1))}`); } });
      out.push(`ANIM meshes ${n} box ${bx.min.toArray().map(x => x.toFixed(1))} .. ${bx.max.toArray().map(x => x.toFixed(1))}`); } else out.push('ANIM none');
    document.title = 'PICK ' + out.join(' | ');
    const d = document.createElement('pre'); d.id = 'pick'; d.textContent = out.join('\n'); document.body.appendChild(d);
  }
});

window.__mvm = { scene, camera, controls, THREE, loadLevel, get current() { return current; }, get mode() { return mode; } };
