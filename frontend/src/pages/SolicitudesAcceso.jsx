import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import { registrationRequest } from '../services/registrationApi.js';

export default function SolicitudesAcceso({user,token,onLogout}) {
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
  const sending=useRef(false);
  useEffect(()=>{
    const abort=new AbortController();setLoading(true);setError('');
    registrationRequest('/solicitudes-acceso',{token,signal:abort.signal}).then(setItems).catch((e)=>{
      if(e.name!=='AbortError'){setItems([]);setError(e.message);if(e.status===401)onLogout();}
    }).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[token,revision]);
  const decide=async(item,action)=>{
    if(sending.current)return;
    if(!window.confirm(`¿${action==='aprobar'?'Aprobar':'Rechazar'} la solicitud de ${item.fullName}?`))return;
    sending.current=true;setBusy(true);setError('');setNotice('');
    try{
      const result=await registrationRequest(`/solicitudes-acceso/${item.id}`,{token,method:'PATCH',body:{action}});
      setNotice(result.message);setRevision((n)=>n+1);
    }catch(e){setError(e.message);if(e.status===401)onLogout();}finally{sending.current=false;setBusy(false);}
  };
  return <Layout user={user} onLogout={onLogout} active="PERFIL">
    <Link to="/perfil" className="text-accent text-sm">← Volver a Perfil</Link>
    <h1 className="text-2xl font-extrabold mt-4">Solicitudes de acceso</h1>
    <p className="text-sm text-text-secondary mt-2">{user.community} · Revisá los datos y el número de socio antes de aprobar.</p>
    <button className="btn light mt-4" disabled={busy || loading} onClick={()=>setRevision((n)=>n+1)}>Actualizar</button>
    {error && <p role="alert" className="error mt-4">{error}</p>}
    {notice && <p role="status" className="notice ok mt-4">{notice}</p>}
    {loading ? <p role="status" className="mt-5">Cargando solicitudes…</p> : !error && !items.length ? <p className="empty-state mt-5">No hay solicitudes pendientes en esta comunidad.</p> :
      !error && <div className="grid gap-4 mt-5">{items.map((item)=><article key={item.id} className="elevated-card p-4">
        <h2 className="font-bold text-lg">{item.fullName}</h2><p className="mt-2">Socio #{item.membershipNumber}</p>
        <p className="break-words">Email: {item.email}</p><p>Teléfono: +{item.phone}</p>
        <p className="text-xs text-text-muted mt-2">{new Date(item.requestedAt).toLocaleString('es-AR')}</p>
        <div className="row"><button className="btn green" disabled={busy} onClick={()=>decide(item,'aprobar')}>Aprobar</button>
          <button className="btn light" disabled={busy} onClick={()=>decide(item,'rechazar')}>Rechazar</button></div>
      </article>)}</div>}
  </Layout>;
}
