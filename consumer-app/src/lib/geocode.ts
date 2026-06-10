/**
 * Free address → county lookup using the U.S. Census Bureau geocoder.
 * No API key required; CORS-enabled; nothing is stored.
 */

export interface AddressLookupResult {
  matchedAddress: string;
  /** County name without the word "County", e.g. "Los Angeles" */
  county: string;
  isCalifornia: boolean;
}

const GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

export async function lookupAddress(
  address: string,
  fetchImpl: typeof fetch = fetch
): Promise<AddressLookupResult | null> {
  const url = new URL(GEOCODER_URL);
  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('vintage', 'Current_Current');
  url.searchParams.set('layers', 'Counties');
  url.searchParams.set('format', 'json');

  const res = await fetchImpl(url.toString());
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
  const data = await res.json();

  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;

  const countyGeo = match.geographies?.Counties?.[0];
  const stateFips: string | undefined = countyGeo?.STATE ?? match.addressComponents?.state;

  return {
    matchedAddress: match.matchedAddress ?? address,
    county: countyGeo?.BASENAME ?? '',
    isCalifornia: stateFips === '06' || match.addressComponents?.state === 'CA',
  };
}
