/**
 * Address autocomplete backed by Photon (photon.komoot.io) — a free,
 * no-API-key geocoder built on OpenStreetMap data that supports
 * search-as-you-type. Results are restricted to California.
 */

export interface AddressSuggestion {
  /** Display label, e.g. "123 Main St, San Jose, CA 95112" */
  label: string;
  /** County name without the word "County" (may be empty if unknown) */
  county: string;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';
/** California bounding box: minLon,minLat,maxLon,maxLat */
const CA_BBOX = '-124.48,32.53,-114.13,42.01';

interface PhotonProperties {
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  district?: string;
  county?: string;
  state?: string;
  postcode?: string;
  countrycode?: string;
}

export function parsePhotonResponse(data: unknown): AddressSuggestion[] {
  const features: { properties?: PhotonProperties }[] =
    (data as { features?: { properties?: PhotonProperties }[] })?.features ?? [];

  const out: AddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const f of features) {
    const p = f.properties ?? {};
    if (p.countrycode && p.countrycode.toUpperCase() !== 'US') continue;
    if (p.state && p.state !== 'California') continue;

    const line1 =
      p.housenumber && p.street ? `${p.housenumber} ${p.street}` : (p.name ?? p.street ?? '');
    if (!line1) continue;

    const cityName = p.city ?? p.district ?? '';
    const tail = p.postcode ? `CA ${p.postcode}` : 'CA';
    const label = [line1, cityName, tail].filter(Boolean).join(', ');

    if (seen.has(label)) continue;
    seen.add(label);

    out.push({
      label,
      county: (p.county ?? '').replace(/ county$/i, '').trim(),
    });
    if (out.length >= 6) break;
  }
  return out;
}

export async function suggestAddresses(
  query: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}
): Promise<AddressSuggestion[]> {
  const { signal, fetchImpl = fetch } = options;
  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '8');
  url.searchParams.set('bbox', CA_BBOX);
  url.searchParams.set('lang', 'en');

  const res = await fetchImpl(url.toString(), { signal });
  if (!res.ok) throw new Error(`Photon returned ${res.status}`);
  return parsePhotonResponse(await res.json());
}
