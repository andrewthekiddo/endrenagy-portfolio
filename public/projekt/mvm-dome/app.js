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
  felso:  { key: 'S3', name: 'Felső körüljáró szint', model: 'models/S3.glb', meret: 7017024, data: 'data/S3.json', tier: 'Felső lelátó (3xx)' },
  paholy: { key: 'S2', name: 'Páholy szint (VIP)', model: 'models/S2.glb', meret: 7293664, data: 'data/S2.json', tier: 'Alsó lelátó (2xx)' },
  also:   { key: 'S1', name: 'Alsó körüljáró szint', model: 'models/S1.glb', meret: 5280968, data: 'data/S1.json', tier: 'Alsó lelátó (2xx)' },
  lobby:  { key: 'S0', name: 'Lobby – Bejárati szint', model: 'models/S0.glb', meret: 2526800, data: 'data/S0.json', tier: 'Küzdőtéri lelátó (1xx)' },
  // a teljes, megépített épület kívülről (homlokzat bekapcsolva, nyitott tető): a kezdőnézet, ha a fájljai megvannak (lásd VAN_EPULET)
  epulet: { key: 'S4', name: 'MVM Dome', model: 'models/S4.glb', meret: 7398620, data: 'data/S4.json', tier: 'Lelátó' },
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
const IKON_ELO = ['wc', 'wc_ferfi', 'wc_noi', 'akadalymentes', 'baba', 'bufe', 'ruhatar', 'lift', 'vip', 'elsosegely', 'info', 'wc_s', 'wc_ferfi_s', 'wc_noi_s', 'akadalymentes_s', 'baba_s', 'bufe_s', 'ruhatar_s', 'vip_s', 'elsosegely_s'].map((n) => { const k = new Image(); k.src = ikonUrl(n); k.decode?.().catch(() => {}); return k; });
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
  const tex = await texLoader.loadAsync(await forras(nagy ? info.nagy : info.file));
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
// A lobby kék mosdó-kiemelése (UJ_zona_wc_teto) egybefüggő mennyezeti lap; a felhasználó kérésére (2026-11-19) a falak törésvonalánál
// rés vágja blokkokra – csak a nézőben (a fragmens eldobásával), a modell és a sütés érintetlen. hely: a rések világ-X helye (m), fel: a rés félszélessége.
const ZONA_VAGAS = {};   // 2026-11-19 23:30: a lobby kék lapját a modell már 5 blokkra vágva adja (a faltöréseknél) → a nézőbeli vágás kikapcsolva; minta: { S0: { minta: /UJ_zona_wc_teto/, hely: [-12.1, 12.1], fel: 0.55 } }
function zonaVag(m, v) {
  const elozo = m.onBeforeCompile, kulcs = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (sh, r) => {
    elozo?.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vZonaX;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvZonaX = (modelMatrix * vec4(transformed, 1.0)).x;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vZonaX;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + v.hely.map((x) => `if (abs(vZonaX - (${x.toFixed(3)})) < ${v.fel.toFixed(3)}) discard;`).join('\n'));
  };
  m.customProgramCacheKey = () => (kulcs ? kulcs() : '') + '|zonavag' + v.hely.join('_');
  m.needsUpdate = true;
}
// A lobby lépcsői és mozgólépcsői a szint tetejénél élesen el voltak vágva; a felhasználó kérésére (V2) fölfelé fokozatosan „elporladnak”:
// a megadott alaprajzi sávban (a két lépcsőcsoport) az y0 fölötti képpontokat magassággal növekvő arányban eldobjuk (szitaminta), y1-nél teljesen.
// Nem átlátszóság, ezért a sütött fény és a rajzolási sorrend érintetlen. A homlokzat anyagai kimaradnak (a lobby kivágott homlokzat-alakja marad).
const LEPCSO_FADE = { S0: { xMin: 17, xMax: 38, zMin: -77, zMax: -57, y0: 3.0, y1: 6.2 } };
function lepcsoFade(root, v) {
  const kesz = new Set();
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (kesz.has(m) || FACADE.test(alapNev(m.name)) || /UJ_/.test(m.name)) continue; kesz.add(m);
      const elozo = m.onBeforeCompile, kulcs = m.customProgramCacheKey?.bind(m);
      m.onBeforeCompile = (sh, r) => {
        elozo?.call(m, sh, r);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFadeP;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvFadeP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFadeP;')
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' +
            `if (abs(vFadeP.x) > ${v.xMin.toFixed(1)} && abs(vFadeP.x) < ${v.xMax.toFixed(1)} && vFadeP.z > ${v.zMin.toFixed(1)} && vFadeP.z < ${v.zMax.toFixed(1)}) {` +
            ` float fk = smoothstep(${v.y0.toFixed(1)}, ${v.y1.toFixed(1)}, vFadeP.y); if (fk > 0.0 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) < fk) discard; }`);
      };
      m.customProgramCacheKey = () => (kulcs ? kulcs() : '') + '|lepcsofade';
      m.needsUpdate = true;
    }
  });
}
// Zóna-jelölés elrejtése egy alaprajzi dobozban (világ x / z, m): a páholy szint Platinum bárján nem kell színes jelölés (felhasználó, 2026-11-20).
const ZONA_REJT = { S2: [{ minta: /UJ_zona_bar_/, x0: -13, x1: 13, z0: -71, z1: -57 }],
};
const ZONA_REJT_KESZ = new WeakSet();   // (a userData átmásolódna az anyag klónjára, ezért külön halmaz)
function zonaRejt(m, v) {
  ZONA_REJT_KESZ.add(m);
  const elozo = m.onBeforeCompile, kulcs = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (sh, r) => {
    elozo?.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRejtP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvRejtP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRejtP;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' +
        v.map((d) => `if (vRejtP.x > ${d.x0.toFixed(1)} && vRejtP.x < ${d.x1.toFixed(1)} && vRejtP.z > ${d.z0.toFixed(1)} && vRejtP.z < ${d.z1.toFixed(1)}) discard;`).join('\n'));
  };
  m.customProgramCacheKey = () => (kulcs ? kulcs() : '') + '|zonarejt';
  m.needsUpdate = true;
}
// ---------- Kék mosdó-tömb tetők az A / P / F szinten (felhasználó, 2026-11-20) ----------
// „ahol van WC … annak az épületnek a teteje … a lobbiba odaraktunk egy ilyen blokkosított kék kijelölést … a többi szinten is ezt csináld meg.”
// A lobbyn ez a modellben van (UJ_zona_wc_teto); a többi szinten a modellben nem készült el, ezért a NÉZŐ építi fel betöltéskor:
//  1. a szintet felülről, merőlegesen kirajzolja magasságtérképnek (GPU, WC_N × WC_N képpont, ±WC_R m);
//  2. minden mosdóajtó mögött megkeresi a falakkal körülzárt helyiséget (elárasztás a padló szintjén; fal = 1 m-nél magasabb cella);
//  3. a helyiség alaprajzára a faltető magasságában kék, áttetsző lapot tesz. A helyiségek közti falak adják a „blokkokat”.
const WC_SZINT = new Set(['S1', 'S2', 'S3']);
const WC_N = 2048, WC_R = 112, WC_CAM = 60;
const wcMagAnyag = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: 'varying float vY;' + '\n' + 'void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: 'varying float vY;' + '\n' + 'void main(){ float d = clamp((vY + 8.0) / 64.0, 0.0, 1.0) * 255.0; gl_FragColor = vec4(floor(d) / 255.0, fract(d), 0.0, 1.0); }',
});
function wcMagassagTerkep(root) {
  if (root.userData.magTerkep) return root.userData.magTerkep;
  const rt = new THREE.WebGLRenderTarget(WC_N, WC_N, { depthBuffer: true });
  const cam = new THREE.OrthographicCamera(-WC_R, WC_R, WC_R, -WC_R, 0.1, WC_CAM + 20);
  cam.position.set(0, WC_CAM, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(true);
  const sz = new THREE.Scene(); sz.background = new THREE.Color(0x000000);
  const szulo = root.parent; sz.add(root); sz.overrideMaterial = wcMagAnyag;
  // az áttetsző lapok (üveg, zóna-lapok) és a jelölések ne számítsanak
  const rejt = []; root.traverse((o) => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; if (o.visible && ms.every((m) => m.transparent || m.opacity < 1 || /UJ_/.test(m.name || ''))) { rejt.push(o); o.visible = false; } });
  const elozo = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(sz, cam);
  const puf = new Uint8Array(WC_N * WC_N * 4); renderer.readRenderTargetPixels(rt, 0, 0, WC_N, WC_N, puf);
  renderer.setRenderTarget(elozo); for (const o of rejt) o.visible = true; sz.remove(root); if (szulo) szulo.add(root); rt.dispose();
  // magasság méterben (a háttér: −8); a kép sorai alulról fölfelé: sor = (R + z) / (2R) · N fordítva → lásd wcCella
  const mag = new Float32Array(WC_N * WC_N);
  for (let i = 0; i < mag.length; i++) mag[i] = (puf[i * 4] + puf[i * 4 + 1] / 255) / 255 * 64 - 8;
  root.userData.magTerkep = mag;
  return mag;
}
// világ (x, z) ↔ cella: a kamera fölfelé-iránya −z, ezért a kép alja a +z; a visszaolvasott puffer 0. sora a kép alja
const wcCx = (x) => Math.round((x + WC_R) / (2 * WC_R) * (WC_N - 1));
const wcCy = (z) => Math.round((WC_R - z) / (2 * WC_R) * (WC_N - 1));
const wcX = (cx) => cx / (WC_N - 1) * 2 * WC_R - WC_R, wcZ = (cy) => WC_R - cy / (WC_N - 1) * 2 * WC_R;
function wcTetok(root, pois) {
  const mag = wcMagassagTerkep(root), N = WC_N, cm = 2 * WC_R / (N - 1);
  const fal = (i) => mag[i] > 1.0;                                     // 1 m-nél magasabb: fal, ajtólap, lelátó – nem járható
  const foglalt = new Uint8Array(N * N);                               // 1: már egy helyiséghez tartozik
  const ajtok = []; for (const p of pois) { if (p.cat !== 'wc') continue; for (const a of (p.ajtok || [p])) ajtok.push(a); }
  // A mosdó-tömbnek a modellben sík teteje van (kb. 3 m magasan): az ajtóhoz legközelebbi tetőcellától elárasztjuk az AZONOS magasságú,
  // összefüggő felületet – ez a tömb alaprajza. (A lelátó emelkedik, a folyosó padlója 0 m: egyik sem azonos magasságú, tehát határol.)
  const MAXT = 1500 / (cm * cm), MINT = 25 / (cm * cm), KER = Math.round(4 / cm);
  const helyisegek = [];
  for (const a of ajtok) {
    const ax = wcCx(a.x), ay = wcCy(-a.y); let si = -1, legj = 1e9;
    for (let dy = -KER; dy <= KER; dy++) for (let dx = -KER; dx <= KER; dx++) {
      const x = ax + dx, y = ay + dy; if (x < 2 || y < 2 || x > N - 3 || y > N - 3) continue;
      const i = y * N + x, d = dx * dx + dy * dy; if (d < legj && mag[i] > 2.3 && mag[i] < 4.8) { legj = d; si = i; }
    }
    if (si < 0 || foglalt[si]) continue;
    const h0 = mag[si], verem = [si], latott = new Map([[si, 1]]); let rossz = false;
    while (verem.length) {
      const i = verem.pop(); if (latott.size > MAXT) { rossz = true; break; }
      const x = i % N; if (x < 2 || x > N - 3 || i < 2 * N || i > N * (N - 2)) continue;
      for (const j of [i - 1, i + 1, i - N, i + N]) if (!latott.has(j) && Math.abs(mag[j] - h0) < 0.2) { latott.set(j, 1); verem.push(j); }
    }
    if (rossz || latott.size < MINT) continue;
    for (const i of latott.keys()) foglalt[i] = 1;
    // NYITÁS (zsugorítás, majd visszahízlalás 0,6 m-rel): az azonos magasságú, de keskeny faltetők (büfék, mellvédek) kiesnek, csak a tömör tető marad
    let cellak = [...latott.keys()];
    { const E = Math.round(0.6 / cm); let h = new Set(cellak);
      const lep = (be, zsug) => { let akt = be; for (const [dx, dy] of [[1, 0], [0, 1]]) { const ki = new Set();
        if (zsug) { for (const i of akt) { let jo = true; for (let k = -E; k <= E && jo; k++) if (!akt.has(i + k * (dx + dy * N))) jo = false; if (jo) ki.add(i); } }
        else { for (const i of akt) for (let k = -E; k <= E; k++) ki.add(i + k * (dx + dy * N)); }
        akt = ki; } return akt; };
      const mag0 = h; h = lep(lep(h, true), false); cellak = [...h].filter((i) => mag0.has(i)); }
    if (cellak.length < MINT) continue;
    // NAGY tömb (450 m² fölött – pl. a páholy szint lounge-ai): nem az egész tető mosdó → csak az ajtók körüli szelet marad,
    // az aréna közepéből nézve az ajtók szögtartománya ± kb. 6 m ívnyi ráhagyással (egyenes, sugárirányú vágás)
    if (cellak.length * cm * cm > 450) {
      const sajat = ajtok.filter((b) => { const bx = wcCx(b.x), by = wcCy(-b.y); for (let dy = -KER; dy <= KER; dy++) for (let dx = -KER; dx <= KER; dx++) if (latott.has((by + dy) * N + bx + dx)) return true; return false; });
      const kp = Math.atan2(-a.y, a.x), kul = (f) => { let d = f - kp; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
      let f0 = 0, f1 = 0; for (const b of sajat) { const d = kul(Math.atan2(-b.y, b.x)); if (Math.abs(d) < 0.6) { f0 = Math.min(f0, d); f1 = Math.max(f1, d); } }
      const r = Math.hypot(a.x, a.y) || 1, ra = 6 / r;
      cellak = cellak.filter((i) => { const d = kul(Math.atan2(wcZ((i - i % N) / N), wcX(i % N))); return d >= f0 - ra && d <= f1 + ra; });
      if (cellak.length < MINT) continue;
    }
    // BLOKKOK: a tömb folyosó felőli (a padlóval határos) szélét az aréna közepe körüli szög szerint sorba rendezzük, egyszerűsítjük (0,6 m),
    // és a töréspontoknál a közép felé futó, 0,35 m széles rést vágunk a lapba – „a falak törésvonalában”.
    const halm = new Set(cellak), szel = [];
    for (const i of cellak) { let p = false; for (const j of [i - 1, i + 1, i - N, i + N]) if (!halm.has(j) && mag[j] < 1.0) { p = true; break; } if (p) { const x = wcX(i % N), z = wcZ((i - i % N) / N); szel.push([Math.atan2(z, x), x, z]); } }
    if (szel.length > 20) {
      szel.sort((p, q) => p[0] - q[0]);
      // ha a szögtartomány átlépi a ±π-t (a tömb a −x tengelyen ül), forgassuk el a sorrendet a legnagyobb résnél
      let ri = 0, rmax = 0; for (let k = 0; k < szel.length; k++) { const d = (szel[(k + 1) % szel.length][0] - szel[k][0] + 2 * Math.PI) % (2 * Math.PI); if (d > rmax) { rmax = d; ri = k + 1; } }
      const vonal = szel.slice(ri).concat(szel.slice(0, ri)).filter((_, k) => k % 3 === 0);
      const dp = (a, b, ki) => { let m = 0, mi = -1; const [, x0, z0] = vonal[a], [, x1, z1] = vonal[b], L = Math.hypot(x1 - x0, z1 - z0) || 1;
        for (let k = a + 1; k < b; k++) { const d = Math.abs((vonal[k][1] - x0) * (z1 - z0) - (vonal[k][2] - z0) * (x1 - x0)) / L; if (d > m) { m = d; mi = k; } }
        if (m > 0.6) { dp(a, mi, ki); ki.push(mi); dp(mi, b, ki); } };
      const tor = []; dp(0, vonal.length - 1, tor);
      const hossz = (k) => Math.hypot(vonal[k][1] - vonal[0][1], vonal[k][2] - vonal[0][2]), teljes = hossz(vonal.length - 1);
      const ures = new Set();
      for (const k of tor) {
        const [, x, z] = vonal[k]; if (hossz(k) < 3 || teljes - hossz(k) < 3) continue;       // a tömb végeinél ne legyen keskeny szelet
        const r = Math.hypot(x, z) || 1, ux = -x / r, uz = -z / r;                          // a rés iránya: az aréna közepe felé
        for (let t = -0.6; t < 40; t += cm * 0.5) for (let o = -0.18; o <= 0.18; o += cm * 0.5) {
          const i = wcCy(z + uz * t - ux * o) * N + wcCx(x + ux * t + uz * o); if (halm.has(i)) ures.add(i);
        }
      }
      helyisegek.push({ cellak: cellak.filter((i) => !ures.has(i)), y: h0 });
    } else helyisegek.push({ cellak, y: h0 });
  }
  if (QS.has('wcdebug')) {   // hibakeresés: a magasságtérkép (szürke: 0–8 m), a talált helyiségek (kék) és az ajtók (piros) képként
    const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N);
    for (let i = 0; i < N * N; i++) { const x = i % N, y = N - 1 - ((i - x) / N), o = (y * N + x) * 4, v = Math.max(0, Math.min(255, (mag[i] + 1) / 9 * 255)); im.data[o] = im.data[o + 1] = im.data[o + 2] = v; im.data[o + 3] = 255; if (foglalt[i]) { im.data[o] = 40; im.data[o + 1] = 140; im.data[o + 2] = 255; } }
    g.putImageData(im, 0, 0); g.fillStyle = '#f00'; for (const a of ajtok) g.fillRect(wcCx(a.x) - 3, N - 1 - wcCy(-a.y) - 3, 7, 7);
    window.__wcdbg = c.toDataURL('image/jpeg', 0.85);
  }
  if (!helyisegek.length) return null;
  // lap: a helyiség cellái + 1 cella ráhagyás a falra; soronkénti sávokból, az egymás alatti azonos sávok összevonva
  const cs = [], ix = [];
  // ugyanaz a kinézet, mint a modell kék mosdó-blokkjain az alsó szinten (W_UJ_zona_wc_teto / _szegely): világoskék, saját fénnyel, 60%-os fedés, világító szegély
  const anyag = new THREE.MeshBasicMaterial({ name: 'WEB_wc_teto', color: 0x5fb4f2, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide });   // saját színű (nem a jelenet fényétől függő): a sütött szinten a lámpás anyag sötét maradna
  const szelek = [];
  for (const { cellak, y: yt } of helyisegek) {
    const y = yt + 0.07, bov = new Set(cellak);
    for (const i of cellak) { const x = i % N, yy = (i - x) / N, xa = wcX(x) - cm / 2, xb = wcX(x) + cm / 2, za = wcZ(yy) + cm / 2, zb = wcZ(yy) - cm / 2, yv = y + 0.02;
      if (!bov.has(i - 1)) szelek.push(xa, yv, za, xa, yv, zb); if (!bov.has(i + 1)) szelek.push(xb, yv, za, xb, yv, zb);
      if (!bov.has(i - N)) szelek.push(xa, yv, za, xb, yv, za); if (!bov.has(i + N)) szelek.push(xa, yv, zb, xb, yv, zb); }
    const sorok = new Map(); for (const i of bov) { const x = i % N, yy = (i - x) / N; if (!sorok.has(yy)) sorok.set(yy, []); sorok.get(yy).push(x); }
    let nyitott = new Map();                                            // 'x0_x1' → kezdő sor (az összevonáshoz)
    const lezar = (kulcs, y0, y1) => { const [x0, x1] = kulcs.split('_').map(Number), b = cs.length / 3;
      const xa = wcX(x0) - cm / 2, xb = wcX(x1) + cm / 2, za = wcZ(y0) + cm / 2, zb = wcZ(y1) - cm / 2;
      cs.push(xa, y, za, xb, y, za, xb, y, zb, xa, y, zb); ix.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    const ys = [...sorok.keys()].sort((p, q) => p - q);
    for (let k = 0; k <= ys.length; k++) {
      const yy = ys[k], uj = new Map();
      if (k < ys.length) { const xs = sorok.get(yy).sort((p, q) => p - q); let x0 = xs[0], e = xs[0];
        for (let t = 1; t <= xs.length; t++) { if (t < xs.length && xs[t] === e + 1) { e = xs[t]; continue; } uj.set(`${x0}_${e}`, yy); if (t < xs.length) { x0 = xs[t]; e = xs[t]; } } }
      for (const [kulcs, y0] of nyitott) { if (uj.has(kulcs) && ys[k - 1] === yy - 1) uj.set(kulcs, y0); else lezar(kulcs, y0, ys[k - 1]); }
      nyitott = uj;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(cs, 3)); g.setIndex(ix);
  const halo = new THREE.Mesh(g, anyag); halo.name = 'WEB_wc_tetok'; halo.renderOrder = 5; halo.frustumCulled = false;
  halo.userData.helyisegek = helyisegek.length;
  for (const { cellak, y: yt } of helyisegek) { const f = zonaFeliratPontokra(cellak.map((i) => [wcX(i % N), wcZ((i - i % N) / N)]), yt + 0.07, 'TOILET'); if (f) halo.add(f); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(szelek, 3));
  const szegely = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ name: 'WEB_wc_szegely', color: 0x5cc0ff, transparent: true, opacity: 0.95 })); szegely.renderOrder = 6; szegely.frustumCulled = false; halo.add(szegely);
  return halo;
}
// Hibás modell-lapok újrarajzolása: a helyiség padlóját (falakkal körülzárt, 2,5 m alatti cellák) elárasztjuk a megadott belső pontból,
// és az alaprajzára a faltető magasságában színes lapot + világító szegélyt teszünk (a modell lapjával azonos színben). mag: Blender x / y, m.
// (Az egyedi lista helyett ma már a ZONA_MIND fut: minden egység automatikusan.)
const ZONA_UJRA = {};
// A, P, F szint: a modell színes zóna-lapjai sok helyen nem a falakig érnek / túllógnak, a BAR felirat fehér háttérlapon, rossz irányban áll
// (felhasználó, 2026-11-20, képpel). A néző ezért MINDEN egységet újrarajzol: a modell lapjának közepéből elárasztja a helyiség padlóját
// (a magasságtérképen, 2,5 m-es falakig), arra teszi a lapot + szegélyt a modell színében, és a bárokra saját, sötét, nagy „BAR” feliratot,
// a helyiség hossztengelye mentén, a betűk teteje az aréna közepe felé (kívülről nézve egyenesen olvasható). A modell lapja, szegélye,
// felirata és háttérlapja ezeken a szinteken elrejtve. Ha egy helyiség elárasztása kifut (nyitott), annál az egységnél a modell lapja marad.
const ZONA_MIND = new Set(['S1']);   // a páholy és a felső szinten az egységek a lelátó / mennyezet alatt vannak, felülről nem látszanak a falaik → ott a modell lapja marad
// Feliratok a jelölt egységekre (felhasználó, 2026-11-20): minden típusnak saját angol felirata, sötét, nagy betűvel,
// a helyiség hossztengelyével PÁRHUZAMOSAN (a pontfelhő fő iránya), a betűk teteje az aréna közepe felé – kívülről nézve egyenesen olvasható.
const ZONA_SZOVEG = { bar: 'BAR', ruhatar: 'CLOAKROOM', wc: 'TOILET', merch: 'MERCH SHOP' };
function zonaFeliratPontokra(pontok, y, szoveg, szin = 0x0b1220) {
  // pontok: [[x, z], …] világkoordinátában
  const n = pontok.length; if (n < 3) return null;
  let mx = 0, mz = 0; for (const [x, z] of pontok) { mx += x; mz += z; } mx /= n; mz /= n;
  let sxx = 0, szz = 0, sxz = 0; for (const [x, z] of pontok) { const dx = x - mx, dz = z - mz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
  const f = 0.5 * Math.atan2(2 * sxz, sxx - szz); let dx = Math.cos(f), dz = Math.sin(f);          // fő irány
  // a betűk „fel” iránya (dz, −dx); ha nem az aréna közepe felé mutat, fordítsunk
  if (dz * -mx + -dx * -mz < 0) { dx = -dx; dz = -dz; }
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const [x, z] of pontok) { const ex = x - mx, ez = z - mz, a = ex * dx + ez * dz, b = ex * dz - ez * dx; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  const hossz = a1 - a0, mely = b1 - b0;
  const c = document.createElement('canvas'), g = c.getContext('2d'), FS = 200; g.font = `900 ${FS}px Nunito, "Arial Black", Arial, sans-serif`;
  const tw = Math.ceil(g.measureText(szoveg).width) + 40; c.width = tw; c.height = 260;
  g.font = `900 ${FS}px Nunito, "Arial Black", Arial, sans-serif`; g.fillStyle = '#' + new THREE.Color(szin).getHexString(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(szoveg, tw / 2, 136);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const arany = tw / 260, h = Math.min(mely * 0.6, hossz * 0.82 / arany, 3.2), sz = h * arany;
  if (h < 0.35) return null;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, h), new THREE.MeshBasicMaterial({ name: 'WEB_zona_felirat', map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  m.renderOrder = 8; m.frustumCulled = false;
  m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, Math.atan2(-dz, dx), 0);
  m.position.set(mx + dx * (a0 + a1) / 2 + dz * (b0 + b1) / 2, y + 0.06, mz + dz * (a0 + a1) / 2 - dx * (b0 + b1) / 2);
  return m;
}
// a modell egy anyagú lapjaiból (pl. UJ_zona_wc_teto, UJ_zona_ruhatar_teto) tömbönként felirat – ahol a néző nem rajzolja újra az egységet
function modellLapFeliratok(root, minta, szoveg, kihagy = () => false) {
  // a lap háromszögei összetartoznak (egy tömb), és a 2,5 m-nél közelebbi csúcsok is (a blokkok közti rések átívelése)
  root.updateMatrixWorld(true); const pts = [], szulo = [];
  const gy = (i) => { while (szulo[i] !== i) { szulo[i] = szulo[szulo[i]]; i = szulo[i]; } return i; }, egyesit = (a, b) => { a = gy(a); b = gy(b); if (a !== b) szulo[a] = b; };
  root.traverse((o) => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (!minta.test(m.name || '')) continue;
    const p = o.geometry.attributes.position, e = o.matrixWorld.elements, b0 = pts.length;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); pts.push([e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]); szulo.push(pts.length - 1); }
    const ix = o.geometry.index; if (ix) for (let t = 0; t < ix.count; t += 3) { egyesit(b0 + ix.getX(t), b0 + ix.getX(t + 1)); egyesit(b0 + ix.getX(t), b0 + ix.getX(t + 2)); }
    else for (let t = 0; t + 2 < p.count; t += 3) { egyesit(b0 + t, b0 + t + 1); egyesit(b0 + t, b0 + t + 2); } } });
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[j][0] - pts[i][0], pts[j][2] - pts[i][2]) < 2.5) egyesit(i, j);
  const csop = new Map(); for (let i = 0; i < pts.length; i++) { const g = gy(i); if (!csop.has(g)) csop.set(g, []); csop.get(g).push(i); }
  const out = [];
  for (const cs of csop.values()) {
    const pp = cs.map((j) => [pts[j][0], pts[j][2]]), y = Math.max(...cs.map((j) => pts[j][1]));
    if (kihagy(pp)) continue;
    const f = zonaFeliratPontokra(pp, y, szoveg); if (f) out.push(f);
  }
  return out;
}
function zonaMind(root, key) {
  const mag = wcMagassagTerkep(root), N = WC_N, cm = 2 * WC_R / (N - 1);
  root.updateMatrixWorld(true);
  // a modell zóna-lapjai: csúcsok egységenként (5 m-en belül összefüggő csoportok), típus és szín az anyagból
  const egysegek = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      const t = /UJ_zona_([a-z]+)_teto/.exec(m.name || ''); if (!t || t[1] === 'wc') continue;
      const p = o.geometry.attributes.position, e = o.matrixWorld.elements, cs = [];
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); cs.push([e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]); }
      const kesz = new Array(cs.length).fill(false);
      for (let i = 0; i < cs.length; i++) { if (kesz[i]) continue; const cs0 = [i]; kesz[i] = true;
        for (let k = 0; k < cs0.length; k++) for (let j = 0; j < cs.length; j++) if (!kesz[j] && Math.hypot(cs[j][0] - cs[cs0[k]][0], cs[j][2] - cs[cs0[k]][2]) < 5) { kesz[j] = true; cs0.push(j); }
        const n = cs0.length, cx = cs0.reduce((a, j) => a + cs[j][0], 0) / n, cz = cs0.reduce((a, j) => a + cs[j][2], 0) / n, y = Math.max(...cs0.map((j) => cs[j][1]));
        egysegek.push({ tipus: t[1], szin: m.color.getHex(), fedes: m.opacity, x: cx, z: cz, y });
      }
    }
  });
  for (let i = 0; i < egysegek.length; i++) for (let j = egysegek.length - 1; j > i; j--) {
    const a = egysegek[i], b = egysegek[j];
    if (a.tipus === b.tipus && Math.hypot(a.x - b.x, a.z - b.z) < 12) { a.x = (a.x + b.x) / 2; a.z = (a.z + b.z) / 2; a.y = Math.max(a.y, b.y); egysegek.splice(j, 1); }
  }
  // feliratos egységek: ahol a modellnek volt „_betu” felirata (a lap közelében)
  const betuk = []; root.traverse((o) => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (/UJ_zona_[a-z]+_betu/.test(m.name || '')) { const b = new THREE.Box3().setFromObject(o); betuk.push(b); } });
  const csop = new THREE.Group(); csop.name = 'WEB_zona_mind'; const rejt = [];
  // 1. lépés: minden egység helyiségének elárasztása (a vékony falak 1 cellával hízlalva); folyosóra kifutó / túl nagy: kihagyva
  const fal = (i) => mag[i] >= 2.5 || mag[i - 1] >= 2.5 || mag[i + 1] >= 2.5 || mag[i - N] >= 2.5 || mag[i + N] >= 2.5;
  const K = Math.round(1.5 / cm);
  for (const u of egysegek) {
    let si = wcCy(u.z) * N + wcCx(u.x);
    if (fal(si)) { let lj = 1e9, bj = -1; for (let dy = -K; dy <= K; dy++) for (let dx = -K; dx <= K; dx++) { const i = si + dy * N + dx; if (!fal(i) && dx * dx + dy * dy < lj) { lj = dx * dx + dy * dy; bj = i; } } if (bj < 0) continue; si = bj; }
    const lat = new Set([si]), verem = [si]; let rossz = false;
    while (verem.length) { const i = verem.pop(); if (lat.size > 320 / (cm * cm)) { rossz = true; break; }
      for (const j of [i - 1, i + 1, i - N, i + N]) if (!lat.has(j) && !fal(j)) { lat.add(j); verem.push(j); } }
    if (!rossz && lat.size >= 4 / (cm * cm)) u.lat = lat;
  }
  // 2. lépés: ugyanabba a helyiségbe eső egységek: azonos típus → egy egység; különböző típus (ruhatár + büfé) → a cellák a közelebbi középponté
  const jo = egysegek.filter((u) => u.lat);
  for (let i = 0; i < jo.length; i++) for (let j = jo.length - 1; j > i; j--) {
    const a = jo[i], b = jo[j]; let kozos = false; for (const c of b.lat) if (a.lat.has(c)) { kozos = true; break; }
    if (!kozos) continue;
    if (a.tipus === b.tipus) { for (const c of b.lat) a.lat.add(c); a.y = Math.max(a.y, b.y); jo.splice(j, 1); }
    else { const tav = (u, c) => (wcX(c % N) - u.x) ** 2 + (wcZ((c - c % N) / N) - u.z) ** 2;
      for (const c of [...a.lat]) if (b.lat.has(c)) { if (tav(a, c) <= tav(b, c)) b.lat.delete(c); else a.lat.delete(c); } }
  }
  for (const u of jo) {
    const lat = u.lat; if (lat.size < 4 / (cm * cm)) continue;
    // a lap a fal közepéig ér: 2 cellás visszahízlalás, de a szomszéd egység cellái nélkül
    const tobbi = new Set(); for (const w of jo) if (w !== u) for (const c of w.lat) tobbi.add(c);
    let bov = new Set(lat); for (let k = 0; k < 2; k++) { const uj = new Set(bov); for (const i of bov) for (const j of [i - 1, i + 1, i - N, i + N]) if (!tobbi.has(j)) uj.add(j); bov = uj; }
    const cs = [], ix = [], sz = [], y = u.y;
    const sorok = new Map(); for (const i of bov) { const x = i % N, yy = (i - x) / N; if (!sorok.has(yy)) sorok.set(yy, []); sorok.get(yy).push(x); }
    for (const [yy, xs] of sorok) { xs.sort((a, b) => a - b); let x0 = xs[0], e = xs[0];
      for (let t = 1; t <= xs.length; t++) { if (t < xs.length && xs[t] === e + 1) { e = xs[t]; continue; }
        const b = cs.length / 3, xa = wcX(x0) - cm / 2, xb = wcX(e) + cm / 2, za = wcZ(yy) + cm / 2, zb = wcZ(yy) - cm / 2;
        cs.push(xa, y, za, xb, y, za, xb, y, zb, xa, y, zb); ix.push(b, b + 1, b + 2, b, b + 2, b + 3);
        if (t < xs.length) { x0 = xs[t]; e = xs[t]; } } }
    for (const i of bov) { const x = i % N, yy = (i - x) / N, xa = wcX(x) - cm / 2, xb = wcX(x) + cm / 2, za = wcZ(yy) + cm / 2, zb = wcZ(yy) - cm / 2, yv = y + 0.02;
      if (!bov.has(i - 1)) sz.push(xa, yv, za, xa, yv, zb); if (!bov.has(i + 1)) sz.push(xb, yv, za, xb, yv, zb);
      if (!bov.has(i - N)) sz.push(xa, yv, za, xb, yv, za); if (!bov.has(i + N)) sz.push(xa, yv, zb, xb, yv, zb); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(cs, 3)); g.setIndex(ix);
    const lap = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ name: 'WEB_zona_teto', color: u.szin, transparent: true, opacity: Math.max(0.45, u.fedes * 0.8), depthWrite: false, side: THREE.DoubleSide }));
    lap.renderOrder = 5; lap.frustumCulled = false; csop.add(lap);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sz, 3));
    const v = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ name: 'WEB_zona_szegely', color: u.szin })); v.renderOrder = 6; v.frustumCulled = false; csop.add(v);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const i of bov) { const x = wcX(i % N), z = wcZ((i - i % N) / N); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const doboz = { x0: x0 - 0.6, x1: x1 + 0.6, z0: z0 - 0.6, z1: z1 + 0.6 }; rejt.push(doboz);
    // felirat minden egységre, a helyiség hossztengelyével párhuzamosan
    { const f = zonaFeliratPontokra([...lat].map((i) => [wcX(i % N), wcZ((i - i % N) / N)]), y, ZONA_SZOVEG[u.tipus] || u.tipus.toUpperCase()); if (f) csop.add(f); }
  }
  for (const f of modellLapFeliratok(root, /UJ_zona_wc_teto/, 'TOILET')) csop.add(f);
  // a modell zóna-anyagai (a mosdó kivételével) az újrarajzolt egységek dobozaiban eldobva
  if (rejt.length) root.traverse((o) => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material]))
    if (/UJ_zona_(?!wc)[a-z]+_(teto|szegely|betu|felirathatter)/.test(m.name || '') && !String(m.customProgramCacheKey?.() || '').includes('|zonarejt')) zonaRejt(m, rejt.concat(ZONA_REJT[key] || [])); });
  return csop.children.length ? csop : null;
}
function zonaUjra(root, lista) {
  const mag = wcMagassagTerkep(root), N = WC_N, cm = 2 * WC_R / (N - 1), csop = new THREE.Group(); csop.name = 'WEB_zona_ujra';
  for (const z of lista) {
    const si = wcCy(-z.mag[1]) * N + wcCx(z.mag[0]); if (mag[si] >= 2.5) continue;
    const latott = new Set([si]), verem = [si]; let rossz = false;
    while (verem.length) { const i = verem.pop(); if (latott.size > 400 / (cm * cm)) { rossz = true; break; }
      for (const j of [i - 1, i + 1, i - N, i + N]) if (!latott.has(j) && mag[j] < 2.5) { latott.add(j); verem.push(j); } }
    if (rossz) continue;
    // a fal feléig kiterjesztve (a lap a fal belső élén érjen véget, ne maradjon rés)
    const bov = new Set(latott); for (const i of latott) for (const j of [i - 1, i + 1, i - N, i + N]) bov.add(j);
    const cs = [], ix = [], sz = [], y = z.y;
    const sorok = new Map(); for (const i of bov) { const x = i % N, yy = (i - x) / N; if (!sorok.has(yy)) sorok.set(yy, []); sorok.get(yy).push(x); }
    for (const [yy, xs] of sorok) { xs.sort((a, b) => a - b); let x0 = xs[0], e = xs[0];
      for (let t = 1; t <= xs.length; t++) { if (t < xs.length && xs[t] === e + 1) { e = xs[t]; continue; }
        const b = cs.length / 3, xa = wcX(x0) - cm / 2, xb = wcX(e) + cm / 2, za = wcZ(yy) + cm / 2, zb = wcZ(yy) - cm / 2;
        cs.push(xa, y, za, xb, y, za, xb, y, zb, xa, y, zb); ix.push(b, b + 1, b + 2, b, b + 2, b + 3);
        if (t < xs.length) { x0 = xs[t]; e = xs[t]; } } }
    for (const i of bov) { const x = i % N, yy = (i - x) / N, xa = wcX(x) - cm / 2, xb = wcX(x) + cm / 2, za = wcZ(yy) + cm / 2, zb = wcZ(yy) - cm / 2, yv = y + 0.02;
      if (!bov.has(i - 1)) sz.push(xa, yv, za, xa, yv, zb); if (!bov.has(i + 1)) sz.push(xb, yv, za, xb, yv, zb);
      if (!bov.has(i - N)) sz.push(xa, yv, za, xb, yv, za); if (!bov.has(i + N)) sz.push(xa, yv, zb, xb, yv, zb); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(cs, 3)); g.setIndex(ix);
    const lap = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ name: 'WEB_zona_ujra_teto', color: z.szin, transparent: true, opacity: z.fedes * 0.85, depthWrite: false, side: THREE.DoubleSide }));
    lap.renderOrder = 5; lap.frustumCulled = false; csop.add(lap);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sz, 3));
    const vonal = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ name: 'WEB_zona_ujra_szegely', color: z.szin })); vonal.renderOrder = 6; vonal.frustumCulled = false; csop.add(vonal);
  }
  return csop.children.length ? csop : null;
}
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
      if (ZONA_VAGAS[key]?.minta.test(m.name) && !QS.has('novag')) zonaVag(m, ZONA_VAGAS[key]);
      { const d = (ZONA_REJT[key] || []).filter((d) => d.minta.test(m.name)); if (d.length && !QS.has('norejt')) zonaRejt(m, d); }
      // a zónák feliratai (BAR, MERCH SHOP …) sokkal sötétebbek és a színes lap FÖLÉ rajzolva (felhasználó, 2026-11-20: „nehezen olvasom el”):
      // áttetsző körben, a lap után rajzoljuk, így a lap színe nem mossa ki; a szín közel fekete sötétkék
      if (/UJ_zona_.*_betu/.test(m.name)) { m.color.setHex(0x070b14); if (m.emissive) m.emissive.setHex(0); m.map = null; m.transparent = true; m.opacity = 1; m.depthWrite = false; o.renderOrder = 20; }
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
// A pineken két kép van: a színes (eredeti) és a semleges (sötét korong, sárga rajz); alapból a semleges látszik, a színes csak kijelöléskor –
// kivéve az információt és a liftet, azok mindig színesek (felhasználó, 2026-11-20). A szűrőgombokon marad a színes.
const MINDIG_SZINES = new Set(['info', 'lift']);
const semUrl = (nev) => (nev === 'info' ? ikonUrl(nev) : asset(`img/ikonok/ikon_${nev}_s.svg`));
const ICON2 = (cat, nev) => { const n = nev || IKONFAJL[cat]; return `<img class="ik szin" src="${ikonUrl(n)}" alt=""><img class="ik sem" src="${semUrl(n)}" alt="">`; };
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
// A szektorszám helye: a szektor KÖZEPE a lelátón (felhasználó, 2026-11-20: „nagyon a nézőtér legtetején van … lehetne a szektorok közepén”).
// A szektor-alaprajzból (data/szektorok.json) számolva: a szám a saját oldalán, a sorok (r) és a magasság (z) közepén ül; ha nincs adat, marad a régi hely.
function szektorKozep(p, padlo) {
  const q = SZEKTOR?.szektorok[p.id.slice(8)]; if (!q?.length) return null;
  let bf = 0, br = -1e9; SZEKTOR.oldalak.forEach((o, i) => { const r = o[0] * p.x + o[1] * p.y - o[2]; if (r > br) { br = r; bf = i; } });
  const sajat = q.filter((k) => k[0] === bf), k = sajat.length ? sajat : q, o = SZEKTOR.oldalak[k[0][0]];
  let r0 = 1e9, r1 = -1e9, t0 = -1e9, t1 = 1e9; for (const a of k) { r0 = Math.min(r0, a[3]); r1 = Math.max(r1, a[4]); t0 = Math.max(t0, a[1]); t1 = Math.min(t1, a[2]); }
  const rm = (r0 + r1) / 2;
  // a magasság a sorok közepén: abban a darabban, amelyikbe az rm esik
  const d = k.find((a) => rm >= a[3] && rm <= a[4]) || k[0], z = d[5] + (d[6] - d[5]) * Math.min(1, Math.max(0, (rm - d[3]) / (d[4] - d[3])));
  // az oldal menti hely: a szám eredeti helye, de a szektor (véges) határain belül; saroknál (±999) a véges vég felől 4 m-rel beljebb
  let t = -o[1] * p.x + o[0] * p.y;
  const v0 = t0 > -900, v1 = t1 < 900;
  if (v0 && v1) t = (t0 + t1) / 2; else if (v0) t = Math.max(t, t0 + 2); else if (v1) t = Math.min(t, t1 - 2);
  const x = o[0] * (rm + o[2]) - o[1] * t, y = o[1] * (rm + o[2]) + o[0] * t;
  return new THREE.Vector3(x, z - padlo + 0.9, -y);
}
function buildMarkers(pois, padlo = 0) {
  markersEl.innerHTML = ''; AGAK.innerHTML = ''; markersEl.appendChild(AGAK);
  return pois.map((p) => {
    const el = document.createElement('div');
    el.className = `mk ${p.cat}`;
    el.style.setProperty('--szin', CATS[p.cat].color);
    if (p.cat === 'szektor' || MINDIG_SZINES.has(p.cat)) el.classList.add('eredeti');
    el.style.setProperty('--ink', CATS[p.cat].ink);
    if (p.cat === 'szektor') {
      el.innerHTML = `<div class="pin">${p.name.replace('Szektor ', '')}</div>`;
    } else {
      el.innerHTML = `<div class="lbl">${p.name}</div><div class="pin">${ICON2(p.cat, p.ikon)}<span class="db"></span></div><div class="stem"></div>`;
    }
    el.addEventListener('click', (e) => { e.stopPropagation(); const mk = current.markers.find((x) => x.el === el); if (mk?.csopN > 1) csoportKozelit(mk); else selectPoi(p); });
    el.addEventListener('dblclick', (e) => e.stopPropagation());
    markersEl.appendChild(el);
    const world = (p.cat === 'szektor' && !QS.has('regiszektor') && szektorKozep(p, padlo)) || poiWorld(p); if (p.cat !== 'szektor' || world.x === p.x) world.y += p.cat === 'szektor' ? 1.5 : 1.2;
    if (p.cat !== 'szektor') {   // minden szolgáltatás-pin EGY magasságban (felhasználó, V2): a padlótól 5,7 m-rel följebb, 3D-s szárral; a közös mosdó szára elágazik
      el.classList.add('agas');
      const ag = document.createElementNS('http://www.w3.org/2000/svg', 'path'); AGAK.appendChild(ag);
      // 3D-s váz (világkoordináta): ajtó alja → ajtó fölött (gerinc vége) … gerinc a fal vonalában … → másik ajtó alja; a gerinc közepéről föl a pinhez
      const G = 3.3, P = 2.4;
      // az információs pult pinje alacsonyabban áll (felhasználó, 2026-11-19): a lobbyban a mögötte lévő ruhatár-pinnel egybelógott
      if (!p.ajtok) { const al = poiWorld(p); return { p, el, world, ag, vaz: [al.clone().setY(al.y + 0.15), al.clone().setY(al.y + (p.cat === 'info' ? 1.9 : G + P))] }; }
      const [a, b] = p.ajtok.map(poiWorld);
      const fa = a.clone().setY(a.y + G), fb = b.clone().setY(b.y + G), kz = fa.clone().lerp(fb, 0.5), tet = kz.clone().setY(kz.y + P);
      return { p, el, world, ag, vaz: [a.clone().setY(a.y + 0.15), fa, fb, b.clone().setY(b.y + 0.15), kz, tet] };
    }
    return { p, el, world };
  });
}

