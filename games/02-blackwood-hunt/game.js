/* loaded as a classic script; deps are provided by the loader in index.html */
const THREE = window.THREE;
const PointerLockControls = window.PointerLockControls;

/* ============================== setup ============================== */
const ARENA = 58;
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10171a);
scene.fog = new THREE.FogExp2(0x1b2a24, 0.021);

const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.05, 400);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
document.getElementById('app').appendChild(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ============================== lighting ============================== */
const hemi = new THREE.HemisphereLight(0x9dbfcf, 0x2a3324, 0.62);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe6bd, 1.55);
sun.position.set(38, 46, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 130;
const S = 46;
sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
sun.shadow.bias = -0.0012;
sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(new THREE.DirectionalLight(0x3d5a6b, 0.34).translateX(-30).translateY(18).translateZ(-26));

/* ============================== helpers ============================== */
const dummy = new THREE.Object3D();
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// collision proxies: {x,z,r}
const colliders = [];
// meshes bullets can hit
const worldTargets = [];

function addCollider(x, z, r) { colliders.push({ x, z, r }); }

/* ============================== sky dome ============================== */
{
  const g = new THREE.SphereGeometry(220, 20, 14);
  const pos = g.attributes.position, col = [];
  const top = new THREE.Color(0x1d3a4d), mid = new THREE.Color(0x4c6b63), bot = new THREE.Color(0x8fa27e);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = clamp((pos.getY(i) / 220 + 0.22) / 1.05, 0, 1);
    if (t < 0.34) c.copy(bot).lerp(mid, t / 0.34); else c.copy(mid).lerp(top, (t - 0.34) / 0.66);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
}

/* ============================== ground ============================== */
{
  const g = new THREE.PlaneGeometry(300, 300, 70, 70);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = [];
  const a = new THREE.Color(0x3c4a2c), b = new THREE.Color(0x24301e), d = new THREE.Color(0x54492f);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = Math.sin(x * 0.17) * Math.cos(z * 0.21) + Math.sin(x * 0.53 + z * 0.31) * 0.5;
    pos.setY(i, n * 0.16 + Math.random() * 0.07);
    const t = (n + 1.5) / 3;
    c.copy(b).lerp(a, clamp(t + Math.random() * 0.25, 0, 1));
    if (Math.random() > 0.86) c.lerp(d, 0.45);
    col.push(c.r, c.g, c.b);
  }
  g.computeVertexNormals();
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 }));
  ground.receiveShadow = true;
  scene.add(ground);
  worldTargets.push(ground);
}

/* ============================== forest ============================== */
const MAT = {
  bark: new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.95 }),
  barkPale: new THREE.MeshStandardMaterial({ color: 0x6d6350, roughness: 0.9 }),
  leafA: new THREE.MeshStandardMaterial({ color: 0x2f5730, roughness: 0.85, flatShading: true }),
  leafB: new THREE.MeshStandardMaterial({ color: 0x3d6b33, roughness: 0.85, flatShading: true }),
  leafC: new THREE.MeshStandardMaterial({ color: 0x51703a, roughness: 0.85, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x6a6f6c, roughness: 0.92, flatShading: true }),
  bush: new THREE.MeshStandardMaterial({ color: 0x35542c, roughness: 0.9, flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6b5334, roughness: 0.85 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x7d7b70, roughness: 0.95 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x4c6b34, roughness: 1, flatShading: true, side: THREE.DoubleSide })
};

function inst(geo, mat, count, shadow) {
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.castShadow = !!shadow; m.receiveShadow = !!shadow;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(m);
  return m;
}

// --- trees (3 species) ---
const treeSpots = [];
{
  // pick positions: inner scatter + dense boundary ring
  const tryPlace = (r0, r1, minD) => {
    for (let k = 0; k < 40; k++) {
      const ang = Math.random() * Math.PI * 2, rr = rnd(r0, r1);
      const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
      if (Math.hypot(x, z) < 7) continue;
      let ok = true;
      for (const t of treeSpots) if (Math.hypot(t.x - x, t.z - z) < minD) { ok = false; break; }
      if (ok) return { x, z };
    }
    return null;
  };
  for (let i = 0; i < 96; i++) { const p = tryPlace(9, ARENA - 4, 4.6); if (p) treeSpots.push(p); }
  for (let i = 0; i < 130; i++) { const p = tryPlace(ARENA - 2, ARENA + 16, 2.4); if (p) treeSpots.push(p); }

  const N = treeSpots.length;
  const trunkG = new THREE.CylinderGeometry(0.34, 0.55, 1, 7, 1);
  trunkG.translate(0, 0.5, 0);
  const trunks = inst(trunkG, MAT.bark, N, true);

  const coneG = new THREE.ConeGeometry(1, 1, 8, 1);
  coneG.translate(0, 0.5, 0);
  const sphG = new THREE.IcosahedronGeometry(1, 1);

  const canopy = [
    inst(coneG, MAT.leafA, N * 3, true),
    inst(sphG, MAT.leafB, N * 2, true),
    inst(coneG, MAT.leafC, N, true)
  ];
  let c0 = 0, c1 = 0, c2 = 0;
  const put = (m, i, x, y, z, sx, sy, sz, ry) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0);
    dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
  };

  treeSpots.forEach((p, i) => {
    const species = Math.random();
    const h = rnd(7, 13.5), w = rnd(0.75, 1.25), ry = Math.random() * 6.28;
    put(trunks, i, p.x, 0, p.z, w, h, w, ry);
    addCollider(p.x, p.z, 0.55 * w + 0.32);
    p.h = h;

    if (species < 0.5) { // conifer
      for (let l = 0; l < 3; l++) {
        const y = h * (0.36 + l * 0.21), r = (3.5 - l * 0.85) * w, hh = h * (0.36 - l * 0.05);
        put(canopy[0], c0++, p.x, y, p.z, r, hh, r, ry + l);
      }
    } else if (species < 0.85) { // broadleaf blobs
      for (let l = 0; l < 2; l++) {
        put(canopy[1], c1++, p.x + rnd(-0.9, 0.9), h * (0.78 + l * 0.16), p.z + rnd(-0.9, 0.9),
          rnd(2.2, 3.4) * w, rnd(1.7, 2.5) * w, rnd(2.2, 3.4) * w, Math.random() * 6.28);
      }
    } else { // tall spire
      put(canopy[2], c2++, p.x, h * 0.42, p.z, 2.5 * w, h * 0.72, 2.5 * w, ry);
    }
  });
  for (let i = c0; i < N * 3; i++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); canopy[0].setMatrixAt(i, dummy.matrix); }
  for (let i = c1; i < N * 2; i++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); canopy[1].setMatrixAt(i, dummy.matrix); }
  for (let i = c2; i < N; i++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); canopy[2].setMatrixAt(i, dummy.matrix); }
  trunks.instanceMatrix.needsUpdate = true;
  canopy.forEach(m => m.instanceMatrix.needsUpdate = true);
  worldTargets.push(trunks);
}

