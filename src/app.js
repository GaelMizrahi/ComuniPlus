import { createElement, field, optionList } from './components/ui.js';
import { initialMatches, levels, sportFilters, sports } from './data/matches.js';

const state = {
  screen: 'matches',
  activeFilter: 'Todos',
  matches: [...initialMatches],
};

function setState(nextState) {
  Object.assign(state, nextState);
  render();
}

function formatDateLabel(value) {
  const [year, month, day] = value.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'short' }).format(
    new Date(year, month - 1, day),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function createIcon(name) {
  return createElement('span', { className: 'icon', 'aria-hidden': 'true', text: name });
}

function renderMissingPlayerScreen() {
  const availableMatches = state.matches.filter((match) => match.playersNeeded > 0);
  const filteredMatches =
    state.activeFilter === 'Todos'
      ? availableMatches
      : availableMatches.filter((match) => match.category === state.activeFilter);

  const hero = createElement('div', { className: 'hero-card' }, [
    createElement('div', {}, [
      createElement('p', { className: 'eyebrow', text: 'ComuniPlus Deportes' }),
      createElement('h1', { text: '¿Falta un jugador?' }),
      createElement('p', {
        className: 'hero-description',
        text: '¿Te falta alguien para completar el equipo? Publicá tu partido o encontrá uno disponible para sumarte.',
      }),
    ]),
    createElement('button', { className: 'primary-button', type: 'button', onClick: () => setState({ screen: 'create' }) }, [
      createElement('span', { text: '➕ Crear partido' }),
    ]),
  ]);

  const filters = createElement(
    'div',
    { className: 'filter-row', 'aria-label': 'Filtros deportivos' },
    sportFilters.map((filter) =>
      createElement('button', {
        className: `filter-chip ${state.activeFilter === filter ? 'active' : ''}`,
        type: 'button',
        text: filter,
        onClick: () => setState({ activeFilter: filter }),
      }),
    ),
  );

  const heading = createElement('div', { className: 'section-heading' }, [
    createElement('div', {}, [
      createElement('h2', { text: 'Partidos disponibles' }),
      createElement('p', { text: `${filteredMatches.length} convocatorias abiertas` }),
    ]),
  ]);

  const grid = createElement('div', { className: 'match-grid' }, filteredMatches.map(renderMatchCard));
  const children = [hero, filters, heading, grid];

  if (filteredMatches.length === 0) {
    children.push(
      createElement('div', { className: 'empty-state' }, [
        createElement('div', { className: 'empty-icon', text: '👥' }),
        createElement('h3', { text: 'No hay partidos disponibles' }),
        createElement('p', { text: 'Probá con otro deporte o creá una nueva convocatoria.' }),
      ]),
    );
  }

  return createElement('section', { className: 'screen fade-in' }, children);
}

function renderMatchCard(match) {
  const missingText = match.playersNeeded === 1 ? 'Falta 1 jugador' : `Faltan ${match.playersNeeded} jugadores`;

  return createElement('article', { className: 'match-card' }, [
    createElement('div', { className: 'card-topline' }, [
      createElement('span', { className: 'sport-pill', text: match.category }),
      createElement('span', { className: 'status-pill', text: 'Disponible' }),
    ]),
    createElement('h3', { text: match.sport }),
    createElement('p', { className: 'level-label', text: match.level }),
    createElement('div', { className: 'match-details' }, [
      createElement('span', {}, [createIcon('📅'), match.day]),
      createElement('span', {}, [createIcon('🕒'), match.time]),
      createElement('span', {}, [createIcon('📍'), match.location]),
    ]),
    createElement('p', { className: 'notes', text: match.notes }),
    createElement('div', { className: 'card-footer' }, [
      createElement('strong', { text: missingText }),
      createElement('button', {
        className: 'secondary-button',
        type: 'button',
        text: 'Unirme',
        onClick: () => joinMatch(match.id),
      }),
    ]),
  ]);
}

function joinMatch(matchId) {
  setState({
    matches: state.matches.map((match) =>
      match.id === matchId ? { ...match, playersNeeded: Math.max(match.playersNeeded - 1, 0) } : match,
    ),
  });
}

function renderCreateMatchScreen() {
  const form = createElement('form', { className: 'match-form', onSubmit: handleCreateMatch }, [
    field('Deporte', createElement('select', { name: 'sport' }, optionList(sports))),
    createElement('div', { className: 'form-row' }, [
      field('Fecha', createElement('input', { name: 'date', required: true, type: 'date' })),
      field('Horario', createElement('input', { name: 'time', required: true, type: 'time' })),
    ]),
    createElement('div', { className: 'form-row' }, [
      field(
        'Cantidad de jugadores necesarios',
        createElement('input', { name: 'playersNeeded', min: '1', required: true, type: 'number', value: '1' }),
      ),
      field('Nivel de juego', createElement('select', { name: 'level' }, optionList(levels))),
    ]),
    field('Ubicación', createElement('input', { name: 'location', required: true, type: 'text', placeholder: 'Ej: Palermo' })),
    field(
      'Información adicional',
      createElement('textarea', { name: 'notes', placeholder: 'Jugamos amistoso. Llevar camiseta blanca.' }),
    ),
    createElement('button', { className: 'primary-button full-width', type: 'submit', text: 'Publicar Partido' }),
  ]);

  return createElement('section', { className: 'screen fade-in' }, [
    createElement('button', {
      className: 'back-button',
      type: 'button',
      text: '← Volver',
      onClick: () => setState({ screen: 'matches' }),
    }),
    createElement('div', { className: 'form-card' }, [
      createElement('p', { className: 'eyebrow', text: 'Nueva convocatoria' }),
      createElement('h1', { text: 'Crear Partido' }),
      createElement('p', {
        className: 'form-description',
        text: 'Completá los datos para publicar el partido y encontrar a quienes faltan.',
      }),
      form,
    ]),
  ]);
}

function handleCreateMatch(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const sport = formData.get('sport');

  const match = {
    id: Date.now(),
    sport,
    category: sport,
    level: formData.get('level'),
    day: formatDateLabel(formData.get('date')),
    time: formData.get('time'),
    location: formData.get('location'),
    playersNeeded: Number(formData.get('playersNeeded')),
    notes: formData.get('notes') || 'Sin información adicional.',
  };

  setState({ matches: [match, ...state.matches], screen: 'matches', activeFilter: 'Todos' });
}

function render() {
  const root = document.getElementById('root');
  root.replaceChildren(state.screen === 'matches' ? renderMissingPlayerScreen() : renderCreateMatchScreen());
}

render();
