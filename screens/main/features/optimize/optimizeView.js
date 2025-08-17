import { on } from '../../../lib/bus.js';
import { MSG } from '../../../lib/schema.js';

const DEG = Math.PI/180; //convert deg to rad

const sphToUnit = (raDeg,decDeg)=> { //converts ra and dec degrees to radians then makes +Y the pole
  const ra=raDeg*DEG, dec=decDeg*DEG;
  return { 
    x:Math.cos(dec)*Math.cos(ra), 
    y:Math.sin(dec), 
    z:-Math.cos(dec)*Math.sin(ra) };
};

window.__STARS_RAW__ = []; //creates global array to store stars
on(MSG.STARS_XYZ, (xyz) => {
  window.__STARS_RAW__ = xyz.map((s,i)=>({
    ra:s.ra, dec:s.dec, vmag:(s.vmag ?? s.mag), plx:s.plx, idx:(s.idx ?? i),
    unit:sphToUnit(s.ra, s.dec)
  }));
  console.log('cached stars:', window.__STARS_RAW__.length);
});

// will be assigned after DOM ready
let pairStatusEl = null;
let barFillEl    = null;

function setProgress(pct, label){ //function that updates progress bar iteratively
  if (barFillEl) barFillEl.style.width = pct + '%';
  if (pairStatusEl) pairStatusEl.textContent = label ?? `Building pairs… ${pct}%`;
}

function nextFrame(){ 
  return new Promise(r => requestAnimationFrame(r)); 
}

async function buildPairsInline({ topN, maxSepDeg }) { //function for building star list
  setProgress(0, 'Preparing…'); // reset progress

  const starsRaw = window.__STARS_RAW__;
  if (!starsRaw.length) { alert('Load a star catalog first.'); return; }

  const keep = starsRaw.slice().sort((a,b)=>a.vmag-b.vmag) //clones array and sorts by brightness lower vmag first
                       .slice(0, Math.max(1, topN)) //topN has at least one
                       .map((s,new_id)=>({ ...s, new_id })); //builds new_id index

  const N = keep.length, cosThr = Math.cos(maxSepDeg*DEG); //cos of max sep deg allows for easy dot product
  const lines = []; //holds csv lines for star pairs
  const dot = (A,B)=> A.x*B.x + A.y*B.y + A.z*B.z; //dot product function

  for (let i=0;i<N;i++){
    const Ai = keep[i].unit;
    for (let j=i+1;j<N;j++){
      const c = dot(Ai, keep[j].unit);
      if (c >= cosThr){
        const th = Math.acos(Math.max(-1,Math.min(1,c)))/DEG;
        lines.push(`${i},${j},${c},${th}\n`);
      }
    }
    if ((i & 31) === 0) {   //every 32 iterations, updates progress and sets frame              // update ~every 32 rows
      const pct = Math.round(i*100/N);
      setProgress(pct);
      await nextFrame();                  // allow paint
    }
  }

  setProgress(100, 'Packaging…');

  // CSVs
  const starHeader = 'new_id,old_idx,ra_deg,dec_deg,mag,plx\n';
  const starRows   = keep.map(s=>`${s.new_id},${s.idx},${s.ra},${s.dec},${s.vmag},${s.plx}`).join('\n');
  const u1 = URL.createObjectURL(new Blob([starHeader, starRows], {type:'text/csv'}));
  Object.assign(document.createElement('a'), { href:u1, download:`stars_top${keep.length}_raDec.csv` }).click();
  URL.revokeObjectURL(u1);

  const pairHeader = 'i,j,cos_theta,theta_deg\n';
  const u2 = URL.createObjectURL(new Blob([pairHeader, ...lines], {type:'text/csv'}));
  Object.assign(document.createElement('a'), { href:u2, download:`pairs_top${keep.length}_max${maxSepDeg}deg.csv` }).click();
  URL.revokeObjectURL(u2);

  setProgress(100, `Done: ${keep.length} stars`);
}

document.addEventListener('DOMContentLoaded', () => {
  // wire DOM refs now that elements exist
  pairStatusEl = document.getElementById('pair_status');
  barFillEl    = document.getElementById('opt_bar');   // inner fill div

  const pairBtn = document.getElementById('opt_buildPairs');
  if (!pairBtn) { console.warn('opt_buildPairs not found'); return; }

  pairBtn.addEventListener('click', async () => {
    console.log('build pairs clicked');
    setProgress(0, 'Preparing…');
    const topN   = Math.max(100, parseInt(document.getElementById('pair_topN')?.value || '5000', 10));
    const maxSep = Math.max(1,   parseFloat(document.getElementById('pair_maxSep')?.value || '40'));
    try { await buildPairsInline({ topN, maxSepDeg: maxSep }); }
    catch (e){ console.error('pair build failed', e); setProgress(0, 'Error'); }
  });
});