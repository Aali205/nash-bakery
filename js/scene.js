// NASH — procedural 3D espresso scene (Three.js)
// A porcelain demitasse with the NASH wordmark, a living crema shader,
// rising steam and a cloud of roasted coffee beans. Everything is generated
// in code — no model files.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const NOISE = /* glsl */ `
  float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const CREMA_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  ${NOISE}
  void main(){
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = atan(p.y, p.x);
    float sw = a + r * 3.2 + uTime * 0.12;
    vec2 q = vec2(cos(sw), sin(sw)) * r;
    float n = fbm(q * 3.0 + uTime * 0.04);
    float tiger = fbm(vec2(a * 2.5, r * 9.0) + n * 2.2);

    vec3 dark  = vec3(0.24, 0.13, 0.06);
    vec3 mid   = vec3(0.60, 0.37, 0.17);
    vec3 light = vec3(0.87, 0.67, 0.43);

    vec3 col = mix(mid, light, smoothstep(0.35, 0.78, n));
    col = mix(col, dark, smoothstep(0.55, 1.0, r) * 0.85);
    col = mix(col, dark * 1.3, smoothstep(0.55, 0.8, tiger) * 0.35);
    float bubble = step(0.986, hash(floor(vUv * 190.0)));
    col += bubble * 0.07 * (1.0 - r);
    col += smoothstep(0.22, 0.0, length(p - vec2(-0.14, 0.17))) * 0.14;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const STEAM_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  varying vec2 vUv;
  ${NOISE}
  void main(){
    vec2 uv = vUv;
    float x = uv.x - 0.5;
    x += sin(uv.y * 5.0 - uTime * 1.1 + uSeed) * 0.09 * uv.y;
    float n = fbm(vec2(x * 3.0 + uSeed, uv.y * 2.4 - uTime * 0.32));
    float column = smoothstep(0.34, 0.0, abs(x));
    float a = column * smoothstep(0.38, 0.78, n);
    a *= smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.4, uv.y);
    gl_FragColor = vec4(vec3(1.0, 0.98, 0.94), a * 0.6 * uOpacity);
  }
