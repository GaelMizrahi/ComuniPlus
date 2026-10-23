import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { marketRequest } from '../services/marketApi.js';
import Layout from '../components/layout/Layout.jsx';
import './Mercado.css';

const money = (price) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
const availability = { 1: 'Disponible', 2: 'Reservado', 3: 'Vendido' };
const localDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const publicationLabel = (item) => !item.visible ? 'Oculta'
  : item.publishFrom && Date.parse(item.publishFrom) > Date.now() ? 'Programada'
  : item.publishUntil && Date.parse(item.publishUntil) <= Date.now() ? 'Finalizada'
  : item.isPublished ? 'Visible' : 'No visible';
const dateLabel = (value) => new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

function LikeButton({ item, busy, like }) {
  return <button className={`btn market-like ${item.liked ? 'liked' : 'light'}`} disabled={busy || (!item.canLike && !item.liked)}
    aria-pressed={item.liked} aria-label={`${item.liked ? 'Quitar like a' : 'Dar like a'} ${item.title}`} onClick={() => like(item)}>
    <span aria-hidden="true">{item.liked ? '♥' : '♡'}</span> {item.liked ? 'Te gusta' : 'Like'}
  </button>;
}

function Modal({ title, children, close, busy = false }) {
  const ref = useRef();
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} className="market-dialog" aria-label={title} onCancel={(e) => { e.preventDefault(); if (!busy) close(); }}>
    <div className="market-dialog-head"><h2>{title}</h2><button className="btn light" onClick={close} disabled={busy} aria-label="Cerrar">×</button></div>
    {children}
  </dialog>;
}

