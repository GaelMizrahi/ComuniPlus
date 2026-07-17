import React from 'react';

export default function TimeSlots({ slots, selectedTime, onSelect }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">Horarios</p>
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
                className={`py-2.5 px-2 rounded-xl text-[13px] font-semibold border transition-all duration-200 active:scale-95
                  ${selectedTime === time
                    ? 'bg-accent text-white border-accent shadow-fab'
                    : available
                      ? 'bg-surface text-text border-border hover:border-accent/40 hover:text-accent'
                      : 'bg-surface-secondary text-text-muted/40 border-border-subtle line-through cursor-not-allowed'
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
