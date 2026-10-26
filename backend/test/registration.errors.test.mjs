import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationHandler } from '../src/controllers/registration.controller.js';

test('login diagnostics distinguish setup, credentials, network and unknown failures without leaking details', async () => {
  const logs=[];
  const original=console.error;
  console.error=(...args)=>logs.push(args.join(' '));
  try {
    for (const [error,status,code] of [
      [{code:'42703',message:'private details'},503,'REGISTRATION_SETUP_REQUIRED'],
      [{code:'PGRST202',message:'private details'},503,'REGISTRATION_SETUP_REQUIRED'],
      [{code:'PGRST301',message:'private details'},503,'REGISTRATION_CREDENTIALS_INVALID'],
      [{message:'Invalid API key'},503,'REGISTRATION_CREDENTIALS_INVALID'],
      [{message:'TypeError: fetch failed private details'},503,'REGISTRATION_CONNECTION_FAILED'],
      [{code:'XX000',message:'private details'},500,'REGISTRATION_UPSTREAM_ERROR'],
      [{code:'private details',message:'private details'},500,'REGISTRATION_UPSTREAM_ERROR']
    ]) {
      const res={set(){return this;},status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;}};
      await registrationHandler(async()=>{throw error;})({},res);
      assert.equal(res.statusCode,status);assert.equal(res.body.code,code);
      assert.ok(!JSON.stringify(res.body).includes('private details'));
    }
    assert.equal(logs.length,7);assert.ok(!logs.join(' ').includes('private details'));
    assert.ok(logs.some((line)=>line.includes('(XX000)')));
  } finally {console.error=original;}
});
