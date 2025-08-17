import * as THREE from 'three';
import { on } from '../../../lib/bus.js';
import { MSG } from '../../../lib/schema.js';
import { sampleOrbit, keplerToECI } from '../../../lib/orbit.js';

// ---------- set scene ----------
const scene = new THREE.Scene(); //sets up scene 
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.001, 1e12); //defines new perspective camera
const renderer = new THREE.WebGLRenderer(); //sets up renderer (common for THREE.js)
renderer.setSize(window.innerWidth, window.innerHeight); //sets size to browser window
renderer.setPixelRatio(window.devicePixelRatio); //sets pixel ration based on device
document.body.appendChild(renderer.domElement);
camera.position.z = 0.3;

//resize window handler
addEventListener('resize', () => {
  console.log('resize')
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}); 

// ---------- constant values ----------
const EARTH_RADIUS_KM = 6371; // in km
const SCALE_FACTOR = 1000; //How many scene units equal 1 AU?
const earthRadiusAU = EARTH_RADIUS_KM / 149600000; // 6371 km to AU
const scaledEarthRadius = earthRadiusAU * SCALE_FACTOR; // in scene units
const KM_TO_UNITS = scaledEarthRadius / EARTH_RADIUS_KM; //gives units per km 
window.KM_TO_UNITS = KM_TO_UNITS; //stored globally so other things can reference it

//---------render earth and light----------------
const loader = new THREE.TextureLoader();
const earthGeom = new THREE.IcosahedronGeometry(scaledEarthRadius, 12);
const earthMat  = new THREE.MeshPhongMaterial({ map: loader.load("../../../../assets/BM.jpeg") });
const earthMesh = new THREE.Mesh(earthGeom, earthMat);
scene.add(earthMesh);
//-----------light------------
const light = new THREE.HemisphereLight(/*light from sky*/0xffffbb, /*light from ground */0xffffbb, /*intensity 0-2*/1);
scene.add(light);

//---------------racaster setup--------------
const raycaster = new THREE.Raycaster(); //raycaster shoots a invisible ray from camera to scene (read about raycasting in Three.js)
raycaster.params.Points.threshold = 1; //tolerance for mouse pointer
const mouse = new THREE.Vector2(); //establishes variable for mouse coordinates

//------raycaster to html setup
const tip = document.createElement('div'); //the following code inserts this snippit into the html code
tip.style.cssText = `
  position:fixed; z-index:10; pointer-events:none;
  background:rgba(0,0,0,.85); color:#fff; font:12px/1.2 system-ui,Arial;
  padding:6px 8px; border-radius:4px; border:1px solid #333; display:none;
`;
document.body.appendChild(tip);

//-------set up triggers for mouse moves
renderer.domElement.addEventListener('mousemove', (ev) => { //everytime mouse moves function run
  if (!starsPointsMesh) return; //don't run if nothing moves
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera); //shoots ray from mouse to point on screen
  let hits = raycaster.intersectObject(starsPointsMesh, true); // checks if it hits starsPointsMesh / hits contain points
  
  if (hits.length === 0) //look for near points (5) is tolerance
    hits = cpuPickNearest(starsPointsMesh, ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height, camera, 5);
  
  if (hits.length === 0) { //hide tooltip and stop if no hit
    tip.style.display = 'none'; 
    return; 
  }

  const i = hits[0].index; //
  const g = starsPointsMesh.geometry;
  const idx = (g.getAttribute('idx')?.getX(i) ?? i) | 0;
  const ra  = g.getAttribute('ra')?.getX(i)?.toFixed(4) ?? '—';
  const dec = g.getAttribute('dec')?.getX(i)?.toFixed(4) ?? '—';
  const mag = g.getAttribute('mag')?.getX(i)?.toFixed(2) ?? '—';

  tip.textContent = `#${idx} | RA ${ra} | Dec ${dec} | Vmag ${mag}`;
  tip.style.left = `${ev.clientX + 12}px`;
  tip.style.top  = `${ev.clientY + 12}px`;
  tip.style.display = 'block';

  if (++_dbgCount % 300 === 0) console.log('hover hit idx', idx);
});
renderer.domElement.addEventListener('mouseleave', () => tip.style.display = 'none');

// ---------- stars ----------
let starsPointsMesh = null;
let orbitLine = null;
let satMarker = null;
let camArrow;
let _dbgCount = 0;

