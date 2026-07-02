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

export function normalizeRestrictions(restrictions) {
  return Array.isArray(restrictions)
    ? restrictions.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export function generateWhatsappLink(phoneNumber, reservation, currentUser) {
  const cleanPhoneNumber = String(phoneNumber ?? '').replace(/\D/g, '');
  if (!cleanPhoneNumber) return null;

  const restrictions = normalizeRestrictions(reservation?.restrictions).length
    ? normalizeRestrictions(reservation.restrictions).join(', ')
    : 'sin restricciones especiales';
  const travelerName = currentUser ? getFullName(currentUser) : 'un usuario de la app';
  const message = `Hola, ¿cómo estás? Soy ${travelerName}. Sé que pediste un viaje desde ${reservation.origin} hasta ${reservation.destination} para el ${reservation.departureDate ?? 'día acordado'} a las ${reservation.departureTime ?? 'hora acordada'} con estas restricciones: ${restrictions}. Nos comunicamos por acá. Si te queda alguna duda, avisame.`;

  return `https://wa.me/${cleanPhoneNumber}?text=${encodeURIComponent(message)}`;
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
    observations: request.observaciones ?? '',
    restrictions: normalizeRestrictions(request.restricciones),
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
  const reservationData = {
    origin: request.lugarDeSalida,
    destination: request.lugarDeLlegada,
    departureDate: request.diaSalida,
    departureTime: request.horarioDeSalida,
    restrictions: normalizeRestrictions(request.restricciones)
  };

  return {
    id: `trip-${trip.id}`,
    tripId: trip.id,
    rideId: request.id,
    role,
    roleLabel: isPassenger ? 'Viaje que pediste' : 'Viaje que aceptaste',
    otherPersonName: getFullName(otherPerson),
    otherContactPhone: otherPerson?.telefono ?? null,
    whatsappLink: generateWhatsappLink(otherPerson?.telefono, reservationData, isPassenger ? requester : conductor),
    requesterName: getFullName(requester),
    conductorName: getFullName(conductor),
    origin: request.lugarDeSalida,
    destination: request.lugarDeLlegada,
    departureDate: request.diaSalida,
    departureTime: request.horarioDeSalida,
    seatsReserved: Number(request.espaciosSolicitados),
    observations: request.observaciones ?? '',
    restrictions: reservationData.restrictions,
    status: 'active',
    canComplete: isRideDue(request.diaSalida, request.horarioDeSalida),
    carDescription: trip.descripcionAuto ?? '',
    carPlate: trip.patenteAuto ?? ''
  };
}