const free = (x, z, pad) => {
  if (Math.hypot(x, z) > ARENA - 2) return false;
  for (const c of colliders) if (Math.hypot(c.x - x, c.z - z) < c.r + pad) return false;
  return true;
};
function spot(pad, r0, r1) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * 6.283, r = rnd(r0 || 6, r1 || ARENA - 5);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (free(x, z, pad)) return { x, z };
  }
  return null;
}

// --- rocks ---
{
  const m = inst(new THREE.IcosahedronGeometry(1, 0), MAT.rock, 46, true);
  for (let i = 0; i < 46; i++) {
    const p = spot(1.2) || { x: 999, z: 999 };
    const s = rnd(0.5, 2.5);
    dummy.position.set(p.x, s * 0.42, p.z);
    dummy.rotation.set(rnd(0, 1), Math.random() * 6.28, rnd(0, 1));
    dummy.scale.set(s * rnd(0.8, 1.4), s * rnd(0.6, 1.1), s * rnd(0.8, 1.4));
    dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    if (s > 1.3) addCollider(p.x, p.z, s * 0.8);
  }
  m.instanceMatrix.needsUpdate = true;
  worldTargets.push(m);
}

// --- bushes ---
{
  const m = inst(new THREE.DodecahedronGeometry(1, 0), MAT.bush, 70, true);
  for (let i = 0; i < 70; i++) {
    const p = spot(0.9) || { x: 999, z: 999 };
    const s = rnd(0.6, 1.5);
    dummy.position.set(p.x, s * 0.55, p.z);
    dummy.rotation.set(rnd(0, 1), Math.random() * 6.28, rnd(0, 1));
    dummy.scale.set(s * 1.3, s * 0.85, s * 1.3);
    dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
  }
  m.instanceMatrix.needsUpdate = true;
  worldTargets.push(m);
}

// --- fallen logs + stumps ---
{
  const g = new THREE.CylinderGeometry(0.42, 0.5, 1, 8, 1);
  g.rotateZ(Math.PI / 2);
  const m = inst(g, MAT.barkPale, 18, true);
  for (let i = 0; i < 18; i++) {
    const p = spot(1.6) || { x: 999, z: 999 };
    const len = rnd(3.5, 8), s = rnd(0.8, 1.5);
    dummy.position.set(p.x, 0.42 * s, p.z);
    dummy.rotation.set(rnd(-0.1, 0.1), Math.random() * 6.28, 0);
    dummy.scale.set(len, s, s);
    dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    addCollider(p.x, p.z, 1.1);
  }
  m.instanceMatrix.needsUpdate = true;
  worldTargets.push(m);

  const sg = new THREE.CylinderGeometry(0.6, 0.75, 1, 7, 1); sg.translate(0, 0.5, 0);
  const sm = inst(sg, MAT.bark, 14, true);
  for (let i = 0; i < 14; i++) {
    const p = spot(1.1) || { x: 999, z: 999 };
    dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, Math.random() * 6.28, 0);
    const s = rnd(0.7, 1.3); dummy.scale.set(s, rnd(0.6, 1.4), s);
    dummy.updateMatrix(); sm.setMatrixAt(i, dummy.matrix);
    addCollider(p.x, p.z, 0.8 * s);
  }
  sm.instanceMatrix.needsUpdate = true;
  worldTargets.push(sm);
}

// --- crates ---
{
  const m = inst(new THREE.BoxGeometry(1, 1, 1), MAT.wood, 20, true);
  let i = 0;
  while (i < 20) {
    const p = spot(1.4);
    if (!p) { dummy.position.set(999, 0, 999); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); m.setMatrixAt(i++, dummy.matrix); continue; }
    const stack = Math.random() < 0.4 ? 2 : 1;
    for (let s = 0; s < stack && i < 20; s++) {
      const sz = rnd(0.9, 1.4) - s * 0.15;
      dummy.position.set(p.x + rnd(-0.2, 0.2), sz / 2 + s * sz, p.z + rnd(-0.2, 0.2));
      dummy.rotation.set(0, Math.random() * 6.28, 0);
      dummy.scale.set(sz, sz, sz); dummy.updateMatrix(); m.setMatrixAt(i++, dummy.matrix);
    }
    addCollider(p.x, p.z, 1.0);
  }
  m.instanceMatrix.needsUpdate = true;
  worldTargets.push(m);
}

// --- ruins (a few broken walls + pillars) ---
{
  const walls = new THREE.Group(); scene.add(walls);
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  for (let r = 0; r < 4; r++) {
    const p = spot(3.5, 12, ARENA - 12); if (!p) continue;
    const rot = Math.random() * 6.28;
    const segs = 2 + ((Math.random() * 3) | 0);
    for (let s = 0; s < segs; s++) {
      const w = rnd(2.2, 4.5), h = rnd(1.2, 3.6);
      const off = (s - segs / 2) * 3.4;
      const wall = new THREE.Mesh(boxG, MAT.stone);
      wall.position.set(p.x + Math.cos(rot) * off, h / 2, p.z + Math.sin(rot) * off);
      wall.rotation.y = rot + rnd(-0.12, 0.12);
      wall.scale.set(w, h, rnd(0.5, 0.9));
      wall.castShadow = wall.receiveShadow = true;
      walls.add(wall);
      addCollider(wall.position.x, wall.position.z, Math.max(w, 1) * 0.42);
    }
    for (let c = 0; c < 2; c++) {
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1, 9), MAT.stone);
      const h = rnd(1.6, 4.2);
      pil.position.set(p.x + rnd(-5, 5), h / 2, p.z + rnd(-5, 5));
      pil.scale.set(1, h, 1); pil.rotation.z = rnd(-0.08, 0.08);
      pil.castShadow = pil.receiveShadow = true;
      walls.add(pil);
      addCollider(pil.position.x, pil.position.z, 0.7);
    }
  }
  worldTargets.push(walls);
}

