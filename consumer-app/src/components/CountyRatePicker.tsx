import { COUNTY_RATES } from '../lib/tax';

interface CountyRatePickerProps {
  county: string;
  onCountyChange: (county: string) => void;
  rate: string;
  onRateChange: (rate: string) => void;
}

/**
 * County dropdown that auto-fills a typical tax rate, with an editable rate
 * field for people who know their exact rate from their bill.
 */
export default function CountyRatePicker({ county, onCountyChange, rate, onRateChange }: CountyRatePickerProps) {
  function handleCounty(value: string) {
    onCountyChange(value);
    const r = COUNTY_RATES[value];
    if (r !== undefined) onRateChange(r.toFixed(2));
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="county" className="input-label">
          Your county
        </label>
        <select id="county" value={county} onChange={(e) => handleCounty(e.target.value)} className="select">
          <option value="">Choose a county…</option>
          {Object.keys(COUNTY_RATES).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="input-help">Picking a county fills in a typical tax rate for you.</p>
      </div>
      <div>
        <label htmlFor="taxRate" className="input-label">
          Tax rate (%)
        </label>
        <input
          type="text"
          inputMode="decimal"
          id="taxRate"
          value={rate}
          onChange={(e) => onRateChange(e.target.value)}
          className="input"
          placeholder="1.10"
        />
        <p className="input-help">
          If you have a tax bill handy, use the exact rate printed on it — rates vary by neighborhood.
        </p>
      </div>
    </div>
  );
}
