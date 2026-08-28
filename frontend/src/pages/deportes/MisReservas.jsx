import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Layout from '../../components/layout/Layout.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import ElevatedCard from '../../components/ui/ElevatedCard.jsx';
import DatePill from '../../components/ui/DatePill.jsx';
import Toast from '../../components/ui/Toast.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

import { cancelReserva, getMisReservas } from '../../services/deportesApi.js';

const canCancel = (reservation) => {
  const date = reservation.date || reservation.fecha;
  const time = reservation.time || reservation.horario;

  const startsAt = new Date(
    `${date}T${String(time ?? '').slice(0, 5)}:00`
  );

  return (
    Number.isFinite(startsAt.getTime()) &&
    startsAt.getTime() > Date.now() + 36 * 60 * 60 * 1000
  );
};

export default function MisReservas({
  user,
  token,
  onLogout,
  Layout: LayoutProp
}) {
  const L = LayoutProp || Layout;
  const nav = useNavigate();

  const [reservas, setReservas] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);

      const data = await getMisReservas(token);

      setReservas(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error?.status === 401) {
        return onLogout();
      }

      setToast({
        message: error?.message || 'No se pudieron cargar tus reservas.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (reservation) => {
    setToast(null);

    if (!canCancel(reservation)) {
      setToast({
        message:
          'Solo podés cancelar reservas con más de 36 horas de anticipación.',
        type: 'error'
      });

      return;
    }

    try {
      await cancelReserva(token, reservation.id);

      setToast({
        message: 'Reserva cancelada correctamente.',
        type: 'success'
      });

      await load();
    } catch (error) {
      if (error?.status === 401) {
        return onLogout();
      }

      setToast({
        message: error?.message || 'No se pudo cancelar la reserva.',
        type: 'error'
      });
    }
  };

  return (
    <L>
      {toast && (
        <Toast
          {...toast}
          onClose={() => setToast(null)}
        />
      )}

      <button
        type="button"
        onClick={() => nav(-1)}
        className="flex items-center gap-1 text-[13px] font-semibold text-text-muted mb-6 active:opacity-60 transition-opacity"
      >
        ← Volver
      </button>

      <SectionHeader
        eyebrow="Deportes"
        title="Mis reservas"
      />

      <p className="text-[13px] text-text-muted mb-5">
        Consultá tus reservas deportivas y gestioná tus próximos horarios.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-28 rounded-[18px] skeleton"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reservas.map((reservation, index) => {
            const date =
              reservation.date || reservation.fecha;

            const time =
              reservation.time || reservation.horario;

            const sport =
              reservation.sport || reservation.deporte;

            const court =
              reservation.courtName ||
              reservation.court ||
              reservation.cancha ||
              'Cancha';

            const status =
              reservation.status ||
              reservation.estado ||
              'Confirmada';

            const cancellable = canCancel(reservation);

            return (
              <ElevatedCard
                key={reservation.id}
                className="p-4 animate-slide-up"
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    {sport && (
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">
                        {sport}
                      </p>
                    )}

                    <p className="text-[14px] font-bold mt-0.5 truncate">
                      {court}
                    </p>
                  </div>

                  <DatePill
                    date={date}
                    time={time}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border-subtle gap-3">
                  <span
                    className={`text-[12px] font-semibold ${
                      String(status).toLowerCase() === 'cancelada'
                        ? 'text-danger'
                        : 'text-text-muted'
                    }`}
                  >
                    {status}
                  </span>

                  {String(status).toLowerCase() !== 'cancelada' && (
                    <button
                      type="button"
                      disabled={!cancellable}
                      onClick={() => cancel(reservation)}
                      className={`text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-opacity ${
                        cancellable
                          ? 'text-danger active:opacity-60'
                          : 'text-text-muted/40 cursor-not-allowed'
                      }`}
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                {!cancellable &&
                  String(status).toLowerCase() !== 'cancelada' && (
                    <p className="text-[11px] text-text-muted mt-2">
                      Disponible para cancelar hasta 36 horas antes del horario reservado.
                    </p>
                  )}
              </ElevatedCard>
            );
          })}

          {reservas.length === 0 && (
            <EmptyState
              icon="🏟️"
              message="No tenés reservas deportivas"
            />
          )}
        </div>
      )}
    </L>
  );
}