// --- grass tufts (cheap detail) ---
{
  const g = new THREE.ConeGeometry(0.18, 1, 3, 1, true); g.translate(0, 0.5, 0);
  const N = 900, m = inst(g, MAT.grass, N, false);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (ARENA + 6);
    dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    dummy.rotation.set(rnd(-0.16, 0.16), Math.random() * 6.28, rnd(-0.16, 0.16));
    const s = rnd(0.5, 1.5); dummy.scale.set(s, s * rnd(0.7, 1.6), s);
    dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
  }
  m.instanceMatrix.needsUpdate = true;
}

/* ============================== particles ============================== */
const PMAX = 420;
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3);
const pVel = new Float32Array(PMAX * 3), pLife = new Float32Array(PMAX), pMax = new Float32Array(PMAX);
let pHead = 0;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
for (let i = 0; i < PMAX; i++) pPos[i * 3 + 1] = -999;
const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
  size: 0.13, vertexColors: true, transparent: true, opacity: 0.95,
  depthWrite: false, blending: THREE.AdditiveBlending
}));
points.frustumCulled = false;
scene.add(points);

const pGrav = new Float32Array(PMAX);
const pBase = new Float32Array(PMAX * 3);

function burst(pos, n, color, speed, life, grav) {
  for (let i = 0; i < n; i++) {
    const k = pHead = (pHead + 1) % PMAX, k3 = k * 3;
    pPos[k3] = pos.x; pPos[k3 + 1] = pos.y; pPos[k3 + 2] = pos.z;
    const t = Math.random() * 6.283, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u) * speed * rnd(0.3, 1);
    pVel[k3] = Math.cos(t) * s; pVel[k3 + 1] = u * speed * rnd(0.3, 1) + speed * 0.35; pVel[k3 + 2] = Math.sin(t) * s;
    pBase[k3] = color.r; pBase[k3 + 1] = color.g; pBase[k3 + 2] = color.b;
    pCol[k3] = color.r; pCol[k3 + 1] = color.g; pCol[k3 + 2] = color.b;
    pLife[k] = pMax[k] = life * rnd(0.6, 1.2);
    pGrav[k] = grav === undefined ? 9 : grav;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}

function updateParticles(dt) {
  let dirty = false;
  for (let k = 0; k < PMAX; k++) {
    if (pLife[k] <= 0) continue;
    const k3 = k * 3;
    pLife[k] -= dt;
    dirty = true;
    if (pLife[k] <= 0) {
      pPos[k3 + 1] = -999;
      pCol[k3] = pCol[k3 + 1] = pCol[k3 + 2] = 0;
      continue;
    }
    pVel[k3 + 1] -= pGrav[k] * dt;
    pPos[k3] += pVel[k3] * dt; pPos[k3 + 1] += pVel[k3 + 1] * dt; pPos[k3 + 2] += pVel[k3 + 2] * dt;
    if (pPos[k3 + 1] < 0.04) { pPos[k3 + 1] = 0.04; pVel[k3] *= 0.55; pVel[k3 + 2] *= 0.55; pVel[k3 + 1] *= -0.26; }
    const f = pLife[k] / pMax[k];
    pCol[k3] = pBase[k3] * f; pCol[k3 + 1] = pBase[k3 + 1] * f; pCol[k3 + 2] = pBase[k3 + 2] * f;
  }
  if (dirty) {
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }
}

const C_BLOOD = new THREE.Color(0x8e1f16), C_SPARK = new THREE.Color(0xffcf7a),
  C_DUST = new THREE.Color(0x8a8272), C_GOO = new THREE.Color(0x4fbf5a);

/* ============================== tracers ============================== */
const TR = 14;
const trGeo = new THREE.BufferGeometry();
const trPos = new Float32Array(TR * 6);
trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3));
const tracers = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({
  color: 0xffe0a0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending
}));
tracers.frustumCulled = false;
scene.add(tracers);
const trLife = new Float32Array(TR);
let trHead = 0;
function tracer(a, b) {
  const k = trHead = (trHead + 1) % TR, i = k * 6;
  trPos[i] = a.x; trPos[i + 1] = a.y; trPos[i + 2] = a.z;
  trPos[i + 3] = b.x; trPos[i + 4] = b.y; trPos[i + 5] = b.z;
  trLife[k] = 0.06;
  trGeo.attributes.position.needsUpdate = true;
}
function updateTracers(dt) {
  let d = false;
  for (let k = 0; k < TR; k++) {
    if (trLife[k] <= 0) continue;
    trLife[k] -= dt;
    if (trLife[k] <= 0) { const i = k * 6; for (let j = 0; j < 6; j++) trPos[i + j] = 0; d = true; }
  }
  if (d) trGeo.attributes.position.needsUpdate = true;
}

/* ============================== audio ============================== */
let AC = null;
function actx() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; }
function noiseBuf(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  return b;
}
let NB = null;
function sfx(type) {
  try {
    const ctx = actx(); if (!NB) NB = noiseBuf(ctx);
    const t = ctx.currentTime, g = ctx.createGain(); g.connect(ctx.destination);
    if (type === 'shot' || type === 'boom' || type === 'rifle') {
      const s = ctx.createBufferSource(); s.buffer = NB;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      const vol = type === 'boom' ? 0.4 : type === 'rifle' ? 0.16 : 0.22;
      f.frequency.value = type === 'boom' ? 900 : 2400;
      s.connect(f); f.connect(g);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (type === 'boom' ? 0.32 : 0.12));
      s.start(t); s.stop(t + 0.35);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(type === 'boom' ? 130 : 220, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.13);
      og.gain.setValueAtTime(0.16, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(og); og.connect(ctx.destination); o.start(t); o.stop(t + 0.15);
    } else if (type === 'hit' || type === 'die' || type === 'hurt') {
      const o = ctx.createOscillator();
      o.type = type === 'hit' ? 'square' : 'sawtooth';
      const f0 = type === 'hit' ? 780 : type === 'die' ? 300 : 200;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.28, t + (type === 'hit' ? 0.07 : 0.3));
      g.gain.setValueAtTime(type === 'hit' ? 0.07 : 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (type === 'hit' ? 0.08 : 0.34));
      o.connect(g); o.start(t); o.stop(t + 0.36);
    } else if (type === 'click' || type === 'reload') {
      const o = ctx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(type === 'click' ? 900 : 420, t);
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.connect(g); o.start(t); o.stop(t + 0.07);
    }
  } catch (e) { /* ignore */ }
}

