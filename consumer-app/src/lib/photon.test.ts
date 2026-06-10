import { describe, it, expect } from 'vitest';
import { parsePhotonResponse, suggestAddresses } from './photon';

const feature = (props: Record<string, string>) => ({ properties: props });

describe('parsePhotonResponse', () => {
  it('builds labels and strips "County" from county names', () => {
    const out = parsePhotonResponse({
      features: [
        feature({
          housenumber: '123',
          street: 'Main St',
          city: 'San Jose',
          county: 'Santa Clara County',
          state: 'California',
          postcode: '95112',
          countrycode: 'US',
        }),
      ],
    });
    expect(out).toEqual([{ label: '123 Main St, San Jose, CA 95112', county: 'Santa Clara' }]);
  });

  it('filters out non-California and non-US results', () => {
    const out = parsePhotonResponse({
      features: [
        feature({ name: 'Main St', city: 'Reno', state: 'Nevada', countrycode: 'US' }),
        feature({ name: 'Main St', city: 'Vancouver', countrycode: 'CA' }),
        feature({ name: 'Main St', city: 'Fresno', state: 'California', countrycode: 'US' }),
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].label).toContain('Fresno');
  });

  it('dedupes identical labels and caps at 6 results', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      feature({
        housenumber: String(i),
        street: 'Oak Ave',
        city: 'Sacramento',
        state: 'California',
        countrycode: 'US',
      })
    );
    const out = parsePhotonResponse({ features: [...many, many[0]] });
    expect(out).toHaveLength(6);
    expect(new Set(out.map((s) => s.label)).size).toBe(6);
  });

  it('tolerates missing fields and empty responses', () => {
    expect(parsePhotonResponse({})).toEqual([]);
    expect(parsePhotonResponse({ features: [feature({ state: 'California' })] })).toEqual([]);
  });
});

describe('suggestAddresses', () => {
  it('queries Photon with CA bounds and parses the response', async () => {
    let requestedUrl = '';
    const fetchImpl = (async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          features: [
            feature({
              housenumber: '1',
              street: 'A St',
              city: 'Davis',
              county: 'Yolo County',
              state: 'California',
              countrycode: 'US',
            }),
          ],
        }),
      };
    }) as unknown as typeof fetch;

    const out = await suggestAddresses('1 A St Davis', { fetchImpl });
    expect(requestedUrl).toContain('photon.komoot.io');
    expect(requestedUrl).toContain('bbox=');
    expect(out[0]).toEqual({ label: '1 A St, Davis, CA', county: 'Yolo' });
  });

  it('throws on a non-OK response', async () => {
    const fetchImpl = (async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    await expect(suggestAddresses('x', { fetchImpl })).rejects.toThrow();
  });
});
