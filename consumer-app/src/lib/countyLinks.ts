/**
 * County office links via NETR Online's Public Records Directory
 * (publicrecords.netronline.com) — a stable, uniform directory with one
 * page per county linking to the official Assessor, Treasurer-Tax
 * Collector, and Recorder sites. One URL pattern covers all 58 CA
 * counties, e.g. /state/CA/county/santa_clara.
 */

export const NETR_CA_DIRECTORY = 'https://publicrecords.netronline.com/state/CA';

/** All 58 California counties. */
export const CA_COUNTIES = [
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa',
  'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo',
  'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin',
  'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa',
  'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside', 'Sacramento',
  'San Benito', 'San Bernardino', 'San Diego', 'San Francisco', 'San Joaquin',
  'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara', 'Santa Cruz',
  'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter',
  'Tehama', 'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba',
] as const;

const COUNTY_SET = new Set<string>(CA_COUNTIES);

export interface CountyPortal {
  url: string;
  label: string;
  /** true when falling back to the statewide directory page */
  isDirectory: boolean;
}

export function countyPortal(county: string): CountyPortal {
  if (COUNTY_SET.has(county)) {
    const slug = county.toLowerCase().replace(/ /g, '_');
    return {
      url: `https://publicrecords.netronline.com/state/CA/county/${slug}`,
      label: `${county} County offices directory`,
      isDirectory: false,
    };
  }
  return {
    url: NETR_CA_DIRECTORY,
    label: 'California county offices directory',
    isDirectory: true,
  };
}