/* ============================== player ============================== */
camera.rotation.order = 'YXZ';
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

const EYE = 1.68, RADIUS = 0.42;
const player = {
  pos: new THREE.Vector3(0, EYE, 0),
  vel: new THREE.Vector3(),
  onGround: true,
  hp: 100, maxHp: 100,
  stamina: 100, sprinting: false,
  score: 0, kills: 0,
  alive: true,
  hurtCd: 0, bob: 0
};

const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (!running) return;
  if (e.code === 'Digit1') selectWeapon(0);
  if (e.code === 'Digit2') selectWeapon(1);
  if (e.code === 'Digit3') selectWeapon(2);
  if (e.code === 'KeyR') reload();
});
addEventListener('keyup', e => { keys[e.code] = false; });

/* ============================== weapons ============================== */
const WEAPONS = [
  {
    name: 'PISTOL', dmg: 30, rof: 0.24, mag: 12, reserveMax: 108, reload: 1.05,
    spread: 0.006, pellets: 1, auto: false, recoil: 1.05, kick: 0.055, range: 90,
    falloff: 70, sound: 'shot', flash: 0.32
  },
  {
    name: 'SHOTGUN', dmg: 17, rof: 0.82, mag: 6, reserveMax: 48, reload: 1.9,
    spread: 0.062, pellets: 8, auto: false, recoil: 3.1, kick: 0.16, range: 45,
    falloff: 20, sound: 'boom', flash: 0.6
  },
  {
    name: 'RIFLE', dmg: 14, rof: 0.088, mag: 30, reserveMax: 240, reload: 1.6,
    spread: 0.017, pellets: 1, auto: true, recoil: 0.62, kick: 0.032, range: 110,
    falloff: 85, sound: 'rifle', flash: 0.26
  }
];
WEAPONS.forEach(w => { w.ammo = w.mag; w.reserve = w.reserveMax; });
let wIdx = 0, fireCd = 0, reloading = 0, mouseDown = false;

/* --- view models --- */
const weaponRoot = new THREE.Group();
camera.add(weaponRoot);
const vmLight = new THREE.PointLight(0xffbb55, 0, 9, 2);
vmLight.position.set(0.3, -0.15, -1.2);
camera.add(vmLight);

const M_METAL = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.42, metalness: 0.85 });
const M_DARK = new THREE.MeshStandardMaterial({ color: 0x1d2124, roughness: 0.6, metalness: 0.5 });
const M_GRIP = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.85 });
const M_FLASH = new THREE.MeshBasicMaterial({ color: 0xffd68a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });

function box(mat, w, h, d, x, y, z, rx) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); if (rx) m.rotation.x = rx;
  return m;
}
function buildViews() {
  const models = [];
  // pistol
  const p = new THREE.Group();
  p.add(box(M_METAL, 0.075, 0.09, 0.34, 0, 0, -0.12));
  p.add(box(M_DARK, 0.055, 0.05, 0.4, 0, 0.035, -0.16));
  p.add(box(M_GRIP, 0.07, 0.17, 0.09, 0, -0.11, 0.03, 0.22));
  p.add(box(M_DARK, 0.03, 0.05, 0.04, 0, -0.05, -0.02));
  models.push(p);
  // shotgun
  const s = new THREE.Group();
  s.add(box(M_DARK, 0.1, 0.075, 0.86, 0, 0.01, -0.34));
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.9, 8), M_METAL);
  bar.rotation.x = Math.PI / 2; bar.position.set(0, 0.055, -0.42); s.add(bar);
  s.add(box(M_GRIP, 0.09, 0.1, 0.3, 0, -0.045, 0.13));
  s.add(box(M_GRIP, 0.075, 0.16, 0.1, 0, -0.12, 0.02, 0.2));
  const pump = box(M_DARK, 0.11, 0.09, 0.18, 0, -0.03, -0.42); s.add(pump);
  s.userData.pump = pump;
  models.push(s);
  // rifle
  const r = new THREE.Group();
  r.add(box(M_DARK, 0.085, 0.1, 0.62, 0, 0, -0.22));
  const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.7, 8), M_METAL);
  rb.rotation.x = Math.PI / 2; rb.position.set(0, 0.045, -0.62); r.add(rb);
  r.add(box(M_DARK, 0.05, 0.055, 0.2, 0, 0.085, -0.2));
  r.add(box(M_GRIP, 0.07, 0.16, 0.1, 0, -0.11, 0.02, 0.18));
  r.add(box(M_DARK, 0.09, 0.14, 0.1, 0, -0.09, -0.16));
  r.add(box(M_GRIP, 0.07, 0.11, 0.24, 0, -0.01, 0.24));
  models.push(r);

  models.forEach((g, i) => {
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), M_FLASH.clone());
    flash.position.set(0, i === 0 ? 0.02 : 0.05, i === 0 ? -0.34 : i === 1 ? -0.88 : -0.98);
    g.add(flash);
    const flash2 = flash.clone(); flash2.rotation.y = Math.PI / 2; flash2.material = flash.material; g.add(flash2);
    g.userData.flash = flash.material;
    g.userData.muzzle = flash.position.clone();
    g.position.set(0.24, -0.2, -0.05);
    g.visible = i === 0;
    weaponRoot.add(g);
  });
  return models;
}
const views = buildViews();

const HUD = {
  hp: document.getElementById('hpFill'), hpT: document.getElementById('hpText'),
  st: document.getElementById('stFill'), wn: document.getElementById('weaponName'),
  am: document.getElementById('ammoMag'), ar: document.getElementById('ammoRes'),
  rl: document.getElementById('reloadHint'), sc: document.getElementById('score'),
  wv: document.getElementById('wave'), lf: document.getElementById('left'),
  slots: [...document.querySelectorAll('.slot')], flash: document.getElementById('damageFlash'),
  hm: document.getElementById('hitmarker'), feed: document.getElementById('killFeed'),
  banner: document.getElementById('waveBanner'), ch: document.getElementById('crosshair')
};

