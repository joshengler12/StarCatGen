// Adapted from your orbitMath.js
const MU = 398600.4418; // km^3/s^2 //standard gravitational parameter
const D2R = d => d * Math.PI / 180;

export function deriveExtras(a_km, e){
  const b_km = a_km*Math.sqrt(1-e*e); //✅ semi minor axis of elipse km
  const l_km = a_km*(1-e*e); //✅ semi-latus rectum km
  const rp_km = a_km*(1-e); //✅periapsis radius km
  const ra_km = a_km*(1+e); //✅apoapsis radius km
  const n = Math.sqrt(MU/Math.pow(a_km,3)); //✅ average angular speed radians/sec
  const T = 2*Math.PI/n; //✅orbital period in seconds
  return { b_km, l_km, rp_km, ra_km, n_rad_s:n, period_s:T };
}

export function keplerToECI({ e, a_km, i_deg, loan_deg, argp_deg, me_deg }) {
  const i_rad = D2R(i_deg); //angles to radians
  const O_rad = D2R(loan_deg); //longitude of ascending node
  const w_rad = D2R(argp_deg); //argument of periapsis
  const nu_rad = D2R(me_deg); //true anomaly
  const l_km = a_km*(1-e*e); //semi-latus rectum
  const rpf = [ //position vector in the perifocal frame
    ((l_km*Math.cos(nu_rad))/(1+e*Math.cos(nu_rad))),
    ((l_km*Math.sin(nu_rad))/(1+e*Math.cos(nu_rad))),
    0
  ];
  const vpf = [ //velocity vector in the perifocal frame
    (-(Math.sqrt(MU/l_km))*(Math.sin(nu_rad))),
    (Math.sqrt(MU/l_km))*((e + Math.cos(nu_rad))),
    0
  ];
  //next rotate from perifocal frame to Earth-Centered Inertial Frame
  const R = matMul(matMul(rotz(O_rad), rotx(i_rad)), rotz(w_rad));
  console.log("r_eci_km:", matVec(R, rpf), "v_eci_kms:", matVec(R, vpf));
  return { r_eci_km: eciToScene(matVec(R, rpf)), v_eci_kms: eciToScene(matVec(R, vpf)) };
} //exporst rpf vector for position of satelite and vpf is velocity vector of satelite 

export function sampleOrbit({ e, a_km, i_deg, loan_deg, argp_deg, me_deg }, samples=360) {
  const p = a_km*(1-e*e); //semi-latus rectum km
  const i = D2R(i_deg); //deg to rad
  const O = D2R(loan_deg); //deg to rad
  const w = D2R(argp_deg); //deg to rad
  const R = matMul(matMul(rotz(O), rotx(i)), rotz(w)); //use with matVec(R, rpf) to rotate any position vector from orbital plane to ECI frame
  const pts = [];
  for (let s=0; s<samples; s++){
    const nu = (2*Math.PI*s)/samples; // true anomoly
    const rpf = [
      p*Math.cos(nu)/(1+e*Math.cos(nu)),
      p*Math.sin(nu)/(1+e*Math.cos(nu)),
      0
    ]; //satelites x y position on elipse before rotation
    pts.push(eciToScene(matVec(R, rpf))); // km in ECI (used matVec(R,rpf) to rotate onto elipse)
  }
  console.log("All orbit points:", pts);
  return pts;
}

export function eciToScene([x,y,z]) { 
  return [x, z, y]; 
}

function rotx(t){ //x axis rotation matrix
  const c=Math.cos(t), 
  s=Math.sin(t); 
  return [
    [1,0,0],
    [0, c,-s],
    [0, s, c]
  ]; 
}


function rotz(t){ //z axis rotation matrix
  const c=Math.cos(t);
  const s=Math.sin(t); 
  return [
    [ c,-s,0],
    [ s, c,0],
    [0,0,1]
  ]; 
}

function matMul(A,B){ //C = A · B / 3x3 matrix multiplication
  return A.map(
    (r,i)=>r.map(
      (_,j)=>
      A[i][0]*B[0][j]+
      A[i][1]*B[1][j]+
      A[i][2]*B[2][j]
    )
  ); 
}

function matVec(A,v){ //multiple 3x3 array by 3 element array
  return [
    A[0][0]*v[0]+A[0][1]*v[1]+A[0][2]*v[2],
    A[1][0]*v[0]+A[1][1]*v[1]+A[1][2]*v[2],
    A[2][0]*v[0]+A[2][1]*v[1]+A[2][2]*v[2]
  ]; 
}




