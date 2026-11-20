import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import ClubLogo from '../components/ui/ClubLogo.jsx';
import {consultasRequest} from '../services/consultasApi.js';
import './Consultas.css';

const date=(value)=>new Date(value).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
function Composer({send,disabled=false,broadcast=false,count=0,club=''}) {
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const sending=useRef(false),request=useRef(null),input=useRef(),focusAfterSend=useRef(false);
 useEffect(()=>{if(!busy&&!disabled&&focusAfterSend.current){focusAfterSend.current=false;input.current?.focus();}},[busy,disabled]);
 const submit=async(event)=>{
  event.preventDefault();if(sending.current)return;setError('');setNotice('');
  const value=text.trim();if(!value||value.length>3000)return setError('Escribí un mensaje de hasta 3000 caracteres');
  if(broadcast&&!window.confirm(`¿Enviar este mensaje a todos los socios aceptados de ${club}? Actualmente hay ${count} destinatarios. Sus respuestas serán privadas.`))return;
  if(!request.current||request.current.text!==value)request.current={text:value,requestId:crypto.randomUUID()};
  sending.current=true;setBusy(true);
  try{
   const result=await send(request.current);setText('');request.current=null;focusAfterSend.current=true;
   if(broadcast)setNotice(`Mensaje enviado a ${result.recipientCount} socios.`);
  }catch(e){setError(e.message);}finally{sending.current=false;setBusy(false);}
 };
 return <form className="consulta-composer" aria-label={broadcast?'Mensaje a todos':'Enviar mensaje privado'} onSubmit={submit}>
  <label htmlFor={broadcast?'broadcast-text':'private-text'}>{broadcast?'Mensaje para todos los socios':'Mensaje privado'}</label>
  <textarea ref={input} id={broadcast?'broadcast-text':'private-text'} rows={3} maxLength={3000} required disabled={disabled||busy}
   value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();e.currentTarget.form.requestSubmit();}}}/>
  <p className="text-xs text-text-muted">{broadcast?`Destinatarios: socios aceptados de ${club}, excepto tu propia cuenta.`:'Este mensaje queda en esta conversación privada.'}</p>
  {broadcast&&<p className="text-xs text-text-muted">{count?`${count} socios recibirán una copia privada.`:'Todavía no hay otros socios aceptados para recibir este mensaje.'}</p>}
  {error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status" className="notice ok">{notice}</p>}
  <button className="btn blue w-full" disabled={disabled||busy||!text.trim()||broadcast&&count===0}>{busy?'Enviando…':broadcast?'Enviar a todos':'Enviar mensaje'}</button>
 </form>;
}

function Inbox({revision}) {
 const [items,setItems]=useState([]),[page,setPage]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[more,setMore]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>setPage(0),[revision]);
 useEffect(()=>{
  const abort=new AbortController();let pending=false;
  const load=async()=>{
   if(pending||document.hidden)return;pending=true;setLoading(true);
   try{
    const data=await consultasRequest(`/conversaciones?page=${page}`,{signal:abort.signal});if(abort.signal.aborted)return;
    setItems((old)=>page===0?data.items:[...new Map([...old,...data.items].map((item)=>[item.id,item])).values()]);setMore(data.hasMore);setError('');
   }catch(e){if(e.name!=='AbortError'){setError(e.message);if([403,404].includes(e.status))setItems([]);}}
   finally{pending=false;if(!abort.signal.aborted)setLoading(false);}
  };
  load();const timer=page===0?setInterval(load,10000):null;document.addEventListener('visibilitychange',load);
  return()=>{abort.abort();clearInterval(timer);document.removeEventListener('visibilitychange',load);};
 },[page,revision,retry]);
 return <section aria-label="Conversaciones privadas" className="consulta-inbox">
  <div className="flex justify-between items-center gap-2"><h2 className="font-bold text-lg">Conversaciones privadas</h2><button className="btn light" disabled={loading} onClick={()=>{setPage(0);setRetry((n)=>n+1);}}>Actualizar</button></div>
  {error&&<p role="alert" className="error mt-3">{error}</p>}{loading&&<p role="status" className="text-sm mt-3">Actualizando conversaciones…</p>}
  {!loading&&!error&&!items.length&&<p className="empty-state mt-4">Todavía no hay consultas. Los socios pueden iniciar su chat desde Consultas.</p>}
  {!error&&items.map((item)=><Link className="consulta-thread" to={`/consultas/${item.id}`} key={item.id}>
   <div className="flex items-center justify-between gap-2"><strong className="break-words">{item.name}</strong><time className="text-xs text-text-muted shrink-0">{date(item.updatedAt)}</time></div>
   <p className="text-xs text-text-muted">Socio #{item.membershipNumber}{item.active?'':' · Membresía inactiva'}</p><p className="consulta-preview">{item.preview||'Conversación iniciada, sin mensajes'}</p>
  </Link>)}
  {more&&!error&&<button className="btn light w-full mt-3" disabled={loading} onClick={()=>setPage((n)=>n+1)}>Ver más conversaciones</button>}
 </section>;
}

