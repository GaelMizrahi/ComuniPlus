import { positiveId,notFound } from '../utils/community.js';
import { getFullName } from '../utils/helpers.js';
const fail=(statusCode,message)=>{throw Object.assign(new Error(message),{statusCode});};
export function consultaData(body) {
 const text=typeof body?.text==='string'?body.text.trim():'';
 if(!text||text.length>3000)fail(400,'El mensaje debe tener entre 1 y 3000 caracteres');
 if(typeof body?.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId))fail(400,'Identificador de envío inválido');
 return {text,key:body.requestId.toLowerCase()};
}
export function createConsultasService(repo) {
 const shapeThread=(row)=>({id:row.id,name:getFullName(row.socio?.usuario),membershipNumber:row.socio?.nroSocio,
  active:row.socio?.aceptado===true,updatedAt:row.actualizadaEn,preview:row.ultimoMensaje});
 const shapeMessage=(row,member)=>({id:row.id,text:row.texto,createdAt:row.creadoEn,mine:Number(row.idRemitente)===Number(member.id),isAdmin:row.esAdmin,isBroadcast:row.idDifusion!=null});
 const admin=async(member)=>{if(!await repo.isAdmin(member))fail(403,'Solo los administradores de tu club pueden acceder a esta opción');};
 const thread=async(member,id)=>{
  const isAdmin=await repo.isAdmin(member);
  const row=await repo.thread(member,positiveId(id),isAdmin);
  if(!row)notFound('Conversación no encontrada');
  return {row,isAdmin};
 };
 return {
  context:async(member)=>{
   const isAdmin=await repo.isAdmin(member);
   return {isAdmin,adminAvailable:await repo.adminAvailable(member),recipientCount:isAdmin?await repo.recipientCount(member):0};
  },
  open:(member)=>repo.open(member),
  inbox:async(member,rawPage='0')=>{
   await admin(member);if(!/^\d{1,5}$/.test(String(rawPage)))fail(400,'Página inválida');
   const rows=await repo.inbox(member,Number(rawPage));return{items:rows.slice(0,20).map(shapeThread),hasMore:rows.length>20};
  },
  messages:async(member,id,query={})=>{
   if(query.after&&query.before)fail(400,'Cursor inválido');
   const after=query.after?positiveId(query.after):null,before=query.before?positiveId(query.before):null;
   const {row,isAdmin}=await thread(member,id);
   const messages=await repo.messages(row.id,{after,before});
   const items=messages.slice(0,50).map((message)=>shapeMessage(message,member));
   if(!after)items.reverse();
   return {conversation:shapeThread(row),items,hasMore:messages.length>50,canReply:row.socio?.aceptado===true,isAdmin};
  },
  send:async(member,id,body)=>{
   const {text,key}=consultaData(body);
   const {row}=await thread(member,id);
   if(!row.socio?.aceptado)fail(409,'La membresía de este socio ya no está activa');
   return {item:shapeMessage(await repo.send(member,row.id,text,key),member)};
  },
  broadcast:async(member,body)=>{
   await admin(member);const {text,key}=consultaData(body);
   return repo.broadcast(member,text,key);
  }
 };
}