function refreshHud() {
  const w = WEAPONS[wIdx];
  HUD.wn.textContent = w.name;
  HUD.am.textContent = w.ammo;
  HUD.am.classList.toggle('empty', w.ammo === 0);
  HUD.ar.textContent = w.reserve;
  HUD.sc.textContent = player.score;
  const f = clamp(player.hp / player.maxHp, 0, 1);
  HUD.hp.style.width = (f * 100) + '%';
  HUD.hp.classList.toggle('low', f < 0.34);
  HUD.hpT.textContent = Math.max(0, Math.ceil(player.hp));
  HUD.st.style.width = player.stamina + '%';
  HUD.slots.forEach((s, i) => s.classList.toggle('active', i === wIdx));
}

function selectWeapon(i) {
  if (i === wIdx) return;
  wIdx = i; reloading = 0; fireCd = Math.max(fireCd, 0.28);
  views.forEach((v, k) => v.visible = k === i);
  weaponRoot.position.y = -0.34;
  HUD.rl.classList.add('hidden');
  sfx('reload'); refreshHud();
}

function reload() {
  const w = WEAPONS[wIdx];
  if (reloading > 0 || w.ammo >= w.mag || w.reserve <= 0) return;
  reloading = w.reload;
  HUD.rl.classList.remove('hidden');
  sfx('reload');
}

/* ============================== monsters ============================== */
const monsters = [];
const hitProxies = [];
const INVIS = new THREE.MeshBasicMaterial({ visible: false });

function makeLurker(tint) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.78, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x231a1a, roughness: 0.9, flatShading: true });
  const eye = new THREE.MeshBasicMaterial({ color: 0xffe14a });
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), skin);
  body.scale.set(1.15, 0.85, 1.5); body.position.y = 1.0; g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.5, 6), skin);
  neck.position.set(0, 1.2, -0.72); neck.rotation.x = -0.9; g.add(neck);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 6), skin);
  head.rotation.x = -Math.PI / 2; head.position.set(0, 1.32, -1.1); g.add(head);
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 5), dark);
  jaw.rotation.x = -Math.PI / 2; jaw.position.set(0, 1.18, -1.35); g.add(jaw);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), eye);
    e.position.set(0.13 * s, 1.42, -1.2); g.add(e);
  }
  const legs = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.44 * sx, 0.95, 0.55 * sz);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.55, 5), skin);
    up.position.y = -0.27; hip.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.5, 5), dark);
    lo.position.set(0, -0.75, 0.1); lo.rotation.x = -0.35; hip.add(lo);
    g.add(hip); legs.push(hip);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 5), skin);
  tail.rotation.x = 1.35; tail.position.set(0, 1.1, 0.95); g.add(tail);
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 4), dark);
    sp.position.set(0, 1.5 - i * 0.03, -0.5 + i * 0.28); g.add(sp);
  }
  return { group: g, legs, mats: [skin, dark], height: 1.5, eyeY: 1.35, headY: 1.28 };
}

function makeBrute(tint) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c211c, roughness: 0.92, flatShading: true });
  const eye = new THREE.MeshBasicMaterial({ color: 0xff4a2a });
  const torso = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), skin);
  torso.scale.set(1.05, 1.15, 0.85); torso.position.y = 1.85; g.add(torso);
  const hipM = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), skin);
  hipM.position.y = 1.0; hipM.scale.set(1.1, 0.8, 0.9); g.add(hipM);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), skin);
  head.position.set(0, 2.6, -0.16); head.scale.set(1, 0.9, 1.1); g.add(head);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), eye);
    e.position.set(0.15 * s, 2.66, -0.44); g.add(e);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 5), dark);
    horn.position.set(0.26 * s, 2.85, -0.05); horn.rotation.z = 0.5 * s; horn.rotation.x = -0.3; g.add(horn);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(0.95 * s, 2.2, 0);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.17, 0.9, 6), skin);
    up.position.y = -0.42; up.rotation.z = 0.2 * s; sh.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.85, 6), skin);
    lo.position.set(0.12 * s, -1.2, -0.1); sh.add(lo);
    const fist = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), dark);
    fist.position.set(0.14 * s, -1.66, -0.12); sh.add(fist);
    g.add(sh); arms.push(sh);
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.36 * s, 1.02, 0);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.62, 6), skin);
    up.position.y = -0.31; hip.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.55, 6), dark);
    lo.position.set(0, -0.85, 0.05); hip.add(lo);
    g.add(hip); legs.push(hip);
  }
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 4), dark);
    sp.position.set(rnd(-0.35, 0.35), 2.5 - i * 0.34, 0.62);
    sp.rotation.x = 1.1; g.add(sp);
  }
  return { group: g, legs, arms, mats: [skin, dark], height: 2.7, eyeY: 2.6, headY: 2.45 };
}

function spawnMonster(kind, wave) {
  // spawn on ring away from player
  let x = 0, z = 0;
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * 6.283, r = rnd(ARENA * 0.55, ARENA - 5);
    x = Math.cos(a) * r; z = Math.sin(a) * r;
    if (Math.hypot(x - player.pos.x, z - player.pos.z) > 22 && free(x, z, 1.4)) break;
  }
  const elite = wave >= 4 && Math.random() < clamp(0.08 + wave * 0.03, 0, 0.4);
  let m;
  if (kind === 'brute') {
    m = makeBrute(elite ? 0x6d2f3a : pick([0x5a4638, 0x4d4235, 0x63503c]));
    Object.assign(m, {
      hp: 190 + wave * 26, speed: rnd(2.2, 2.7), dmg: 26, atkCd: 1.5, range: 3.0,
      score: 130, radius: 1.0, kind: 'brute', boxW: 2.2, boxD: 1.8
    });
  } else {
    m = makeLurker(elite ? 0x7a2f2f : pick([0x4b5f3c, 0x5c5340, 0x3f5449]));
    Object.assign(m, {
      hp: 78 + wave * 12, speed: rnd(4.2, 5.4), dmg: 13, atkCd: 0.95, range: 2.3,
      score: 60, radius: 0.7, kind: 'lurker', boxW: 1.5, boxD: 2.7, boxH: 1.75
    });
  }
  if (elite) { m.hp *= 1.6; m.dmg *= 1.4; m.speed *= 1.12; m.score *= 2; m.group.scale.multiplyScalar(1.22); }
  m.maxHp = m.hp;
  m.group.position.set(x, 0, z);
  m.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(m.group);

  const bh = m.boxH || m.height;
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(m.boxW, bh, m.boxD), INVIS);
  proxy.position.y = bh / 2;
  proxy.userData.m = m;
  m.group.add(proxy);
  m.proxy = proxy;
  hitProxies.push(proxy);

  m.pos = m.group.position;
  m.cd = rnd(0.2, 0.8);
  m.dying = 0; m.flash = 0; m.phase = Math.random() * 6.28;
  m.push = new THREE.Vector3();
  monsters.push(m);
  return m;
}