`;

const CREAM = new THREE.Color('#f2ebda');
const OLIVE = new THREE.Color('#80875c');
const INK = new THREE.Color('#1a1a16');

function curve(points, n) {
  return new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(n);
}

function buildCup() {
  const outer = curve([[0, 0], [0.25, 0.0], [0.29, 0.025], [0.3, 0.08], [0.4, 0.18], [0.5, 0.36], [0.55, 0.62], [0.572, 0.9], [0.58, 0.965]], 70);
  const rim = curve([[0.58, 0.965], [0.572, 0.99], [0.553, 0.99], [0.545, 0.965]], 10);
  const inner = curve([[0.545, 0.965], [0.535, 0.9], [0.51, 0.62], [0.45, 0.36], [0.34, 0.21], [0.18, 0.15], [0, 0.14]], 50);
  const profile = [...outer, ...rim.slice(1), ...inner.slice(1)];
  const segments = 96;
  const geo = new THREE.LatheGeometry(profile, segments);

  // Vertex colours: cream porcelain with an olive band + ink foot line
  const colors = [];
  for (let i = 0; i <= segments; i++) {
    profile.forEach((p, j) => {
      let c = CREAM;
      if (j < outer.length && p.y > 0.86 && p.y < 0.9) c = OLIVE;
      if (j < outer.length && p.y < 0.03) c = INK;
      colors.push(c.r, c.g, c.b);
    });
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.2,
  });
  const cup = new THREE.Mesh(geo, mat);

  // Handle — a partial torus, centred on +x
  const arc = Math.PI * 1.3;
  const handleGeo = new THREE.TorusGeometry(0.19, 0.045, 20, 60, arc);
  const handle = new THREE.Mesh(handleGeo, new THREE.MeshPhysicalMaterial({ color: CREAM, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 }));
  handle.rotation.z = -arc / 2;
  handle.scale.set(1, 1.15, 1.3);
  handle.position.set(0.6, 0.58, 0);

  // Decal band for the wordmark — a thin shell hugging the outer wall
  const decalPts = outer.filter((p) => p.y > 0.44 && p.y < 0.8).map((p) => new THREE.Vector2(p.x * 1.006, p.y));
  const decalGeo = new THREE.LatheGeometry(decalPts, segments, -Math.PI, Math.PI * 2);
  const decalMat = new THREE.MeshPhysicalMaterial({ transparent: true, roughness: 0.3, clearcoat: 1, depthWrite: false, opacity: 1 });
  const decal = new THREE.Mesh(decalGeo, decalMat);
  decal.visible = false;

  const img = new Image();
  img.src = 'assets/img/nash-ink.png';
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 256;
    const ctx = c.getContext('2d');
    const w = 330, h = w * (img.height / img.width);
    // front of the cup sits at u = 0.5
    ctx.drawImage(img, 1024 - w / 2, 128 - h / 2, w, h);
    ctx.font = '600 20px "Space Mono", monospace';
    ctx.fillStyle = '#1a1a16';
    ctx.textAlign = 'center';
    ctx.fillText('EST. 2018', 1024, 128 - h / 2 - 16);
    ctx.fillText('ARTISANAL BAKERY', 1024, 128 + h / 2 + 30);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    decalMat.map = tex;
    decalMat.needsUpdate = true;
    decal.visible = true;
  };

  // Crema surface
  const crema = new THREE.Mesh(
    new THREE.CircleGeometry(0.527, 96),
    new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: VERT, fragmentShader: CREMA_FRAG })
  );
  crema.rotation.x = -Math.PI / 2;
  crema.position.y = 0.84;

  const g = new THREE.Group();
  g.add(cup, handle, decal, crema);
  return { group: g, crema };
}

function buildSaucer() {
  const profile = curve([[0, 0], [0.45, 0], [0.52, 0.015], [0.6, 0.035], [0.85, 0.08], [1.0, 0.13], [1.03, 0.125], [1.0, 0.1], [0.86, 0.068], [0.6, 0.05], [0.36, 0.045], [0, 0.045]], 90);
  const segments = 110;
  const geo = new THREE.LatheGeometry(profile, segments);
  const colors = [];
  for (let i = 0; i <= segments; i++) {
    profile.forEach((p) => {
      const c = p.x > 0.965 ? OLIVE : p.x < 0.46 && p.y < 0.01 ? INK : CREAM;
      colors.push(c.r, c.g, c.b);
    });
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }));
}

function buildShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(30,28,18,0.55)');
  grd.addColorStop(0.5, 'rgba(30,28,18,0.25)');
  grd.addColorStop(1, 'rgba(30,28,18,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.005;
  return m;
}

function buildSteam() {
  const g = new THREE.Group();
  const mats = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSeed: { value: i * 3.7 }, uOpacity: { value: 1 } },
      vertexShader: VERT, fragmentShader: STEAM_FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.9), mat);
    m.position.set((i - 1) * 0.14, 1.95, (i - 1) * 0.05);
    g.add(m);
    mats.push(mat);
  }
  return { group: g, mats };
}

function beanGeometry() {
  const geo = new THREE.SphereGeometry(1, 40, 30);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.x *= 0.72; v.z *= 0.55;
    if (v.z > 0) {
      v.z *= 0.62;
      const s = v.x - 0.12 * Math.sin(v.y * 3.0);
      v.z -= 0.2 * Math.exp(-(s * s) / 0.005) * (1 - v.y * v.y);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildBeans(count) {
  const mesh = new THREE.InstancedMesh(
    beanGeometry(),
    new THREE.MeshPhysicalMaterial({ color: '#3a2216', roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color('#8a5a3a') }),
    count
  );
  const data = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < count; i++) {
    let p;
    do {
      p = new THREE.Vector3(rand(-4.2, 4.2), rand(-1.6, 3.2), rand(-3, 1.6));
    } while (Math.hypot(p.x, (p.y - 0.6) * 0.9, p.z) < 1.45);
    data.push({
      base: p,
      rot: new THREE.Euler(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)),
      spin: new THREE.Vector3(rand(-0.6, 0.6), rand(-0.6, 0.6), rand(-0.4, 0.4)),
      phase: rand(0, 6.28),
      scale: rand(0.085, 0.14),
    });
  }
  return { mesh, data };
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const lookAt = new THREE.Vector3(0, 0.55, 0);

  const key = new THREE.DirectionalLight('#fff1dc', 2.2);
  key.position.set(-3, 5, 4);
  const rim = new THREE.DirectionalLight('#dfe6b8', 1.4);
  rim.position.set(4, 2, -3);
  scene.add(key, rim, new THREE.AmbientLight('#ffffff', 0.25));

  // Cup rig
  const rig = new THREE.Group();
  const spinner = new THREE.Group();
  const { group: cupGroup, crema } = buildCup();
  cupGroup.position.y = 0.045;
  const saucer = buildSaucer();
  const shadow = buildShadow();
  const steam = buildSteam();
  spinner.add(cupGroup, saucer);
  rig.add(shadow, spinner, steam.group);
  scene.add(rig);

  // Beans
  const beans = buildBeans(window.innerWidth < 760 ? 34 : 64);
  scene.add(beans.mesh);

  // Animated state — driven by GSAP from main.js
  const state = {
    x: 0, y: -0.2, z: 0,
    rotY: 0.5, rotX: 0, rotZ: 0,
    scale: 1,
    spread: 0,
    beanY: 0,
    camY: 2.0,
    camZ: 6.4,
    steam: 1,
    intro: 0,
  };

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let mobile = false;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    mobile = w < 760;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  const dummy = new THREE.Object3D();
  let running = true;

  function frame() {
    if (!running) return;
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    // Camera: pulled back on portrait screens so the cup always fits
    const fit = mobile ? 1.55 : Math.max(1, 1.25 / camera.aspect + 0.35);
    camera.position.set(mouse.x * 0.35, state.camY - mouse.y * 0.2, state.camZ * fit);
    camera.lookAt(lookAt);

    rig.position.set(state.x, state.y + Math.sin(t * 0.8) * 0.03, state.z);
    rig.scale.setScalar(state.scale * (mobile ? 0.9 : 1));
    rig.rotation.x = state.rotX + mouse.y * 0.06;
    rig.rotation.z = state.rotZ;
    spinner.rotation.y = state.rotY + mouse.x * 0.25 + Math.sin(t * 0.4) * 0.05;

    crema.material.uniforms.uTime.value = t;
    steam.group.children.forEach((m, i) => {
      m.lookAt(camera.position.x, m.getWorldPosition(dummy.position).y, camera.position.z);
      steam.mats[i].uniforms.uTime.value = t;
      steam.mats[i].uniforms.uOpacity.value = state.steam;
    });

    beans.data.forEach((b, i) => {
      const s = state.spread;
      dummy.position.set(
        b.base.x * s + mouse.x * 0.3 * (b.base.z + 3) * 0.3,
        b.base.y * s + Math.sin(t * 0.7 + b.phase) * 0.12 + state.beanY + 0.6 * (1 - s),
        b.base.z * s
      );
      dummy.rotation.set(b.rot.x + t * b.spin.x, b.rot.y + t * b.spin.y, b.rot.z + t * b.spin.z);
      dummy.scale.setScalar(b.scale * Math.min(1, s * 1.4));
      dummy.updateMatrix();
      beans.mesh.setMatrixAt(i, dummy.matrix);
    });
    beans.mesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    state,
    pause() { running = false; },
    play() { if (!running) { running = true; requestAnimationFrame(frame); } },
    get running() { return running; },
  };
}
