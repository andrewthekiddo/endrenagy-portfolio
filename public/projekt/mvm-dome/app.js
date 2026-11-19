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
// Gyors indulás (V2): a kis adatfájlok kérése azonnal, egyszerre elindul – a kód lejjebb csak megvárja őket
const ELO = { fotok: fetch(asset('data/fotok.json')), kamerak: fetch(asset('data/kamerak.json')), epulet: fetch(asset('data/S4.json'), { method: 'HEAD' }) };
if (SHOT) { addEventListener('error', (e) => { document.title = 'JSERR ' + e.message + ' @' + e.lineno; }); addEventListener('unhandledrejection', (e) => { document.title = 'JSREJ ' + (e.reason && e.reason.message); }); }   // képernyőkép-mód (fej nélküli böngésző): a betöltő azonnal eltűnik

// ---------- konfiguráció ----------
// 4 szint + a teljes épület, mindegyik a saját padlóján (y = 0), az aréna középpontja az origó. A modellek a Blender showreel-fájlból
// (00_Teljes_epulet/…_showreel_v01.blend) jönnek: _Blender_Projects/00_Web_export/scripts/export_web.py + web_adat.py
const LEVELS = {
  felso:  { key: 'S3', name: 'Felső körüljáró szint', model: 'models/S3.glb', meret: 6998296, data: 'data/S3.json', tier: 'Felső lelátó (3xx)' },
  paholy: { key: 'S2', name: 'Páholy szint (VIP)', model: 'models/S2.glb', meret: 7249368, data: 'data/S2.json', tier: 'Alsó lelátó (2xx)' },
  also:   { key: 'S1', name: 'Alsó körüljáró szint', model: 'models/S1.glb', meret: 5175100, data: 'data/S1.json', tier: 'Alsó lelátó (2xx)' },
  lobby:  { key: 'S0', name: 'Lobby – Bejárati szint', model: 'models/S0.glb', meret: 3098200, data: 'data/S0.json', tier: 'Küzdőtéri lelátó (1xx)' },
  // a teljes, megépített épület kívülről (homlokzat bekapcsolva, nyitott tető): a kezdőnézet, ha a fájljai megvannak (lásd VAN_EPULET)
  epulet: { key: 'S4', name: 'MVM Dome', model: 'models/S4.glb', meret: 9625688, data: 'data/S4.json', tier: 'Lelátó' },
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
// Az ikonok már induláskor letöltődnek és dekódolódnak (a modell letöltése alatt), hogy a pinek ne üres körként jelenjenek meg, amibe később ugrik be a rajz (felhasználó, 2026-11-19)
const IKON_ELO = ['wc', 'wc_ferfi', 'wc_noi', 'akadalymentes', 'baba', 'bufe', 'ruhatar', 'lift', 'vip', 'elsosegely', 'info'].map((n) => { const k = new Image(); k.src = ikonUrl(n); k.decode?.().catch(() => {}); return k; });
// Szűrés: null = minden szolgáltatás látszik; egy kategória = csak az látszik (pulzálva). A szektorszámok külön kapcsolhatók.
let activeCat = null;
let showSectors = true;
// Szűréskor a többi szolgáltatás NEM tűnik el, csak elhalványul; a kijelölt típus nagyobb és jobban világít (felhasználó, V2, 2026-11-19)
const isVisible = (cat) => cat === 'szektor' ? showSectors : true;

// ---------- DOM ----------
const $ = (s) => document.querySelector(s);
const loaderEl = $('#loader'), pctEl = $('#pct'), barEl = $('#barfill'), lvlNameEl = $('#lvlName');
const markersEl = $('#markers'), panel = $('#panel'), toast = $('#toast'), hint = $('#hint'), overviewBtn = $('#overviewBtn');

// ---------- Three.js alap ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;          // mint a Blender-fájl (AgX) – a sütött fény így a showreel képéhez hasonlít
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
renderer.debug.onShaderError = (gl, prog, vs, fs) => { document.title = 'SHADERERR ' + (gl.getShaderInfoLog(fs) || '') + ' || ' + (gl.getShaderInfoLog(vs) || ''); };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141d2b);
scene.fog = new THREE.Fog(0x141d2b, 320, 700);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(42, 1, 1.0, 1200);   // szűkebb mélységtartomány → pontosabb mélységpuffer (kevesebb villogás)
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
const alapNev = (n) => (n || '').replace(/^W_(?:nb|f\d+)_/, 'W_');   // 'W_nb_…' (sütetlen réteg) és 'W_fNN_…' (sík árnyalás) előtag nélkül
const STAND = /^W_(Lelato|TS_lelato|Szek|VIP_szek|Kuzdoter)/i;   // dupla kattintás: ezekre kattintva a szektort választja
// Szektor-kiemelés (felhasználó, 2026-11-19): a lelátó adott része villog, pontosan a szektor alakjában. A lelátó a modellben 16 egyenes
// oldalú sokszög, a közlekedőlépcsők az oldalra merőlegesek → egy szektor = néhány téglalap az oldal saját koordinátáiban
// (oldal, t0..t1 az oldal mentén, r0..r1 az oldaltól kifelé, z0 / z1 = az első / utolsó sor szintje). Adat: data/szektorok.json – a modell székeiből
// készül (00_Web_export/scripts/szektorok_gen.py). A shader a képpont alaprajzi helyéből kiszámolja az oldalt, r-t, t-t, és
// csak a felfelé néző lapokat színezi. A kattintás (sectorAt) ugyanebből az adatból keres.
const SZ_MAX = 12;                                   // téglalap / szektor (most legfeljebb 10)
let SZEKTOR = null;                                  // { oldalak: [[nx, ny, d] × 16], szektorok: { '203': [[oldal, t0, t1, r0, r1, z0, z1], …] } }
const HL = { on: { value: 0 }, k: { value: 0 }, n: { value: 0 }, padlo: { value: 0 },
             F: { value: Array.from({ length: 16 }, () => new THREE.Vector3(1, 0, 1e6)) },
             R: { value: Array.from({ length: SZ_MAX }, () => new THREE.Vector4()) },
             Q: { value: Array.from({ length: SZ_MAX }, () => new THREE.Vector3()) } };
