import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// ---------- konfiguráció ----------
const LEVELS = {
  felso:  { name: 'Felső körüljáró szint', model: 'models/felso.glb', poi: 'poi.json' },
  paholy: { name: 'Páholy szint', model: null },
  also:   { name: 'Alsó körüljáró szint', model: null },
};

const CATS = {
  wc:         { label: 'Mosdó',           icon: '<circle cx="6.5" cy="4" r="2"/><path d="M3.5 8h6v7H8v6H5v-6H3.5z"/><path d="M12 2v20"/><circle cx="17.5" cy="4" r="2"/><path d="M15.5 8h4l2 7h-2v6h-4v-6h-2z"/>', text: 'Női, férfi és akadálymentes mosdó.' },
  bar:        { label: 'Bár',             icon: '<path d="M4 4h16l-6 8v6h-4v-6z"/><path d="M8 20h8"/>', text: 'Italok, snackek, kávé. Kártyás fizetés.' },
  ruhatar:    { label: 'Ruhatár',         icon: '<path d="M12 4a2 2 0 1 0 0 4v2"/><path d="M12 10 3 16h18z"/>', text: 'Kabát- és táskamegőrzés.' },
  lift:       { label: 'Lift',            icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 11l3-3 3 3"/><path d="M9 14l3 3 3-3"/>', text: 'Akadálymentes közlekedés a szintek között.' },
  elsosegely: { label: 'Elsősegély',      icon: '<path d="M12 5v14"/><path d="M5 12h14"/>', text: 'Egészségügyi ügyelet a rendezvény ideje alatt.' },
  baba:       { label: 'Baba-mama szoba', icon: '<circle cx="12" cy="8" r="4"/><path d="M6 21a6 6 0 0 1 12 0"/>', text: 'Pelenkázó és szoptatóhelyiség.' },
  lepcso:     { label: 'Lépcsőház',       icon: '<path d="M4 20h4v-4h4v-4h4V8h4"/>', text: 'Lépcsőház a szintek között.' },
};
// Szűrés: null = minden szolgáltatás látszik; egy kategória = csak az látszik (sárgán, pulzálva). A szektorszámok külön kapcsolhatók.
let activeCat = null;
let showSectors = true;
const isVisible = (cat) => cat === 'szektor' ? showSectors : (activeCat ? cat === activeCat : cat !== 'lepcso');

// ---------- DOM ----------
const $ = (s) => document.querySelector(s);
const loaderEl = $('#loader'), pctEl = $('#pct'), barEl = $('#barfill'), lvlNameEl = $('#lvlName');
const markersEl = $('#markers'), card = $('#card'), toast = $('#toast'), hint = $('#hint');

// ---------- Three.js alap ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141d2b);
scene.fog = new THREE.Fog(0x141d2b, 300, 600);

const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 2000);
camera.position.set(190, 170, 250);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 35;
controls.maxDistance = 380;
controls.maxPolarAngle = Math.PI * 0.46;
controls.minPolarAngle = Math.PI * 0.08;
controls.target.set(0, -2, 0);
controls.addEventListener('start', () => { stopTour(); hint.classList.add('hide'); });

// Fények: alap hangulat (a végleges verzióban ezt kisütött lightmap váltja ki)
scene.add(new THREE.HemisphereLight(0x3bc3ee, 0x101828, 0.55));
const key = new THREE.DirectionalLight(0xffe9d0, 1.1);
key.position.set(120, 220, 80);
scene.add(key);
const rim = new THREE.DirectionalLight(0x5a6cff, 0.35);
rim.position.set(-150, 120, -120);
scene.add(rim);


const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

let current = null;          // { root, pois, markers, lights }
let pendingPoi = null;

