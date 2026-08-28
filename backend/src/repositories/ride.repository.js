import { supabase } from '../config/index.js';

const REQUEST_COLUMNS =
  'id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida, requisitos';

const REQUEST_COLUMNS_FALLBACK =
  'id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida';

const TRIP_COLUMNS =
  'id, espaciosDisponibles, horarioDeSalida, descripcionAuto, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje, idComunidad, diaSalida';

const TRIP_COLUMNS_FALLBACK =
  'id, espaciosDisponibles, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje, idComunidad, diaSalida';

function isMissingRequirementsColumn(error) {
  return (
    error &&
    (
      String(error.message ?? '').includes('requisitos') ||
      String(error.details ?? '').includes('requisitos')
    )
  );
}

function isMissingTripOptionalColumn(error) {
  const text =
    `${error?.message ?? ''} ${error?.details ?? ''}`;

  return text.includes('descripcionAuto');
}

function shapeTripRow(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,

    // Compatibilidad con código viejo
    lugaresDisponibles:
      row.espaciosDisponibles ?? 0
  };
}

export async function getRequestById(rideId) {
  const { data, error } = await supabase
    .from('solicitudViaje')
    .select(REQUEST_COLUMNS)
    .eq('id', rideId)
    .maybeSingle();

  if (
    error &&
    isMissingRequirementsColumn(error)
  ) {
    const {
      data: fallbackData,
      error: fallbackError
    } = await supabase
      .from('solicitudViaje')
      .select(REQUEST_COLUMNS_FALLBACK)
      .eq('id', rideId)
      .maybeSingle();

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackData;
  }

  if (error) {
    throw error;
  }

  return data;
}

export async function findPendingRequests(zone) {
  let query = supabase
    .from('solicitudViaje')
    .select(REQUEST_COLUMNS)
    .order('id', {
      ascending: false
    });

  if (
    zone &&
    zone !== 'Todos los viajes'
  ) {
    query = query.or(
      `lugarDeSalida.ilike.%${zone}%,lugarDeLlegada.ilike.%${zone}%`
    );
  }

  const {
    data = [],
    error
  } = await query;

  if (
    error &&
    isMissingRequirementsColumn(error)
  ) {
    let fallbackQuery = supabase
      .from('solicitudViaje')
      .select(REQUEST_COLUMNS_FALLBACK)
      .order('id', {
        ascending: false
      });

    if (
      zone &&
      zone !== 'Todos los viajes'
    ) {
      fallbackQuery = fallbackQuery.or(
        `lugarDeSalida.ilike.%${zone}%,lugarDeLlegada.ilike.%${zone}%`
      );
    }

    const {
      data: fallbackData = [],
      error: fallbackError
    } = await fallbackQuery;

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackData;
  }

  if (error) {
    throw error;
  }

  return data;
}

export async function findAcceptedRequestIds(
  requestIds
) {
  if (requestIds.length === 0) {
    return new Set();
  }

  const {
    data: trips = [],
    error
  } = await supabase
    .from('Viaje')
    .select('idSolicitudViaje')
    .in(
      'idSolicitudViaje',
      requestIds
    );

  if (error) {
    throw error;
  }

  return new Set(
    trips.map(
      (trip) =>
        trip.idSolicitudViaje
    )
  );
}

export async function createRequest({
  seats,
  departureTime,
  origin,
  destination,
  requesterUserId,
  date,
  communityId,
  requirements = []
}) {
  console.log(
    '===== CREATE REQUEST ====='
  );

  console.log({
    seats,
    departureTime,
    origin,
    destination,
    requesterUserId,
    date,
    communityId
  });

  const {
    data,
    error
  } = await supabase
    .from('solicitudViaje')
    .insert({
      espaciosSolicitados:
        seats,

      horarioDeSalida:
        departureTime,

      lugarDeSalida:
        String(origin).trim(),

      lugarDeLlegada:
        String(destination).trim(),

      idSolicitante:
        requesterUserId,

      idComunidad:
        communityId,

      diaSalida:
        date,

      requisitos:
        requirements
    })
    .select(REQUEST_COLUMNS)
    .single();

  if (
    error &&
    isMissingRequirementsColumn(error)
  ) {
    const {
      data: fallbackData,
      error: fallbackError
    } = await supabase
      .from('solicitudViaje')
      .insert({
        espaciosSolicitados:
          seats,

        horarioDeSalida:
          departureTime,

        lugarDeSalida:
          String(origin).trim(),

        lugarDeLlegada:
          String(destination).trim(),

        idSolicitante:
          requesterUserId,

        idComunidad:
          communityId,

        diaSalida:
          date
      })
      .select(
        REQUEST_COLUMNS_FALLBACK
      )
      .single();

    if (fallbackError) {
      console.error(
        '===== ERROR CREATE REQUEST FALLBACK ====='
      );

      console.error(
        fallbackError
      );

      throw fallbackError;
    }

    return fallbackData;
  }

  if (error) {
    console.error(
      '===== ERROR CREATE REQUEST ====='
    );

    console.error(error);

    throw error;
  }

  console.log(
    '===== CREATE REQUEST OK ====='
  );

  console.log(data);

  return data;
}