function Chat({id,isAdmin}) {
 const [messages,setMessages]=useState([]),[conversation,setConversation]=useState(null),[canReply,setCanReply]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[older,setOlder]=useState(false),[olderBusy,setOlderBusy]=useState(false),[revision,setRevision]=useState(0);
 const lastId=useRef(0),pending=useRef(false),feed=useRef(),scrollBottom=useRef(true),preserve=useRef(null),lifetime=useRef(null);
 const merge=(items)=>{
  if(items.length)lastId.current=Math.max(lastId.current,...items.map((item)=>Number(item.id)));
  setMessages((old)=>[...new Map([...old,...items].map((item)=>[item.id,item])).values()].sort((a,b)=>a.id-b.id));
 };
 useLayoutEffect(()=>{
  const element=feed.current;if(!element)return;
  if(preserve.current){element.scrollTop=preserve.current.top+element.scrollHeight-preserve.current.height;preserve.current=null;}
  else if(scrollBottom.current){element.scrollTop=element.scrollHeight;scrollBottom.current=false;}
 },[messages]);
 useEffect(()=>{
  const abort=new AbortController();lifetime.current=abort;lastId.current=0;pending.current=false;setMessages([]);setLoading(true);scrollBottom.current=true;
  const load=async()=>{
   if(pending.current||document.hidden)return;pending.current=true;
   const after=lastId.current;
   try{
    const data=await consultasRequest(`/conversaciones/${encodeURIComponent(id)}/mensajes${after?`?after=${after}`:''}`,{signal:abort.signal});if(abort.signal.aborted)return;
    const element=feed.current;scrollBottom.current=!after||!element||element.scrollHeight-element.scrollTop-element.clientHeight<100;
    setConversation(data.conversation);setCanReply(data.canReply);merge(data.items);if(!after)setOlder(data.hasMore);setError('');
   }catch(e){if(e.name!=='AbortError'){setError(e.message);if([403,404].includes(e.status)){setMessages([]);setConversation(null);setCanReply(false);}}}
   finally{pending.current=false;if(!abort.signal.aborted)setLoading(false);}
  };
  load();const timer=setInterval(load,5000);document.addEventListener('visibilitychange',load);
  return()=>{abort.abort();clearInterval(timer);document.removeEventListener('visibilitychange',load);};
 },[id,revision]);
 const loadOlder=async()=>{
  if(pending.current||!messages.length)return;pending.current=true;setOlderBusy(true);
  try{
   const data=await consultasRequest(`/conversaciones/${encodeURIComponent(id)}/mensajes?before=${messages[0].id}`,{signal:lifetime.current.signal});
   if(lifetime.current.signal.aborted)return;
   const element=feed.current;preserve.current=element?{height:element.scrollHeight,top:element.scrollTop}:null;merge(data.items);setOlder(data.hasMore);
  }catch(e){if(e.name!=='AbortError')setError(e.message);}finally{pending.current=false;setOlderBusy(false);}
 };
 const send=async(body)=>{
  const data=await consultasRequest(`/conversaciones/${encodeURIComponent(id)}/mensajes`,{method:'POST',body});scrollBottom.current=true;merge([data.item]);return data;
 };
 return <section className="consulta-chat" aria-label="Chat privado">
  <h2 className="text-lg font-bold">{isAdmin?conversation?.name||'Conversación privada':'Administración del club'}</h2>
  {isAdmin&&conversation&&<p className="text-xs text-text-muted">Socio #{conversation.membershipNumber}</p>}
  <p className="text-xs text-text-muted mt-1">Solo el socio de esta conversación y los administradores autorizados del club pueden ver estos mensajes.</p>
  {error&&<div role="alert" className="error mt-3"><p>{error}</p><button className="btn light mt-2" onClick={()=>setRevision((n)=>n+1)}>Reintentar</button></div>}
  {loading&&<p role="status" className="mt-3">Cargando conversación…</p>}
  {older&&<button className="btn light w-full mt-3" disabled={olderBusy||loading} onClick={loadOlder}>Ver mensajes anteriores</button>}
  <div ref={feed} className="consulta-messages" role="log" aria-label="Mensajes privados" aria-live="polite">
   {!loading&&!error&&!messages.length&&<p className="empty-state">Todavía no hay mensajes. Escribí para iniciar la conversación.</p>}
   {messages.map((item)=><article className={`consulta-bubble ${item.mine?'mine':''}`} key={item.id}>
    {item.isBroadcast&&<span className="consulta-broadcast-label">Comunicado del club</span>}
    <strong className="text-xs">{item.mine?'Vos':item.isAdmin?'Administración':conversation?.name||'Socio'}</strong><p>{item.text}</p><time dateTime={item.createdAt}>{date(item.createdAt)}</time>
   </article>)}
  </div>
  {conversation&&!canReply&&<p className="text-sm text-text-muted">La membresía de este socio está inactiva. El historial se conserva.</p>}
  <Composer key={id} send={send} disabled={!canReply||loading||olderBusy}/>
 </section>;
}

export default function Consultas({user,onLogout}) {
 const {conversationId}=useParams(),navigate=useNavigate();
 const [context,setContext]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0),[inboxRevision,setInboxRevision]=useState(0),[broadcast,setBroadcast]=useState(false);
 useEffect(()=>{
  const abort=new AbortController();setLoading(true);setError('');
  (async()=>{
   try{
    const data=await consultasRequest('/contexto',{signal:abort.signal});if(abort.signal.aborted)return;setContext(data);
    if(!data.isAdmin&&!conversationId){const own=await consultasRequest('/propia',{method:'POST',body:{},signal:abort.signal});if(!abort.signal.aborted)navigate(`/consultas/${own.id}`,{replace:true});}
   }catch(e){if(e.name!=='AbortError')setError(e.message);}finally{if(!abort.signal.aborted)setLoading(false);}
  })();
  return()=>abort.abort();
 },[conversationId,revision,navigate]);
 const sendBroadcast=async(body)=>{const result=await consultasRequest('/difusiones',{method:'POST',body});setInboxRevision((n)=>n+1);return result;};
 return <Layout user={user} onLogout={onLogout} active="HOME">
  <div className="flex gap-3 items-center mb-4"><ClubLogo src={user.communityLogo} name={user.community}/><div className="min-w-0"><p className="text-xs text-text-muted break-words">{user.community}</p><h1 className="text-2xl font-extrabold">Consultas</h1></div></div>
  <Link to={context?.isAdmin&&conversationId?'/consultas':'/home'} className="text-accent text-sm">← {context?.isAdmin&&conversationId?'Todas las conversaciones':'Volver a Inicio'}</Link>
  {loading&&<p role="status" className="mt-5">Preparando Consultas…</p>}
  {error&&<div role="alert" className="error mt-4"><p>{error}</p><button className="btn light mt-2" onClick={()=>setRevision((n)=>n+1)}>Reintentar</button></div>}
  {!loading&&!error&&context&&<>
   {!context.adminAvailable&&!context.isAdmin&&<p className="notice mt-4">Tu club todavía no tiene un administrador asignado. Podés dejar tu consulta y quedará guardada aquí.</p>}
   {conversationId?<Chat key={conversationId} id={conversationId} isAdmin={context.isAdmin}/>:context.isAdmin&&<>
    <div className="mt-5"><button className="btn blue w-full" aria-expanded={broadcast} onClick={()=>setBroadcast((value)=>!value)}>{broadcast?'Cerrar mensaje general':'Mensaje a todos los socios'}</button>
     {broadcast&&<section className="consulta-broadcast" aria-label="Comunicado general"><h2 className="font-bold text-lg">Mensaje a todos</h2><p className="text-sm mt-2">Cada socio lo recibirá en su chat privado. Sus respuestas no se comparten con los demás socios.</p>
      <Composer broadcast send={sendBroadcast} count={context.recipientCount} club={user.community}/></section>}
    </div><Inbox revision={inboxRevision}/>
   </>}
  </>}
 </Layout>;
}
