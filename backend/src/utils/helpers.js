export function getFullName(user) {
  return `${user?.nombre ?? ''}${user?.apellido ? ` ${user.apellido}` : ''}`.trim() || 'Usuario';
}

export function asNumber(value) {
  return Number.parseInt(String(value), 10);
}

export function normalizePhone(phone) {
  return String(phone ?? '').replace(/[^\d+]/g, '');
}

export function buildWhatsAppLink(phone, message) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`;
}


export function normalizeRequirements(requirements) {
  if (Array.isArray(requirements)) return requirements.map((item) => String(item).trim()).filter(Boolean);
  if (!requirements) return [];
  if (typeof requirements === 'string') {
    try {
      const parsed = JSON.parse(requirements);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      return requirements.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

export function mapSupabaseError(error) {
  if (!error) return null;
  return { message: error.message, code: error.code, details: error.details, hint: error.hint };
}

export function shapeOpenRide(request, requester) {
  return {
    id: request.id,
    requesterId: request.idSolicitante,
    requesterName: getFullName(requester),
    requesterPhone: requester?.telefono ?? null,
    origin: request.lugarDeSalida,
    destination: request.lugarDeLlegada,
    departureDate: request.diaSalida,
    departureTime: request.horarioDeSalida,
    seatsNeeded: Number(request.espaciosSolicitados),
    seatsAvailable: Number(request.espaciosSolicitados),
    requirements: normalizeRequirements(request.requisitos),
    requested: true
  };
}

export function isRideDue(date, time) {
  if (!date || !time) return false;
  const rideDate = new Date(`${date}T${String(time).slice(0, 8)}`);
  if (Number.isNaN(rideDate.getTime())) return false;
  return rideDate <= new Date();
}

export function shapeReservation({ trip, request, currentUserId, requester, conductor }) {
  const isPassenger = Number(request.idSolicitante) === Number(currentUserId);
  const otherPerson = isPassenger ? conductor : requester;
  const role = isPassenger ? 'passenger' : 'driver';
  const message = `Hola ${getFullName(otherPerson)}, soy ${isPassenger ? 'la persona que pidió' : 'la persona que aceptó'} la reserva del viaje de ${request.lugarDeSalida} a ${request.lugarDeLlegada}. Me quedó una duda y quería consultarte:`;

  return {
    id: `trip-${trip.id}`,
    tripId: trip.id,
    rideId: request.id,
    role,
    roleLabel: isPassenger ? 'Viaje que pediste' : 'Viaje que aceptaste',
    otherPersonName: getFullName(otherPerson),
    otherContactPhone: otherPerson?.telefono ?? null,
    whatsappLink: buildWhatsAppLink(otherPerson?.telefono, message),
    requesterName: getFullName(requester),
    conductorName: getFullName(conductor),
    origin: request.lugarDeSalida,
    destination: request.lugarDeLlegada,
    deparutureDate: request.diaSalida,
    departureTime: request.horarioDeSalida,
    seatsReserved: Number(request.espaciosSolicitados),
    requirements: normalizeRequirements(request.requisitos),
    status: 'active',
    canComplete: isRideDue(request.diaSalida, request.horarioDeSalida),
    carDescription: trip.descripcionAuto ?? '',
    carPlate: trip.patenteAuto ?? ''
  };
}
