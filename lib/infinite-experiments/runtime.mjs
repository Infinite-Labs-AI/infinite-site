
const RESERVED = '/__infinite_experiments';
const PRIVATE = {'cache-control':'private, no-store, max-age=0','cdn-cache-control':'no-store','vercel-cdn-cache-control':'no-store','vary':'Cookie'};
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal:true});
const segment = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
const cookieNameValid = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const identityValid = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\u0000-\u001f\u007f]/.test(value);
const PERSON_ID = /^[a-f0-9]{32}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;
function base64(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unbase64(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('encoding');
  const bytes = Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  if (base64(bytes) !== value) throw new Error('noncanonical');
  return bytes;
}
function cookies(header) {
  const result = new Map();
  for (const part of (header || '').split(';')) {
    const equals = part.indexOf('='); if(equals < 0) continue;
    const key = part.slice(0,equals).trim();
    result.set(key, result.has(key) ? null : part.slice(equals+1).trim());
  }
  return result;
}
function randomHex16() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
}
function isReserved(path) {
  // Hosting layers may repeatedly decode, collapse separators, then resolve dot segments.
  // Check each interpretation; never let a public alias reach a private static artifact.
  for (let i=0;i<16;i++) {
    const segments=[];
    for (const part of path.replace(/\\/g,'/').split('/')) {
      if(!part || part==='.') continue;
      if(part==='..') segments.pop(); else segments.push(part);
    }
    const normalized='/'+segments.join('/');
    if(normalized===RESERVED || normalized.startsWith(RESERVED+'/')) return true;
    try {
      const decoded=decodeURIComponent(path);
      if(decoded===path) return false;
      path=decoded;
    } catch { return true; } // Invalid escapes are ambiguous to downstream decoders.
  }
  return true; // Refuse excessive nested encoding rather than guessing host behavior.
}
function validPath(path) {
  return typeof path === 'string' && /^\/(?:[a-zA-Z0-9_-]+\/?)*(?:[a-zA-Z0-9_-]+\.html)?$/.test(path) && !path.startsWith('//') && !isReserved(path);
}
function validExperiment(e) {
  return !!e && segment(e.id) && segment(e.revision) && validPath(e.pagePath)
    && [e.startsAt,e.enrollmentEndsAt,e.endsAt].every(t=>Number.isSafeInteger(t) && t>=0 && t<=8640000000000000)
    && e.startsAt < e.enrollmentEndsAt && e.enrollmentEndsAt <= e.endsAt
    // This version freezes an exact 50/50 split; any other allocation fails closed.
    && !!e.allocationBasisPoints && e.allocationBasisPoints.control === 5000 && e.allocationBasisPoints.test === 5000
    && ['control','test'].every(arm=>e.variants && e.variants[arm]
      && e.variants[arm].path === RESERVED+'/'+e.id+'/'+e.revision+'/'+arm+'.html'
      && ['sha256','contentSha256'].every(field=>typeof e.variants[arm][field] === 'string' && SHA256_HEX.test(e.variants[arm][field])))
    // Byte-level proof that control is the untouched original page.
    && typeof e.originalContentSha256 === 'string' && SHA256_HEX.test(e.originalContentSha256)
    && e.originalContentSha256 === e.variants.control.contentSha256;
}
function validOptions(o) {
  const m=o.manifest;
  return m && m.schemaVersion === 2 && Array.isArray(m.experiments) && m.experiments.every(validExperiment)
    && new Set(m.experiments.map(e=>e.id)).size === m.experiments.length
    && new Set(m.experiments.map(e=>e.pagePath)).size === m.experiments.length
    && Array.isArray(o.productionHosts) && o.productionHosts.length > 0
    && o.productionHosts.every(h=>typeof h === 'string' && h.length<=253 && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(h))
    && typeof o.signingSecret === 'string' && o.signingSecret.length >= 32
    && ['production','preview'].includes(o.environment)
    && (o.consentMode === undefined || ['required','not_required'].includes(o.consentMode))
    && (o.consentCookie === undefined || (cookieNameValid(o.consentCookie.name)
       && identityValid(o.consentCookie.grantedValue) && identityValid(o.consentCookie.deniedValue)
       && o.consentCookie.grantedValue !== o.consentCookie.deniedValue))
    && (o.personCookieName === undefined || cookieNameValid(o.personCookieName));
}
export {isReserved as isExperimentArtifactPath};
export function createExperimentRouter(options = {}) {
  if (!options || typeof options !== 'object') options={};
  const now = options.now || Date.now;
  const randomId = typeof options.randomId === 'function' ? options.randomId : randomHex16;
  // Snapshot every deployment value. A caller cannot mutate artifact targets or policy mid-test.
  let o; try { o=JSON.parse(JSON.stringify(options)); } catch { o={}; }
  let valid=false; try { valid=!!validOptions(o); } catch { /* fail closed */ }
  const experiments = Array.isArray(o.manifest && o.manifest.experiments) ? o.manifest.experiments : [];
  let key;
  const getKey = () => key || (key=crypto.subtle.importKey('raw',encoder.encode(o.signingSecret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']));
  async function sign(payload) {
    const data=base64(encoder.encode(JSON.stringify(payload)));
    return data+'.'+base64(new Uint8Array(await crypto.subtle.sign('HMAC',await getKey(),encoder.encode(data))));
  }
  async function verify(value) {
    if(typeof value !== 'string' || value.length>4096) throw new Error('invalid cookie');
    const parts=value.split('.'); if(parts.length!==2) throw new Error('invalid cookie');
    const signature=unbase64(parts[1]);
    if(!await crypto.subtle.verify('HMAC',await getKey(),signature,encoder.encode(parts[0]))) throw new Error('signature');
    return JSON.parse(decoder.decode(unbase64(parts[0])));
  }
  function allocationOf(experimentId) {
    const e=experiments.find(item=>item && item.id===experimentId);
    if(!valid || !e) throw new Error('invalid configuration');
    return e.allocationBasisPoints;
  }
  // Deterministic split: HMAC-SHA256(secret, 'assign:v1:' + id + ':' + revision + ':' + person), first four
  // bytes big-endian, modulo 10000. The prefix domain-separates this use of the secret from cookie signing
  // (a signed cookie body is base64url, which never contains a colon). No network call is involved.
  async function bucketArm(experimentId, revision, personId) {
    const allocation = allocationOf(experimentId);
    const data = encoder.encode('assign:v1:' + experimentId + ':' + revision + ':' + personId);
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', await getKey(), data));
    const value = ((digest[0]<<24)>>>0) + (digest[1]<<16) + (digest[2]<<8) + digest[3];
    return (value % 10000) < allocation.control ? 'control' : 'test';
  }
  const router = async function route(request) {
    let url; try { url=new URL(request.url); } catch { return {kind:'pass',reason:'invalid_request',headers:{}}; }
    if(isReserved(url.pathname)) return {kind:'not_found',reason:'reserved_artifact',headers:{...PRIVATE,'x-robots-tag':'noindex, nofollow'}};
    const e=experiments.find(item=>item && item.pagePath===url.pathname);
    const headers=e ? {...PRIVATE} : {};
    const pass=reason=>({kind:'pass',reason,headers});
    if(!e) return pass('unconfigured_path');
    // This escape can only REMOVE treatment. It never selects an arm or an identity.
    if(url.searchParams.has('__infinite_original')) return pass('original_requested');
    if(!valid) return pass('invalid_configuration');
    if(o.enabled!==true) return pass('disabled');
    if(o.environment!=='production' && o.allowPreview!==true) return pass('environment_excluded');
    if(url.protocol!=='https:' || !o.productionHosts.includes(url.host)) return pass('host_excluded');
    const h=request.headers;
    if(request.method!=='GET' || !(h.get('accept') || '').split(',').some(v=>/^text\/html(?:\s*;|\s*$)/i.test(v.trim()) && !/;\s*q=0(?:\.0*)?(?:;|$)/i.test(v))
      || (h.get('sec-fetch-dest') && h.get('sec-fetch-dest')!=='document')
      || (h.get('sec-fetch-mode') && h.get('sec-fetch-mode')!=='navigate')) return pass('not_navigation');
    const userAgent=h.get('user-agent') || '';
    if(!userAgent.trim() || /bot|crawler|spider|slurp|headless|preview|facebookexternalhit|bingpreview|curl|wget|node|python|undici|playwright|puppeteer/i.test(userAgent)) return pass('bot');
    if(/prefetch|prerender/i.test((h.get('purpose') || '')+' '+(h.get('sec-purpose') || '')) || h.has('next-router-prefetch') || h.has('x-moz')) return pass('prefetch');
    const jar=cookies(h.get('cookie'));
    const consent=o.consentCookie;
    const explicitlyGranted=consent && jar.get(consent.name)===consent.grantedValue;
    // The existing site consent choice overrides browser privacy signals in both directions.
    if(!explicitlyGranted && (h.get('sec-gpc')==='1' || h.get('dnt')==='1')) return pass('privacy_signal');
    if(consent && jar.has(consent.name) && jar.get(consent.name)!==consent.grantedValue) return pass('consent_denied');
    if(o.consentMode!=='not_required' && (!consent || jar.get(consent.name)!==consent.grantedValue)) return pass('consent_required');
    try {
      const time=now(); if(!Number.isSafeInteger(time)) return pass('invalid_clock');
      if(time<e.startsAt) return pass('not_started');
      if(time>=e.endsAt) return pass('expired');
      const cookieName='__Host-infinite-exp-'+e.id;
      const binding=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(e)))));
      const personCookieName=o.personCookieName || '__Host-infinite-person';
      let person;
      if(jar.has(personCookieName)) {
        // null means the name was presented twice: ambiguous identity, never guess.
        const value=jar.get(personCookieName);
        if(value===null || !PERSON_ID.test(value)) return pass('invalid_identity');
        person=value;
      }
      let payload, signedAssignment;
      if(jar.has(cookieName)) {
        try { signedAssignment=jar.get(cookieName);payload=await verify(signedAssignment); } catch { return pass('invalid_assignment'); }
        if(!payload || payload.schemaVersion!==2 || payload.experimentId!==e.id || payload.revision!==e.revision || payload.host!==url.host
          || payload.binding!==binding || payload.expiresAt!==e.endsAt
          || !Number.isSafeInteger(payload.enrolledAt) || payload.enrolledAt<e.startsAt || payload.enrolledAt>=e.enrollmentEndsAt || payload.enrolledAt>time
          || !PERSON_ID.test(payload.personId || '') || !['control','test'].includes(payload.variant)
          || !payload.allocationBasisPoints || payload.allocationBasisPoints.control!==e.allocationBasisPoints.control
          || payload.allocationBasisPoints.test!==e.allocationBasisPoints.test) return pass('invalid_assignment');
        const expectedArtifact=e.variants[payload.variant];
        if(!payload.artifact || ['path','sha256','contentSha256'].some(field=>payload.artifact[field]!==expectedArtifact[field])) return pass('invalid_assignment');
        // A person cookie that disagrees with the signed payload is ambiguous identity: never guess.
        if(person!==undefined && person!==payload.personId) return pass('identity_changed');
        person=payload.personId;
      } else if(time>=e.enrollmentEndsAt) return pass('enrollment_closed');
      if(person===undefined) { person=randomId(); if(!PERSON_ID.test(person)) return pass('invalid_identity'); }
      const arm=payload ? payload.variant : await bucketArm(e.id,e.revision,person);
      const selectedAt=now();
      if(!Number.isSafeInteger(selectedAt) || selectedAt<time) return pass('invalid_clock');
      if(selectedAt>=e.endsAt) return pass('expired');
      if(!payload && selectedAt>=e.enrollmentEndsAt) return pass('enrollment_closed');
      const cookieAttrs='; Path=/; Secure; SameSite=Lax; Expires=';
      // The person id is the durable signup join key: every rewrite refreshes its one-year sliding expiry.
      const cookieLines=[personCookieName+'='+person+cookieAttrs+new Date(selectedAt+31536000000).toUTCString()];
      if(!payload) {
        payload={schemaVersion:2,experimentId:e.id,revision:e.revision,host:url.host,personId:person,variant:arm,enrolledAt:selectedAt,expiresAt:e.endsAt,artifact:{...e.variants[arm]},allocationBasisPoints:{...e.allocationBasisPoints},binding};
        signedAssignment=await sign(payload);
        cookieLines.push(cookieName+'='+signedAssignment+cookieAttrs+new Date(e.endsAt).toUTCString());
      }
      // The decision headers object holds one string per key, so several Set-Cookie values travel joined
      // with a separator the wrapper (vercel.mjs) splits on. Nothing touches the response headers until
      // every cookie is ready: a failure above returns original bytes and no cookie at all.
      headers['set-cookie']=cookieLines.join('\n');
      const artifact={...e.variants[payload.variant]};
      return {kind:'rewrite',reason:jar.has(cookieName)?'retained_assignment':'enrolled',destination:artifact.path+url.search,headers,
        context:{experimentId:e.id,revision:e.revision,pagePath:e.pagePath,personId:person,variant:payload.variant,artifact,cookieName,signedAssignment,consentState:explicitlyGranted?'granted':'not_required'}};
    } catch { return pass('runtime_unavailable'); }
  };
  router.bucketArm=bucketArm;
  return router;
}
