export function createConsultasRepository(db) {
 const result=async(query)=>{const {data,error}=await query;if(error)throw error;return data;};
 const conversations=(member)=>db.from('ConsultaConversacion')
  .select('id,actualizadaEn,ultimoMensaje,idComunidadUsuario,socio:ComunidadUsuario!ConsultaConversacion_socio_club_fkey!inner(nroSocio,aceptado,usuario:Usuario!idUsuario(nombre,apellido))')
  .eq('idComunidad',member.idComunidad);
 return {
  isAdmin:async(member)=>Boolean((await result(db.from('Administrador').select('id').eq('idComunidadUsuario',member.id).eq('idComunidad',member.idComunidad).limit(1)))?.length),
  adminAvailable:async(member)=>{
   const admins=await result(db.from('Administrador').select('idComunidadUsuario').eq('idComunidad',member.idComunidad).not('idComunidadUsuario','is',null));
   const ids=admins.map((row)=>row.idComunidadUsuario);if(!ids.length)return false;
   return Boolean((await result(db.from('ComunidadUsuario').select('id').eq('idComunidad',member.idComunidad).eq('aceptado',true).in('id',ids).limit(1)))?.length);
  },
  recipientCount:async(member)=>{
   const {count,error}=await db.from('ComunidadUsuario').select('id',{count:'exact',head:true})
    .eq('idComunidad',member.idComunidad).eq('aceptado',true).neq('idUsuario',member.idUsuario);
   if(error)throw error;return count??0;
  },
  inbox:(member,page)=>result(conversations(member).order('actualizadaEn',{ascending:false}).order('id',{ascending:false}).range(page*20,page*20+20)),
  thread:(member,id,isAdmin)=>{
   let query=conversations(member).eq('id',id);
   if(!isAdmin)query=query.eq('idComunidadUsuario',member.id);
   return result(query.maybeSingle());
  },
  messages:(id,{after,before})=>{
   let query=db.from('ConsultaMensaje').select('id,idRemitente,texto,esAdmin,idDifusion,creadoEn').eq('idConversacion',id);
   if(after)query=query.gt('id',after);
   if(before)query=query.lt('id',before);
   return result(query.order('id',{ascending:Boolean(after)}).limit(51));
  },
  open:(member)=>result(db.rpc('abrirConsultaClub',{p_actor:member.id})),
  send:(member,id,text,key)=>result(db.rpc('enviarConsultaClub',{p_actor:member.id,p_conversacion:id,p_texto:text,p_id_cliente:key})),
  broadcast:(member,text,key)=>result(db.rpc('difundirConsultaClub',{p_actor:member.id,p_texto:text,p_id_cliente:key}))
 };
}
