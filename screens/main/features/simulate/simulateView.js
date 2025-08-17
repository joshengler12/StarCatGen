import { send } from '../../../lib/bus.js';
import { MSG }  from '../../../lib/schema.js';
import { keplerToECI } from '../../../lib/orbit.js';

function earthWin(){ return document.getElementById('earthFrame')?.contentWindow; }
function camWin(){   return document.getElementById('cameraFrame')?.contentWindow; }

const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];

window.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const M    = $('MeanAtEpoch');
  const play = $('sim_play');
  const pause= $('sim_pause');
  const rate = $('sim_rate');
  const rng  = $('sim_nu');
  const disp = $('sim_nu_val');

  let timer = null;

  function pushPoseFromInputs() {
    const k = {
      e:        parseFloat(document.getElementById('Eccentricity').value),
      a_km:     parseFloat(document.getElementById('SemimajorAxis').value),
      i_deg:    parseFloat(document.getElementById('Inclination').value),
      loan_deg: parseFloat(document.getElementById('LongOfAN').value),
      argp_deg: parseFloat(document.getElementById('ArgOfP').value),
      me_deg:   parseFloat(document.getElementById('MeanAtEpoch').value)
    };

    const { r_eci_km, v_eci_kms } = keplerToECI(k);
    const m = Math.hypot(...r_eci_km) || 1;
    const r_hat = r_eci_km.map(x => x/m);
    const h = cross(r_eci_km, v_eci_kms);
    const hm = Math.hypot(...h) || 1;
    const h_hat = h.map(x => x/hm);

    send(earthWin(), MSG.SAT_POSE, { r_eci_km, v_eci_kms, r_hat, h_hat });
    send(camWin(), MSG.SAT_POSE, { r_eci_km, v_eci_kms, r_hat, h_hat });
  }

  function setM(deg){
    const M = document.getElementById('MeanAtEpoch');
    if (!M) return;
    
    const v = ((deg % 360) + 360) % 360;
    M.value = v.toFixed(1);
    rng.value = v;
    disp.textContent = `${v.toFixed(1)}°`;
    
    pushPoseFromInputs(); // immediate sat/camera move
  }

  // slider drag -> fluid updates
  rng?.addEventListener('input', () => setM(Number(rng.value)||0));

  // play/pause timer (still uses existing pipeline + fluid pose)
  play.addEventListener('click', () => {
    if (timer) return;
    const r = Number(rate.value) || 10; // deg/s
    const step = 33; // ms (~30fps)

    timer = setInterval(() => {
      setM((Number(M.value)||0) + r*(step/1000));
    }, step);
  });

  pause.addEventListener('click', () => {
    clearInterval(timer);
    timer = null;
  });
});