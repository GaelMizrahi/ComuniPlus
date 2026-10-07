import React, { createContext, useContext, useState } from 'react';

export const DEFAULT_SPORTS = ['Fútbol masculino', 'Fútbol femenino', 'Tenis', 'Básquet', 'Patín', 'Pádel', 'Hockey', 'Gimnasia Artística', 'Vóley'];

const DeportesContext = createContext(null);

export function DeportesProvider({ children }) {
  const [sports, setSports] = useState(DEFAULT_SPORTS);
  const [selectedSport, setSelectedSport] = useState(DEFAULT_SPORTS[0]);

  const value = {
    sports,
    setSports,
    selectedSport,
    setSelectedSport,
  };

  return (
    <DeportesContext.Provider value={value}>
      {children}
    </DeportesContext.Provider>
  );
}

export function useDeportes() {
  const ctx = useContext(DeportesContext);
  if (!ctx) throw new Error('useDeportes must be used within DeportesProvider');
  return ctx;
}

export default DeportesContext;
