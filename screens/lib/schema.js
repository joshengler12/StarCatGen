// add new messages (keep your existing ones)
export const MSG = {
  STARS_RAW: 'stars:raw',
  STARS_XYZ: 'stars:xyz',          // array of {x,y,z}
  ORBIT_SET: 'orbit:set',
  SAT_POSE:  'sat:pose',           // { r_eci_km, r_hat, h_hat, KM_TO_UNITS? }
  CAM_SET:   'camera:settings',
  OPTIM_PROGRESS: 'optim:progress', // {i, total}
  OPTIM_DONE:     'optim:done',
  SAT_POS   : 'sat:pos',
};

