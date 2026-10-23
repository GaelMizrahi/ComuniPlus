import React from 'react';
import { useDeportes } from '../../context/DeportesContext';

export default function SportFilter() {
  const { sports, selectedSport, setSelectedSport } = useDeportes();

  return (
    <div className="sport-filter">
      {sports.map((sport) => (
        <button
          key={sport}
          type="button"
          className={selectedSport === sport ? 'active' : ''}
          onClick={() => setSelectedSport(sport)}
        >
          {sport}
        </button>
      ))}
    </div>
  );
}