// ---------- Takarás: a modell mögé kerülő buborékok eltűnnek (felhasználó, 2026-11-20: „a modell ki tudná maszkolni … az adna mélységet”) ----------
// A buborékok HTML-elemek, ezért a kép mélységét külön, kis felbontásban rajzoljuk ki (minden tömör felület távolsága a kamerától, 16 biten),
// visszaolvassuk, és amelyik buborék pontja mögötte van, azt elhalványítjuk. Az áttetsző felületek (üveg, színes zóna-lapok) nem takarnak.
const TAKAR = { be: !QS.has('notakar'), sz: 288, kep: null, m: 0, rt: null, puf: null, kocka: 0, elozo: '', kesz: false };
const takarAnyag = new THREE.ShaderMaterial({
  uniforms: { uTav: { value: 1200 } }, side: THREE.DoubleSide,
  vertexShader: 'varying float vZ;' + '\n' + 'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float uTav; varying float vZ;' + '\n' + 'void main(){ float d = clamp(vZ / uTav, 0.0, 1.0) * 255.0; gl_FragColor = vec4(floor(d) / 255.0, fract(d), 0.0, 1.0); }',
});
const _feher = new THREE.Color(0xffffff);
function takarasFrissit() {
  if (!TAKAR.be || !current) return;
  // csak akkor rajzoljuk újra, ha a kamera elmozdult (álló képnél elég egyszer), és akkor is csak minden 3. képkockán
  const kulcs = current.level + camera.matrixWorld.elements.map((x) => x.toFixed(2)).join(',') + camera.fov.toFixed(1) + innerWidth + 'x' + innerHeight;
  if (kulcs === TAKAR.elozo || (++TAKAR.kocka % 3 && TAKAR.kesz)) return;
  TAKAR.elozo = kulcs;
  const w = TAKAR.sz, h = Math.max(32, Math.round(TAKAR.sz * innerHeight / innerWidth));
  if (!TAKAR.rt || TAKAR.m !== h) { TAKAR.rt?.dispose(); TAKAR.rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true }); TAKAR.puf = new Uint8Array(w * h * 4); TAKAR.m = h; }
  // ami nem takar: áttetsző anyagok, a levágott homlokzat (FACADE_CUT) – ezeket a mélységrajz idejére elrejtjük
  current.nemTakar ??= (() => { const l = []; const vag = !!FACADE_CUT[LEVELS[current.level].key];
    for (const gy of [current.root, current.anim?.root]) gy?.traverse((o) => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
      if (ms.every((m) => m.transparent || m.opacity < 1 || (vag && FACADE.test(alapNev(m.name))))) l.push(o); }); return l; })();
  for (const o of current.nemTakar) o.visible = false;
  const hatter = scene.background; scene.background = _feher; scene.overrideMaterial = takarAnyag; takarAnyag.uniforms.uTav.value = camera.far;
  renderer.setRenderTarget(TAKAR.rt); renderer.render(scene, camera);
  renderer.readRenderTargetPixels(TAKAR.rt, 0, 0, w, h, TAKAR.puf);
  renderer.setRenderTarget(null); scene.overrideMaterial = null; scene.background = hatter;
  for (const o of current.nemTakar) o.visible = true;
  TAKAR.kesz = true;
}
// igaz, ha a világbeli pont a modell mögött van (a pont körüli 3×3 képpont mindegyikében közelebb van valami tömör felület)
const _tv = new THREE.Vector3();
function takart(pont) {
  if (!TAKAR.be || !TAKAR.kesz) return false;
  _tv.copy(pont).applyMatrix4(camera.matrixWorldInverse); const tav = -_tv.z; if (tav <= 0) return false;
  _tv.copy(pont).project(camera);
  const w = TAKAR.sz, h = TAKAR.m, px = Math.round((_tv.x * 0.5 + 0.5) * (w - 1)), py = Math.round((_tv.y * 0.5 + 0.5) * (h - 1));
  if (px < 1 || py < 1 || px > w - 2 || py > h - 2) return false;
  const tures = 7 + tav * 0.012;   // csak az takar, ami legalább ~7 m-rel a pont ELŐTT van – a pin saját tárgya (liftakna, pult, fal, amin ül) ne tüntesse el
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const i = ((py + dy) * w + px + dx) * 4, d = (TAKAR.puf[i] + TAKAR.puf[i + 1] / 255) / 255 * camera.far;
    if (d >= tav - tures) return false;
  }
  return true;
}
// puhítás: csak akkor vált állapotot, ha két egymást követő mérés ugyanazt mondja (a széleken ne villogjon)
function takarJel(m, pont) {
  const t = m.el !== selectedEl && takart(pont);
  m.tk = t ? Math.min(2, (m.tk || 0) + 1) : Math.max(0, (m.tk || 0) - 1);
  if (m.tk === 2 && !m.tkBe) { m.tkBe = true; m.el.classList.add('takart'); } else if (m.tk === 0 && m.tkBe) { m.tkBe = false; m.el.classList.remove('takart'); }
  return !!m.tkBe;
}