/* ============================== waves ============================== */
const game = { wave: 0, pending: 0, spawnT: 0, breakT: 2.0, over: false };

function banner(txt) {
  HUD.banner.textContent = txt;
  HUD.banner.classList.remove('hidden');
  HUD.banner.style.animation = 'none';
  void HUD.banner.offsetWidth;
  HUD.banner.style.animation = 'wavePop 2.4s ease-out forwards';
}
function feed(txt) {
  const d = document.createElement('div');
  d.textContent = txt;
  HUD.feed.appendChild(d);
  setTimeout(() => d.remove(), 2600);
}
function nextWave() {
  game.wave++;
  game.pending = 3 + Math.ceil(game.wave * 1.7);
  game.spawnT = 0;
  HUD.wv.textContent = game.wave;
  banner('WAVE ' + game.wave);
  if (game.wave > 1) player.hp = Math.min(player.maxHp, player.hp + 18);
  // refill some reserve ammo each wave
  WEAPONS.forEach(w => { w.reserve = Math.min(w.reserveMax, w.reserve + Math.ceil(w.mag * 2.5)); });
  refreshHud();
}

/* ============================== shooting ============================== */
const ray = new THREE.Raycaster();
ray.far = 120;
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), camDir = new THREE.Vector3();
let recoilPitch = 0, recoilYaw = 0, kickZ = 0, shakeT = 0;

function hitmark(kill) {
  HUD.hm.classList.toggle('kill', !!kill);
  HUD.hm.classList.add('on');
  setTimeout(() => HUD.hm.classList.remove('on'), 90);
}

function fire() {
  const w = WEAPONS[wIdx];
  if (reloading > 0 || fireCd > 0) return;
  if (w.ammo <= 0) { sfx('click'); fireCd = 0.28; reload(); return; }
  w.ammo--; fireCd = w.rof;
  sfx(w.sound);

  const view = views[wIdx];
  view.userData.flash.opacity = 1;
  vmLight.intensity = w.flash * 26;
  recoilPitch += w.recoil * 0.014 * rnd(0.8, 1.25);
  recoilYaw += w.recoil * 0.006 * rnd(-1, 1);
  kickZ += w.kick;
  shakeT = Math.max(shakeT, w.recoil * 0.05);
  HUD.ch.classList.add('wide');
  setTimeout(() => HUD.ch.classList.remove('wide'), 110);

  camera.getWorldDirection(camDir);
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const muzzlePos = origin.clone().addScaledVector(camDir, 0.85)
    .addScaledVector(tmpV2.set(1, 0, 0).applyQuaternion(camera.quaternion), 0.14);
  muzzlePos.y -= 0.1;

  const targets = hitProxies.concat(worldTargets);

  for (let p = 0; p < w.pellets; p++) {
    const dir = camDir.clone();
    dir.x += rnd(-w.spread, w.spread);
    dir.y += rnd(-w.spread, w.spread);
    dir.z += rnd(-w.spread, w.spread);
    dir.normalize();
    ray.set(origin, dir);
    ray.far = w.range;
    const hits = ray.intersectObjects(targets, true);
    let end = origin.clone().addScaledVector(dir, w.range);
    if (hits.length) {
      const h = hits[0];
      end = h.point.clone();
      const m = h.object.userData.m;
      if (m && m.dying <= 0) {
        const dist = h.distance;
        let dmg = w.dmg * clamp(1 - Math.max(0, dist - w.falloff * 0.35) / w.falloff, 0.34, 1);
        const head = h.point.y > m.group.position.y + m.headY * m.group.scale.y * 0.98;
        if (head) dmg *= 2.0;
        damageMonster(m, dmg, dir, head);
        burst(h.point, head ? 12 : 7, C_BLOOD, 4.2, 0.5, 11);
        if (Math.random() < 0.4) burst(h.point, 3, C_GOO, 3, 0.4, 10);
      } else {
        burst(h.point, 5, Math.random() < 0.5 ? C_SPARK : C_DUST, 3.4, 0.34, 12);
      }
    }
    if (p % 2 === 0) tracer(muzzlePos, end);
  }
  refreshHud();
  if (w.ammo === 0) reload();
}

function damageMonster(m, dmg, dir, head) {
  m.hp -= dmg;
  m.flash = 0.12;
  m.push.addScaledVector(dir, (head ? 2.6 : 1.7) * (m.kind === 'brute' ? 0.35 : 1));
  sfx('hit');
  if (m.hp <= 0) {
    m.dying = 1.1;
    m.proxy.userData.m = null;
    const i = hitProxies.indexOf(m.proxy);
    if (i >= 0) hitProxies.splice(i, 1);
    player.score += m.score;
    player.kills++;
    burst(m.group.position.clone().setY(m.height * 0.6), 26, C_BLOOD, 5.5, 0.8, 12);
    sfx('die');
    feed((head ? 'HEADSHOT · ' : '') + (m.kind === 'brute' ? 'BRUTE' : 'LURKER') + ' +' + m.score);
    hitmark(true);
  } else hitmark(false);
  refreshHud();
}

function hurtPlayer(dmg) {
  if (!player.alive) return;
  player.hp -= dmg;
  HUD.flash.classList.add('on');
  setTimeout(() => HUD.flash.classList.remove('on'), 60);
  shakeT = Math.max(shakeT, 0.22);
  sfx('hurt');
  if (player.hp <= 0) { player.hp = 0; gameOver(); }
  refreshHud();
}

renderer.domElement.addEventListener('mousedown', e => {
  if (e.button === 0) { mouseDown = true; if (running) fire(); }
});
addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });

