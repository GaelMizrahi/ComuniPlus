export default function TimeSlots({ slots, selectedTime, onSelect }) {
  return (
    <div className="time-slots">
      {slots.map((slot) => (
        <button key={slot.time} type="button" disabled={!slot.available} className={selectedTime === slot.time ? 'active' : ''} onClick={() => onSelect(slot.time)}>
          {slot.time}
        </button>
      ))}
    </div>
  );
}
