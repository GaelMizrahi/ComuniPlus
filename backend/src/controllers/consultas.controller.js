export const consultasHandler=(operation,status=200)=>async(req,res)=>{
 try{res.status(status).json(await operation(req));}
 catch(error){
  if(['42703','42P01','PGRST200','PGRST202','PGRST204','PGRST205'].includes(error.code))return res.status(503).json({message:'Falta actualizar Consultas. Ejecutá database/consultas_migration.sql en Supabase.',code:'CHAT_SETUP_REQUIRED'});
  const code=error.statusCode??({'42501':403,P0002:404,P0001:409,'22023':400}[error.code])??500;
  if(code>=500)console.error('[Consultas] Error interno sin registrar el contenido de los mensajes');
  res.status(code).json({message:code>=500?'No se pudo completar la operación de Consultas. Reintentá.':error.message});
 }
};
