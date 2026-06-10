import { describe, it, expect } from 'vitest';
import { buildReportHTML, escapeHtml } from './report';
import { countyPortal, NETR_CA_DIRECTORY, CA_COUNTIES } from './countyLinks';
import { COUNTY_RATES } from './tax';
import { lookupAddress } from './geocode';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<script>"a" & 'b'</script>`)).toBe(
      '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;'
    );
  });
});

describe('buildReportHTML', () => {
  it('includes title, address, rows, highlights, and lists', () => {
    const html = buildReportHTML({
      title: 'Supplemental Tax Estimate',
      subtitle: 'What to expect',
      address: '123 MAIN ST, SAN JOSE, CA',
      sections: [
        {
          title: 'Your details',
          rows: [['Purchase price', '$850,000']],
          highlights: [{ label: 'Estimated total', value: '$6,573' }],
          list: ['Set aside $1,650/month.'],
          paragraphs: ['Counties usually mail bills 3–6 months after closing.'],
        },
      ],
    });
    expect(html).toContain('Supplemental Tax Estimate');
    expect(html).toContain('123 MAIN ST, SAN JOSE, CA');
    expect(html).toContain('$850,000');
    expect(html).toContain('$6,573');
    expect(html).toContain('Set aside $1,650/month.');
    expect(html).toContain('window.print()');
  });

  it('escapes user-provided values', () => {
    const html = buildReportHTML({
      title: 'T',
      address: '<img src=x onerror=alert(1)>',
      sections: [],
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});

describe('countyPortal', () => {
  it('builds the NETR county URL with a snake_case slug', () => {
    expect(countyPortal('Los Angeles').url).toBe(
      'https://publicrecords.netronline.com/state/CA/county/los_angeles'
    );
    expect(countyPortal('San Luis Obispo').url).toBe(
      'https://publicrecords.netronline.com/state/CA/county/san_luis_obispo'
    );
    expect(countyPortal('Alpine').isDirectory).toBe(false);
  });

  it('covers every CA county, and falls back to the state directory otherwise', () => {
    for (const county of CA_COUNTIES) {
      expect(countyPortal(county).isDirectory).toBe(false);
    }
    const p = countyPortal('Not A County');
    expect(p.isDirectory).toBe(true);
    expect(p.url).toBe(NETR_CA_DIRECTORY);
  });

  it('has a tax rate for all 58 counties', () => {
    expect(CA_COUNTIES).toHaveLength(58);
    for (const county of CA_COUNTIES) {
      expect(COUNTY_RATES[county], county).toBeGreaterThan(0);
    }
  });
});

describe('lookupAddress', () => {
  const censusResponse = {
    result: {
      addressMatches: [
        {
          matchedAddress: '1600 PENNSYLVANIA AVE, LOS ANGELES, CA, 90001',
          addressComponents: { state: 'CA' },
          geographies: {
            Counties: [{ BASENAME: 'Los Angeles', STATE: '06' }],
          },
        },
      ],
    },
  };

  function fakeFetch(body: unknown, ok = true): typeof fetch {
    return (async () => ({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
    })) as unknown as typeof fetch;
  }

  it('parses county and state from a Census geocoder response', async () => {
    const r = await lookupAddress('whatever', fakeFetch(censusResponse));
    expect(r).toMatchObject({ county: 'Los Angeles', isCalifornia: true });
    expect(r!.matchedAddress).toContain('LOS ANGELES');
  });

  it('returns null when there is no match', async () => {
    const r = await lookupAddress('whatever', fakeFetch({ result: { addressMatches: [] } }));
    expect(r).toBeNull();
  });

  it('throws on a non-OK response', async () => {
    await expect(lookupAddress('whatever', fakeFetch({}, false))).rejects.toThrow();
  });
});
