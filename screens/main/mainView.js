import { send } from '../lib/bus.js';
import { MSG } from '../lib/schema.js';
import { raDecPlxToXYZ } from '../lib/astro.js';
import { keplerToECI } from '../lib/orbit.js';

// latest inputs
let lastStarsRaw = [];
let lastKepler   = null;

function earthWin() { 
  return document.getElementById('earthFrame')?.contentWindow; 
}
function camWin() {   
  return document.getElementById('cameraFrame')?.contentWindow; 
}

// ---------- publish stars ----------
export function publishStarsRaw(starsRaw) {
  const withIdx = starsRaw.map((s, i) => ({ ...s, idx: i })); //maps star data with idx: i values
  lastStarsRaw = withIdx.slice(); //if withIdx is modified, lastStarsRaw will hold same data from initial input

  const xyz = withIdx.map(s => {
    const p = raDecPlxToXYZ(s.ra, s.dec, s.plx);
    return p && { ...p, ra: s.ra, dec: s.dec, mag: s.mag, plx: s.plx, idx: s.idx };
  }).filter(Boolean);

  console.log(xyz) 
  send(earthWin(), MSG.STARS_XYZ, xyz);
  send(camWin(), MSG.STARS_XYZ, xyz); 
  send(window, MSG.STARS_XYZ, xyz); 
} // sends all star data to every window

// ---------- publish orbit ----------
export function publishOrbit(kepler) {
  lastKepler = { ...kepler }; //store what is currently listed as new value
  console.log(lastKepler); //logs an array of all kepler variables
  //convert to ECI
  const { r_eci_km, v_eci_kms } = keplerToECI(lastKepler); //position and velocity vectors of sat
  
  const norm  = v => { //unit vector generation
    const m = Math.hypot(v[0],v[1],v[2]); 
    return m ? [v[0]/m, v[1]/m, v[2]/m] : [1,0,0]; 
  };
  
  const cross = (a,b)=> [ //cross product of two vectors
    a[1]*b[2]-a[2]*b[1], 
    a[2]*b[0]-a[0]*b[2], 
    a[0]*b[1]-a[1]*b[0],
  ];

  const r_hat = norm(r_eci_km); //vector toward satelite on obit
  const h_hat = norm(cross(r_eci_km, v_eci_kms)); //perpendicular vector to the orbital plane
  const payload = { r_eci_km, r_hat, h_hat, scale: earthWin()?.KM_TO_UNITS }; //package sent to listeners

 
  send(earthWin(), MSG.ORBIT_SET, kepler);
  send(camWin(), MSG.ORBIT_SET, kepler);
  //send(earthWin(), MSG.SAT_POSE, payload);
  //send(earthWin(), MSG.SAT_POS, payload);
}







