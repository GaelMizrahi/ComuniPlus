import React from 'react';

export default function TimeSlots({ slots, selectedTime, onSelect }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-2">Horarios</p>
      {!slots || slots.length === 0 ? (
        <p className="text-[13px] text-text-muted py-4">Sin horarios disponibles</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot) => {
            const time = typeof slot === 'string' ? slot : slot.time;
            const available = typeof slot === 'string' ? true : slot.available !== false;
            return (
              <button
                key={time}
                type="button"
                disabled={!available}
                onClick={() => available && onSelect(time)}
                className={`py-2 px-2 rounded-lg text-[13px] font-medium border transition-all duration-150 active:scale-95
                  ${selectedTime === time
                    ? 'bg-text text-white border-text'
                    : available
                      ? 'bg-transparent text-text border-border hover:border-text/30'
                      : 'bg-transparent text-text-muted/40 border-border line-through cursor-not-allowed'
                  }`}
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
