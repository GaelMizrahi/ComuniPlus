import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';

const API_URL = 'http://localhost:3001';

const Top = ({user}) => <div className='top'><div className='avatar'>{user?.fullName?.[0]||'C'}</div><div className='logo'>Comuni+</div></div>;
const Bottom = () => <div className='nav'><div className='navin'><span>HOME</span><span>VIAJES</span><span>DEPORTES</span><span>MERCADO</span><span>PERFIL</span></div></div>;

function Login({ onLogin }) {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const nav=useNavigate();
  const submit=async(e)=>{e.preventDefault();const res=await fetch(`${API_URL}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(!res.ok)return setError('Credenciales inválidas');const data=await res.json();onLogin(data.user);nav('/home');};
  return <div className='mobile'><div className='content'><div className='logo' style={{textAlign:'center',fontSize:36,marginTop:20}}>Comuni+</div><h1 style={{textAlign:'center'}}>Bienvenido de nuevo</h1><div className='card'><form onSubmit={submit}><label>CORREO ELECTRÓNICO</label><input className='input' placeholder='nombre@dominio.com' value={email} onChange={e=>setEmail(e.target.value)}/><label>CONTRASEÑA</label><input className='input' type='password' value={password} onChange={e=>setPassword(e.target.value)}/><button className='btn btn-blue' style={{width:'100%',marginTop:12}}>Iniciar sesión</button>{error&&<p>{error}</p>}</form></div></div></div>;
}

const Layout=({user,onLogout,children})=><div className='mobile'><Top user={user}/><div className='content'>{children}<button className='btn btn-light' onClick={onLogout}>Cerrar sesión</button></div><Bottom/></div>;

function Home({user,onLogout}){return <Layout user={user} onLogout={onLogout}><h2>Club Náutico Hacoaj</h2><p>📍 Sede Tigre, Buenos Aires</p><div className='card'><h3>Noticias de la comunidad</h3><p>Vista hardcodeada para MVP.</p></div><h3>Secciones</h3><div className='row'><div className='card' style={{flex:1}}>Deportes</div><Link className='card link' style={{flex:1,display:'block'}} to='/viajes'>Transporte</Link></div></Layout>}

function Viajes({user,onLogout}){
  const [rides,setRides]=useState([]);const [zone,setZone]=useState('Todos los viajes');const [msg,setMsg]=useState('');const nav=useNavigate();
  const load=async()=>{const res=await fetch(`${API_URL}/api/rides?zone=${encodeURIComponent(zone)}`);setRides(await res.json());}; useEffect(()=>{load()},[zone]);
  const offer=async(rideId)=>{const seats=Number(prompt('¿Cuántas personas llevás? (1-4)','1')); if(!seats||seats<1||seats>4){setMsg('Debe ser entre 1 y 4');return;} const comment=prompt('Comentario del conductor (opcional)','No tengo espacio en el baúl')||'';
    const res=await fetch(`${API_URL}/api/rides/${rideId}/offer`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:user.id,seats,comment})}); const data=await res.json(); if(!res.ok)return setMsg(data.message); setMsg('Oferta enviada'); load();};
  const chips=['Todos los viajes','Palermo','Belgrano'];
  return <Layout user={user} onLogout={onLogout}><h1>Carpooling Comunitario</h1><p>Conectate con integrantes de tu comunidad.</p><div className='chips row'>{chips.map(c=><button key={c} className={zone===c?'active':''} onClick={()=>setZone(c)}>{c}</button>)}</div>{msg&&<p>{msg}</p>}{rides.map(r=><div className='card' key={r.id}><div className='between'><strong>{r.driverName}</strong><strong>{r.departureTime}</strong></div><p>{r.origin} → {r.destination}</p><p>🟢 {r.seatsAvailable} LUGARES</p><p>“{r.comment||'Sin comentario'}”</p><button className='btn btn-blue' onClick={()=>offer(r.id)}>Ofrecer lugar</button></div>)}<button className='btn btn-green' style={{width:'100%'}} onClick={()=>nav('/viajes/solicitar')}>Pedir viaje</button></Layout>
}

function Solicitar({user,onLogout}){const [f,setF]=useState({origin:'',destination:'',date:'',departureTime:'',seatsNeeded:1,comment:''});const [msg,setMsg]=useState('');const ch=(k,v)=>setF(p=>({...p,[k]:v}));
const submit=async(e)=>{e.preventDefault();if(f.seatsNeeded<1||f.seatsNeeded>4)return setMsg('Lugares a buscar: 1 a 4');const res=await fetch(`${API_URL}/api/rides/request`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,requesterId:user.id})});const d=await res.json();if(!res.ok)return setMsg(d.message);setMsg('Viaje publicado');};
return <Layout user={user} onLogout={onLogout}><h1>Pedir un viaje</h1><div className='card'><form onSubmit={submit}><label>ORIGEN</label><input className='input' value={f.origin} onChange={e=>ch('origin',e.target.value)} required/><label>DESTINO</label><input className='input' value={f.destination} onChange={e=>ch('destination',e.target.value)} required/><label>FECHA</label><input className='input' type='date' value={f.date} onChange={e=>ch('date',e.target.value)} required/><label>HORA</label><input className='input' type='time' value={f.departureTime} onChange={e=>ch('departureTime',e.target.value)} required/><label>LUGARES A BUSCAR (max 4)</label><input className='input' type='number' min='1' max='4' value={f.seatsNeeded} onChange={e=>ch('seatsNeeded',Number(e.target.value))}/><label>COMENTARIOS</label><textarea className='input' value={f.comment} onChange={e=>ch('comment',e.target.value)}/><button className='btn btn-green' style={{width:'100%'}}>Pedir viaje</button></form></div>{msg&&<p>{msg}</p>}</Layout>}

function Reservas({user,onLogout}){const [items,setItems]=useState([]);const load=async()=>{const r=await fetch(`${API_URL}/api/reservations?userId=${user.id}`);setItems(await r.json());};useEffect(()=>{load()},[]); const cancel=async(id)=>{await fetch(`${API_URL}/api/reservations/${id}/cancel`,{method:'POST'});load();};
return <Layout user={user} onLogout={onLogout}><h1>Reservas</h1>{items.map(i=><div className='card' key={i.id}><strong>Viaje a {i.destination}</strong><p><b>Llevar a:</b> {i.seatsReserved} personas</p><p>{i.origin} → {i.destination}</p><p>{i.date} {i.departureTime}</p>{i.driverComment&&<p>Comentario conductor: {i.driverComment}</p>}<button className='btn btn-light' onClick={()=>cancel(i.id)}>Cancelar</button></div>)}{!items.length&&<p>No tenés reservas.</p>}</Layout>}

function Protected({user,children}){return user?children:<Navigate to='/' replace/>}

export default function App(){const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('comuni_user')||'null'));const onLogin=u=>{setUser(u);localStorage.setItem('comuni_user',JSON.stringify(u));};const onLogout=()=>{setUser(null);localStorage.removeItem('comuni_user');};
return <Routes><Route path='/' element={<Login onLogin={onLogin}/>}/><Route path='/home' element={<Protected user={user}><Home user={user} onLogout={onLogout}/></Protected>}/><Route path='/viajes' element={<Protected user={user}><Viajes user={user} onLogout={onLogout}/></Protected>}/><Route path='/viajes/solicitar' element={<Protected user={user}><Solicitar user={user} onLogout={onLogout}/></Protected>}/><Route path='/reservas' element={<Protected user={user}><Reservas user={user} onLogout={onLogout}/></Protected>}/></Routes>}