// ---------- Anyag-hangolás: sötét alap, csak a megvilágított / világító felületek emelkednek ki ----------
const MAT = {
  padlo_vilagos:      { color: 0x3d3d44, roughness: 0.92 },
  falak:              { color: 0x2a2a30, roughness: 0.95 },
  lelato_beton:       { color: 0x303036, roughness: 0.95 },
  szekek:             { color: 0x5c5c68, roughness: 0.9 },
  korlat:             { color: 0x5a5a64, roughness: 0.5, metalness: 0.6 },
  kiszolgalopult:     { color: 0x3a2f18, roughness: 0.6, emissive: 0xfcbf20, emissiveIntensity: 0.32 },
  kiszolgaloter_padlo:{ color: 0x5a5648, roughness: 0.8, emissive: 0xfcd97a, emissiveIntensity: 0.22 },
  felirat:            { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7 },
  homlokzat_01:       { color: 0x1c1c21, roughness: 0.7, metalness: 0.3 },
  homlokzat_02:       { color: 0x3a3a42, roughness: 0.6, metalness: 0.3 },
  homlokzat_03:       { color: 0x121215, roughness: 0.9 },
  homlokzat_04:       { color: 0x2a2a31, roughness: 0.7, metalness: 0.3 },
};
function tuneMaterials(root) {
  const done = new Set();
  root.traverse((o) => {
    if (!o.isMesh || !o.material || done.has(o.material)) return;
    done.add(o.material);
    const m = o.material, n = (m.name || '').toLowerCase();
    const key = Object.keys(MAT).find(k => n.includes(k));
    if (!key) return;
    const t = MAT[key];
    m.color.setHex(t.color);
    if (t.roughness !== undefined) m.roughness = t.roughness;
    if (t.metalness !== undefined) m.metalness = t.metalness;
    if (t.emissive !== undefined) { m.emissive = new THREE.Color(t.emissive); m.emissiveIntensity = t.emissiveIntensity; }
  });
}

// Fényfoltok a szolgáltatások fölé – meleg a bároknál, hideg a mosdóknál (a végleges verzióban kisütött lightmap)
const LIGHT = { bar: [0xfcbf20, 520], wc: [0x3bc3ee, 260], ruhatar: [0x3bc3ee, 200], lift: [0x3bc3ee, 150], elsosegely: [0xfcbf20, 150], baba: [0x3bc3ee, 150] };
function addPoiLights(pois) {
  const lights = [];
  for (const p of pois) {
    const L = LIGHT[p.cat]; if (!L) continue;
    const l = new THREE.PointLight(L[0], L[1], 30, 1.9);
    l.position.set(p.x, p.z + 5, -p.y);
    scene.add(l); lights.push(l);
  }
  return lights;
}

// ---------- Markerek ----------
const ICON = (cat) => `<svg viewBox="0 0 24 24">${CATS[cat].icon}</svg>`;

