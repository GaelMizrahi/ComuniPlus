import test from 'node:test';
import assert from 'node:assert/strict';
import { marketErrorResponse } from '../src/controllers/market.controller.js';

test('missing columns, relations and RPCs identify the required database migration', () => {
  for (const code of ['42703','42P01','PGRST200','PGRST202','PGRST204']) {
    const result = marketErrorResponse({ code, message:'internal details must not be exposed' });
    assert.equal(result.status,503);
    assert.equal(result.code,'MARKET_SCHEMA_NOT_READY');
    assert.match(result.message,/mercado_migration\.sql/);
    assert.ok(!result.message.includes('internal details'));
  }
});
test('missing photo bucket and unusable service credentials are actionable server failures', () => {
  const bucket = marketErrorResponse({ name:'StorageApiError', statusCode:'404', message:'Bucket not found' });
  assert.equal(bucket.status,503); assert.equal(bucket.code,'MARKET_STORAGE_NOT_READY');
  for (const statusCode of ['401','403']) {
    const auth = marketErrorResponse({ name:'StorageApiError',statusCode,message:'do not expose authentication details' });
    assert.equal(auth.code,'MARKET_CREDENTIALS_INVALID'); assert.equal(auth.status,503);
  }
});
test('normal validation, authorization and reservation conflicts remain distinct', () => {
  assert.equal(marketErrorResponse({ statusCode:400,message:'Título inválido' }).status,400);
  assert.equal(marketErrorResponse({ code:'42501',message:'No tenés permiso' }).status,403);
  assert.equal(marketErrorResponse({ code:'P0002',message:'Publicación no encontrada' }).status,404);
  assert.equal(marketErrorResponse({ code:'23505',message:'private row data' }).status,409);
  assert.ok(!marketErrorResponse({ code:'23505',message:'private row data' }).message.includes('private'));
});
test('unexpected backend errors never expose credentials or internal diagnostics', () => {
  const result = marketErrorResponse(new Error('secret-value or private diagnostics'));
  assert.equal(result.status,500);
  assert.ok(!result.message.includes('secret-value'));
});
