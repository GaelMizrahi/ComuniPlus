export default function CourtCard({ court, selected, onSelect }) {
  return (
    <article className={`court-card elevated-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(court)}>
      <img src={court.image || 'https://placehold.co/640x360/e7f0ff/256fca?text=Comuni%2B'} alt={court.name} />
      <div>
        <strong>{court.name}</strong>
        <span>{court.location}</span>
        <b>${court.pricePerHour}/hora</b>
      </div>
    </article>
  );
}
