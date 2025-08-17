import { deriveExtras } from '../../../lib/orbit.js';
import { publishOrbit } from '../../mainView.js';

const fields = ['Eccentricity','SemimajorAxis','Inclination','LongOfAN','ArgOfP','MeanAtEpoch']; //easier to grab names
const isFiniteNum = x => Number.isFinite(x); //don't have to rewrite to check that values are finite
function $(id){ return document.getElementById(id); } //don't have to rewrite document.getElementbyID just dollar sign

function getKepler(){ //store values as variables
  const e = $('Eccentricity');
  const a = $('SemimajorAxis'); 
  const i = $('Inclination');
  const loan = $('LongOfAN'); 
  const argp = $('ArgOfP'); 
  const me = $('MeanAtEpoch');
  if (!a || !e || !i || !loan || !argp || !me) return null;  // <-- guard
  return {
    e:  parseFloat(e.value),
    a_km:     parseFloat(a.value),
    i_deg: parseFloat(i.value),
    loan_deg: parseFloat(loan.value),
    argp_deg: parseFloat(argp.value),
    me_deg:   parseFloat(me.value)
  };
}

function isValidKepler(k){ //set limits on kepler inputs
  console.log(k.e)
  return k &&
    isFiniteNum(k.e) && 
    k.e >= 0 && k.e <= 1 &&
    isFiniteNum(k.a_km) && 
    k.a_km > 0 &&
    isFiniteNum(k.i_deg) && 
    isFiniteNum(k.loan_deg) &&
    isFiniteNum(k.argp_deg) && 
    isFiniteNum(k.me_deg);
}

function publish(k){
  // make sure kepler is valid
  if (!isValidKepler(k)) {
    const dt=$('derivedText'); 
    if (dt) dt.textContent='Waiting for valid inputs…'; 
    return; 
  }
  //imports derive Extras from lib/orbit.js to calculate other common orbit values
  try{
    const d = deriveExtras(k.a_km, k.e);
    const dt = $('derivedText');
    if (dt) dt.textContent = `rp=${d.rp_km.toFixed(0)} km, ra=${d.ra_km.toFixed(0)} km, T=${(d.period_s/60).toFixed(1)} min`; //sends to main.html
  }catch(err){ //check for errors
    const dt = $('derivedText'); if (dt) dt.textContent = String(err.message);
    return;
  }
  publishOrbit(k); //sends data to mainView.js
}

window.addEventListener('DOMContentLoaded', () => {
  let t;
  function onChange() {
    clearTimeout(t); 
    t = setTimeout(()=> publish(getKepler()), 120); //update text on screen, but delay to allow user to type
  };

  fields.forEach(id => $(id)?.addEventListener('input', onChange));

  $('btnUseApPeri')?.addEventListener('click', ()=>{
    const row = document.getElementById('apPeriRow');
    if (row) row.style.display = (row.style.display === 'none' || !row.style.display) ? 'flex' : 'none';
  });

  document.getElementById('btnApplyOrbit')?.addEventListener('click', () => publish(getKepler()));
});