const SZEKTOR_KESZ = fetch(asset('data/szektorok.json')).then((r) => r.json()).then((d) => {
  d.oldalak.forEach((o, i) => HL.F.value[i].set(o[0], o[1], o[2])); SZEKTOR = d;
}).catch((e) => console.warn('szektorok.json', e));
// világ-pont → [oldal, r, t, z] a lelátó sokszögében (Blender: x = világ x, y = −világ z; z abszolút = világ y + a szint padlója)
function lelatoHely(p) {
  const x = p.x, y = -p.z; let bf = 0, br = -1e9;
  SZEKTOR.oldalak.forEach((o, i) => { const r = o[0] * x + o[1] * y - o[2]; if (r > br) { br = r; bf = i; } });
  const o = SZEKTOR.oldalak[bf];
  return [bf, br, -o[1] * x + o[0] * y, p.y + (current?.data.padlo || 0)];
}
// hátoldal-eltolás: csak kétoldalas, nem „matrica” anyagokra (a képek / feliratok lapja – akár fordított normállal – a fal előtt marad)
const hatBias = (m) => !QS.has('nohb') && m.side === THREE.DoubleSide && !(m.polygonOffset && m.polygonOffsetFactor < 0);
function addSectorShader(m) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uLmGamma: LM.gamma, uLmGain: LM.gain, uLmAmb: LM.amb, uHlOn: HL.on, uHlK: HL.k, uSzN: HL.n, uSzPadlo: HL.padlo, uSzF: HL.F, uSzR: HL.R, uSzQ: HL.Q });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform vec3 uLmAmb;\nuniform float uLmGamma,uLmGain,uHlOn,uHlK,uSzN,uSzPadlo;\nuniform vec3 uSzF[16];\nuniform vec4 uSzR[' + SZ_MAX + '];\nuniform vec3 uSzQ[' + SZ_MAX + '];')
      .replace('reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;',
        'vec3 lmL = lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI; lmL *= uLmGain * pow(max(dot(lmL, vec3(0.2126, 0.7152, 0.0722)), 1e-5), uLmGamma - 1.0); reflectedLight.indirectDiffuse += lmL + uLmAmb;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (uHlOn > 0.5 && normalize(cross(dFdx(vWPos), dFdy(vWPos))).y > 0.6) {   // felfelé néző lap (a normál a képernyő-deriváltakból)
          vec2 hp = vec2(vWPos.x, -vWPos.z);
          float hr = -1e9, ht = 0.0; int hf = 0;
          for (int i = 0; i < 16; i++) { vec3 f = uSzF[i]; float r = dot(f.xy, hp) - f.z; if (r > hr) { hr = r; hf = i; ht = dot(vec2(-f.y, f.x), hp); } }
          float hz = vWPos.y + uSzPadlo;
          for (int i = 0; i < ${SZ_MAX}; i++) {
            if (float(i) >= uSzN) break;
            vec4 q = uSzR[i]; vec3 e = uSzQ[i];
            float dz = hz - mix(e.y, e.z, clamp((hr - q.z) / (q.w - q.z), 0.0, 1.0));   // magasság a sorok lejtőjéhez képest (alatta a körüljáró padlója sötét marad)
            if (int(e.x + 0.5) == hf && ht > q.x && ht < q.y && hr > q.z && hr < q.w && dz > -0.5 && dz < 1.2) { gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.99, 0.75, 0.13), uHlK); break; }
          }
        }` + (hatBias(m) ? `
        // Nulla vastagságú falak (pl. büfé-fülke belső hátfala = a tömb külső oldala, egy síkban, ellentétes normállal): mindkét lap
        // mindkét oldalról rajzolódik → a hátoldal kicsit hátrébb kerül a mélységben, így mindig a néző felé forduló lap látszik (nincs villogás,
        // és – a hátlap-eldobással szemben – fordított normálú lap se tűnik el).
        gl_FragDepth = gl_FragCoord.z + (gl_FrontFacing ? 0.0 : 4e-7);` : ''));   // ~7 lépés a 24 bites mélységben: csak a pontosan egy síkba eső lapokra hat
  };
  m.customProgramCacheKey = () => 'szektor-hl9' + (hatBias(m) ? 'd' : 's');
}
// Kézi felülírások (felhasználó, 2026-11-18): a lelátó sötét, ne fehér; a lelátó-bejáratok sötét számai (a fehér szektorszám
// mellett „duplának” látszottak) rejtve
const MAT = {
  W_Lelato_beton_vilagos: { color: 0x1d222b, roughness: 0.95 },
  W_Lelato_beton:         { color: 0x232831, roughness: 0.95 },
  W_Lelato_felirat_sotet: { hide: true },
  W_Lobby_fal:            { mul: 0.4, exact: true },   // fémes falburkolat (a Blenderben a sötét eget tükrözi): a sütéshez nem fémes → sötétebb, matt szürke (felhasználó: ne csupa fekete, de ne is világos)
  W_Hatso_teto:           { color: 0xb9b3aa, roughness: 0.9 },   // lobby: a WC-k / hátsó helyiségek túlnyúló teteje világos, megvilágított (nem fekete)
  // (a lobbyfájl duplán látszó Szektor_1xx szövegeit 2026-11-18-tól maga a modell rejti)
};
// Felső körüljáró: a teljes homlokzat (+35 m-es perem, LED-kijelző) kívülről eltakarná a folyosót → a szint mennyezeténél (padló + 5,1 m)
// elvágva, ahogy a többi szinten a modellben is a szint fölött ér véget
const FACADE = /^W_(Kulso|Kulter)/;
const FACADE_CUT = { S3: 5.1 };
// Sütött fény (lobby, alsó körüljáró): a GLB második UV-rétege (uv1) a lightmap-atlasz; a sütött felületek megvilágítatlan (Basic)
// anyagot kapnak: szín × lightmap × (π / skála) × erősítés. Sütetlen marad: üveg, világító felületek, a számok / feliratok rétege
// ('W_nb_' anyagok) és az animált lift – ezeket a jelenet fényei világítják.
const texLoader = new THREE.TextureLoader();
async function loadLightmap(info) {
  // V2 (gyors betöltés): mindenhol a 4096 px-es lightmap az alap (64 MB videómemória); a 8192 px-es (256 MB) csak külön kérésre: ?lm8k
  const nagy = info.nagy && QS.has('lm8k') && renderer.capabilities.maxTextureSize >= 8192;
  const tex = await texLoader.loadAsync(asset(nagy ? info.nagy : info.file));
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.channel = 1;
  tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return tex;
}
const HOML = Number(QS.get('homl')) || 0.06;           // a külső homlokzat (f36 osztály) sötétítése
const SIK_GAIN = Number(QS.get('sikg')) || 1.0;
const SIK_LELATO = Number(QS.get('lelato')) || 0.4;   // a sötét lelátó / küzdőtér (f100 osztály) fényessége – a Blender-képen szinte fekete
// A sütött fény görbéje: fény' = erősítés × fény^gamma (a fényesség szerint, a színarány megtartásával). A Cycles-sütés árnyékai
// mélyebbek, mint a Blender (EEVEE, árnyék nélküli lámpák) képe; a gamma < 1 megemeli az árnyékokat. Szintenként a data/<S>.json adja.
const LM = { gamma: { value: 1.0 }, gain: { value: 1.0 }, amb: { value: new THREE.Vector3(0.02, 0.024, 0.033).multiplyScalar(QS.has('amb') ? Number(QS.get('amb')) : 1) } };   // amb: kis alapfény, hogy az árnyék se legyen csupa fekete
function applyLightmap(root, tex, intensity) {
  const conv = new Map(), klonok = [tex];              // a lightmap példányai (anyagonként egy) – szintváltáskor a videómemóriából kiürítve
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const hasUv1 = !!o.geometry.attributes.uv1;
    const one = (m) => {
      const ao = m.aoMap;                                       // az 1×1-es helykitöltő: csak a TEXCOORD_1 megtartásához kellett, de a
      if (ao) { m.aoMap = null; m.needsUpdate = true; }         // gltfpack UV-kvantálásának visszaalakítása (offset / repeat) rajta van
      if (m.transparent || (m.name || '').startsWith('W_nb_')) return m;
      if (m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) return m;
      if (/^W_f36_/.test(m.name || '')) {                // külső homlokzat: marad a jelenet fényeivel árnyalt anyag (formát ad), éjszakai tónusra sötétítve
        if (!conv.has(m)) {
          if (/szalag_feher/.test(m.name)) { m.emissive.setHex(0xfff0dc); m.emissiveIntensity = 1.6; }   // a kapuk fölötti LED-szalag világít
          else { m.color.multiply(new THREE.Color(0.8 * HOML, 0.9 * HOML, 1.15 * HOML)); if (m.metalness !== undefined) { m.metalness = Math.min(m.metalness, 0.3); m.roughness = Math.max(m.roughness, 0.5); } }
          conv.set(m, m);
        }
        return m;
      }
      let b = conv.get(m);
      const sik = /^W_f(\d+)_/.exec(m.name || '');      // az atlaszból kimaradó felület: szín × állandó tényező, lightmap nélkül
      if (!b && sik) {
        b = new THREE.MeshBasicMaterial({ name: m.name, color: m.color.clone().multiplyScalar((sik[1] === '100' ? SIK_LELATO : Number(sik[1]) / 100) * SIK_GAIN), map: m.map, side: m.side, visible: m.visible });
        b.clippingPlanes = m.clippingPlanes; b.polygonOffset = m.polygonOffset; b.polygonOffsetFactor = m.polygonOffsetFactor; b.polygonOffsetUnits = m.polygonOffsetUnits;
        addSectorShader(b); conv.set(m, b);
      }
      if (!b && !hasUv1) return m;
      if (!b) {
        const t = tex.clone();                                  // anyagonként saját UV-transzformáció (a kép közös)
        if (ao) { t.offset.copy(ao.offset); t.repeat.copy(ao.repeat); t.center.copy(ao.center); t.rotation = ao.rotation; t.matrixAutoUpdate = ao.matrixAutoUpdate; t.matrix.copy(ao.matrix); }
        t.channel = 1; t.needsUpdate = true; klonok.push(t);
        m.color.setRGB(Math.max(m.color.r, 0.04), Math.max(m.color.g, 0.042), Math.max(m.color.b, 0.05));   // a legsötétebb anyag se legyen csupa fekete (matt sötét, mint a WC-folyosó)
        b = new THREE.MeshBasicMaterial({ name: m.name, color: m.color, map: m.map, lightMap: t, lightMapIntensity: intensity, side: m.side, visible: m.visible });
        b.clippingPlanes = m.clippingPlanes; b.polygonOffset = m.polygonOffset; b.polygonOffsetFactor = m.polygonOffsetFactor; b.polygonOffsetUnits = m.polygonOffsetUnits;
        addSectorShader(b); conv.set(m, b);
      }
      return b;
    };
    o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
  });
  return klonok;
}
// Rétegsorrend az egy síkba eső lapokra (villogás ellen): a képes / feliratos „matrica” lapok előre, a szerkezeti felületek
// (padló, födém, fal, tömb) hátra kerülnek a mélységpufferben; a burkolatok, bútorok a kettő között maradnak.
const RETEG_ELO = /tv_kep|TV_MVM|_foto|grafika|Logo_|felirat|Felirat|szam|Szam|szoveg|nyil|taktilis|szonyeg|szennyfogo|csik|kijelzo|kepernyo|LED/;
const RETEG_PADLO = /padlo|Padlo|terrazzo|fodem|beton/;
const RETEG_FAL = /fal_|_fal|belso_sotet|hullam|teto|Teto|sav|labazat|piller/;
function reteg(m) {
  const n = m.name || '';
  const r = ((m.map && /tv_kep|TV_MVM|_foto|grafika|Logo_/.test(n)) || n.startsWith('W_nb_') || RETEG_ELO.test(n)) ? -2 : RETEG_PADLO.test(n) ? 2 : RETEG_FAL.test(n) ? 1 : 0;
  if (r) { m.polygonOffset = true; m.polygonOffsetFactor = r; m.polygonOffsetUnits = r * 4; }
}
const UVEG_FEL = /^W_(TS_uveg_L2_uveg|VIP_uvegmellved)/;
function tuneMaterials(root, key) {
  const cut = FACADE_CUT[key] ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), FACADE_CUT[key])] : null;
  const done = new Set();
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (done.has(m)) continue; done.add(m);
      if (m.transparent) { m.depthWrite = false; }
      if (m.transparent && UVEG_FEL.test(alapNev(m.name))) m.opacity *= Number(QS.get('uveg')) || 0.5;   // (&uveg=1: eredeti) VIP-szint belső üvegei (Gold VIP üvegfront, mellvéd): fele ennyire fedjenek (felhasználó, 2026-11-19)
      reteg(m);
      // színes szolgáltatás-jelölők (UJ_zona_<bar|ruhatar|merch|wc>_teto / _szegely / _betu): matt, ne tükrözzön (felhasználó, V2)
      if (/UJ_zona_/.test(m.name)) { if ('roughness' in m) m.roughness = 1; if ('metalness' in m) m.metalness = 0; if ('envMapIntensity' in m) m.envMapIntensity = 0; if ('specularIntensity' in m) m.specularIntensity = 0; }
      if (m.map) m.map.anisotropy = 8;                 // csempézett anyagminták: lapos szögből se mosódjanak
      if (cut && FACADE.test(alapNev(m.name))) m.clippingPlanes = cut;
      const t = Object.entries(MAT).find(([k, v]) => v.exact ? alapNev(m.name) === k : alapNev(m.name).startsWith(k))?.[1];
      if (t) {
        if (t.hide) { m.visible = false; continue; }
        if (t.color !== undefined) m.color.setHex(t.color);
        if (t.mul !== undefined) m.color.multiplyScalar(t.mul);
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

// Mosdók összevonása (felhasználó, V2, 2026-11-19): az egymás melletti férfi és női mosdó EGY közös pin (férfi-női piktogram),
// amelynek a szára kétfelé ágazik, és az ágak az egyes ajtókhoz vezetnek le. Csak a nézőben történik – a data/S*.json érintetlen.
// Az egy csoportba tartozó ajtók: 10,8 m-en belül láncolva; az akadálymentes mosdó külön pin marad.
const WC_TAV = 10.8;
function osszevonMosdo(pois) {
  const w = pois.filter((p) => p.ikon === 'wc_ferfi' || p.ikon === 'wc_noi');
  const szulo = w.map((_, i) => i), gy = (i) => { while (szulo[i] !== i) i = szulo[i]; return i; };
  for (let i = 0; i < w.length; i++) for (let j = 0; j < i; j++) if (Math.hypot(w[i].x - w[j].x, w[i].y - w[j].y) < WC_TAV) szulo[gy(i)] = gy(j);
  const csop = new Map(); w.forEach((p, i) => { const g = gy(i); if (!csop.has(g)) csop.set(g, []); csop.get(g).push(p); });
  const ki = pois.filter((p) => !w.includes(p)); let n = 0;
  for (const t of csop.values()) {
    if (t.length < 2) { ki.push(t[0]); continue; }
    const vegyes = t.some((p) => p.ikon === 'wc_ferfi') && t.some((p) => p.ikon === 'wc_noi');
    // csak KÉT ág (felhasználó): vegyes csoportban a legközelebbi férfi–női ajtópár, egynemű csoportban a két legközelebbi ajtó
    let par = null, pd = Infinity;
    for (const a of t) for (const b of t) {
      if (a === b || (vegyes && !(a.ikon === 'wc_ferfi' && b.ikon === 'wc_noi'))) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < pd) { pd = d; par = [a, b]; }
    }
    const kp = (f) => (par[0][f] + par[1][f]) / 2;
    n++;
    ki.push({ id: `wc_${String(n).padStart(2, '0')}`, cat: 'wc', ikon: vegyes ? 'wc' : t[0].ikon, name: `${vegyes ? 'Mosdó' : t[0].ikon === 'wc_noi' ? 'Női mosdó' : 'Férfi mosdó'} ${n}`,
      x: kp('x'), y: kp('y'), z: kp('z'), ajtok: par, tagok: t.map((p) => p.id) });
  }
  // Szomszédos liftek (6 m-en belül, pl. a felső szint liftpárjai): elég egy pin (felhasználó, V2)
  const li = ki.filter((p) => p.cat === 'lift'), kesz = new Set();
  for (const a of li) {
    if (kesz.has(a)) continue;
    const t = li.filter((b) => !kesz.has(b) && Math.hypot(a.x - b.x, a.y - b.y) < 6);
    if (t.length < 2) continue;
    t.forEach((b) => kesz.add(b));
    const k = (f) => t.reduce((s, b) => s + b[f], 0) / t.length;
    ki[ki.indexOf(a)] = { ...a, x: k('x'), y: k('y'), z: k('z'), tagok: t.map((b) => b.id) };
    for (const b of t.slice(1)) ki.splice(ki.indexOf(b), 1);
  }
  return ki;
}
const AGAK = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); AGAK.setAttribute('class', 'agak');
function buildMarkers(pois) {
  markersEl.innerHTML = ''; AGAK.innerHTML = ''; markersEl.appendChild(AGAK);
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
    if (p.cat !== 'szektor') {   // minden szolgáltatás-pin EGY magasságban (felhasználó, V2): a padlótól 5,7 m-rel följebb, 3D-s szárral; a közös mosdó szára elágazik
      el.classList.add('agas');
      const ag = document.createElementNS('http://www.w3.org/2000/svg', 'path'); ag.style.stroke = CATS[p.cat].color; AGAK.appendChild(ag);
      // 3D-s váz (világkoordináta): ajtó alja → ajtó fölött (gerinc vége) … gerinc a fal vonalában … → másik ajtó alja; a gerinc közepéről föl a pinhez
      const G = 3.3, P = 2.4;
      if (!p.ajtok) { const al = poiWorld(p); return { p, el, world, ag, vaz: [al.clone().setY(al.y + 0.15), al.clone().setY(al.y + G + P)] }; }
      const [a, b] = p.ajtok.map(poiWorld);
      const fa = a.clone().setY(a.y + G), fb = b.clone().setY(b.y + G), kz = fa.clone().lerp(fb, 0.5), tet = kz.clone().setY(kz.y + P);
      return { p, el, world, ag, vaz: [a.clone().setY(a.y + 0.15), fa, fb, b.clone().setY(b.y + 0.15), kz, tet] };
    }
    return { p, el, world };
  });
}

const _v = new THREE.Vector3();
function updateMarkers() {
  if (!current) return;
  const w = innerWidth, h = innerHeight;
  const camDist = camera.position.distanceTo(controls.target);
  for (const m of current.markers) {
    if (!isVisible(m.p.cat)) { m.el.classList.add('hidden'); if (m.ag) m.ag.style.display = 'none'; continue; }
    m.el.classList.toggle('focus', activeCat !== null && m.p.cat === activeCat);
    m.el.classList.toggle('dim', activeCat !== null && m.p.cat !== activeCat && m.p.cat !== 'szektor');
    _v.copy(m.world).project(camera);
    if (_v.z > 1) { m.el.classList.add('hidden'); if (m.ag) m.ag.style.display = 'none'; continue; }
    m.el.classList.remove('hidden');
    const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * h;
    const focus = activeCat !== null && m.p.cat === activeCat;
    const szek = m.p.cat === 'szektor', halv = activeCat !== null && !focus && !szek;
    const s = THREE.MathUtils.clamp(95 / camDist + 0.28, 0.5, 1.1) * (szek ? 1.12 : 1.4) * (focus ? 1.35 : halv ? 0.72 : 1);   // V2: nagyobb pinek
    if (m.ag) {
      // a 3D-s váz pontjai képernyőre vetítve: a gerinc így a folyosó falának irányát követi, nem a képernyő vízszintesét
      let rejt = false;
      const q = m.vaz.map((a) => { _v.copy(a).project(camera); if (_v.z > 1) rejt = true; return `${((_v.x * 0.5 + 0.5) * w).toFixed(1)} ${((-_v.y * 0.5 + 0.5) * h).toFixed(1)}`; });
      m.ag.setAttribute('d', q.length === 2 ? `M${q[0]}L${q[1]}` : `M${q[0]}L${q[1]}L${q[2]}L${q[3]}M${q[4]}L${q[5]}`); m.ag.style.display = rejt ? 'none' : '';
      m.ag.style.opacity = halv ? 0.3 : 0.9; m.ag.style.strokeWidth = focus ? 2.6 : 2;
      m.el.style.transform = `translate(${q[q.length - 1].replace(' ', 'px,')}px) translate(-50%,-100%) scale(${s})`;
      continue;
    }
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
let forog = true;      // a „Forgás” gomb: a körút lassú alapmozgása ki-be kapcsolható
let nincsUresjarat = false;   // felülnézetben nem ugrik vissza magától a körútra
let anim = null;
let idleTimer = null;
let hfov = 49.6;
let camShift = [0, 0];   // a Blender-kamera lencse-eltolása (shift_x, shift_y; a kép nagyobbik oldalának arányában)

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
  mode = 'detail'; nincsUresjarat = false; controls.maxDistance = 160; controls.minPolarAngle = Math.PI * 0.08;
  controls.enabled = true;
  overviewBtn.classList.add('show');
  const from = { p: camera.position.clone(), t: controls.target.clone() };
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).setY(0).normalize();
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 1).normalize();
  const to = { t: anchor.clone(), p: anchor.clone().add(dir.multiplyScalar(distance)).add(new THREE.Vector3(0, height, 0)) };
  anim = { from, to, t0: performance.now(), dur: 1100 };
  armIdle();
}
// Alapnézet: vissza a szint kezdőkamerájához (a körút eleje, eredeti távolság)
// Álló telefonon a tág áttekintő kamera közelebbről indul (felhasználó, V2) – az aréna így kitölti a kép szélességét
const alapZoom = () => (current && innerWidth / innerHeight < 0.8 && KAMERAK[LEVELS[current.level].key] && !QS.has('regikamera') ? 0.86 : 1);
function alapNezet() {
  if (!current) return;
  closePanel(false);
  mode = 'tour'; controls.enabled = false; overviewBtn.classList.remove('show'); clearTimeout(idleTimer); nincsUresjarat = false;
  tour.zoom = alapZoom(); tour.dir = 1; tour.vel = 0; tour.lastNow = 0; tour.u = current.path.closed ? 0 : 0.5;
  const p = new THREE.Vector3(), t = new THREE.Vector3(); pathAt(tour.u, p, t);
  anim = { from: { p: camera.position.clone(), t: controls.target.clone() }, to: { p, t }, t0: performance.now(), dur: 1400 };
}
// Felülnézet: az egész szint egyből felülről, észak fölfelé; szabadon forgatható / nagyítható, és nem ugrik vissza magától
const _box = new THREE.Box3(), _bs = new THREE.Vector3(), _bc = new THREE.Vector3();
function felulNezet() {
  if (!current) return;
  closePanel(false);
  _box.setFromObject(current.root); _box.getSize(_bs); _box.getCenter(_bc);
  const padlo = current.data.padlo ?? _box.min.y;
  const vf = THREE.MathUtils.degToRad(camera.fov) / 2, R = Math.max(_bs.z, _bs.x / camera.aspect) / 2;
  const H = Math.min(R / Math.tan(vf) * 1.08, 900);
  const t = new THREE.Vector3(_bc.x, padlo, _bc.z), p = new THREE.Vector3(_bc.x, padlo + H, _bc.z + H * 0.012);
  mode = 'detail'; controls.enabled = true; overviewBtn.classList.add('show'); clearTimeout(idleTimer); nincsUresjarat = true;
  controls.maxDistance = Math.max(160, H * 1.3); controls.minPolarAngle = 0;   // felülről, az egész szint belefér
  anim = { from: { p: camera.position.clone(), t: controls.target.clone() }, to: { p, t }, t0: performance.now(), dur: 1400 };
}
function armIdle() {
  clearTimeout(idleTimer);
  if (nincsUresjarat) return;
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
    const base = SHOT || !forog ? 0 : (closed ? 1 / TOUR.loopSec : tour.dir / TOUR.arcSec);   // képernyőkép-módban áll a kamera
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
// A pont szektora a szektor-alaprajzokból (csak a szint saját szektorai közül). pontos = csak akkor ad találatot, ha a pont
// benne van egy szektor téglalapjában; különben a legközelebbi szektort adja (lépcsőre, mellvédre kattintva).
function sectorAt(point, pontos = false) {
  const secs = current.pois.filter((s) => s.cat === 'szektor');
  if (SZEKTOR) {
    const [f, r, t, z] = lelatoHely(point);
    let best = null, bd = Infinity;
    for (const s of secs) {
      for (const q of SZEKTOR.szektorok[s.id.slice(8)] || []) {
        if (q[0] !== f) continue;
        const dt = Math.max(q[1] - t, t - q[2], 0), dr = Math.max(q[3] - r, r - q[4], 0), zc = q[5] + (q[6] - q[5]) * Math.min(1, Math.max(0, (r - q[3]) / (q[4] - q[3]))), dz = Math.max(zc - 0.5 - z, z - zc - 1.2, 0);
        const d = Math.hypot(dt, dr) + 4 * dz;
        if (d < bd) { bd = d; best = s; }
      }
    }
    return best && (bd === 0 || (!pontos && bd < 4)) ? best : null;   // 4 m-en belül: határlépcső, mellvéd, kapu
  }
  const a = Math.atan2(-point.z, point.x);
  let best = null, bd = Infinity;
  for (const s of secs) {
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
  const mat = hit.object.material, lelato = mat && STAND.test(alapNev(mat.name));
  const pontos = lelato ? sectorAt(hit.point, true) : null;      // a lelátón a szektor az első (ne a 7 m-en belüli szolgáltatás vigye el)
  if (pontos) { selectPoi(pontos, hit.point); return; }
  if (best) { selectPoi(best); return; }
  const s = sectorAt(hit.point, true) || (lelato ? sectorAt(hit.point) : null);
  if (s) { selectPoi(s, hit.point); return; }
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
const TIER = { 1: 'Küzdőtéri lelátó (1xx)', 2: 'Alsó lelátó (2xx)', 3: 'Felső lelátó (3xx)' };   // a szektorszám első jegye szerint (a teljes épületen mindhárom látszik)
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
// A panel képe: ikononként EGY profi fotó, szintenként válogatva (data/fotok.json, képek: img/fotok/) – nem lapozható (felhasználó, 2026-11-19).
// Ha az adott szinten a típusról nincs fotó, egy másik szint ugyanilyen helyiségének képe jön, felirattal; ha sehol sincs, a szint általános képe.
const FOTOK = await ELO.fotok.then((r) => r.json()).then((d) => d.szintek).catch(() => ({}));
const SZINTNEV = Object.fromEntries(Object.values(LEVELS).map((l) => [l.key, l.name]));
function setPhotos(p, c) {
  const kulcs = LEVELS[current.level].key, F = FOTOK[kulcs] || {}, f = p.ikon === 'wc' ? (F.wc_noi || F.wc_ferfi) : F[p.cat === 'szektor' ? 'szektor' : (p.ikon || p.cat)];
  $('#panelPhoto').style.backgroundImage = `url(${asset(f ? 'img/fotok/' + f.f : c.photo)})`;
  $('#photoCap').textContent = !f ? '' : f.alt ? 'Kép a szintről' : (f.szint !== kulcs ? `A kép másik szinten készült: ${SZINTNEV[f.szint]}` : '');
}
function selectPoi(p, anchor) {
  const m = current.markers.find(x => x.p === p);
  selectedEl?.classList.remove('sel'); selectedEl = m?.el || null; selectedEl?.classList.add('sel');
  const c = CATS[p.cat];
  setPhotos(p, c);
  $('#panelCat').textContent = `${side(p)} · ${c.label}`;
  $('#panelTitle').textContent = p.name;
  $('#panelText').textContent = p.cat === 'szektor'
    ? `${TIER[p.id[8]] || LEVELS[current.level].tier}. A szektor bejárata a körüljáróról nyílik; a legközelebbi mosdó és büfé a bejárat közelében található.`
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

// Szektor-kiemelés: a kiválasztott szektor téglalapjai a shader uniformjaiba (alak: data/szektorok.json)
function highlightSector(s) {
  const rects = s && current && SZEKTOR ? SZEKTOR.szektorok[s.id.slice(8)] : null;
  if (!rects) { HL.on.value = 0; return; }
  rects.slice(0, SZ_MAX).forEach((q, i) => { HL.R.value[i].set(q[1], q[2], q[3], q[4]); HL.Q.value[i].set(q[0], q[5], q[6]); });
  HL.n.value = Math.min(rects.length, SZ_MAX); HL.padlo.value = current.data.padlo || 0;
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
  $('#tSzektor')?.classList.toggle('on', showSectors);
  $('#tForgas')?.classList.toggle('on', forog);
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
  loaderEl.classList.remove('hide'); setProgress(0);
}
// A százalék folyamatosan számol föl (felhasználó, V2): a cél a tényleges letöltés, a kiírt szám egyesével követi – nem ugrik 0-ról 100-ra
let pctCel = 0, pctMost = 0, pctFut = false, pctT = 0;
function pctRajz() { const p = Math.round(pctMost * 100); pctEl.textContent = `${p}%`; barEl.style.width = `${p}%`; }
function pctLep(now) {
  const dt = Math.min(0.1, (now - pctT) / 1000); pctT = now;
  // letöltés közben lassan előre is kúszik (hogy akkor is mozogjon, ha a böngésző ritkán jelent), a cél fölé legfeljebb 3%-kal
  const cel = pctCel >= 1 ? 1 : Math.min(0.97, Math.max(pctCel, Math.min(pctMost + dt * 0.02, pctCel + 0.03)));
  pctMost = Math.min(cel, pctMost + dt * (pctCel >= 1 ? Math.max(2.5, (1 - pctMost) / 0.25) : 0.9)); pctRajz();   // a végén kb. negyed másodperc alatt kifut 100-ig
  if (pctMost < 1) requestAnimationFrame(pctLep); else pctFut = false;
}
function setProgress(k) {
  if (k === 0) { pctCel = pctMost = 0; pctRajz(); } else pctCel = Math.max(pctCel, k);
  if (SHOT) { pctMost = pctCel; pctRajz(); return; }
  if (!pctFut) { pctFut = true; pctT = performance.now(); requestAnimationFrame(pctLep); }
}
const loadGltf = (url, onProg) => new Promise((res, rej) => loader.load(asset(url), res, onProg, rej));

const KAMERAK = await ELO.kamerak.then((r) => r.json()).catch(() => ({}));
let loading = false;
async function loadLevel(level) {
  if (loading || current?.level === level) return;
  loading = true;
  const L = LEVELS[level];
  try {
    closePanel(false);
    await SZEKTOR_KESZ;
    let c = cache[level];
    if (!c) {
      const resp = await fetch(asset(L.data));
      if (!resp.ok) { showToast(`${L.name}: a modell pár percen belül érkezik.`); if (!current) setTimeout(() => loadLevel('lobby'), 0); return; }
      showLoader(L.name);
      const data = await resp.json();
      if (!QS.has('kulonwc')) data.pois = osszevonMosdo(data.pois);   // férfi + női mosdó egy közös pin
      if (KAMERAK[L.key] && !QS.has('regikamera')) data.camera = KAMERAK[L.key];   // V2: tág áttekintő kamera (data/kamerak.json)
      let c_baked = false, c_lm = null;
      // a modell és a lightmap egyszerre töltődik (V2: gyorsabb betöltés), nem egymás után
      const lmP = data.lightmap && !QS.has('nolm') ? loadLightmap(data.lightmap).catch((e) => { console.warn('lightmap', e); return null; }) : null;
      const gltf = await loadGltf(L.model, (xhr) => { const ossz = xhr.total || L.meret; if (ossz) setProgress(Math.min(0.95, 0.95 * xhr.loaded / ossz)); });   // a tömörítve küldött fájlnál a böngésző nem tudja a teljes méretet → a szint ismert mérete (LEVELS.meret)
      tuneMaterials(gltf.scene, L.key);
      const lmTex = lmP && await lmP;
      if (lmTex) {
        try { c_lm = applyLightmap(gltf.scene, lmTex, Math.PI / data.lightmap.k); c_baked = true; }
        catch (e) { console.warn('lightmap', e); }
      }
      let animObj = null;
      if (data.anim) {
        try { animObj = setupAnim(await loadGltf(data.anim.model), data.anim.clip_top); } catch (e) { console.warn('animáció', e); }
      }
      c = cache[level] = { level, baked: c_baked, lm: c_lm, root: gltf.scene, anim: animObj, data, path: buildPath(data.camera) };
      setProgress(1);
    }
    if (current) {
      scene.remove(current.root); if (current.anim) scene.remove(current.anim.root);
      if (current.lm && current.level !== level) current.lm.forEach(t => t.dispose());   // a 8192 px-es lightmap ~256 MB videómemória: csak az aktuális szinté marad fent (visszaváltáskor újra feltöltődik)
      current.lights.forEach(l => scene.remove(l));
      markersEl.innerHTML = '';
    }
    scene.add(c.root); if (c.anim) scene.add(c.anim.root);
    current = { ...c, pois: c.data.pois, markers: buildMarkers(c.data.pois), lights: c.baked ? [] : addPoiLights(c.data.pois) };
    camShift = [c.data.camera.shift_x || 0, c.data.camera.shift_y || 0];
    LM.gain.value = Number(QS.get('lmg')) || c.data.lightmap?.gain || 1; LM.gamma.value = Number(QS.get('lmgam')) || c.data.lightmap?.gamma || 1;
    hfov = 2 * Math.atan(c.data.camera.sensor / 2 / c.data.camera.lens) * 180 / Math.PI;
    resize();
    fillCounts(current.pois);
    if (!QS.has('tiszta')) $('#filters').style.display = current.pois.length ? '' : 'none';   // a teljes épületen nincs pin → üres szűrőpanel se legyen
    $('#lvlSub').textContent = L.name;
    document.querySelectorAll('#levels button').forEach(b => b.classList.toggle('active', b.dataset.level === level));
    renderer.compile(scene, camera);
    await Promise.race([Promise.all(IKON_ELO.map((k) => k.decode?.().catch(() => {}))), new Promise((r) => setTimeout(r, 1500))]);   // a betöltő csak akkor tűnik el, ha az ikonok is megvannak
    setTimeout(() => { loaderEl.classList.add('hide'); if (SHOT) loaderEl.style.display = 'none'; }, SHOT ? 250 : 450);   // a számláló még kifut 100-ig
    tour.zoom = alapZoom(); tour.dir = 1;
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
// A lencse-eltolás csak körút-módban él (ott a Blender-kamera kivágását adja); részletnézetben 0-ra fut, hogy a forgáspont középen legyen
let shiftK = 1; let DBGFOV = 0;
function applyShift() {
  const w = innerWidth, h = innerHeight, M = Math.max(w, h);
  if ((camShift[0] || camShift[1]) && shiftK > 0.001) camera.setViewOffset(w, h, camShift[0] * M * shiftK, -camShift[1] * M * shiftK, w, h);
  else if (camera.view) camera.clearViewOffset();
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // a Blender-kamera vízszintes látószöge; álló képernyőn a függőleges látószög felső korláttal
  const vf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov) / 2) / Math.max(camera.aspect, 0.75));
  camera.fov = Math.min(THREE.MathUtils.radToDeg(vf), 80);
  applyShift();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

renderer.setAnimationLoop((now) => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (current?.anim) current.anim.mixer.update(dt);
  stepAnim(now);
  stepTour(now);
  if (HL.on.value) HL.k.value = QS.has('hlk') ? Number(QS.get('hlk')) : 0.5 + 0.32 * Math.sin(now / 320);
  const cel = mode === 'tour' ? 1 : 0;
  if (Math.abs(cel - shiftK) > 0.001) { shiftK += (cel - shiftK) * (SHOT ? 1 : 0.08); applyShift(); camera.updateProjectionMatrix(); }
  if (mode === 'detail' && !anim) controls.update(); else camera.lookAt(controls.target);
  if (DBGFOV && camera.fov !== DBGFOV) { camera.fov = DBGFOV; camera.updateProjectionMatrix(); }
  renderer.render(scene, camera);
  updateMarkers();
});

buildFilters();
// Nézetgombok a sarokban (felhasználó, V2): Alapnézet, Felülnézet, Szektorszámok, Forgás
$('#tAlap').addEventListener('click', alapNezet);
$('#tFelul').addEventListener('click', felulNezet);
$('#tSzektor').addEventListener('click', () => { showSectors = !showSectors; syncChips(); });
$('#tForgas').addEventListener('click', () => { forog = !forog; syncChips(); });
syncChips();
if (QS.has('tiszta')) ['#filters', '#levels', '#tools', '#panel', '#hint', '#overviewBtn', '#toast'].forEach((q) => { const e = $(q); if (e) e.style.display = 'none'; });   // hibakeresés: kezelőfelület nélküli kép
setTimeout(() => hint.classList.add('hide'), 9000);
const start = QS.get('szint');
// A teljes épület (S4) a kezdőnézet és a szintváltó legalsó gombja (felhasználó, 2026-11-19) – de csak ha a fájljai már kint vannak;
// addig a gomb rejtve marad, és a lobby az alapszint (felhasználó, 2026-11-18).
const VAN_EPULET = await ELO.epulet.then((r) => r.ok && !/html/.test(r.headers.get('content-type') || '')).catch(() => false);
if (!VAN_EPULET) { const b = document.querySelector('#levels button[data-level="epulet"]'); if (b) b.style.display = 'none'; }
const ALAP = VAN_EPULET ? 'epulet' : 'lobby';
loadLevel(LEVELS[start] && (start !== 'epulet' || VAN_EPULET) ? start : ALAP)
 .then(async () => {
  const vv = QS.get('valt');                             // hibakeresés: ?valt=also → átvált arra a szintre, majd vissza (a lightmap kiürítés / újrafeltöltés próbája)
  if (vv && LEVELS[vv]) { await loadLevel(vv); await loadLevel(LEVELS[start] ? start : ALAP); }
  const sz = QS.get('szektor'), pid = QS.get('poi');   // mély link: ?szektor=209 vagy ?poi=lift_01
  const p = current?.pois.find(x => (sz && x.id === `szektor_${sz}`) || (pid && (x.id === pid || x.tagok?.includes(pid))));
  if (p) { anim = null; selectPoi(p); if (SHOT && anim) { camera.position.copy(anim.to.p); controls.target.copy(anim.to.t); anim = null; controls.update(); } }
  // hibakeresés: ?cam=px,py,pz,tx,ty,tz[,fov] → rögzített kamera a szint Blender-koordinátáiban (összevetés a Blender-képpel)
  // hibakeresés: ?kat=lift → szűrő bekapcsolva; ?nezet=felul → felülnézet; ?allo → forgás kikapcsolva
  const kat = QS.get('kat'); if (kat && CATS[kat]) { activeCat = kat; syncChips(); }
  if (QS.has('allo')) { forog = false; syncChips(); }
  if (QS.get('nezet') === 'felul') { felulNezet(); if (SHOT && anim) { camera.position.copy(anim.to.p); controls.target.copy(anim.to.t); anim = null; controls.update(); } }
  const ck = QS.get('cam');
  if (ck) {
    const v = ck.split(',').map(Number);
    mode = 'detail'; anim = null; camera.position.set(v[0], v[2], -v[1]); controls.target.set(v[3], v[5], -v[4]);
    DBGFOV = v[6] || 40; camera.fov = DBGFOV; shiftK = 0; applyShift(); camera.updateProjectionMatrix(); controls.update();
  }
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
    renderer.render(scene, camera); let nl = 0; scene.traverse(o => { if (o.isPointLight) nl++; });
    out.push(`INFO rajzolas ${renderer.info.render.calls} haromszog ${renderer.info.render.triangles} pontfeny ${nl}`);
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