function Editor({ item, categories, save, close, busy }) {
  const [form, setForm] = useState(() => ({
    ...(item ?? { title: '', description: '', price: '', category: '', condition: '2', type: 'producto' }),
    visible: item?.visible ?? true, publishFrom: localDateInput(item?.publishFrom), publishUntil: localDateInput(item?.publishUntil)
  }));
  const [photo, setPhoto] = useState();
  const [preview, setPreview] = useState(item?.image);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const reader = useRef();
  useEffect(() => () => reader.current?.abort(), []);
  const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const choosePhoto = (event) => {
    reader.current?.abort();
    setPhoto(undefined); setPreview(item?.image); setError(''); setReading(false);
    const files = event.target.files;
    if (!files?.length) return;
    const file = files[0];
    if (files.length !== 1 || file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Elegí una sola imagen JPEG, PNG o WebP de hasta 5 MB.');
      event.target.value = '';
      return;
    }
    const active = new FileReader(); reader.current = active; setReading(true);
    active.onload = () => {
      setPhoto({ mimeType: file.type, data: String(active.result).split(',')[1] });
      setPreview(String(active.result)); setReading(false);
    };
    active.onerror = () => { setError('No se pudo leer la imagen.'); setReading(false); };
    active.readAsDataURL(file);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy || reading) return;
    if (!item && !photo) return setError('La foto es obligatoria.');
    setError('');
    try {
      const publishFrom = form.publishFrom ? new Date(form.publishFrom).toISOString() : null;
      const publishUntil = form.publishUntil ? new Date(form.publishUntil).toISOString() : null;
      if (publishFrom && publishUntil && publishFrom >= publishUntil) return setError('Hasta debe ser posterior a Desde.');
      await save({ ...form, publishFrom, publishUntil, price: Number(form.price), ...(photo ? { photo } : {}) });
    }
    catch (error) { setError(error.message); }
  };
  return <Modal title={item ? 'Editar publicación' : 'Nueva publicación'} close={close} busy={busy || reading}>
    <form onSubmit={submit}>
      <fieldset disabled={busy || reading} className="market-fieldset">
        <label htmlFor="market-title">Título</label><input id="market-title" className="field" required maxLength={120} value={form.title} onChange={(e) => change('title', e.target.value)} />
        <label htmlFor="market-description">Descripción</label><textarea id="market-description" className="field" required maxLength={4000} rows={4} value={form.description} onChange={(e) => change('description', e.target.value)} />
        <label htmlFor="market-price">Precio ($)</label><input id="market-price" className="field" type="number" min="0" max="999999999999.99" step="0.01" required value={form.price} onChange={(e) => change('price', e.target.value)} />
        <label htmlFor="market-category">Categoría</label><select id="market-category" className="field" required value={form.category} onChange={(e) => change('category', e.target.value)}>
          <option value="">Elegí una categoría</option>{[...new Set([...categories, ...(item?.category ? [item.category] : [])])].map((category) => <option key={category}>{category}</option>)}
        </select>
        <div className="form-grid">
          <div><label htmlFor="market-condition">Condición</label><select id="market-condition" className="field" required value={form.condition} onChange={(e) => change('condition', e.target.value)}><option value="1">Nuevo</option><option value="2">Usado</option></select></div>
          <div><label htmlFor="market-type">Tipo</label><select id="market-type" className="field" required value={form.type} onChange={(e) => change('type', e.target.value)}><option value="producto">Producto</option><option value="propiedad">Propiedad</option></select></div>
        </div>
        <label htmlFor="market-visibility">Visibilidad</label>
        <select id="market-visibility" className="field" value={String(form.visible)} onChange={(e) => change('visible', e.target.value === 'true')}>
          <option value="true">Visible</option><option value="false">Oculta</option>
        </select>
        <p className="muted small">Visible respeta las fechas que elijas. Oculta queda guardada solo en Mis publicaciones.</p>
        <label htmlFor="market-from">Desde (opcional)</label>
        <input id="market-from" className="field" type="datetime-local" value={form.publishFrom} onChange={(e) => change('publishFrom', e.target.value)} />
        <label htmlFor="market-until">Hasta (opcional)</label>
        <input id="market-until" className="field" type="datetime-local" value={form.publishUntil} onChange={(e) => change('publishUntil', e.target.value)} />
        <p className="muted small">Hora local de tu dispositivo. Podés dejar ambas fechas vacías: sin Desde se publica ahora; sin Hasta no vence.</p>
        {(form.publishFrom || form.publishUntil) && <button type="button" className="btn light" onClick={() => setForm((previous) => ({ ...previous, publishFrom: '', publishUntil: '' }))}>Limpiar fechas</button>}
        <label htmlFor="market-photo">Una foto · hasta 5 MB</label><input id="market-photo" className="field" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} required={!item?.image} />
      </fieldset>
      {reading && <p role="status">Leyendo imagen…</p>}
      {preview && <img className="market-preview" src={preview} alt="Vista previa de la publicación" />}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn blue full" disabled={busy || reading}>{busy ? 'Guardando…' : item ? 'Guardar cambios' : !form.visible ? 'Guardar oculta' : form.publishFrom || form.publishUntil ? 'Guardar programación' : 'Publicar'}</button>
    </form>
  </Modal>;
}

