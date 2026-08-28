import React from 'react';

export default function SportFilter({ sports, selectedSport, onSelect }) {
  return (
    <div className="sport-filter">
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