// ------------- camera normal from satelite----------
function aimCameraAlongRhat(k) {
    const { r_eci_km } = keplerToECI(k);
    const m = Math.hypot(...r_eci_km) || 1;
    const r_hat = [r_eci_km[0]/m, r_eci_km[1]/m, r_eci_km[2]/m];
    if (!r_eci_km?.every(Number.isFinite) || !r_hat?.every(Number.isFinite)) return;

    const K   = Number.isFinite(window.KM_TO_UNITS) ? window.KM_TO_UNITS : 1;
    const sat = new THREE.Vector3(r_eci_km[0]*K, r_eci_km[1]*K, r_eci_km[2]*K);
    const rDir = new THREE.Vector3(...r_hat);

    const dEye  = Math.max(0.05, sat.length()*0.3);    // distance in front of sat
    const dLook = dEye * 2; 

    const d = Math.max(0.05, sat.length()*0.3);        // standoff distance in scene units
    const eye   = sat.clone().addScaledVector(rDir, dEye); // behind the sat along −r̂
    const look  = sat.clone().addScaledVector(rDir,  dLook); // ahead of the sat along +r̂

    camera.position.copy(eye);
    camera.lookAt(look);

    if (typeof controls !== 'undefined') {
        controls.target.copy(look);
        controls.update();
    }
}
//--------similar to above but matches (pose) payload-------
function aimCameraRadialPose({ r_eci_km, r_hat }) {
  if (!r_eci_km?.every(Number.isFinite)) return;

  // derive r̂ if not provided
  if (!r_hat || !r_hat.every(Number.isFinite)) {
    const m = Math.hypot(...r_eci_km) || 1;
    r_hat = r_eci_km.map(v => v/m);
  }

  const K   = Number.isFinite(window.KM_TO_UNITS) ? window.KM_TO_UNITS : 1;
  const sat = new THREE.Vector3(r_eci_km[0]*K, r_eci_km[1]*K, r_eci_km[2]*K);
  const rDir= new THREE.Vector3(...r_hat).normalize();

  const dEye  = Math.max(0.05, sat.length()*0.3);
  const dLook = dEye * 2;

  const eye  = sat.clone().addScaledVector(rDir, dEye);   // in front of sat along +r̂
  const look = sat.clone().addScaledVector(rDir, dLook);  // further ahead

  camera.position.copy(eye);
  camera.lookAt(look);
}
// ---------- Rendering stars ----------
function disposeStars() {
  if (starsPointsMesh) {
    scene.remove(starsPointsMesh);
    starsPointsMesh.geometry.dispose(); //clears buffer
    starsPointsMesh.material.dispose(); //clears texture
    starsPointsMesh = null; //sets starsPointsMesh back to null so it doesn't get reused
  }
}

// ---------- Rendering stars 2 ----------
function renderStarsXYZ(starsXYZ) {
  disposeStars(); //clear old stars
  const N = starsXYZ.length;
  const pos  = new Float32Array(N * 3);
  const col  = new Float32Array(N * 3);
  const ra  = new Float32Array(N);
  const dec = new Float32Array(N);
  const mag = new Float32Array(N);
  const idx = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const s = starsXYZ[i];
    pos[i*3+0] = s.x; 
    pos[i*3+1] = s.y; 
    pos[i*3+2] = s.z;
    col[i*3+0] = 1; //hardcodes every stars color as white
    col[i*3+1] = 1; //hardcodes every stars color as white
    col[i*3+2] = 1; //hardcodes every stars color as white
    ra[i]  = s.ra ?? NaN;
    dec[i] = s.dec ?? NaN;
    mag[i] = s.mag ?? NaN;
    idx[i] = s.idx ?? i;
  }
  const g = new THREE.BufferGeometry(); //needs to store these values in the THREE BUFFER
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('ra',       new THREE.Float32BufferAttribute(ra, 1));
  g.setAttribute('dec',      new THREE.Float32BufferAttribute(dec, 1));
  g.setAttribute('mag',      new THREE.Float32BufferAttribute(mag, 1));
  g.setAttribute('idx',      new THREE.Float32BufferAttribute(idx, 1));
  g.computeBoundingSphere();

  const m = new THREE.PointsMaterial({
    vertexColors: true, // modify r,g,b values from col value above to set colors
    size: 1.0, //control size of star
    //look at three documentation for other variables to add
  });
  starsPointsMesh = new THREE.Points(g, m);
  starsPointsMesh.frustumCulled = false;
  scene.add(starsPointsMesh);
}

// ---------- Rendering Orbit ----------
function drawOrbitTrack(pts_km) {
  const pts3 = pts_km.map(([x,y,z]) => new THREE.Vector3(x*KM_TO_UNITS, y*KM_TO_UNITS, z*KM_TO_UNITS));
  const geom = new THREE.BufferGeometry().setFromPoints(pts3.concat([pts3[0]]));
  const mat  = new THREE.LineBasicMaterial({ transparent:true, opacity:0.9 });
  const line = new THREE.Line(geom, mat);
  if (orbitLine){ 
    orbitLine.geometry.dispose(); 
    orbitLine.material.dispose(); 
    scene.remove(orbitLine); 
  }
  orbitLine = line;
  scene.add(orbitLine);
}

