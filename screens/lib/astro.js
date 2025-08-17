function D2R(d) {
  return d * Math.PI / 180;
} //✅ Decimal to Radians formula

export function raDecPlxToXYZ(raDeg, decDeg, plx_mas, scaleAU = 1) {
  
  const raRad = D2R(raDeg);
  const decRad = D2R(decDeg); //distance in millarcsec
  const distArcSec = plx_mas / 1000; //from milliarcseconds to arcseconds
  const distParsec = 1 / distArcSec; //from arcseconds to Parsec
  const distAU = distParsec * 206265 * scaleAU; //from Parsec to astronomical units
  return { //standard spherical-to-Cartesian formula
    x: -distAU * Math.cos(decRad) * Math.cos(raRad),
    y: distAU * Math.sin(decRad),
    z: distAU * Math.cos(decRad) * Math.sin(raRad), 
  };
} // ✅ returns x,y,and z coordinates for position of star in Astronomical Units

export function brightnessFromMag(m) {
  return Math.pow(100, -m / 5);
} 