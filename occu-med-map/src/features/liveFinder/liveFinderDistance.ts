// Live/NPI result rows carry `dist` in MILES. Every API producer
// (/api/live-finder, /api/enhanced-search, /api/google-places) reports miles,
// and providerCandidateAdapter forwards `dist` as `straightMiles`. Client-side
// fallbacks compute meters with haversine, so they must be converted here.

export const METERS_PER_MILE = 1609.34;

export function metersToMiles(meters:number):number {
  return meters / METERS_PER_MILE;
}

function haversineMiles(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const R=3958.8,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// Uses the API's miles value when present; otherwise falls back to the
// straight-line distance from the search center. The API sends 0 when a
// candidate has no distanceMiles, so non-positive values also fall back.
export function normalizeResultDistMiles(rawDist:unknown, centerLat:number, centerLng:number, lat:number, lng:number):number {
  const dist = rawDist === null || rawDist === undefined || rawDist === '' ? NaN : Number(rawDist);
  if (Number.isFinite(dist) && dist > 0) return dist;
  return haversineMiles(centerLat, centerLng, lat, lng);
}

export function fmtDist(miles:number):string {
  if (!Number.isFinite(miles)) return '—';
  return miles < 0.1 ? Math.round(miles*5280)+' ft' : miles.toFixed(1)+' mi';
}
