import React from 'react';

export default function TimeSlots({ slots, selectedTime, onSelect }) {
  return (
    <div className="time-slots">
      <h3>Horarios disponibles</h3>

      {!slots || slots.length === 0 ? (
        <p className="empty-state">
          No hay horarios disponibles para esta fecha.
        </p>
      ) : (
        <div className="chips">
          {slots.map((slot) => {
            const time = typeof slot === 'string' ? slot : slot.time;
            const available =
              typeof slot === 'string' ? true : slot.available !== false;

            return (
              <button
                key={time}
                type="button"
                disabled={!available}
                className={selectedTime === time ? 'active' : ''}
                onClick={() => {
                  if (available) {
                    onSelect(time);
                  }
                }}
              >
                {time}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}