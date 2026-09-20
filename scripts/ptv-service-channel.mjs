export function unwrapPtvServiceLocationBatch(payload) {
  if (!Array.isArray(payload)) throw new Error("PTV ServiceChannel/list did not return an array");
  return payload
    .map((entry) => entry?.locationChannel || entry?.serviceLocationChannel || entry)
    .filter((channel) => channel && typeof channel === "object");
}

/**
 * PTV labels address coordinates latitude/longitude, but most Finnish records
 * are ETRS-TM35FIN (EPSG:3067) northing/easting values. Convert those values
 * to WGS84 while continuing to accept the small number already published as
 * decimal degrees.
 */
export function normalizePtvCoordinates(latitude, longitude) {
  const northing = Number(String(latitude ?? "").trim().replace(",", "."));
  const easting = Number(String(longitude ?? "").trim().replace(",", "."));
  if (!Number.isFinite(northing) || !Number.isFinite(easting)) return null;

  if (northing >= 59 && northing <= 71.5 && easting >= 18 && easting <= 33.5) {
    return { lat: northing, lng: easting };
  }
  if (northing < 6_000_000 || northing > 8_000_000 || easting < -100_000 || easting > 1_000_000) {
    return null;
  }

  const semiMajorAxis = 6_378_137;
  const flattening = 1 / 298.257222101;
  const eccentricitySquared = flattening * (2 - flattening);
  const secondEccentricitySquared = eccentricitySquared / (1 - eccentricitySquared);
  const scale = 0.9996;
  const centralMeridian = 27 * Math.PI / 180;
  const x = easting - 500_000;
  const meridionalArc = northing / scale;
  const e1 = (1 - Math.sqrt(1 - eccentricitySquared)) / (1 + Math.sqrt(1 - eccentricitySquared));
  const mu = meridionalArc / (semiMajorAxis * (
    1 - eccentricitySquared / 4
    - 3 * eccentricitySquared ** 2 / 64
    - 5 * eccentricitySquared ** 3 / 256
  ));
  const footprintLatitude = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const sinFootprint = Math.sin(footprintLatitude);
  const cosFootprint = Math.cos(footprintLatitude);
  const tanFootprint = Math.tan(footprintLatitude);
  const radiusPrime = semiMajorAxis / Math.sqrt(1 - eccentricitySquared * sinFootprint ** 2);
  const radiusMeridian = semiMajorAxis * (1 - eccentricitySquared)
    / (1 - eccentricitySquared * sinFootprint ** 2) ** 1.5;
  const tangentSquared = tanFootprint ** 2;
  const c = secondEccentricitySquared * cosFootprint ** 2;
  const d = x / (radiusPrime * scale);
  const latitudeRadians = footprintLatitude - (radiusPrime * tanFootprint / radiusMeridian) * (
    d ** 2 / 2
    - (5 + 3 * tangentSquared + 10 * c - 4 * c ** 2 - 9 * secondEccentricitySquared) * d ** 4 / 24
    + (61 + 90 * tangentSquared + 298 * c + 45 * tangentSquared ** 2
      - 252 * secondEccentricitySquared - 3 * c ** 2) * d ** 6 / 720
  );
  const longitudeRadians = centralMeridian + (
    d
    - (1 + 2 * tangentSquared + c) * d ** 3 / 6
    + (5 - 2 * c + 28 * tangentSquared - 3 * c ** 2
      + 8 * secondEccentricitySquared + 24 * tangentSquared ** 2) * d ** 5 / 120
  ) / cosFootprint;
  const lat = latitudeRadians * 180 / Math.PI;
  const lng = longitudeRadians * 180 / Math.PI;
  return lat >= 59 && lat <= 71.5 && lng >= 18 && lng <= 33.5 ? { lat, lng } : null;
}
