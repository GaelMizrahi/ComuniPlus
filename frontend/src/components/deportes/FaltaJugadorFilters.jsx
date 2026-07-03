import React from 'react';

export default function FaltaJugadorFilters({ sports, selectedSport, onSelect }) {
  return (
    <div className="chips sport-filter">
      {sports.map((sport) => (
        <button
          key={sport}
          type="button"
          className={selectedSport === sport ? 'active' : ''}
          onClick={() => onSelect(sport)}
        >
          {sport}
        </button>
      ))}
    </div>
  );
}
