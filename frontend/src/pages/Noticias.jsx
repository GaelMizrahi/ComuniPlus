import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import ClubLogo from '../components/ui/ClubLogo.jsx';
import { newsRequest } from '../services/newsApi.js';
import './Noticias.css';

const date = (value) => new Date(value).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
function Editor({ save, close, busy }) {
  const [title, setTitle] = useState(''), [text, setText] = useState('');
  const [photo, setPhoto] = useState(null), [preview, setPreview] = useState(''), [error, setError] = useState(''), [reading, setReading] = useState(false);
  const readId = useRef(0);
  const choose = (event) => {
    const version = ++readId.current;
    const file = event.target.files?.[0]; setPhoto(null); setPreview(''); setError(''); setReading(false);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) return setError('Elegí una imagen JPEG, PNG o WebP de hasta 5 MB');
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => { if (version === readId.current) { const value = String(reader.result); setPreview(value); setPhoto({ mimeType: file.type, data: value.split(',')[1] }); setReading(false); } };
    reader.onerror = () => { if (version === readId.current) { setReading(false); setError('No se pudo leer la imagen'); } };
    reader.readAsDataURL(file);
  };
  return <section className="news-editor" aria-label="Publicar noticia">
    <h2 className="text-lg font-bold">Nueva noticia</h2>
    <form onSubmit={async (event) => { event.preventDefault(); setError(''); if (!photo || reading) return setError('Seleccioná una imagen'); try { await save({ title, text, photo }); } catch (e) { setError(e.message); } }}>
      <fieldset disabled={busy}>
        <label htmlFor="news-title">Título</label><input id="news-title" className="field" required minLength={5} maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="news-text">Texto de la noticia</label><textarea id="news-text" className="field" required minLength={20} maxLength={8000} rows={7} value={text} onChange={(e) => setText(e.target.value)} />
        <label htmlFor="news-image">Imagen · hasta 5 MB</label><input id="news-image" type="file" accept="image/jpeg,image/png,image/webp" required onChange={choose} />
      </fieldset>
      {reading && <p role="status">Leyendo imagen…</p>}
      {preview && <img src={preview} alt="Vista previa de la noticia" className="news-image mt-3" />}
      {error && <p role="alert" className="error mt-3">{error}</p>}
      <div className="flex gap-2 mt-4"><button className="btn blue" disabled={busy || reading}>{busy ? 'Publicando…' : 'Publicar noticia'}</button>
        <button type="button" className="btn light" disabled={busy} onClick={close}>Cancelar</button></div>
    </form>
  </section>;
}

export default function Noticias({ user, onLogout }) {
  const { noticiaId } = useParams(), navigate = useNavigate();
  const [items, setItems] = useState([]), [detail, setDetail] = useState(null), [canPublish, setCanPublish] = useState(false);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(false), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const [page, setPage] = useState(0), [hasMore, setHasMore] = useState(false);
  const sending = useRef(false);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError(''); setCanPublish(false); setDetail(null); setEditor(false);
    newsRequest(noticiaId ? `/${encodeURIComponent(noticiaId)}` : `?page=${page}`, { signal: abort.signal }).then((data) => {
      setCanPublish(data.canPublish);
      if (noticiaId) setDetail(data.item);
      else { setItems((old) => page === 0 ? data.items : [...new Map([...old, ...data.items].map((item) => [item.id, item])).values()]); setHasMore(data.hasMore); }
    }).catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setItems([]); } }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [noticiaId, page, revision]);
  const reload = () => { setPage(0); setRevision((n) => n + 1); };
  const publish = async (data) => {
    if (sending.current) return;
    sending.current = true; setBusy(true); setNotice('');
    try { await newsRequest('', { method: 'POST', body: data }); setEditor(false); setNotice('Noticia publicada'); reload(); }
    finally { sending.current = false; setBusy(false); }
  };
  const remove = async (item) => {
    if (sending.current || !window.confirm(`¿Eliminar la noticia “${item.title}”?`)) return;
    sending.current = true; setBusy(true); setError('');
    try { await newsRequest(`/${item.id}`, { method: 'DELETE' }); setNotice('Noticia eliminada'); if (noticiaId) navigate('/noticias'); else reload(); }
    catch (e) { setError(e.message); }
    finally { sending.current = false; setBusy(false); }
  };
  return <Layout user={user} onLogout={onLogout} active="HOME">
    <div className="news-heading"><ClubLogo src={user.communityLogo} name={user.community} />
      <div className="min-w-0"><p className="text-xs text-text-muted break-words">{user.community}</p><h1 className="text-2xl font-extrabold">Noticias del club</h1></div></div>
    <Link to={noticiaId ? '/noticias' : '/home'} className="text-accent text-sm">← {noticiaId ? 'Todas las noticias' : 'Volver a Inicio'}</Link>
    {!noticiaId && canPublish && <button className="btn blue w-full mt-5" disabled={busy || loading} onClick={() => { setNotice(''); setEditor(true); }}>+ Publicar noticia</button>}
    {editor && canPublish && <Editor save={publish} busy={busy} close={() => setEditor(false)} />}
    {notice && <p role="status" className="notice ok mt-4">{notice}</p>}
    {error && <div role="alert" className="error mt-5"><p>{error}</p><button className="btn light mt-2" disabled={busy} onClick={reload}>Reintentar</button></div>}
    {loading && <p role="status" className="mt-5">Cargando noticias…</p>}
    {!loading && !error && !noticiaId && !items.length && <p className="empty-state mt-6">Todavía no hay noticias en este club.</p>}
    {!error && !editor && <div className="news-feed">{(noticiaId ? detail ? [detail] : [] : items).map((item) => <article key={item.id} className="news-card">
      <img src={item.image} alt={item.title} className="news-image" />
      <div className="news-body"><div className="flex flex-wrap gap-2 items-center text-xs text-text-muted"><time dateTime={item.publishedAt}>{date(item.publishedAt)}</time>{item.isDemo && <span className="news-demo">Ejemplo de demo</span>}</div>
        <h2 className="text-lg font-bold mt-2 break-words">{noticiaId ? item.title : <Link to={`/noticias/${item.id}`}>{item.title}</Link>}</h2>
        <p className={`news-text ${noticiaId ? '' : 'news-excerpt'}`}>{item.text}</p>
        {!noticiaId && <Link to={`/noticias/${item.id}`} className="text-accent font-semibold text-sm">Leer noticia</Link>}
        {canPublish && <button className="btn light mt-3 w-full" disabled={busy || loading} onClick={() => remove(item)}>Eliminar noticia</button>}
      </div>
    </article>)}</div>}
    {!noticiaId && hasMore && !error && <button className="btn light w-full mt-4" disabled={loading || busy} onClick={() => setPage((n) => n + 1)}>Ver más noticias</button>}
  </Layout>;
}
