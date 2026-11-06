import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewsService, newsData } from '../src/services/news.service.js';
import { createNewsRepository } from '../src/repositories/news.repository.js';
const member={id:10,idUsuario:1,idComunidad:100,aceptado:true};
const photo={mimeType:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64')};
const body={title:'Nueva cancha de tenis',text:'El club incorporó una cancha para sus socios.',photo};
const failStatus=(status)=>(e)=>e.statusCode===status;
function fixture(overrides={}){
 const calls=[];
 const repo={isAdmin:async()=>true,list:async()=>[{id:1,titulo:body.title,texto:body.text,imagenPath:'100/10/private.png',fechaPublicacion:'2026-11-06T12:00:00Z',esDemo:false}],detail:async()=>null,
  signedImage:async(path)=>{calls.push(['sign',path]);return 'https://example.com/temporary?token=test';},upload:async(...args)=>calls.push(['upload',...args]),
  save:async(...args)=>{calls.push(['save',...args]);return{id:5};},remove:async()=>({imagenPath:'100/10/private.png'}),removeImage:async(path)=>calls.push(['remove',path]),...overrides};
 return {repo,calls,service:createNewsService(repo)};
}
test('publication requires title, text and one validated image',()=>{
 assert.equal(newsData({...body,title:'  Nueva cancha  '}).title,'Nueva cancha');
 for(const invalid of [{title:' '},{text:'Corto'},{photo:null},{photo:{mimeType:'image/svg+xml',data:photo.data}},{photo:{mimeType:'image/png',data:'AAAA'}}])assert.throws(()=>newsData({...body,...invalid}),failStatus(400));
});
test('regular members cannot upload/delete even if role or community fields are forged',async()=>{
 const {service,calls}=fixture({isAdmin:async()=>false});
 await assert.rejects(service.publish(member,{...body,isAdmin:true,idComunidad:999}),failStatus(403));
 await assert.rejects(service.remove(member,1),failStatus(403));assert.deepEqual(calls,[]);
});
test('image path and author derive only from session and images receive temporary URLs',async()=>{
 const {service,calls}=fixture();await service.publish(member,{...body,idComunidad:999,idAutor:99,imagenPath:'outside'});
 const upload=calls.find(c=>c[0]==='upload');assert.match(upload[1],/^100\/10\/[0-9a-f-]{36}\.png$/);
 const save=calls.find(c=>c[0]==='save');assert.equal(save[1],member);assert.equal(save[2].idComunidad,undefined);assert.equal(save[3],upload[1]);
 const result=await service.list(member);assert.equal(result.items[0].image,'https://example.com/temporary?token=test');assert.equal(result.canPublish,true);
});
test('foreign detail is hidden, IDs/pages are strict, and pagination does not expose extra rows',async()=>{
 const {service}=fixture({list:async()=>Array.from({length:21},(_,i)=>({id:i,imagenUrl:'/club-logos/ferro.jpg'}))});
 await assert.rejects(service.detail(member,1),failStatus(404));await assert.rejects(service.detail(member,'1x'),failStatus(400));await assert.rejects(service.list(member,'1x'),failStatus(400));
 const result=await service.list(member);assert.equal(result.items.length,20);assert.equal(result.hasMore,true);
});
test('definite rejected saves clean the new image; ambiguous failures preserve possibly committed files',async()=>{
 for(const code of ['42501','NETWORK']){
  const {service,calls}=fixture({save:async()=>{throw{code};}});await assert.rejects(service.publish(member,body));
  assert.equal(calls.some(c=>c[0]==='remove'),code==='42501');
 }
});
test('deletion never cleans image paths belonging to another club',async()=>{
 const {service,calls}=fixture({remove:async()=>({imagenPath:'200/20/foreign.png'})});await service.remove(member,1);assert.ok(!calls.some(c=>c[0]==='remove'));
});
test('repository scopes list and detail by session community and RPC receives the session actor',async()=>{
 const calls=[];const chain={select(){return this;},eq(...args){calls.push(['eq',...args]);return this;},is(){return this;},order(){return this;},range(){return this;},maybeSingle(){return this;},then(resolve){return Promise.resolve({data:[]}).then(resolve);}};
 const repo=createNewsRepository({from:()=>chain,rpc:async(name,args)=>{calls.push([name,args]);return{data:{id:1}};}});
 await repo.list(member,0);await repo.detail(member,7);await repo.save(member,body,'100/10/image.png');
 assert.equal(calls.filter(c=>c[0]==='eq'&&c[1]==='idComunidad'&&c[2]===100).length,2);
 assert.equal(calls.find(c=>c[0]==='publicarNoticiaClub')[1].p_id_actor,10);
});