export default function Mercado({ user, token, onLogout }) {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('public');
  const [config, setConfig] = useState({ categories: [] });
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ q: '', category: '', maxPrice: '', condition: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    const abort = new AbortController();
    marketRequest(token, '/config', { signal: abort.signal }).then((data) => { setConfig(data); setConfigError(''); }).catch((err) => {
      if (err.name !== 'AbortError') { setConfigError(err.message); if (err.status === 401) onLogout(); }
    });
    return () => abort.abort();
  }, [token, revision]);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError(''); setItems([]);
    const timer = setTimeout(async () => {
      const path = tab === 'mine' ? '/mis-publicaciones' : tab === 'likes' ? '/mis-likes' : `/productos?${new URLSearchParams(filters)}`;
      try { setItems(await marketRequest(token, path, { signal: abort.signal })); }
      catch (err) { if (err.name !== 'AbortError') { setError(err.message); if (err.status === 401) onLogout(); } }
      finally { if (!abort.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [token, tab, filters, revision]);

  useEffect(() => {
    setDetail(null); setDetailError('');
    if (!productId) return;
    const abort = new AbortController();
    marketRequest(token, `/productos/${encodeURIComponent(productId)}`, { signal: abort.signal }).then(setDetail).catch((err) => {
      if (err.name !== 'AbortError') { setDetailError(err.message); if (err.status === 401) onLogout(); }
    });
    return () => abort.abort();
  }, [token, productId, revision]);

  useEffect(() => {
    if (editor || deleting || busy) return;
    const refresh = () => { if (!document.hidden) setRevision((n) => n + 1); };
    const now = Date.now();
    const boundaries = [...items, ...(detail ? [detail] : [])]
      .flatMap((item) => [item.publishFrom, item.publishUntil]).filter(Boolean).map(Date.parse).filter((date) => date > now);
    const delay = Math.max(50, Math.min(30000, ...boundaries.map((date) => date - now + 25)));
    const timer = setTimeout(refresh, delay);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [items, detail, editor, deleting, busy, revision]);

  const mutate = async (operation, success) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setNotice(''); setError('');
    try {
      await operation(); setNotice(success); setRevision((n) => n + 1);
      setEditor(null); setDeleting(null);
      return true;
    } catch (err) {
      if (err.status === 401) onLogout();
      throw err;
    } finally { submitting.current = false; setBusy(false); }
  };
  const act = (path, method, success) => mutate(() => marketRequest(token, path, { method }), success).catch((err) => { setError(err.message); return false; });
  const like = (item) => mutate(() => marketRequest(token, `/productos/${item.id}/like`, { method: 'PUT', body: { liked: !item.liked } }), item.liked ? 'Quitaste el like.' : 'Agregaste la publicación a Mis likes.').catch((err) => setError(err.message));
  const filter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));
  const closeDetail = () => navigate('/mercado');

  return <Layout user={user} onLogout={onLogout} active="MERCADO">
    <div className="section-head"><div><p className="eyebrow">{user.community}</p><h1>Mercado</h1></div>
      <button className="btn blue" disabled={busy || !config.categories.length} onClick={() => setEditor({})}>+ Publicar</button></div>
    <p className="muted">Comprá y vendé dentro de tu comunidad.</p>
    <div className="chips market-tabs" aria-label="Secciones de Mercado">{[['public', 'Mercado'], ['mine', 'Mis publicaciones'], ['likes', 'Mis likes']].map(([key, label]) =>
      <button key={key} className={tab === key ? 'active' : ''} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'public' && <section className="market-filters" aria-label="Filtros">
      <label htmlFor="market-search">Buscar en título y descripción</label><input id="market-search" className="field" type="search" maxLength={150} value={filters.q} onChange={(e) => filter('q', e.target.value)} placeholder="¿Qué estás buscando?" />
      <label htmlFor="market-filter-category">Categoría</label><select id="market-filter-category" className="field" value={filters.category} onChange={(e) => filter('category', e.target.value)}><option value="">Todas</option>{config.categories.map((cat) => <option key={cat}>{cat}</option>)}</select>
      <div className="form-grid"><div><label htmlFor="market-maximum">Precio máximo</label><input id="market-maximum" type="number" min="0" step="0.01" className="field" value={filters.maxPrice} onChange={(e) => filter('maxPrice', e.target.value)} placeholder="Sin límite" /></div>
        <div><label htmlFor="market-filter-condition">Condición</label><select id="market-filter-condition" className="field" value={filters.condition} onChange={(e) => filter('condition', e.target.value)}><option value="">Todas</option><option value="1">Nuevo</option><option value="2">Usado</option></select></div></div>
      <p className="muted small">Más recientes primero · Los vendidos no se muestran</p>
    </section>}
    {(error || configError) && <div className="error" role="alert">{error || configError}<button className="btn light" onClick={() => setRevision((n) => n + 1)}>Reintentar</button></div>}
    {notice && <p className="ok notice" role="status">{notice}</p>}
    {loading ? <div role="status" aria-label="Cargando publicaciones" className="market-grid">{[1,2,3,4].map((id) => <div className="market-skeleton" key={id} />)}</div> :
      !error && !items.length ? <p className="empty-state">{tab === 'mine' ? 'Todavía no publicaste en esta comunidad.' : tab === 'likes' ? 'Todavía no marcaste publicaciones con like en esta comunidad.' : 'No encontramos publicaciones. Probá otros filtros o creá la primera.'}</p> :
      <div className="market-grid">{items.map((item) => <article className="market-card elevated-card" key={item.id}>
        <button className="market-card-link" onClick={() => navigate(`/mercado/productos/${item.id}`)}>
          {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <div className="market-no-photo">Sin foto</div>}
          <div className="market-card-info"><span className={`market-status status-${item.availability}`}>{availability[item.availability]}</span>
            <h2>{item.title}</h2><strong className="market-price">{money(item.price)}</strong>
            <p>{item.category} · {item.condition === 1 ? 'Nuevo' : 'Usado'}</p><p className="muted">{item.sellerName}</p>
          </div></button>
        <div className="market-card-actions"><LikeButton item={item} busy={busy} like={like} /></div>
        {item.isOwner && <div className="market-publication-info"><b>{publicationLabel(item)}</b>
          <p>{item.publishFrom ? `Desde: ${dateLabel(item.publishFrom)}` : 'Sin inicio programado'}</p>
          <p>{item.publishUntil ? `Hasta: ${dateLabel(item.publishUntil)}` : 'Sin vencimiento'}</p>
        </div>}
        {item.isOwner && <div className="market-card-actions"><button className="btn light" disabled={busy || item.availability === 3} onClick={() => setEditor({ item })}>Editar</button>
          <button className="btn green" disabled={busy || item.availability === 3} onClick={() => { if (window.confirm('¿Marcar esta publicación como vendida?')) act(`/productos/${item.id}/vendido`, 'PATCH', 'Publicación marcada como vendida.'); }}>Vendido</button></div>}
        {item.canDelete && <button className="btn light market-delete" disabled={busy} onClick={() => setDeleting(item)}>Eliminar</button>}
      </article>)}</div>}
    {productId && !editor && !deleting && <Modal title={detail?.title || 'Detalle de publicación'} close={closeDetail} busy={busy}>
      {detailError ? <p role="alert" className="error">{detailError}</p> : !detail ? <p role="status">Cargando publicación…</p> : <>
        {detail.image && <img className="market-preview" src={detail.image} alt={detail.title} />}
        <strong className="market-price">{money(detail.price)}</strong><p>{detail.category} · {detail.condition === 1 ? 'Nuevo' : 'Usado'} · {detail.type === 'propiedad' ? 'Propiedad' : 'Producto'}</p>
        <p className={`market-status status-${detail.availability}`}>{availability[detail.availability]}</p>
        <p className="market-description">{detail.description}</p><div className="contact-box"><strong>{detail.sellerName}</strong><p>Teléfono: {detail.sellerPhone || 'No disponible'}</p>
          {detail.whatsappLink && <a className="btn whatsapp" href={detail.whatsappLink} target="_blank" rel="noreferrer">Contactar por WhatsApp</a>}</div>
        <div className="market-detail-like"><LikeButton item={detail} busy={busy} like={like} /></div>
        {error && <p role="alert" className="error">{error}</p>}
        {notice && <p role="status" className="ok notice">{notice}</p>}
      </>}
    </Modal>}
    {editor && <Editor item={editor.item} categories={config.categories} busy={busy} close={() => setEditor(null)} save={(body) => mutate(() => marketRequest(token, editor.item ? `/productos/${editor.item.id}` : '/productos', { method: editor.item ? 'PUT' : 'POST', body }), editor.item ? 'Publicación actualizada.' : 'Publicación creada.')} />}
    {deleting && <Modal title="Eliminar publicación" close={() => setDeleting(null)} busy={busy}><p>¿Eliminar “{deleting.title}”? Dejará de mostrarse en Mercado y Mis likes. Se conservará el historial de ventas.</p>
      <button className="btn blue full" disabled={busy} onClick={async () => { const ok = await act(`/productos/${deleting.id}`, 'DELETE', 'Publicación eliminada.'); if (ok && String(productId) === String(deleting.id)) closeDetail(); }}>Confirmar eliminación</button>
      {error && <p className="error" role="alert">{error}</p>}
    </Modal>}
  </Layout>;
}
