const sports = ['Fútbol', 'Hockey', 'Tenis', 'Básquet', 'Pádel', 'Vóley', 'Rugby', 'Running'];
const levels = ['Principiante', 'Intermedio', 'Avanzado', 'Competitivo'];
const filters = ['Todos', 'Fútbol Femenino', 'Fútbol Masculino', 'Pádel', 'Tenis', 'Running', 'Básquet', 'Patín', 'Hockey', 'Gimnasia Artística', 'Vóley'];

let screen = 'home';
let activeFilter = 'Todos';
let matches = [
  { id: 1, sport: 'Fútbol', category: 'Fútbol Masculino', level: 'Intermedio', date: 'Martes', time: '20:00', location: 'Palermo', missingPlayers: 2, notes: 'Cancha de 7. Llevar camiseta blanca.' },
  { id: 2, sport: 'Pádel', category: 'Pádel', level: 'Avanzado', date: 'Viernes', time: '19:30', location: 'Belgrano', missingPlayers: 1, notes: 'Partido competitivo, pala propia.' },
  { id: 3, sport: 'Running', category: 'Running', level: 'Principiante', date: 'Sábado', time: '08:00', location: 'Lagos de Palermo', missingPlayers: 3, notes: 'Ritmo abierto, 5K suaves.' },
  { id: 4, sport: 'Vóley', category: 'Vóley', level: 'Principiante', date: 'Domingo', time: '17:00', location: 'Caballito', missingPlayers: 1, notes: 'Amistoso mixto.' },
  { id: 5, sport: 'Hockey', category: 'Hockey', level: 'Intermedio', date: 'Miércoles', time: '18:30', location: 'Núñez', missingPlayers: 2, notes: 'Traer protector bucal.' },
  { id: 6, sport: 'Fútbol', category: 'Fútbol Femenino', level: 'Competitivo', date: 'Jueves', time: '21:00', location: 'Villa Crespo', missingPlayers: 2, notes: 'Fútbol 5, reserva confirmada.' },
];

const app = document.querySelector('#app');
const icon = { plus: '+', users: '👥', calendar: '📅', clock: '🕒', pin: '📍', back: '←' };

function render() {
  app.innerHTML = screen === 'home' ? homeTemplate() : createTemplate();
  bindEvents();
}

function homeTemplate() {
  const availableMatches = matches.filter((match) => match.missingPlayers > 0 && (activeFilter === 'Todos' || match.category === activeFilter));
  return `
    <section class="page fade-in">
      <div class="hero-card">
        <div>
          <p class="eyebrow">Comunidad deportiva</p>
          <h1>¿Falta un jugador?</h1>
          <p class="hero-copy">¿Te falta alguien para completar el equipo? Publicá tu partido o encontrá uno disponible para sumarte.</p>
        </div>
        <button class="primary-button" data-action="create"><span>${icon.plus}</span> Crear partido</button>
      </div>
      <div class="filter-row" aria-label="Filtros deportivos">
        ${filters.map((filter) => `<button class="filter-chip ${activeFilter === filter ? 'active' : ''}" data-filter="${filter}">${filter}</button>`).join('')}
      </div>
      <div class="section-heading"><h2>Partidos disponibles</h2><span>${availableMatches.length} disponibles</span></div>
      <div class="match-grid">${availableMatches.length ? availableMatches.map(matchCardTemplate).join('') : emptyTemplate()}</div>
    </section>`;
}

function matchCardTemplate(match) {
  const plural = match.missingPlayers === 1 ? ['Falta', 'jugador'] : ['Faltan', 'jugadores'];
  return `
    <article class="match-card">
      <div class="card-topline"><span>${match.category}</span><strong>Disponible</strong></div>
      <h3>${match.sport}</h3>
      <div class="detail-list">
        <span>${icon.users} ${match.level}</span><span>${icon.calendar} ${match.date}</span>
        <span>${icon.clock} ${match.time}</span><span>${icon.pin} ${match.location}</span>
      </div>
      <p class="notes">${match.notes}</p>
      <div class="card-footer"><span class="missing-badge">${plural[0]} ${match.missingPlayers} ${plural[1]}</span><button class="secondary-button" data-join="${match.id}">Unirme</button></div>
    </article>`;
}

function emptyTemplate() {
  return '<div class="empty-state"><h3>No hay partidos disponibles</h3><p>Probá con otro deporte o creá una nueva convocatoria.</p></div>';
}

function createTemplate() {
  return `
    <section class="page narrow fade-in">
      <button class="back-button" data-action="back">${icon.back} Volver</button>
      <div class="form-card">
        <p class="eyebrow">Nueva convocatoria</p><h1>Crear Partido</h1>
        <form class="match-form" id="match-form">
          ${fieldTemplate('Deporte', `<select name="sport">${sports.map((sport) => `<option>${sport}</option>`).join('')}</select>`)}
          <div class="two-columns">${fieldTemplate('Fecha', '<input name="date" type="date" />')}${fieldTemplate('Horario', '<input name="time" type="time" />')}</div>
          <div class="two-columns">${fieldTemplate('Cantidad de jugadores necesarios', '<input name="missingPlayers" min="1" type="number" value="1" />')}${fieldTemplate('Nivel de juego', `<select name="level">${levels.map((level) => `<option ${level === 'Intermedio' ? 'selected' : ''}>${level}</option>`).join('')}</select>`)}</div>
          ${fieldTemplate('Ubicación', '<input name="location" type="text" placeholder="Ej: Palermo" />')}
          ${fieldTemplate('Información adicional', '<textarea name="notes" placeholder="Jugamos amistoso. Llevar camiseta blanca." rows="4"></textarea>')}
          <button class="primary-button full" type="submit">Publicar Partido</button>
        </form>
      </div>
    </section>`;
}

function fieldTemplate(label, control) {
  return `<label class="field"><span>${label}</span>${control}</label>`;
}

function bindEvents() {
  document.querySelector('[data-action="create"]')?.addEventListener('click', () => { screen = 'create'; render(); });
  document.querySelector('[data-action="back"]')?.addEventListener('click', () => { screen = 'home'; render(); });
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.filter; render(); }));
  document.querySelectorAll('[data-join]').forEach((button) => button.addEventListener('click', () => {
    matches = matches.map((match) => match.id === Number(button.dataset.join) ? { ...match, missingPlayers: Math.max(match.missingPlayers - 1, 0) } : match);
    render();
  }));
  document.querySelector('#match-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.target));
    matches = [{
      id: Date.now(), sport: form.sport, category: form.sport === 'Fútbol' ? 'Fútbol Masculino' : form.sport,
      level: form.level, date: form.date || 'Fecha a definir', time: form.time || 'Horario a definir',
      location: form.location || 'Ubicación a confirmar', missingPlayers: Math.max(Number(form.missingPlayers || 1), 1), notes: form.notes || 'Sin información adicional.',
    }, ...matches];
    activeFilter = 'Todos'; screen = 'home'; render();
  });
}

render();
