export default function Calendar({ value, onChange }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="form-card elevated-card compact-card">
      <label>FECHA DE RESERVA</label>
      <input className="field" type="date" min={today} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
