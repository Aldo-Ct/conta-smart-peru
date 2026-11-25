import test from 'node:test';
import assert from 'node:assert/strict';
import {decideSync} from '../lib/cloud-sync.mjs';
test('sincronización conserva copias divergentes y permite reanudar cambios locales conocidos',()=>{
 const x={hasLocal:true,localFingerprint:'local',cloudFingerprint:'cloud',knownRevision:0,cloudRevision:1};
 assert.equal(decideSync(x),'conflict');assert.equal(decideSync({...x,hasLocal:false}),'load-cloud');assert.equal(decideSync({...x,localFingerprint:'cloud'}),'matched');assert.equal(decideSync({...x,knownRevision:1}),'upload-local');assert.equal(decideSync({...x,knownRevision:1,cloudRevision:2}),'conflict');
});
