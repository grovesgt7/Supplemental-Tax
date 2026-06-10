import { useState } from 'react';
import { parseDollars } from '../lib/tax';

interface MoneyInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
  required?: boolean;
}

/** Dollar input that formats with thousands separators when the field loses focus. */
export default function MoneyInput({ id, label, value, onChange, placeholder, help, required }: MoneyInputProps) {
  const [focused, setFocused] = useState(false);

  function handleBlur() {
    setFocused(false);
    const n = parseDollars(value);
    if (!Number.isNaN(n)) {
      onChange(n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    }
  }

  return (
    <div>
      <label htmlFor={id} className="input-label">
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">$</span>
        <input
          type="text"
          inputMode="decimal"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          className={`input pl-8 ${focused ? '' : ''}`}
          placeholder={placeholder}
          required={required}
        />
      </div>
      {help && <p className="input-help">{help}</p>}
    </div>
  );
}
