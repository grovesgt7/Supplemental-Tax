import { useEffect, useRef, useState } from 'react';
import { suggestAddresses, type AddressSuggestion } from '../lib/photon';
import { lookupAddress } from '../lib/geocode';
import { countyPortal } from '../lib/countyLinks';

interface AddressAutocompleteProps {
  /** Called when the user picks a suggestion (county may be '' if unknown). */
  onSelect: (address: string, county: string) => void;
  initialValue?: string;
  /** County already known for initialValue (e.g. carried over from the home page). */
  initialCounty?: string;
  size?: 'lg' | 'md';
  /** Render the green "found your county" confirmation inline (default true). */
  showConfirmation?: boolean;
  placeholder?: string;
}

/**
 * Search-as-you-type address input. Suggestions come from the free
 * Photon/OpenStreetMap geocoder (no key, CA-only). If a suggestion is
 * missing its county, the Census geocoder fills the gap. Typing a full
 * address and pressing Enter also works when suggestions are unavailable.
 */
export default function AddressAutocomplete({
  onSelect,
  initialValue = '',
  initialCounty = '',
  size = 'md',
  showConfirmation = true,
  placeholder = 'Start typing your home address…',
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<{ address: string; county: string } | null>(
    initialValue ? { address: initialValue, county: initialCounty } : null
  );
  const lastSelected = useRef(initialValue);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounced suggestion fetch
  useEffect(() => {
    const q = query.trim();
    // Don't re-suggest for an address that's already been selected
    // (covers both arriving pre-filled and the moment after picking one).
    if (q === lastSelected.current.trim() && q !== '') return;
    if (q.length < 4) {
      setItems([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await suggestAddresses(q, { signal: ctrl.signal });
        setItems(results);
        setOpen(results.length > 0);
        setActive(-1);
      } catch {
        // Aborted or the suggestion service is unreachable — typing +
        // Enter still works via the fallback below, so stay quiet.
        setItems([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  async function resolveCounty(address: string, county: string): Promise<string> {
    if (county) return county;
    try {
      const r = await lookupAddress(address);
      if (r?.isCalifornia && r.county) return r.county;
    } catch {
      // fall through
    }
    return '';
  }

  async function choose(item: AddressSuggestion) {
    lastSelected.current = item.label;
    setQuery(item.label);
    setOpen(false);
    setItems([]);
    const county = await resolveCounty(item.label, item.county);
    setConfirmed({ address: item.label, county });
    onSelect(item.label, county);
  }

  /** Enter on free text (no suggestion picked): try the Census geocoder directly. */
  async function chooseFreeText() {
    const q = query.trim();
    if (!q) return;
    lastSelected.current = q;
    setOpen(false);
    setLoading(true);
    const county = await resolveCounty(q, '');
    setLoading(false);
    setConfirmed({ address: q, county });
    onSelect(q, county);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && active >= 0 && items[active]) void choose(items[active]);
      else void chooseFreeText();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const inputClasses =
    size === 'lg'
      ? 'input pl-11 py-3.5 text-lg rounded-2xl shadow-sm'
      : 'input pl-10';
  const portal = confirmed?.county ? countyPortal(confirmed.county) : null;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <svg
          className={`absolute ${size === 'lg' ? 'left-4 w-5 h-5' : 'left-3.5 w-4 h-4'} top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="address-suggestions"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setConfirmed(null);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => items.length > 0 && setOpen(true)}
          className={inputClasses}
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <span
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-brand-600 rounded-full animate-spin"
            aria-hidden
          />
        )}
      </div>

      {open && items.length > 0 && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute z-30 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden text-left"
        >
          {items.map((item, i) => (
            <li
              key={item.label}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(item);
              }}
              onMouseEnter={() => setActive(i)}
              className={`px-4 py-2.5 text-sm cursor-pointer flex items-baseline justify-between gap-3 ${
                i === active ? 'bg-brand-50 text-brand-900' : 'text-gray-700'
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.county && (
                <span className="text-xs text-gray-400 whitespace-nowrap">{item.county} Co.</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {showConfirmation && confirmed && !open && (
        <div className="mt-2 text-sm text-left">
          {confirmed.county ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-emerald-900">
              <p className="font-semibold">✓ {confirmed.county} County</p>
              {portal && (
                <p className="mt-0.5">
                  Need your assessed value? Look it up free at the{' '}
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                  >
                    {portal.label}
                  </a>
                  {portal.isDirectory ? ' — find your county in the list.' : '.'}
                </p>
              )}
            </div>
          ) : (
            <p className="text-amber-700">
              We couldn't pin down the county for that address — pick it manually below.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