/* ============================== movement ============================== */
const fwd = new THREE.Vector3(), side = new THREE.Vector3();
function updatePlayer(dt) {
  const obj = controls.getObject();
  const wantSprint = (keys.ShiftLeft || keys.ShiftRight) && player.stamina > 1;
  const moveF = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const moveS = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const moving = moveF !== 0 || moveS !== 0;
  player.sprinting = wantSprint && moving && moveF > 0;
  player.stamina = clamp(player.stamina + (player.sprinting ? -24 : 17) * dt, 0, 100);

  const speed = player.sprinting ? 9.4 : 5.2;
  camera.getWorldDirection(fwd);
  fwd.y = 0; fwd.normalize();
  side.set(fwd.z, 0, -fwd.x);
  const wish = tmpV.set(0, 0, 0).addScaledVector(fwd, moveF).addScaledVector(side, -moveS);
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

  const accel = player.onGround ? 13 : 4;
  player.vel.x += (wish.x - player.vel.x) * Math.min(1, accel * dt);
  player.vel.z += (wish.z - player.vel.z) * Math.min(1, accel * dt);

  if (keys.Space && player.onGround) { player.vel.y = 6.3; player.onGround = false; }
  player.vel.y -= 19 * dt;

  player.pos.x += player.vel.x * dt;
  player.pos.z += player.vel.z * dt;
  player.pos.y += player.vel.y * dt;

  if (player.pos.y <= EYE) { player.pos.y = EYE; player.vel.y = 0; player.onGround = true; }

  // arena bound
  const d = Math.hypot(player.pos.x, player.pos.z);
  if (d > ARENA - 1.5) {
    const k = (ARENA - 1.5) / d;
    player.pos.x *= k; player.pos.z *= k;
  }
  // obstacles
  for (const c of colliders) {
    const dx = player.pos.x - c.x, dz = player.pos.z - c.z;
    const dd = Math.hypot(dx, dz), min = c.r + RADIUS;
    if (dd < min && dd > 0.0001) {
      const k = (min - dd) / dd;
      player.pos.x += dx * k; player.pos.z += dz * k;
    }
  }

  // head bob
  const sp = Math.hypot(player.vel.x, player.vel.z);
  player.bob += dt * sp * (player.sprinting ? 1.5 : 1.15);
  const bobY = player.onGround ? Math.sin(player.bob * 2.1) * 0.035 * clamp(sp / 6, 0, 1.3) : 0;
  const bobX = player.onGround ? Math.cos(player.bob * 1.05) * 0.028 * clamp(sp / 6, 0, 1.3) : 0;

  let shx = 0, shy = 0;
  if (shakeT > 0) {
    shakeT = Math.max(0, shakeT - dt * 1.7);
    shx = rnd(-1, 1) * shakeT * 0.13; shy = rnd(-1, 1) * shakeT * 0.13;
  }
  obj.position.set(player.pos.x + bobX + shx, player.pos.y + bobY + shy, player.pos.z);

  // recoil recovery applied to camera pitch/yaw
  if (recoilPitch !== 0 || recoilYaw !== 0) {
    camera.rotation.x += recoilPitch;
    obj.rotation.y += recoilYaw;
    const rp = recoilPitch, ry = recoilYaw;
    recoilPitch = 0; recoilYaw = 0;
    recoilBack.x += rp; recoilBack.y += ry;
  }
  if (recoilBack.lengthSq() > 1e-7) {
    const dec = Math.min(1, dt * 7);
    const dx = recoilBack.x * dec, dy = recoilBack.y * dec;
    camera.rotation.x -= dx; obj.rotation.y -= dy;
    recoilBack.x -= dx; recoilBack.y -= dy;
  }
  camera.rotation.x = clamp(camera.rotation.x, -1.45, 1.45);

  // weapon sway / bob / kick
  kickZ *= 1 - Math.min(1, dt * 9);
  const swayX = clamp(-player.vel.x * 0.004 + Math.cos(player.bob * 1.05) * 0.012 * clamp(sp / 6, 0, 1), -0.05, 0.05);
  const swayY = Math.sin(player.bob * 2.1) * 0.012 * clamp(sp / 6, 0, 1);
  weaponRoot.position.x += (0.0 + swayX - weaponRoot.position.x) * Math.min(1, dt * 9);
  weaponRoot.position.y += (0.0 + swayY - weaponRoot.position.y) * Math.min(1, dt * 9);
  weaponRoot.position.z += (kickZ - weaponRoot.position.z) * Math.min(1, dt * 14);
  weaponRoot.rotation.x += (-kickZ * 1.6 - weaponRoot.rotation.x) * Math.min(1, dt * 12);

  const view = views[wIdx];
  if (view.userData.flash.opacity > 0)
    view.userData.flash.opacity = Math.max(0, view.userData.flash.opacity - dt * 14);
  vmLight.intensity = Math.max(0, vmLight.intensity - dt * 180);
  if (views[1].userData.pump) views[1].userData.pump.position.z = -0.42 + kickZ * 1.2;

  if (reloading > 0) {
    reloading -= dt;
    weaponRoot.rotation.z = Math.sin((WEAPONS[wIdx].reload - reloading) * 7) * 0.22;
    weaponRoot.position.y -= 0.1;
    if (reloading <= 0) {
      const w = WEAPONS[wIdx];
      const need = w.mag - w.ammo, take = Math.min(need, w.reserve);
      w.ammo += take; w.reserve -= take;
      HUD.rl.classList.add('hidden');
      weaponRoot.rotation.z = 0;
      sfx('click'); refreshHud();
    }
  } else weaponRoot.rotation.z += (0 - weaponRoot.rotation.z) * Math.min(1, dt * 8);

  if (fireCd > 0) fireCd -= dt;
  if (mouseDown && WEAPONS[wIdx].auto && running) fire();
}
const recoilBack = new THREE.Vector2();

