export function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) return Number.POSITIVE_INFINITY;
  const earthRadiusMiles = 3958.8;
  const toRadians = (value: number) => value * (Math.PI / 180);
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function withinRadiusMiles(
  centerLat: number,
  centerLng: number,
  lat: number,
  lng: number,
  radiusMiles: number,
): boolean {
  if (!(radiusMiles > 0)) return true;
  return haversineMiles(centerLat, centerLng, lat, lng) <= radiusMiles;
}