function buildMarkers(pois) {
  markersEl.innerHTML = '';
  return pois.map((p) => {
    const el = document.createElement('div');
    el.className = `mk ${p.cat}`;
    if (p.cat === 'szektor') {
      el.innerHTML = `<div class="pin">${p.name.replace('Szektor ', '')}</div>`;
    } else {
      el.innerHTML = `<div class="lbl">${p.name}</div><div class="pin">${ICON(p.cat)}</div><div class="stem"></div>`;
    }
    el.addEventListener('click', (e) => { e.stopPropagation(); selectPoi(p, el); });
    markersEl.appendChild(el);
    const world = new THREE.Vector3(p.x, p.z + (p.cat === 'szektor' ? 1.5 : 0.6), -p.y);
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
    const behind = _v.z > 1;
    if (behind) { m.el.classList.add('hidden'); continue; }
    m.el.classList.remove('hidden');
    const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * h;
    // messziről kisebb, közelről nagyobb ikon
    const s = THREE.MathUtils.clamp(95 / camDist + 0.28, 0.5, 1.1);
    m.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%) scale(${s})`;
  }
}

// ---------- Kamera-animáció ----------
let anim = null;
function flyTo(target, distance = 60, height = 42) {
  const from = { p: camera.position.clone(), t: controls.target.clone() };
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).setY(0).normalize();
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 1).normalize();
  const to = { t: target.clone(), p: target.clone().add(dir.multiplyScalar(distance)).add(new THREE.Vector3(0, height, 0)) };
  anim = { from, to, t0: performance.now(), dur: 1100 };
  stopTour();
}
function stepAnim(now) {
  if (!anim) return;
  let k = Math.min(1, (now - anim.t0) / anim.dur);
  k = 1 - Math.pow(1 - k, 3);
  camera.position.lerpVectors(anim.from.p, anim.to.p, k);
  controls.target.lerpVectors(anim.from.t, anim.to.t, k);
  if (k >= 1) anim = null;
}

// ---------- Kiválasztás / infókártya ----------
let selectedEl = null;
function nearestSectors(p, pois) {
  return pois.filter(s => s.cat === 'szektor')
    .map(s => ({ s, d: Math.hypot(s.x - p.x, s.y - p.y) }))
    .sort((a, b) => a.d - b.d).slice(0, 2).map(o => o.s.name.replace('Szektor ', ''));
}
function selectPoi(p, el) {
  selectedEl?.classList.remove('sel'); selectedEl = el; el?.classList.add('sel');
  const c = p.cat === 'szektor' ? { label: 'Szektor' } : CATS[p.cat];
  $('#cardCat').textContent = c.label;
  $('#cardTitle').textContent = p.name;
  $('#cardText').textContent = p.cat === 'szektor'
    ? 'Felső lelátó, 14 sor. A szektor bejárata a körüljáróról nyílik.'
    : c.text;
  $('#cardNear').textContent = p.cat === 'szektor' ? '' : `Legközelebbi szektorok: ${nearestSectors(p, current.pois).join(', ')}`;
  card.classList.add('show');
  flyTo(new THREE.Vector3(p.x, p.z, -p.y), p.cat === 'szektor' ? 70 : 50, p.cat === 'szektor' ? 50 : 34);
  highlightSector(p.cat === 'szektor' ? p.id.split('_')[1] : null);
}
$('#cardX').addEventListener('click', () => { card.classList.remove('show'); selectedEl?.classList.remove('sel'); selectedEl = null; highlightSector(null); armIdle(); });
canvas.addEventListener('pointerdown', () => { /* a modellre kattintás nem zárja be a kártyát, hogy forgatás közben maradjon */ });

// Szektor-kiemelés: a lelátó mesh-t keressük név alapján, ha megvan, pulzál
let hlMeshes = [];
function highlightSector(num) {
  for (const m of hlMeshes) { m.material = m.userData.origMat; }
  hlMeshes = [];
  if (!num || !current) return;
  current.root.traverse((o) => {
    if (o.isMesh && o.name && o.name.includes(`Szektor_${num}`)) {
      o.userData.origMat = o.material;
      o.material = o.material.clone();
      o.material.emissive = new THREE.Color(0xffd166);
      o.material.emissiveIntensity = 0.6;
      hlMeshes.push(o);
    }
  });
}

// Szektor-kereső
function goSector() {
  const v = $('#sec').value.trim();
  const p = current?.pois.find(x => x.id === `szektor_${v}`);
  if (!p) { showToast(`Nincs ${v || 'ilyen'} számú szektor ezen a szinten (301–320).`); return; }
  showSectors = true; syncChips();
  const m = current.markers.find(x => x.p === p);
  selectPoi(p, m?.el);
}
$('#secBtn').addEventListener('click', goSector);
$('#sec').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.keyCode === 13) goSector(); });

// ---------- Szűrőpanel: egy kategória kiválasztása = csak az látszik; újra kattintva vissza az összes ----------
function buildFilters() {
  const f = $('#filters');
  for (const [k, c] of Object.entries(CATS)) {
    const b = document.createElement('button');
    b.className = 'chip'; b.dataset.cat = k;
    b.innerHTML = `<span class="dot">${ICON(k)}</span><span>${c.label}</span><span class="n" data-n="${k}"></span>`;
    b.addEventListener('click', () => { activeCat = activeCat === k ? null : k; card.classList.remove('show'); syncChips(); });
    f.appendChild(b);
  }
  const sec = document.createElement('button');
  sec.className = 'chip'; sec.dataset.sectors = '1';
  sec.innerHTML = `<span class="dot">#</span><span>Szektorszámok</span><span class="n" data-n="szektor"></span>`;
  sec.addEventListener('click', () => { showSectors = !showSectors; syncChips(); });
  f.appendChild(sec);
  const all = document.createElement('button');
  all.className = 'chip all'; all.innerHTML = `<span>Összes szolgáltatás</span>`;
  all.addEventListener('click', () => { activeCat = null; showSectors = true; syncChips(); });
  f.appendChild(all);
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
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = pois.filter(p => p.cat === el.dataset.n).length; });
}

// ---------- Szintbetöltés ----------
function showLoader(name) {
  lvlNameEl.textContent = `${name} betöltése`;
  pctEl.textContent = '0%'; barEl.style.width = '0%';
  loaderEl.classList.remove('hide');
}
function setProgress(k) { const p = Math.round(k * 100); pctEl.textContent = `${p}%`; barEl.style.width = `${p}%`; }

