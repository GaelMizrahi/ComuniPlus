import test from 'node:test';
import assert from 'node:assert/strict';
import {consultaData,createConsultasService} from '../src/services/consultas.service.js';
import {createConsultasRepository} from '../src/repositories/consultas.repository.js';
const member={id:10,idUsuario:1,idComunidad:100,aceptado:true},key='11111111-1111-4111-8111-111111111111';
const status=(value)=>(e)=>e.statusCode===value;
function fixture(overrides={}){
 const calls=[];
 const row={id:20,idComunidadUsuario:10,socio:{nroSocio:123,aceptado:true,usuario:{nombre:'Ana',apellido:'Demo'}},ultimoMensaje:'Hola',actualizadaEn:'2026-11-06T12:00:00Z'};
 const repo={isAdmin:async()=>false,adminAvailable:async()=>true,recipientCount:async()=>2,open:async()=>({id:20}),inbox:async()=>[row],thread:async(...args)=>{calls.push(['thread',...args]);return row;},messages:async()=>[],send:async(...args)=>{calls.push(['send',...args]);return{id:1,texto:'Hola',idRemitente:10,esAdmin:false,idDifusion:null};},broadcast:async(...args)=>{calls.push(['broadcast',...args]);return{id:1,recipientCount:2};},...overrides};
 return{calls,repo,service:createConsultasService(repo),row};
}
test('text and idempotency keys are validated and extra sender/club/role fields are discarded',()=>{
 assert.deepEqual(consultaData({text:' Hola ',requestId:key,idRemitente:999,idComunidad:999,isAdmin:true}),{text:'Hola',key});
 for(const body of [{text:'',requestId:key},{text:' '.repeat(5),requestId:key},{text:'a'.repeat(3001),requestId:key},{text:'Hola',requestId:'bad'}])assert.throws(()=>consultaData(body),status(400));
});
test('members cannot list everyone or broadcast; context never reveals audience counts to members',async()=>{
 const {service,calls}=fixture();await assert.rejects(service.inbox(member),status(403));await assert.rejects(service.broadcast(member,{text:'Hola',requestId:key}),status(403));
 assert.equal((await service.context(member)).recipientCount,0);assert.deepEqual(calls,[]);
});
test('private sending uses the session actor and checks the thread before writing',async()=>{
 const {service,calls}=fixture();const result=await service.send(member,20,{text:'Hola',requestId:key,idRemitente:99});
 assert.equal(result.item.mine,true);assert.equal(result.item.isBroadcast,false);assert.equal(calls[0][3],false);assert.equal(calls[1][1],member);assert.equal(calls[1][2],20);
 const denied=fixture({thread:async()=>null});await assert.rejects(denied.service.send(member,21,{text:'Hola',requestId:key}),status(404));assert.equal(denied.calls.length,0);
});
test('inactive recipients cannot receive replies, and bad cursors/IDs are rejected',async()=>{
 const {row}=fixture();const {service}=fixture({thread:async()=>({...row,socio:{...row.socio,aceptado:false}})});
 await assert.rejects(service.send(member,20,{text:'Hola',requestId:key}),status(409));
 await assert.rejects(service.messages(member,'20x'),status(400));await assert.rejects(service.messages(member,20,{after:1,before:2}),status(400));
});
test('history and incremental pages are ordered and bounded without exposing raw sender IDs',async()=>{
 const rows=Array.from({length:51},(_,i)=>({id:100-i,idRemitente:10,texto:'Hola',esAdmin:true,idDifusion:2}));
 const {service}=fixture({messages:async()=>rows});const data=await service.messages(member,20);
 assert.equal(data.items.length,50);assert.equal(data.items[0].id,51);assert.equal(data.items.at(-1).id,100);assert.equal(data.hasMore,true);assert.equal(data.items[0].isBroadcast,true);assert.equal(data.items[0].idRemitente,undefined);
});
test('admins broadcast using their membership; audience and role are never taken from the browser',async()=>{
 const {service,calls}=fixture({isAdmin:async()=>true});const result=await service.broadcast(member,{text:'Comunicado',requestId:key,recipients:[999],idComunidad:999});
 assert.equal(result.recipientCount,2);assert.deepEqual(calls[0],['broadcast',member,'Comunicado',key]);
});
test('repository always scopes threads by community and also by owner for non-admins',async()=>{
 const calls=[];const chain={select(){return this;},eq(...args){calls.push(args);return this;},maybeSingle(){return this;},then(resolve){return Promise.resolve({data:null}).then(resolve);}};
 const repo=createConsultasRepository({from:()=>chain});await repo.thread(member,99,false);
 assert.ok(calls.some(([field,value])=>field==='idComunidad'&&value===100));assert.ok(calls.some(([field,value])=>field==='idComunidadUsuario'&&value===10));
});