export async function findTripByRequestId(
  requestId
) {
  const {
    data,
    error
  } = await supabase
    .from('Viaje')
    .select(TRIP_COLUMNS)
    .eq(
      'idSolicitudViaje',
      requestId
    )
    .limit(1)
    .maybeSingle();

  if (
    error &&
    isMissingTripOptionalColumn(error)
  ) {
    const {
      data: fallbackData,
      error: fallbackError
    } = await supabase
      .from('Viaje')
      .select(
        TRIP_COLUMNS_FALLBACK
      )
      .eq(
        'idSolicitudViaje',
        requestId
      )
      .limit(1)
      .maybeSingle();

    if (fallbackError) {
      throw fallbackError;
    }

    return shapeTripRow(
      fallbackData
    );
  }

  if (error) {
    throw error;
  }

  return shapeTripRow(data);
}

export async function createTrip({
  espaciosDisponibles,
  horarioDeSalida,
  descripcionAuto,
  lugarDeSalida,
  lugarDeLlegada,
  conductorId,
  requestId,
  communityId,
  diaSalida
}) {
  const cantidadEspacios =
    Number(espaciosDisponibles) || 1;

  const descripcion =
    String(descripcionAuto ?? '').trim();

  console.log(
    '===== CREATE TRIP ====='
  );

  console.log({
    espaciosDisponibles:
      cantidadEspacios,

    horarioDeSalida,

    descripcionAuto:
      descripcion,

    lugarDeSalida,

    lugarDeLlegada,

    conductorId,

    requestId,

    communityId,

    diaSalida
  });

  const {
    data,
    error
  } = await supabase
    .from('Viaje')
    .insert({
      espaciosDisponibles:
        cantidadEspacios,

      horarioDeSalida,

      descripcionAuto:
        descripcion,

      lugarDeSalida,

      lugarDeLlegada,

      idConductor:
        conductorId,

      idSolicitudViaje:
        requestId,

      idComunidad:
        communityId,

      diaSalida
    })
    .select(TRIP_COLUMNS)
    .single();

  if (
    error &&
    isMissingTripOptionalColumn(error)
  ) {
    console.warn(
      'descripcionAuto no está disponible en Viaje. Usando fallback.'
    );

    const {
      data: fallbackData,
      error: fallbackError
    } = await supabase
      .from('Viaje')
      .insert({
        espaciosDisponibles:
          cantidadEspacios,

        horarioDeSalida,

        lugarDeSalida,

        lugarDeLlegada,

        idConductor:
          conductorId,

        idSolicitudViaje:
          requestId,

        idComunidad:
          communityId,

        diaSalida
      })
      .select(
        TRIP_COLUMNS_FALLBACK
      )
      .single();

    if (fallbackError) {
      console.error(
        '===== ERROR CREATE TRIP FALLBACK ====='
      );

      console.error(
        fallbackError
      );

      throw fallbackError;
    }

    console.log(
      '===== CREATE TRIP FALLBACK OK ====='
    );

    console.log(
      fallbackData
    );

    return {
      ...shapeTripRow(
        fallbackData
      ),

      descripcionAuto: ''
    };
  }

  if (error) {
    console.error(
      '===== ERROR CREATE TRIP ====='
    );

    console.error(error);

    throw error;
  }

  console.log(
    '===== CREATE TRIP OK ====='
  );

  console.log(data);

  return shapeTripRow(data);
}

export async function createCommunityTrip(
  communityId,
  tripId
) {
  const {
    error
  } = await supabase
    .from('ComunidadViaje')
    .insert({
      idComunidad:
        communityId,

      idViaje:
        tripId
    });

  if (error) {
    console.error(
      '===== ERROR CREATE COMMUNITY TRIP ====='
    );

    console.error(error);

    throw error;
  }
}

