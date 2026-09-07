// ---------------------------------------------------------------------------
// cityTiers.js — RBI's official population-based centre classification,
// used for deriving a business's Location Quality factor from its verified
// registered address (see bankFactors.js) instead of a self-reported claim.
//
// SOURCE — the tier thresholds themselves are RBI's own classification,
// used for banking-policy purposes (branch/ATM expansion, priority-sector
// lending, etc.):
//   https://www.rbi.org.in/commonman/Upload/English/Notification/PDFs/59BA290613FS.pdf
//   (also documented at https://en.wikipedia.org/wiki/Classification_of_Indian_cities)
//
// IMPORTANT — this is population-threshold classification, NOT the same as
// the commonly-confused Ministry of Finance "X/Y/Z" HRA city classification
// (only 8 X-cities + 97 Y-cities). RBI's tiers apply to every town/city in
// India based on its Census population, of which there are thousands — no
// single government source publishes a pre-computed tier for every one of
// them; the classification is DERIVED by checking a town's population
// against these thresholds. That's what getCityTier()/tierForPopulation()
// below do.
// ---------------------------------------------------------------------------

export const RBI_TIER_THRESHOLDS = [
  { tier: 1, label: "Tier 1", minPopulation: 100000, maxPopulation: Infinity },
  { tier: 2, label: "Tier 2", minPopulation: 50000, maxPopulation: 99999 },
  { tier: 3, label: "Tier 3", minPopulation: 20000, maxPopulation: 49999 },
  { tier: 4, label: "Tier 4", minPopulation: 10000, maxPopulation: 19999 },
  { tier: 5, label: "Tier 5", minPopulation: 5000, maxPopulation: 9999 },
  { tier: 6, label: "Tier 6", minPopulation: 0, maxPopulation: 4999 },
];

/** Classifies a raw population number against RBI's thresholds. */
export function tierForPopulation(population) {
  return (
    RBI_TIER_THRESHOLDS.find((t) => population >= t.minPopulation && population <= t.maxPopulation) ??
    RBI_TIER_THRESHOLDS[RBI_TIER_THRESHOLDS.length - 1]
  );
}

// ---------------------------------------------------------------------------
// Census of India 2011 population figures (city-proper population, not the
// larger urban-agglomeration figure, kept consistent across every entry).
// This is a REFERENCE SUBSET — the major cities, state capitals, and
// business hubs an SME's registered address is realistically likely to be
// in — not an exhaustive list of India's ~8,000 towns. All of these are
// comfortably Tier 1 under RBI's system (>=100,000), which is expected:
// Tier 1 alone covers roughly 70% of India's total urban population.
// Extend this list as real business addresses require it; anything not
// found here falls back to a documented default in bankFactors.js rather
// than silently guessing.
// ---------------------------------------------------------------------------
export const CITY_POPULATIONS_CENSUS_2011 = {
  "mumbai": 12442373,
  "delhi": 11034555,
  "bengaluru": 8443675,
  "bangalore": 8443675,
  "hyderabad": 6809970,
  "ahmedabad": 5570585,
  "chennai": 4681087,
  "kolkata": 4486679,
  "surat": 4467797,
  "pune": 3124458,
  "jaipur": 3046163,
  "lucknow": 2815601,
  "kanpur": 2767031,
  "nagpur": 2405665,
  "indore": 1960631,
  "thane": 1818872,
  "bhopal": 1798218,
  "visakhapatnam": 1730320,
  "pimpri-chinchwad": 1729359,
  "patna": 1684222,
  "vadodara": 1666703,
  "ghaziabad": 1648643,
  "ludhiana": 1618879,
  "agra": 1585704,
  "nashik": 1486973,
  "faridabad": 1414050,
  "meerut": 1305429,
  "rajkot": 1286995,
  "kalyan-dombivli": 1246381,
  "vasai-virar": 1221233,
  "varanasi": 1201815,
  "srinagar": 1180570,
  "aurangabad": 1175116,
  "dhanbad": 1162472,
  "amritsar": 1132761,
  "navi mumbai": 1119477,
  "prayagraj": 1117094,
  "allahabad": 1117094,
  "howrah": 1077075,
  "ranchi": 1073440,
  "coimbatore": 1061447,
  "jabalpur": 1055525,
  "gwalior": 1054420,
  "vijayawada": 1048240,
  "jodhpur": 1033918,
  "madurai": 1017865,
  "raipur": 1010087,
  "kota": 1001365,
  "chandigarh": 960787,
  "guwahati": 957352,
  "solapur": 951118,
  "hubli-dharwad": 943857,
  "mysuru": 920550,
  "mysore": 920550,
  "tiruchirappalli": 916857,
  "shimla": 169578,
};

/**
 * Extracts a plausible city name from a free-text registered address by
 * checking which known city name appears in it. Longer names are checked
 * first so e.g. "navi mumbai" matches before the shorter "mumbai".
 * Returns null if nothing in the reference dataset matches.
 */
export function extractCityFromAddress(address) {
  if (!address) return null;
  const lower = address.toLowerCase();
  const candidates = Object.keys(CITY_POPULATIONS_CENSUS_2011).sort((a, b) => b.length - a.length);
  for (const city of candidates) {
    if (lower.includes(city)) return city;
  }
  return null;
}

/**
 * Full lookup: city name -> RBI tier, using the Census 2011 reference data.
 * @returns {{ matched: boolean, tier: number|null, population: number|null, label: string }}
 */
export function getCityTier(cityName) {
  if (!cityName) return { matched: false, tier: null, population: null, label: "Unknown" };
  const population = CITY_POPULATIONS_CENSUS_2011[cityName.trim().toLowerCase()];
  if (population == null) return { matched: false, tier: null, population: null, label: "Unknown" };
  const tierInfo = tierForPopulation(population);
  return { matched: true, tier: tierInfo.tier, population, label: tierInfo.label };
}