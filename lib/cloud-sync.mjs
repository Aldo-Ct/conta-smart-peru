/** Determina cómo iniciar sincronización sin sobrescribir copias divergentes. */
export function decideSync({hasLocal,localFingerprint,cloudFingerprint,knownRevision,cloudRevision}){
 if(!hasLocal)return 'load-cloud';
 if(localFingerprint===cloudFingerprint)return 'matched';
 if(knownRevision>0&&knownRevision===cloudRevision)return 'upload-local';
 return 'conflict';
}