export async function findPassengerRequests(
  userId
) {
  const {
    data = [],
    error
  } = await supabase
    .from('solicitudViaje')
    .select(REQUEST_COLUMNS)
    .eq(
      'idSolicitante',
      userId
    );

  if (
    error &&
    isMissingRequirementsColumn(error)
  ) {
    const {
      data: fallbackData = [],
      error: fallbackError
    } = await supabase
      .from('solicitudViaje')
      .select(
        REQUEST_COLUMNS_FALLBACK
      )
      .eq(
        'idSolicitante',
        userId
      );

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackData;
  }

  if (error) {
    throw error;
  }

  return data;
}

export async function findTripsByRequestIds(
  requestIds
) {
  if (
    requestIds.length === 0
  ) {
    return [];
  }

  const {
    data = [],
    error
  } = await supabase
    .from('Viaje')
    .select(TRIP_COLUMNS)
    .in(
      'idSolicitudViaje',
      requestIds
    );

  if (
    error &&
    isMissingTripOptionalColumn(error)
  ) {
    const {
      data: fallbackData = [],
      error: fallbackError
    } = await supabase
      .from('Viaje')
      .select(
        TRIP_COLUMNS_FALLBACK
      )
      .in(
        'idSolicitudViaje',
        requestIds
      );

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackData.map(
      shapeTripRow
    );
  }

  if (error) {
    throw error;
  }

  return data.map(
    shapeTripRow
  );
}

export async function findDriverTrips(
  userId
) {
  const {
    data = [],
    error
  } = await supabase
    .from('Viaje')
    .select(TRIP_COLUMNS)
    .eq(
      'idConductor',
      userId
    );

  if (
    error &&
    isMissingTripOptionalColumn(error)
  ) {
    const {
      data: fallbackData = [],
      error: fallbackError
    } = await supabase
      .from('Viaje')
      .select(
        TRIP_COLUMNS_FALLBACK
      )
      .eq(
        'idConductor',
        userId
      );

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackData.map(
      shapeTripRow
    );
  }

  if (error) {
    throw error;
  }

  return data.map(
    shapeTripRow
  );
}

export async function findRequestsByIds(
  requestIds
) {
  if (
    requestIds.length === 0
  ) {
    return [];
  }

  const {
    data = [],
    error
  } = await supabase
    .from('solicitudViaje')
    .select(REQUEST_COLUMNS)
    .in(
      'id',
      requestIds
    );

  if (
    error &&
    isMissingRequirementsColumn(error)
  ) {
    const {
      data: fallbackData = [],
      error: fallbackError
    } = await supabase
      .from('solicitudViaje')
      .select(
        REQUEST_COLUMNS_FALLBACK
      )
      .in(
        'id',
        requestIds
      );

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackData;
  }

  if (error) {
    throw error;
  }

  return data;
}

export async function findTripById(
  tripId
) {
  const {
    data,
    error
  } = await supabase
    .from('Viaje')
    .select(
      'id, idConductor, idSolicitudViaje'
    )
    .eq(
      'id',
      tripId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCommunityTripsByTripId(
  tripId
) {
  const {
    error
  } = await supabase
    .from('ComunidadViaje')
    .delete()
    .eq(
      'idViaje',
      tripId
    );

  if (error) {
    throw error;
  }
}

export async function deleteCommunityTripsByTripIds(
  tripIds
) {
  if (
    tripIds.length === 0
  ) {
    return;
  }

  const {
    error
  } = await supabase
    .from('ComunidadViaje')
    .delete()
    .in(
      'idViaje',
      tripIds
    );

  if (error) {
    throw error;
  }
}

export async function deleteTrip(
  tripId
) {
  const {
    error
  } = await supabase
    .from('Viaje')
    .delete()
    .eq(
      'id',
      tripId
    );

  return error;
}

export async function deleteTripsByRequestId(
  rideId
) {
  const {
    error
  } = await supabase
    .from('Viaje')
    .delete()
    .eq(
      'idSolicitudViaje',
      rideId
    );

  if (error) {
    throw error;
  }
}

export async function deleteRequest(
  rideId
) {
  const {
    error
  } = await supabase
    .from('solicitudViaje')
    .delete()
    .eq(
      'id',
      rideId
    );

  return error;
}

export async function findTripsByRequestId(
  rideId
) {
  const {
    data = [],
    error
  } = await supabase
    .from('Viaje')
    .select('id')
    .eq(
      'idSolicitudViaje',
      rideId
    );

  if (error) {
    throw error;
  }

  return data;
}