// ---------- Place Sat ----------
function placeSatellite(r_eci_km) {
  const pos = new THREE.Vector3(r_eci_km[0]*KM_TO_UNITS, r_eci_km[1]*KM_TO_UNITS, r_eci_km[2]*KM_TO_UNITS);
  if (!satMarker){
    const g = new THREE.SphereGeometry(KM_TO_UNITS*100, 16, 16);
    const m = new THREE.MeshBasicMaterial({ color: 0xff5533 });
    satMarker = new THREE.Mesh(g, m);
    scene.add(satMarker);
  }
  satMarker.position.copy(pos);
}

// ---------- Place CamArrow ----------
function updateCameraArrow({ r_eci_km, r_hat }) {
  // validate inputs
  if (!Array.isArray(r_eci_km) || r_eci_km.length !== 3 || !r_eci_km.every(Number.isFinite)) return;
  if (!Array.isArray(r_hat)   || r_hat.length   !== 3 || !r_hat.every(Number.isFinite)) return;

  const K = Number.isFinite(window.KM_TO_UNITS) ? window.KM_TO_UNITS : 1;

  const origin = new THREE.Vector3(
    r_eci_km[0] * K,
    r_eci_km[1] * K,
    r_eci_km[2] * K
  );

  const d = new THREE.Vector3(r_hat[0], r_hat[1], r_hat[2]).normalize();
  if (d.lengthSq() === 0) return;

  const base      = K * 6;
  const shaftLen  = Math.max(base, origin.length() * 0.04);
  const headLen   = shaftLen * 0.35;
  const headWidth = headLen * 0.7;

  if (!camArrow) {
    camArrow = new THREE.ArrowHelper(d, origin, shaftLen, 0xffcc00, headLen, headWidth);
    camArrow.frustumCulled = false;
    scene.add(camArrow);
  } else {
    camArrow.position.copy(origin);
    camArrow.setDirection(d);
    camArrow.setLength(shaftLen, headLen, headWidth);
  }
}
// ---------- Hover Near Star to show Data ----------
function cpuPickNearest(points, x, y, w, h, cam, radiusPx=5) {
  const g = points.geometry;
  const pos = g.getAttribute('position'); if (!pos) return [];
  const v = new THREE.Vector3();
  let bestI = -1, bestD2 = radiusPx*radiusPx;
  for (let i=0; i<pos.count; i++){
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).project(cam);
    const sx = (v.x * 0.5 + 0.5) * w;
    const sy = (-v.y * 0.5 + 0.5) * h;
    const dx = sx - x, dy = sy - y;
    const d2 = dx*dx + dy*dy;
    if (d2 < bestD2) { bestD2 = d2; bestI = i; }
  }
  return bestI >= 0 ? [{ index: bestI, point: null, distance: 0 }] : [];
}

on(MSG.STARS_XYZ, (xyz)  => {
  console.log("STARS_XYZ_Called");
  renderStarsXYZ(xyz);
});

on(MSG.ORBIT_SET, (k) => {
  try {
    aimCameraAlongRhat(k);
    console.log("ORBIT_SET_Called")
    const pts = sampleOrbit(k, 361);
    drawOrbitTrack(pts); //draw orbit
    const { r_eci_km } = keplerToECI(k);
    placeSatellite(r_eci_km); //generate satelite
    const m = Math.hypot(r_eci_km[0], r_eci_km[1], r_eci_km[2]) || 1;
    const r_hat = [r_eci_km[0]/m, r_eci_km[1]/m, r_eci_km[2]/m];
    updateCameraArrow({ r_eci_km, r_hat }); //add camera arrow
  } catch (err) { console.warn('Orbit update failed:', err); }
}); 

on(MSG.SAT_POSE, (pose) => {
  console.log("SAT_POSE_Called")
  if (pose?.r_eci_km) placeSatellite(pose.r_eci_km);
  updateCameraArrow(pose);
  aimCameraRadialPose(pose);
}); 

on(MSG.SAT_POS, (data) => {
  console.log("SAT_POS_Called")
  if (data?.r_eci_km) placeSatellite(data.r_eci_km);
  updateCameraArrow(data);
}); 

//animate everthing that you added to scene
(function animate(){ 
  requestAnimationFrame(animate); 
  renderer.render(scene, camera); 
})(); 
