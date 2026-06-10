import { createContext, useContext, useState, type ReactNode } from 'react';

export interface PropertyInfo {
  address: string;
  county: string; // without "County"
}

const EMPTY: PropertyInfo = { address: '', county: '' };

const PropertyContext = createContext<{
  property: PropertyInfo;
  setProperty: (p: PropertyInfo) => void;
}>({ property: EMPTY, setProperty: () => {} });

/** Holds the address/county chosen on the home page so every tool starts pre-filled. */
export function PropertyProvider({ children }: { children: ReactNode }) {
  const [property, setProperty] = useState<PropertyInfo>(EMPTY);
  return <PropertyContext.Provider value={{ property, setProperty }}>{children}</PropertyContext.Provider>;
}

export function useProperty() {
  return useContext(PropertyContext);
}