/* ============================== monster ai ============================== */
const mDir = new THREE.Vector3();
function updateMonsters(dt) {
  HUD.lf.textContent = monsters.filter(m => m.dying <= 0).length + game.pending;
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];

    if (m.flash > 0) {
      m.flash -= dt;
      const on = m.flash > 0;
      m.mats[0].emissive.setHex(on ? 0xff4422 : 0x000000);
      m.mats[0].emissiveIntensity = on ? 1.4 : 0;
    }

    if (m.dying > 0) {
      m.dying -= dt;
      m.group.rotation.z = clamp(m.group.rotation.z + dt * 3.4, 0, 1.6);
      m.group.position.y = Math.max(-1.2, m.group.position.y - dt * 0.7);
      if (m.dying <= 0) {
        scene.remove(m.group);
        m.group.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
        m.mats.forEach(x => x.dispose());
        monsters.splice(i, 1);
      }
      continue;
    }

    const dx = player.pos.x - m.pos.x, dz = player.pos.z - m.pos.z;
    const dist = Math.hypot(dx, dz);
    mDir.set(dx / (dist || 1), 0, dz / (dist || 1));

    // obstacle avoidance
    for (const c of colliders) {
      const ox = m.pos.x - c.x, oz = m.pos.z - c.z;
      const od = Math.hypot(ox, oz), lim = c.r + m.radius + 1.1;
      if (od < lim && od > 0.001) {
        const s = (lim - od) / lim;
        mDir.x += (ox / od) * s * 1.9;
        mDir.z += (oz / od) * s * 1.9;
      }
    }
    // separation
    for (const o of monsters) {
      if (o === m || o.dying > 0) continue;
      const ox = m.pos.x - o.pos.x, oz = m.pos.z - o.pos.z;
      const od = Math.hypot(ox, oz), lim = m.radius + o.radius + 0.4;
      if (od < lim && od > 0.001) {
        mDir.x += (ox / od) * 0.9; mDir.z += (oz / od) * 0.9;
      }
    }
    mDir.y = 0;
    if (mDir.lengthSq() > 0) mDir.normalize();

    m.cd -= dt;
    const attacking = dist < m.range;
    const spd = attacking ? m.speed * 0.15 : m.speed;
    m.pos.x += mDir.x * spd * dt + m.push.x * dt;
    m.pos.z += mDir.z * spd * dt + m.push.z * dt;
    m.push.multiplyScalar(1 - Math.min(1, dt * 6));

    // keep inside arena
    const rr = Math.hypot(m.pos.x, m.pos.z);
    if (rr > ARENA - 1) { const k = (ARENA - 1) / rr; m.pos.x *= k; m.pos.z *= k; }

    m.group.rotation.y = Math.atan2(dx, dz) + Math.PI;

    // gait
    m.phase += dt * (attacking ? 7 : spd * 2.4);
    const amp = attacking ? 0.35 : clamp(spd * 0.1, 0.15, 0.55);
    m.legs.forEach((l, k) => { l.rotation.x = Math.sin(m.phase + k * 1.6) * amp; });
    if (m.arms) m.arms.forEach((a, k) => {
      a.rotation.x = attacking ? -0.6 + Math.sin(m.phase * 1.5 + k * 3.1) * 0.9 : Math.sin(m.phase + k * 3.14) * 0.34;
    });
    m.group.position.y = Math.abs(Math.sin(m.phase)) * 0.07 * (m.kind === 'lurker' ? 1.4 : 0.7);

    if (attacking && m.cd <= 0) {
      m.cd = m.atkCd;
      if (dist < m.range + 0.5) hurtPlayer(m.dmg);
      burst(new THREE.Vector3(m.pos.x + mDir.x * 0.8, 1.2, m.pos.z + mDir.z * 0.8), 5, C_GOO, 2.6, 0.3, 10);
    }
  }

  // spawning
  if (game.pending > 0) {
    game.spawnT -= dt;
    if (game.spawnT <= 0) {
      game.spawnT = Math.max(0.35, 1.5 - game.wave * 0.09);
      const bruteChance = clamp(0.08 + game.wave * 0.055, 0, 0.45);
      spawnMonster(Math.random() < bruteChance ? 'brute' : 'lurker', game.wave);
      game.pending--;
    }
  } else if (monsters.every(m => m.dying > 0)) {
    game.breakT -= dt;
    if (game.breakT <= 0) { game.breakT = 4.2; nextWave(); }
  }
}

/* ============================== flow ============================== */
let running = false;
const elStart = document.getElementById('start'),
  elPause = document.getElementById('pause'),
  elOver = document.getElementById('over');

function startGame() {
  resetGame();
  elStart.classList.add('hidden');
  elOver.classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  HUD.ch.classList.remove('hidden');
  controls.lock();
}
function resetGame() {
  monsters.forEach(m => scene.remove(m.group));
  monsters.length = 0; hitProxies.length = 0;
  player.pos.set(0, EYE, 0); player.vel.set(0, 0, 0);
  player.hp = player.maxHp; player.stamina = 100;
  player.score = 0; player.kills = 0; player.alive = true;
  controls.getObject().rotation.y = 0; camera.rotation.set(0, 0, 0);
  WEAPONS.forEach(w => { w.ammo = w.mag; w.reserve = w.reserveMax; });
  wIdx = 0; views.forEach((v, k) => v.visible = k === 0);
  reloading = 0; fireCd = 0; mouseDown = false;
  HUD.rl.classList.add('hidden');
  game.wave = 0; game.pending = 0; game.breakT = 1.4; game.over = false;
  for (let k = 0; k < PMAX; k++) { pLife[k] = 0; pPos[k * 3 + 1] = -999; }
  pGeo.attributes.position.needsUpdate = true;
  nextWave();
  refreshHud();
}
function gameOver() {
  player.alive = false; game.over = true; running = false;
  document.getElementById('finalScore').textContent = player.score;
  document.getElementById('finalWave').textContent = game.wave;
  document.getElementById('finalKills').textContent = player.kills;
  controls.unlock();
  setTimeout(() => {
    elPause.classList.add('hidden');
    elOver.classList.remove('hidden');
    HUD.ch.classList.add('hidden');
  }, 240);
}

controls.addEventListener('lock', () => {
  running = true;
  elPause.classList.add('hidden');
  HUD.ch.classList.remove('hidden');
});
controls.addEventListener('unlock', () => {
  running = false;
  mouseDown = false;
  if (!game.over && elStart.classList.contains('hidden')) elPause.classList.remove('hidden');
  HUD.ch.classList.add('hidden');
});

document.getElementById('playBtn').addEventListener('click', () => {
  try { actx(); } catch (e) { /* audio optional */ }
  startGame();
});
document.getElementById('restartBtn').addEventListener('click', () => { startGame(); });
document.getElementById('resumeBtn').addEventListener('click', () => controls.lock());
elPause.addEventListener('click', () => controls.lock());

/* ============================== loop ============================== */
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (running) {
    updatePlayer(dt);
    updateMonsters(dt);
  }
  updateParticles(dt);
  updateTracers(dt);
  sun.position.set(player.pos.x + 38, 46, player.pos.z + 22);
  sun.target.position.set(player.pos.x, 0, player.pos.z);
  sun.target.updateMatrixWorld();
  renderer.render(scene, camera);
}
scene.add(sun.target);
refreshHud();
tick();
window.__gameReady = true;