async function loadLevel(key) {
  const L = LEVELS[key];
  if (!L.model) { showToast(`${L.name}: a modell a következő fázisban készül.`); return; }
  showLoader(L.name);
  card.classList.remove('show');
  if (current) {
    scene.remove(current.root);
    current.lights.forEach(l => scene.remove(l));
    markersEl.innerHTML = '';
    current = null;
  }
  const poiPromise = fetch(new URL(L.poi, import.meta.url)).then(r => r.json());
  const gltf = await new Promise((res, rej) => loader.load(new URL(L.model, import.meta.url).href, res, (xhr) => {
    const total = xhr.total || 4_000_000; setProgress(Math.min(0.98, xhr.loaded / total));
  }, rej));
  setProgress(1);
  const root = gltf.scene;
  tuneMaterials(root);
  scene.add(root);
  const { pois } = await poiPromise;
  current = { root, pois, markers: buildMarkers(pois), lights: addPoiLights(pois) };
  fillCounts(pois);
  document.querySelectorAll('#levels button').forEach(b => b.classList.toggle('active', b.dataset.level === key));
  // egy frame-nyi idő, hogy a shader-fordítás lefusson, aztán bejön a kép
  renderer.compile(scene, camera);
  setTimeout(() => loaderEl.classList.add('hide'), 250);
  // bevezető kamera-mozgás
  startTour(2200);
}

document.querySelectorAll('#levels button').forEach(b => b.addEventListener('click', () => loadLevel(b.dataset.level)));

let toastT;
function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 2600); }

// ---------- Automatikus kamerakörút: a folyosó fölött, kissé oldalról, körbe az arénán ----------
const TOUR = { a: 138, b: 152, h: 68, ta: 50, tb: 62, th: -2, lead: 0.55, speed: (2 * Math.PI) / 110, idleMs: 14000 };
const tour = { active: false, t: 0, lastNow: 0 };
let idleTimer = null;
const tourPoint = (t, out) => out.set(TOUR.a * Math.cos(t), TOUR.h, TOUR.b * Math.sin(t));
const tourTarget = (t, out) => out.set(TOUR.ta * Math.cos(t + TOUR.lead), TOUR.th, TOUR.tb * Math.sin(t + TOUR.lead));
function startTour(dur = 1600) {
  // a jelenlegi kamerapozícióhoz legközelebbi szögből indul, oda repül, majd folytatja a kört
  tour.t = Math.atan2(camera.position.z / TOUR.b, camera.position.x / TOUR.a);
  const p = tourPoint(tour.t, new THREE.Vector3()), tg = tourTarget(tour.t, new THREE.Vector3());
  anim = { from: { p: camera.position.clone(), t: controls.target.clone() }, to: { p, t: tg }, t0: performance.now(), dur };
  tour.active = true; tour.lastNow = 0;
  clearTimeout(idleTimer);
}
function stopTour() { tour.active = false; armIdle(); }
function armIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!card.classList.contains('show') && current) startTour(); }, TOUR.idleMs);
}
function stepTour(now) {
  if (!tour.active || anim) { tour.lastNow = now; return; }
  const dt = tour.lastNow ? Math.min(0.05, (now - tour.lastNow) / 1000) : 0;
  tour.lastNow = now;
  tour.t += TOUR.speed * dt;
  tourPoint(tour.t, camera.position);
  tourTarget(tour.t, controls.target);
}
['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, () => { if (!tour.active) armIdle(); }, { passive: true }));

// ---------- Dupla kattintás a modellre: odarepül ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
canvas.addEventListener('dblclick', (e) => {
  if (!current) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(current.root, true)[0];
  if (!hit) return;
  flyTo(hit.point, 34, 24);
});
// mobil: dupla koppintás
let lastTap = 0;
canvas.addEventListener('touchend', (e) => {
  const now = performance.now();
  if (now - lastTap < 320 && e.changedTouches.length === 1) {
    const t = e.changedTouches[0];
    canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: t.clientX, clientY: t.clientY }));
  }
  lastTap = now;
});

// ---------- Loop ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

renderer.setAnimationLoop((now) => {
  stepAnim(now);
  stepTour(now);
  if (hlMeshes.length) { const k = 0.35 + 0.3 * Math.sin(now / 350); for (const m of hlMeshes) m.material.emissiveIntensity = k; }
  controls.update();
  renderer.render(scene, camera);
  updateMarkers();
});

buildFilters();
setTimeout(() => hint.classList.add('hide'), 9000);
loadLevel('felso').catch((e) => { console.error(e); lvlNameEl.textContent = 'Hiba a modell betöltésekor'; });
window.__mvm = { scene, camera, controls, THREE, get current() { return current; } };
