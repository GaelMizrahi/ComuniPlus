import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationData, normalizeEmail, createRegistrationService, createLoginService } from '../src/services/registration.service.js';
import { hashPassword,verifyPassword } from '../src/utils/passwords.js';
import { createRegistrationRepository } from '../src/repositories/registration.repository.js';
import { authRateLimit } from '../src/middleware/auth-rate-limit.js';

const body={firstName:'Ana',lastName:'Pérez',email:' ANA@Example.com ',phone:'+54 (911) 2345-6789',communityId:'1',membershipNumber:'123',password:'Nueva Clave123!',confirmPassword:'Nueva Clave123!'};
const member={id:10,idUsuario:1,idComunidad:1,aceptado:true,nroSocio:123};
const claims={idUsuario:1,idComunidad:1,idComunidadUsuario:10};
const user={id:1,nombre:'Ana',apellido:'Pérez',mail:'ana@example.com',telefono:5491123456789,contraseña:'stored-hash'};
const denied=(code)=>(e)=>e.statusCode===code;
function fixture(overrides={}){
  const calls=[];
  const repo={communities:async()=>[{id:1,nombre:'Comunidad A'}],community:async(id)=>id===1?{id:1,nombre:'Comunidad A'}:null,
    membership:async(c)=>JSON.stringify(c)===JSON.stringify(claims)?member:null,isAdmin:async()=>true,
    register:async(data)=>{calls.push(['register',data]);return{id:22};},pending:async()=>[{id:22,nroSocio:123,fechaSolicitud:'2026-10-23T12:00:00Z',usuario:{nombre:'Ana',apellido:'Pérez',mail:'ana@example.com',telefono:5491123456789,contraseña:'never-return'}}],
    decide:async(...args)=>calls.push(['decide',...args]),userByEmail:async()=>user,memberships:async()=>[member],upgradePassword:async()=>true,...overrides};
  return {repo,calls,service:createRegistrationService(repo,{hash:async()=> 'test-hash-only'})};
}
test('email syntax and case normalization reject malformed values and support literal underscores',()=>{
  assert.equal(normalizeEmail(' Persona_1+club@Example.COM '),'persona_1+club@example.com');
  for(const value of ['',null,'a@','a@localhost','a@@example.com','a..b@example.com','.a@example.com','a.@example.com','a b@example.com','a@-example.com','a@example..com']) assert.throws(()=>normalizeEmail(value),denied(400));
});
test('registration validates all mandatory fields, international phone, member number and passwords',()=>{
  const data=registrationData(body);assert.equal(data.phone,'5491123456789');assert.equal(data.email,'ana@example.com');assert.equal(data.communityId,1);
  for(const changes of [{firstName:' '},{lastName:''},{phone:'abc+5491123456789'},{phone:'1123456789'},{phone:'+0123456789'},{membershipNumber:'abc'},{membershipNumber:-1},{communityId:'1x'},{password:'short',confirmPassword:'short'},{password:' '.repeat(12),confirmPassword:' '.repeat(12)},{confirmPassword:'otra contraseña'}]) assert.throws(()=>registrationData({...body,...changes}),denied(400));
});
test('register hashes the password and ignores caller-supplied acceptance, IDs and role',async()=>{
  const {service,calls}=fixture();
  const result=await service.register({...body,aceptado:true,idUsuario:999,isAdmin:true,passwordHash:'fake'});
  assert.equal(result.token,undefined);assert.match(result.message,/pendiente/);
  const data=calls[0][1];assert.equal(data.password,undefined);assert.equal(data.confirmPassword,undefined);assert.equal(data.passwordHash,'test-hash-only');
  assert.equal(data.aceptado,undefined);assert.equal(data.isAdmin,undefined);assert.equal(data.idUsuario,undefined);
  await assert.rejects(service.register({...body,communityId:999}),denied(400));
});
test('pending responses expose only contact data and exclude credential fields',async()=>{
  const {service}=fixture();const [item]=await service.pending(claims);
  assert.equal(item.fullName,'Ana Pérez');assert.equal(item.membershipNumber,123);
  assert.ok(!JSON.stringify(item).includes('never-return'));assert.equal(item.contraseña,undefined);
});
test('administration revalidates all JWT membership fields and role for every operation',async()=>{
  for(const c of [{...claims,idUsuario:9},{...claims,idComunidad:2},{...claims,idComunidadUsuario:99}]){
    await assert.rejects(fixture().service.pending(c),denied(403));
    await assert.rejects(fixture().service.decide(c,22,'aprobar'),denied(403));
  }
  const {service,calls}=fixture({isAdmin:async()=>false});
  assert.deepEqual(await service.permissions(claims),{isAdmin:false});
  await assert.rejects(service.pending(claims),denied(403));await assert.rejects(service.decide(claims,22,'aprobar'),denied(403));assert.equal(calls.length,0);
});
test('approval passes only the session actor and an explicit decision to the RPC',async()=>{
  const {service,calls}=fixture();await service.decide(claims,22,'aprobar');assert.deepEqual(calls.at(-1),['decide',member,22,true]);
  await service.decide(claims,22,'rechazar');assert.deepEqual(calls.at(-1),['decide',member,22,false]);
  await assert.rejects(service.decide(claims,22,'administrador'),denied(400));
});
test('hashes have random salts and require exact passwords; legacy values remain compatible',async()=>{
  const password='  Nueva Clave123!  ';
  const [a,b]=await Promise.all([hashPassword(password),hashPassword(password)]);
  assert.notEqual(a,b);assert.ok(!a.includes(password));assert.equal(await verifyPassword(password,a),true);
  assert.equal(await verifyPassword(password.trim(),a),false);assert.equal(await verifyPassword('incorrecta',a),false);
  assert.equal(await verifyPassword(' anterior ',' anterior '),true);
  assert.equal(await verifyPassword('anything','scrypt$invalid'),false);assert.equal(await verifyPassword('anything',undefined),false);
});
test('pending and rejected accounts never receive a token after correct password verification',async()=>{
  for(const [changes,code] of [[{aceptado:false,rechazado:false},'REGISTRATION_PENDING'],[{aceptado:false,rechazado:true},'REGISTRATION_REJECTED']]){
    let signed=false;const {repo}=fixture({memberships:async()=>[{...member,...changes}]});
    const login=createLoginService(repo,{verify:async()=>true,hash:async()=> 'hash',signToken:()=>{signed=true;return'token';}});
    await assert.rejects(login('ana@example.com','Nueva Clave123!'),(e)=>e.statusCode===403&&e.code===code);assert.equal(signed,false);
  }
});
test('accepted users retain session compatibility and no credential is copied into the token or profile',async()=>{
  let payload;const {repo}=fixture();
  const login=createLoginService(repo,{verify:async()=>true,hash:async()=> 'hash',signToken:(p)=>{payload=p;return'token';}});
  const result=await login('ANA@EXAMPLE.COM','Nueva Clave123!');
  assert.equal(result.token,'token');assert.equal(result.user.community,'Comunidad A');assert.equal(result.user.idComunidadUsuario,10);assert.equal(result.user.isAdmin,true);
  assert.equal(payload.contraseña,undefined);assert.equal(result.user.contraseña,undefined);assert.equal(result.user.password,undefined);
});
test('wrong and missing accounts are rejected; a changed legacy password cannot be overwritten',async()=>{
  for(const overrides of [{userByEmail:async()=>null},{upgradePassword:async()=>false}]){
    const {repo}=fixture(overrides);const login=createLoginService(repo,{verify:async()=>true,hash:async()=> 'hash',signToken:()=>{throw new Error('must not sign');}});
    await assert.rejects(login('ana@example.com','Nueva Clave123!'),denied(401));
  }
});
test('repository uses normalized equality (not ILIKE patterns) and scopes requests by community',async()=>{
  const calls=[];const q=new Proxy({}, {get:(_t,name)=>name==='then'?(resolve)=>resolve({data:[],error:null}):(...args)=>{calls.push([name,...args]);return q;}});
  const repo=createRegistrationRepository({from:(...args)=>{calls.push(['from',...args]);return q;}});
  await repo.userByEmail('person_1@example.com');assert.ok(calls.some((c)=>c[0]==='eq'&&c[1]==='mailNormalizado'&&c[2]==='person_1@example.com'));
  calls.length=0;await repo.pending(member);
  assert.ok(calls.some((c)=>c[0]==='eq'&&c[1]==='idComunidad'&&c[2]===1));
  assert.ok(calls.filter((c)=>c[0]==='select').every((c)=>!c[1].includes('contraseña')));
  calls.length=0;await repo.membership(claims);
  for(const [key,value] of [['id',10],['idUsuario',1],['idComunidad',1],['aceptado',true]])assert.ok(calls.some((c)=>c[0]==='eq'&&c[1]===key&&c[2]===value));
});
test('authentication rate limit blocks repeated requests and expires without trusting forwarded headers',()=>{
  let now=0;const middleware=authRateLimit({limit:2,windowMs:1000,now:()=>now});let passed=0,status;
  const res={set:()=>{},status:(s)=>{status=s;return res;},json:()=>{}};
  for(let i=0;i<3;i++)middleware({ip:'127.0.0.1',headers:{'x-forwarded-for':`different-${i}`}},res,()=>passed++);
  assert.equal(passed,2);assert.equal(status,429);now=1001;middleware({ip:'127.0.0.1'},res,()=>passed++);assert.equal(passed,3);
});
