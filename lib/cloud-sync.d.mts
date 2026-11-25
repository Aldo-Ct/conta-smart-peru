export function decideSync(input:{hasLocal:boolean;localFingerprint:string;cloudFingerprint:string;knownRevision:number;cloudRevision:number;localMatchesKnown?:boolean}):'load-cloud'|'matched'|'upload-local'|'conflict';
export function decideLiveSync(input:{knownRevision:number;cloudRevision:number;localFingerprint:string;confirmedFingerprint:string}):'unchanged'|'load-cloud'|'defer';