const _v = new THREE.Vector3();
function updateMarkers() {
  if (!current) return;
  const w = innerWidth, h = innerHeight;
  const camDist = camera.position.distanceTo(controls.target);
  const kep = THREE.MathUtils.clamp(Math.min(w, h) / 720, 0.62, 1);   // kis képernyőn (telefon) arányosan kisebb pinek és szektorszámok (felhasználó, 2026-11-19)
  const pinSor = [];
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
    const s = THREE.MathUtils.clamp(95 / camDist + 0.28, 0.5, 1.1) * (szek ? 1.12 : 1.0) * kep * (focus ? 1.35 : halv ? 0.72 : 1);   // a pinek kisebbek (felhasználó, 2026-11-20: inkább kisebb buborékok, mint egymás elé toltak) – korábban 1,4
    if (m.ag) {
      // a 3D-s váz pontjai képernyőre vetítve: a gerinc így a folyosó falának irányát követi, nem a képernyő vízszintesét
      let rejt = false;
      const q = m.vaz.map((a) => { _v.copy(a).project(camera); if (_v.z > 1) rejt = true; return [(_v.x * 0.5 + 0.5) * w, (-_v.y * 0.5 + 0.5) * h]; });
      const t = q[q.length - 1];
      pinSor.push({ m, q, s, rejt, halv, focus, x: t[0], y: t[1] - 18 * s, r: 18 * s + 2 });   // x, y: a pin-kör közepe; r: sugara képpontban
      continue;
    }
    takarJel(m, m.world);
    m.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%) scale(${s})`;
  }
  // ZSÚFOLTSÁG (felhasználó, 2026-11-20): távolról az egymáshoz közeli, AZONOS típusú pinek közül csak EGY látszik (a saját helyén, rajta a darabszámmal)
  // („2 ruhatár helyett csak egyet mutat”); közelebb menve szétválnak és a helyükre kerülnek. A csoportosítás képernyő-távolság szerint megy,
  // ezért magától követi a nagyítást.
  const lathato = pinSor.filter((a) => !a.rejt).sort((a, b) => (a.m.elozoFo ? 1 : 0) - (b.m.elozoFo ? 1 : 0) || a.x - b.x || a.y - b.y);   // aki az előző képkockán látszott, az marad a látható (ne ugráljon)
  // az összevonás sugara a távolsággal nő: közelről csak az egymást fedők olvadnak össze (1,15 × a két sugár), távolról kb. két pin-átmérőn belül (2,3 ×)
  const csopK = THREE.MathUtils.clamp(1.15 + (camDist - 90) / 130 * 1.15, 1.15, 2.3);
  const csoportok = [];
  for (const a of lathato) a.kesz = false;
  for (const a of lathato) {
    if (a.kesz) continue;
    a.kesz = true;
    const g = { fo: a, tagok: [a] }, tip = a.m.p.ikon || a.m.p.cat, kijelolt = a.m.el === selectedEl;
    if (!kijelolt) for (const b of lathato) {
      if (b.kesz || (b.m.p.ikon || b.m.p.cat) !== tip || b.m.el === selectedEl) continue;
      // összevonás, ha a két kör összeérne (kis ráhagyással); ami az előző képkockán már együtt volt, az kicsit tovább marad együtt (ne villogjon)
      const hatar = (a.r + b.r) * csopK * (b.m.elozoFo === a.m ? 1.2 : 1);
      if (Math.hypot(b.x - a.x, b.y - a.y) < hatar) { b.kesz = true; g.tagok.push(b); }
    }
    const n = g.tagok.length;
    csoportok.push(g);
  }
  // (A különböző típusú pinek széttolása és a közös pinhez futó szárak – a „buborékháló” – a felhasználó kérésére KIVÉVE, 2026-11-20: nem tetszett.)
  const f = (q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  const szar = (q) => (q.length === 2 ? `M${f(q[0])}L${f(q[1])}` : `M${f(q[0])}L${f(q[1])}L${f(q[2])}L${f(q[3])}M${f(q[4])}L${f(q[5])}`);
  for (const a of pinSor) if (a.rejt) { a.m.ag.style.display = 'none'; a.m.csopN = 0; a.m.elozoFo = null; }
  for (const g of csoportok) {
    const a = g.fo, m = a.m, n = g.tagok.length;
    const t = a.q[a.q.length - 1];
    const tk = takarJel(m, m.vaz[m.vaz.length - 1]);
    m.ag.setAttribute('d', szar(a.q)); m.ag.style.display = tk ? 'none' : '';
    m.ag.style.opacity = a.halv ? 0.3 : 0.9; m.ag.style.strokeWidth = a.focus ? 2.6 : 2;
    m.ag.style.stroke = a.focus || m.el === selectedEl || MINDIG_SZINES.has(m.p.cat) ? CATS[m.p.cat].color : 'rgba(252,191,32,.5)';   // semleges állapotban halvány sárga szár
    m.el.style.transform = `translate(${t[0]}px,${t[1]}px) translate(-50%,-100%) scale(${a.s})`;
    m.el.classList.remove('osszevont');
    if (m.csopN !== n) {
      m.csopN = n; m.el.classList.toggle('csoport', n > 1);
      (m.db ??= m.el.querySelector('.db')).textContent = n > 1 ? n : '';
      (m.lbl ??= m.el.querySelector('.lbl')).textContent = n > 1 ? `${n} × ${CATS[m.p.cat].label} – koppints a közelítéshez` : m.p.name;
    }
    m.csopTagok = g.tagok.map((b) => b.m); m.elozoFo = null;
    for (const b of g.tagok) if (b !== a) { const bm = b.m; bm.elozoFo = m; bm.csopN = 0; bm.el.classList.add('osszevont'); bm.ag.style.display = 'none'; }
  }
}
// Összevont pinre kattintva: közelítés a csoport közepére, amíg a tagok szét nem válnak
function csoportKozelit(mk) {
  const t = mk.csopTagok || [mk], c = new THREE.Vector3();
  for (const x of t) c.add(x.world); c.multiplyScalar(1 / t.length);
  let ter = 0; for (const x of t) ter = Math.max(ter, x.world.distanceTo(c));
  const tav = THREE.MathUtils.clamp(ter * 3.2 + 18, 26, camera.position.distanceTo(c) * 0.6);
  closePanel(false); enterDetail(c, tav * 0.8, tav * 0.6);
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
  if (zoomCel !== null) { tour.zoom += (zoomCel - tour.zoom) * Math.min(1, dt * 8); if (Math.abs(zoomCel - tour.zoom) < 0.002) { tour.zoom = zoomCel; zoomCel = null; } }
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
// Nagyítás körút-módban (felhasználó, 2026-11-19): a kezdőnézet a LEGTÁGABB, onnan befelé lehet nagyítani a kép közepe (a kamera célpontja) felé –
// egérgörgővel, két ujjas csípéssel és a + / − gombbal. A pálya (a körbeforgás) közben megmarad.
const ZOOM_MIN = 0.2;
const zoomAllit = (z) => { tour.zoom = THREE.MathUtils.clamp(z, ZOOM_MIN, alapZoom()); };
let zoomCel = null;   // a + / − gomb puha átmenete
canvas.addEventListener('wheel', (e) => {
  if (mode !== 'tour') return;
  zoomCel = null; zoomAllit(tour.zoom * (1 + Math.sign(e.deltaY) * 0.08));
}, { passive: true });
const ujjak = new Map(); let csip = null;
const ujjTav = () => { const [a, b] = [...ujjak.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  ujjak.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ujjak.size === 2 && mode === 'tour') { tour.drag = null; tour.vel = 0; zoomCel = null; csip = { d0: ujjTav(), z0: tour.zoom }; }
});
canvas.addEventListener('pointermove', (e) => {
  if (!ujjak.has(e.pointerId)) return;
  ujjak.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (csip && ujjak.size === 2 && mode === 'tour') { tour.drag = null; zoomAllit(csip.z0 * csip.d0 / ujjTav()); }
});
const ujjFel = (e) => { ujjak.delete(e.pointerId); if (ujjak.size < 2) csip = null; };
canvas.addEventListener('pointerup', ujjFel); canvas.addEventListener('pointercancel', ujjFel);
// + / − gomb: körút-módban a pálya menti nagyítás, részletnézetben a kamera–célpont távolság
function zoomGomb(k) {
  if (mode === 'tour') { zoomCel = THREE.MathUtils.clamp((zoomCel ?? tour.zoom) * k, ZOOM_MIN, alapZoom()); return; }
  const v = camera.position.clone().sub(controls.target); const d = THREE.MathUtils.clamp(v.length() * k, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(v.setLength(d)); armIdle();
}
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
let tobbUjj = false;   // két ujjas csípés után az ujjak felemelése NEM dupla koppintás
canvas.addEventListener('touchstart', (e) => { if (e.touches.length > 1) tobbUjj = true; }, { passive: true });
canvas.addEventListener('touchend', (e) => {
  if (tobbUjj) { if (e.touches.length === 0) tobbUjj = false; lastTap = 0; return; }
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
// Kézzel felvett pontok (a data/S*.json-t nem bántjuk): a páholy szint Visa Platinum Lounge bárja – a felhasználó kérése (2026-11-20):
// ott ne színes jelölés legyen, hanem egy bár-pin a közepén, és rákattintva KÉT kép a bárról. fotok: saját képek (img/fotok/), nem a típus közös képe.
const SAJAT_POI = { S2: [{ id: 'bar_platinum', cat: 'bar', ikon: 'bufe', name: 'Visa Platinum Lounge bár', x: 0, y: 64, z: 3.94,
  fotok: ['DSC00559.jpg', 'DSC00532.jpg'], szoveg: 'A Visa Platinum Lounge központi bárpultja: italok és snackek a lounge vendégeinek. A lounge a páholy szint északi oldalán található.' }] };
function setPhotos(p, c) {
  $('#panelPhoto2').style.display = p.fotok?.[1] ? '' : 'none';
  if (p.fotok?.length) {
    $('#panelPhoto').style.backgroundImage = `url(${asset('img/fotok/' + p.fotok[0])})`; $('#photoCap').textContent = '';
    if (p.fotok[1]) $('#panelPhoto2').style.backgroundImage = `url(${asset('img/fotok/' + p.fotok[1])})`;
    return;
  }
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
    : (p.szoveg || c.text);
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
// Háttér-előtöltés (felhasználó: „elég lassan töltenek be a szintek”): az első szint megjelenése után a többi szint fájljai
// sorban, csendben letöltődnek (memóriában tartott blob), így szintváltáskor már nem kell a hálózatra várni – csak a feldolgozás marad.
// Adatforgalom-kímélő módban (Save-Data) nem fut. ELO_URL: eredeti útvonal → { p: ígéret a blob-címre, url: kész blob-cím }
const ELO_URL = {};
const forras = async (url) => { const e = ELO_URL[url]; return e ? (e.url || await e.p.catch(() => null) || asset(url)) : asset(url); };
function elotolt(url) {
  if (ELO_URL[url]) return ELO_URL[url].p;
  const e = ELO_URL[url] = {};
  e.p = fetch(asset(url), { priority: 'low' }).then((r) => { if (!r.ok) throw 0; return r.blob(); }).then((b) => (e.url = URL.createObjectURL(b)));
  e.p.catch(() => { delete ELO_URL[url]; });
  return e.p;
}
let eloFut = false;
async function elotoltTobbi() {
  if (eloFut || SHOT || QS.has('noelo') || navigator.connection?.saveData) return;
  eloFut = true;
  for (const k of ['lobby', 'also', 'paholy', 'felso', 'epulet']) {
    const L = LEVELS[k]; if (cache[k] || (k === 'epulet' && !VAN_EPULET)) continue;
    try {
      const d = await fetch(asset(L.data)).then((r) => r.json());
      if (cache[k]) continue;
      await elotolt(L.model); if (d.lightmap) await elotolt(d.lightmap.file); if (d.anim) await elotolt(d.anim.model);
    } catch (e) { /* nem baj: szintváltáskor rendesen letölti */ }
  }
}
const loadGltf = async (url, onProg) => { const f = await forras(url); return new Promise((res, rej) => loader.load(f, res, onProg, rej)); };

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
      if (SAJAT_POI[L.key]) data.pois = data.pois.concat(SAJAT_POI[L.key]);
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
      if (LEPCSO_FADE[L.key] && !QS.has('nofade')) lepcsoFade(gltf.scene, LEPCSO_FADE[L.key]);
      // lobby: a modell feliratai (fehér háttérlapon, kicsi) helyett ugyanaz a nagy, sötét felirat, mint az alsó szinten – minden egységre
      if (L.key === 'S0' && !QS.has('nofelirat')) {
        gltf.scene.traverse((o) => { if (o.isMesh) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (/UJ_zona_[a-z]+_(betu|felirathatter)/.test(m.name || '')) m.visible = false; });
        const g = new THREE.Group(); g.name = 'WEB_lobby_feliratok';
        for (const [t, sz] of Object.entries(ZONA_SZOVEG)) for (const f of modellLapFeliratok(gltf.scene, new RegExp(`UJ_zona_${t}_teto`), sz)) g.add(f);
        if (g.children.length) gltf.scene.add(g);
      }
      if (ZONA_MIND.has(L.key) && !QS.has('noujra')) { try { const u = zonaMind(gltf.scene, L.key); if (u) gltf.scene.add(u); } catch (e) { console.warn('zóna-mind', e); } }
      if (ZONA_UJRA[L.key] && !QS.has('noujra')) { try { const u = zonaUjra(gltf.scene, ZONA_UJRA[L.key]); if (u) gltf.scene.add(u); } catch (e) { console.warn('zóna-újra', e); } }
      // ahol a modell már ad kék mosdó-tetőt (UJ_zona_wc…), ott a néző nem épít másikat – különben duplán lenne
      if (WC_SZINT.has(L.key) && !QS.has('nowcteto')) { try {
        let vanModellben = false; gltf.scene.traverse((o) => { if (o.isMesh) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (/UJ_zona_wc/.test(m.name || '')) vanModellben = true; });
        const t = !vanModellben && wcTetok(gltf.scene, data.pois); if (t) gltf.scene.add(t);
      } catch (e) { console.warn('wc-tető', e); } }
      // a sütött-fény átalakítás új anyagpéldányt adhat, a szektor-kiemelő shader pedig felülírja az onBeforeCompile-t → a zóna-elrejtést a végleges anyagokra újra rátesszük
      if (ZONA_REJT[L.key] && !QS.has('norejt')) gltf.scene.traverse((o) => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { const d = ZONA_REJT[L.key].filter((d) => d.minta.test(m.name || '')); if (d.length && !String(m.customProgramCacheKey?.() || '').includes('|zonarejt')) zonaRejt(m, d); } });
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
    current = { ...c, pois: c.data.pois, markers: buildMarkers(c.data.pois, c.data.padlo || 0), lights: c.baked ? [] : addPoiLights(c.data.pois) };
    camShift = [c.data.camera.shift_x || 0, c.data.camera.shift_y || 0];
    LM.gain.value = Number(QS.get('lmg')) || c.data.lightmap?.gain || 1; LM.gamma.value = Number(QS.get('lmgam')) || c.data.lightmap?.gamma || 1;
    hfov = 2 * Math.atan(c.data.camera.sensor / 2 / c.data.camera.lens) * 180 / Math.PI;
    resize();
    fillCounts(current.pois);
    if (!QS.has('tiszta')) $('#filters').style.display = current.pois.length ? '' : 'none';   // a teljes épületen nincs pin → üres szűrőpanel se legyen
    $('#lvlSub').textContent = L.name;
    $('#forras').style.display = L.key === 'S4' ? '' : 'none';   // a teljes épület környékrajza OpenStreetMap-adatból készült → forrásmegjelölés (ODbL)
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
  takarasFrissit();
  updateMarkers();
});

buildFilters();
// Nézetgombok a sarokban (felhasználó, V2): Alapnézet, Felülnézet, Szektorszámok, Forgás
$('#tAlap').addEventListener('click', alapNezet);
$('#tFelul').addEventListener('click', felulNezet);
$('#tSzektor').addEventListener('click', () => { showSectors = !showSectors; syncChips(); });
$('#tForgas').addEventListener('click', () => { forog = !forog; syncChips(); });
$('#tPlusz').addEventListener('click', () => zoomGomb(0.75));
$('#tMinusz').addEventListener('click', () => zoomGomb(1 / 0.75));
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
  setTimeout(elotoltTobbi, 1200);                         // az első szint megjelent → a többi letöltése a háttérben
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

window.__mvm = { scene, camera, controls, THREE, loadLevel, modellLapFeliratok, zonaFeliratPontokra, magTerkep: () => wcMagassagTerkep(current.root), WC_N, WC_R, get current() { return current; }, get mode() { return mode; } };
