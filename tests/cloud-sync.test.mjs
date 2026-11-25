import test from 'node:test';
import assert from 'node:assert/strict';
import {decideSync} from '../lib/cloud-sync.mjs';
test('sincronización conserva copias divergentes y permite reanudar cambios locales conocidos',()=>{
 const x={hasLocal:true,localFingerprint:'local',cloudFingerprint:'cloud',knownRevision:0,cloudRevision:1};
 assert.equal(decideSync(x),'conflict');assert.equal(decideSync({...x,hasLocal:false}),'load-cloud');assert.equal(decideSync({...x,localFingerprint:'cloud'}),'matched');assert.equal(decideSync({...x,knownRevision:1}),'upload-local');assert.equal(decideSync({...x,knownRevision:1,cloudRevision:2}),'conflict');
});

test('actualiza una copia limpia y conserva cambios pendientes en otros equipos',async()=>{
 const {decideLiveSync}=await import('../lib/cloud-sync.mjs');
 assert.equal(decideLiveSync({knownRevision:1,cloudRevision:2,localFingerprint:'a',confirmedFingerprint:'a'}),'load-cloud');
 assert.equal(decideLiveSync({knownRevision:1,cloudRevision:2,localFingerprint:'editado',confirmedFingerprint:'a'}),'defer');
 assert.equal(decideLiveSync({knownRevision:2,cloudRevision:2,localFingerprint:'a',confirmedFingerprint:'a'}),'unchanged');
 const initial={hasLocal:true,localFingerprint:'old',cloudFingerprint:'new',knownRevision:1,cloudRevision:2};
 assert.equal(decideSync({...initial,localMatchesKnown:true}),'load-cloud');
 assert.equal(decideSync({...initial,localMatchesKnown:false}),'conflict');
});
