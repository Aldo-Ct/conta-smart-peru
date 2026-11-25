/** Decide sin reemplazar cambios locales que no estén confirmados en el servidor. */
export function decideSync({hasLocal,localFingerprint,cloudFingerprint,knownRevision,cloudRevision,localMatchesKnown=false}){
 if(!hasLocal)return 'load-cloud';
 if(localFingerprint===cloudFingerprint)return 'matched';
 if(knownRevision>0&&knownRevision===cloudRevision)return 'upload-local';
 if(knownRevision>0&&cloudRevision>knownRevision&&localMatchesKnown)return 'load-cloud';
 return 'conflict';
}
/** Aplica la copia remota solo si el dispositivo no tiene cambios pendientes. */
export function decideLiveSync({knownRevision,cloudRevision,localFingerprint,confirmedFingerprint}){
 if(cloudRevision<=knownRevision)return 'unchanged';
 if(localFingerprint===confirmedFingerprint)return 'load-cloud';
 return 'defer';
}
