export type EtaOrigin = {
  lat: number;
  lng: number;
  label?: string;
};

export type EtaProviderCandidate = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  source?: string;
  sourceUrl?: string;
  category?: string;
  straightMiles?: number;
};

export type EtaProviderRanking = EtaProviderCandidate & {
  rank: number;
  driveMiles: number;
  driveMinutes: number;
  routeCoordinates: Array<[number, number]>;
  originLabel: string;
  routeProfile: "driving-traffic" | "driving" | "walking";
};

export type EtaRankingOptions = {
  maxCandidates?: number;
  maxRouteCalls?: number;
  maxStraightMiles?: number;
  routeProfile?: "driving-traffic" | "driving" | "walking";
};

export type EtaRankingResult = {
  origin: EtaOrigin;
  rankings: EtaProviderRanking[];
  attempted: number;
  failed: number;
};
