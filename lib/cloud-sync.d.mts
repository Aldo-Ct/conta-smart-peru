export function decideSync(input:{hasLocal:boolean;localFingerprint:string;cloudFingerprint:string;knownRevision:number;cloudRevision:number}):'load-cloud'|'matched'|'upload-local'|'conflict';
