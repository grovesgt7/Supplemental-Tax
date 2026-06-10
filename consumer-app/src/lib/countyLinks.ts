/**
 * Official county property-tax lookup portals.
 *
 * Curated links for the counties where we're confident in a stable URL;
 * everything else falls back to the State Board of Equalization's directory
 * of all 58 county assessors.
 */

export const BOE_ASSESSOR_DIRECTORY = 'https://www.boe.ca.gov/proptaxes/assessors.htm';

const PORTALS: Record<string, { url: string; label: string }> = {
  'Los Angeles': {
    url: 'https://portal.assessor.lacounty.gov/',
    label: 'LA County Assessor Portal',
  },
  'San Diego': {
    url: 'https://www.sdttc.com/',
    label: 'San Diego County Treasurer-Tax Collector',
  },
  Orange: {
    url: 'https://tax.ocgov.com/',
    label: 'Orange County Tax Collector',
  },
  Riverside: {
    url: 'https://www.countytreasurer.org/',
    label: 'Riverside County Treasurer-Tax Collector',
  },
  'San Bernardino': {
    url: 'https://www.mytaxcollector.com/',
    label: 'San Bernardino County Tax Collector',
  },
  'Santa Clara': {
    url: 'https://www.sccassessor.org/',
    label: 'Santa Clara County Assessor',
  },
  Alameda: {
    url: 'https://www.acgov.org/propertytax/',
    label: 'Alameda County Property Tax',
  },
  Sacramento: {
    url: 'https://eproptax.saccounty.gov/',
    label: 'Sacramento County e-PropTax',
  },
  'San Francisco': {
    url: 'https://www.sfassessor.org/',
    label: 'SF Assessor-Recorder',
  },
  Kern: {
    url: 'https://www.kcttc.co.kern.ca.us/',
    label: 'Kern County Treasurer-Tax Collector',
  },
};

export interface CountyPortal {
  url: string;
  label: string;
  isDirectory: boolean; // true when falling back to the statewide directory
}

export function countyPortal(county: string): CountyPortal {
  const portal = PORTALS[county];
  if (portal) return { ...portal, isDirectory: false };
  return {
    url: BOE_ASSESSOR_DIRECTORY,
    label: 'CA directory of county assessors',
    isDirectory: true,
  };
}
