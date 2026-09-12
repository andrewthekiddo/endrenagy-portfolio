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
  wc:         { label: 'Mosdó',           color: 'var(--wc)',         on: true,  icon: '<rect x="5" y="3" width="8" height="7" rx="1"/><path d="M4 11h15a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6z"/><path d="M9 17l-1 4h6l-1-4"/>', text: 'Női, férfi és akadálymentes mosdó.' },
  bar:        { label: 'Bár',             color: 'var(--bar)',        on: true,  icon: '<path d="M4 4h16l-6 8v6h-4v-6z"/><path d="M8 20h8"/>', text: 'Italok, snackek, kávé. Kártyás fizetés.' },
  ruhatar:    { label: 'Ruhatár',         color: 'var(--ruhatar)',    on: true,  icon: '<path d="M12 4a2 2 0 1 0 0 4v2"/><path d="M12 10 3 16h18z"/>', text: 'Kabát- és táskamegőrzés.' },
  lift:       { label: 'Lift',            color: 'var(--lift)',       on: true,  icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 11l3-3 3 3"/><path d="M9 14l3 3 3-3"/>', text: 'Akadálymentes közlekedés a szintek között.' },
  elsosegely: { label: 'Elsősegély',      color: 'var(--elsosegely)', on: true,  icon: '<path d="M12 5v14"/><path d="M5 12h14"/>', text: 'Egészségügyi ügyelet a rendezvény ideje alatt.' },
  baba:       { label: 'Baba-mama szoba', color: 'var(--baba)',       on: true,  icon: '<circle cx="12" cy="8" r="4"/><path d="M6 21a6 6 0 0 1 12 0"/>', text: 'Pelenkázó és szoptatóhelyiség.' },
  lepcso:     { label: 'Lépcsőház',       color: 'var(--lepcso)',     on: false, icon: '<path d="M4 20h4v-4h4v-4h4V8h4"/>', text: 'Lépcsőház a szintek között.' },
  szektor:    { label: 'Szektorszámok',   color: 'var(--szektor)',    on: true,  icon: '', text: '' },
};

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
scene.background = new THREE.Color(0x0b0b0e);
scene.fog = new THREE.Fog(0x0b0b0e, 300, 600);

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
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.addEventListener('start', () => { controls.autoRotate = false; hint.classList.add('hide'); });

// Fények: alap hangulat (a végleges verzióban ezt kisütött lightmap váltja ki)
scene.add(new THREE.HemisphereLight(0x6b78d6, 0x0a0a0c, 0.6));
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
  kiszolgalopult:     { color: 0x3a2a1c, roughness: 0.6, emissive: 0xff9a2a, emissiveIntensity: 0.35 },
  kiszolgaloter_padlo:{ color: 0x6a5a4a, roughness: 0.8, emissive: 0xffb877, emissiveIntensity: 0.28 },
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
const LIGHT = { bar: [0xffa14a, 520], wc: [0x6fb0ff, 260], ruhatar: [0xc09bff, 220], lift: [0x7fe0c8, 160], elsosegely: [0xff6b7a, 160], baba: [0xff9ad5, 160] };
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
    el.style.setProperty('--col', CATS[p.cat].color);
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
    const on = CATS[m.p.cat].on;
    if (!on) { m.el.classList.add('hidden'); continue; }
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
  controls.autoRotate = false;
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
  const c = CATS[p.cat];
  card.style.setProperty('--col', c.color);
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
$('#cardX').addEventListener('click', () => { card.classList.remove('show'); selectedEl?.classList.remove('sel'); selectedEl = null; highlightSector(null); });
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
  CATS.szektor.on = true; syncChips();
  const m = current.markers.find(x => x.p === p);
  selectPoi(p, m?.el);
}
$('#secBtn').addEventListener('click', goSector);
$('#sec').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.keyCode === 13) goSector(); });

// ---------- Szűrőpanel ----------
function buildFilters() {
  const f = $('#filters');
  for (const [k, c] of Object.entries(CATS)) {
    const b = document.createElement('button');
    b.className = 'chip' + (c.on ? '' : ' off');
    b.dataset.cat = k;
    b.style.setProperty('--col', c.color);
    b.innerHTML = `<span class="dot">${k === 'szektor' ? '#' : ICON(k)}</span><span>${c.label}</span><span class="n" data-n="${k}"></span>`;
    b.addEventListener('click', () => { c.on = !c.on; syncChips(); });
    f.appendChild(b);
  }
  const all = document.createElement('button');
  all.className = 'chip all'; all.innerHTML = `<span>Összes mutatása</span>`;
  all.addEventListener('click', () => { for (const c of Object.values(CATS)) c.on = true; syncChips(); });
  f.appendChild(all);
}
function syncChips() {
  document.querySelectorAll('.chip[data-cat]').forEach(b => b.classList.toggle('off', !CATS[b.dataset.cat].on));
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
  anim = { from: { p: camera.position.clone(), t: controls.target.clone() }, to: { p: new THREE.Vector3(130, 120, 175), t: new THREE.Vector3(0, -2, 0) }, t0: performance.now(), dur: 1800 };
  controls.autoRotate = true;
}

document.querySelectorAll('#levels button').forEach(b => b.addEventListener('click', () => loadLevel(b.dataset.level)));

let toastT;
function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 2600); }

// ---------- Loop ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

renderer.setAnimationLoop((now) => {
  stepAnim(now);
  if (hlMeshes.length) { const k = 0.35 + 0.3 * Math.sin(now / 350); for (const m of hlMeshes) m.material.emissiveIntensity = k; }
  controls.update();
  renderer.render(scene, camera);
  updateMarkers();
});

buildFilters();
loadLevel('felso').catch((e) => { console.error(e); lvlNameEl.textContent = 'Hiba a modell betöltésekor'; });
window.__mvm = { scene, camera, controls, THREE, get current() { return current; } };
