import { useState } from 'react';
import { lookupAddress } from '../lib/geocode';
import { countyPortal } from '../lib/countyLinks';
import { COUNTY_RATES } from '../lib/tax';

interface AddressLookupProps {
  /** Called when a CA county is found. */
  onResolved: (county: string, matchedAddress: string) => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; county: string; address: string }
  | { kind: 'not-found' }
  | { kind: 'not-ca'; address: string }
  | { kind: 'error' };

/**
 * "Start with your address" — finds the user's county via the free Census
 * geocoder, auto-fills it, and links to that county's official portal where
 * the assessed value can be looked up. Falls back gracefully to manual entry.
 */
export default function AddressLookup({ onResolved }: AddressLookupProps) {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function handleLookup() {
    const query = address.trim();
    if (!query) return;
    setStatus({ kind: 'loading' });
    try {
      const result = await lookupAddress(query);
      if (!result || !result.county) {
        setStatus({ kind: 'not-found' });
        return;
      }
      if (!result.isCalifornia) {
        setStatus({ kind: 'not-ca', address: result.matchedAddress });
        return;
      }
      setStatus({ kind: 'found', county: result.county, address: result.matchedAddress });
      if (result.county in COUNTY_RATES) {
        onResolved(result.county, result.matchedAddress);
      }
    } catch {
      setStatus({ kind: 'error' });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleLookup();
    }
  }

  const portal = status.kind === 'found' ? countyPortal(status.county) : null;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 space-y-3">
      <div>
        <label htmlFor="address" className="input-label">
          Start with your address <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input flex-1"
            placeholder="123 Main St, San Jose, CA"
            autoComplete="street-address"
          />
          <button
            type="button"
            onClick={() => void handleLookup()}
            disabled={status.kind === 'loading' || !address.trim()}
            className="btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.kind === 'loading' ? 'Looking up…' : 'Find my county'}
          </button>
        </div>
        <p className="input-help">
          We'll detect your county, fill in its typical tax rate, and point you to the official site for your
          assessed value. The lookup uses the free U.S. Census geocoder — your address isn't stored anywhere.
        </p>
      </div>

      {status.kind === 'found' && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-900">
          <p className="font-semibold">✓ {status.county} County — rate filled in below</p>
          {portal && (
            <p className="mt-1">
              Need your assessed value? Look up your property (free) at the{' '}
              <a href={portal.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                {portal.label}
              </a>
              {portal.isDirectory ? ' — find your county in the list.' : '.'}
            </p>
          )}
        </div>
      )}
      {status.kind === 'not-found' && (
        <p className="text-sm text-amber-700">
          We couldn't match that address — try adding the city and ZIP, or just pick your county below.
        </p>
      )}
      {status.kind === 'not-ca' && (
        <p className="text-sm text-amber-700">
          That address appears to be outside California. This tool covers CA property taxes only.
        </p>
      )}
      {status.kind === 'error' && (
        <p className="text-sm text-amber-700">
          The address lookup service didn't respond — no problem, just pick your county below.
        </p>
      )}
    </div>
  );
}
