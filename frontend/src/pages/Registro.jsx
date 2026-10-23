import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { registrationRequest } from '../services/registrationApi.js';

const field = 'field w-full';
const empty = { firstName:'',lastName:'',email:'',phone:'',membershipNumber:'',communityId:'',password:'',confirmPassword:'' };
export default function Registro() {
  const [form,setForm]=useState(empty);
  const [communities,setCommunities]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [communityError,setCommunityError]=useState('');
  const [revision,setRevision]=useState(0);
  const [success,setSuccess]=useState('');
  const sending=useRef(false);
  useEffect(()=>{
    const abort=new AbortController(); setLoading(true); setCommunityError('');
    registrationRequest('/registro/comunidades',{signal:abort.signal}).then(setCommunities).catch((e)=>{
      if(e.name!=='AbortError') setCommunityError(e.message);
    }).finally(()=>{if(!abort.signal.aborted) setLoading(false);});
    return()=>abort.abort();
  },[revision]);
  const change=(key,value)=>setForm((previous)=>({...previous,[key]:value}));
  const submit=async(event)=>{
    event.preventDefault(); if(sending.current)return;
    setError('');
    if(form.password!==form.confirmPassword)return setError('Las contraseñas no coinciden');
    if(!form.password.trim())return setError('Ingresá una contraseña de al menos 12 caracteres');
    sending.current=true; setBusy(true);
    try{
      const result=await registrationRequest('/registro',{method:'POST',body:form});
      setForm(empty); setSuccess(result.message);
    }catch(e){setError(e.message);}finally{sending.current=false;setBusy(false);}
  };
  return <main className="max-w-[430px] mx-auto min-h-screen px-6 py-9">
    <Link to="/login" className="text-accent font-extrabold text-xl">Comuni+</Link>
    <h1 className="text-2xl font-extrabold mt-7 mb-2">Crear cuenta</h1>
    {success ? <section className="bg-surface rounded-2xl p-5 shadow-butter" aria-label="Registro completado">
      <h2 className="font-bold text-lg">Solicitud enviada</h2><p role="status" className="mt-3">{success}</p>
      <Link to="/login" className="btn blue block text-center mt-5">Volver al inicio de sesión</Link>
    </section> : <>
      <p className="text-sm text-text-secondary">Elegí tu comunidad. Un administrador debe aceptar tu solicitud antes de que puedas ingresar.</p>
      {communityError && <div role="alert" className="error mt-4">{communityError}<button className="btn light ml-2" onClick={()=>setRevision((n)=>n+1)}>Reintentar comunidades</button></div>}
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="border-0 p-0 m-0">
          <label htmlFor="register-first">Nombre</label><input id="register-first" className={field} autoComplete="given-name" maxLength={80} required value={form.firstName} onChange={(e)=>change('firstName',e.target.value)}/>
          <label htmlFor="register-last">Apellido</label><input id="register-last" className={field} autoComplete="family-name" maxLength={80} required value={form.lastName} onChange={(e)=>change('lastName',e.target.value)}/>
          <label htmlFor="register-email">Email</label><input id="register-email" className={field} type="email" autoComplete="username" maxLength={254} required value={form.email} onChange={(e)=>change('email',e.target.value)}/>
          <label htmlFor="register-phone">Teléfono</label><input id="register-phone" className={field} type="tel" autoComplete="tel" maxLength={30} required placeholder="+5491123456789" value={form.phone} onChange={(e)=>change('phone',e.target.value)}/>
          <p className="text-xs text-text-muted mt-1">Incluí + y el código de país. Usaremos este número como contacto.</p>
          <label htmlFor="register-community">Comunidad</label><select id="register-community" className={field} required disabled={loading || Boolean(communityError)} value={form.communityId} onChange={(e)=>change('communityId',e.target.value)}>
            <option value="">{loading ? 'Cargando comunidades…' : 'Elegí tu comunidad'}</option>{communities.map((c)=><option value={c.id} key={c.id}>{c.nombre}</option>)}
          </select>
          {!loading && !communityError && !communities.length && <p role="status" className="mt-2">No hay comunidades disponibles. Consultá al administrador.</p>}
          <label htmlFor="register-number">Número de socio</label><input id="register-number" className={field} inputMode="numeric" pattern="[0-9]{1,15}" maxLength={15} required value={form.membershipNumber} onChange={(e)=>change('membershipNumber',e.target.value)}/>
          <label htmlFor="register-password">Contraseña</label><input id="register-password" className={field} type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={form.password} onChange={(e)=>change('password',e.target.value)}/>
          <p className="text-xs text-text-muted mt-1">Entre 12 y 128 caracteres.</p>
          <label htmlFor="register-confirm">Repetir contraseña</label><input id="register-confirm" className={field} type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={form.confirmPassword} onChange={(e)=>change('confirmPassword',e.target.value)}/>
          {error && <p role="alert" className="error mt-4">{error}</p>}
          <button className="btn blue w-full mt-6" disabled={busy || loading || Boolean(communityError) || !communities.length}>{busy ? 'Enviando…' : 'Crear cuenta y solicitar acceso'}</button>
        </fieldset>
      </form>
      <p className="text-sm text-center mt-6">¿Ya tenés cuenta? <Link to="/login" className="text-accent font-bold">Iniciar sesión</Link></p>
    </>}
  </main>;
}
