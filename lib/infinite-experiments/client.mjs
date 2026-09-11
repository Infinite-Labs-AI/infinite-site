
export function createExperimentClient(options = {}) {
  // The pixel's public key binds every beacon to its site source; a missing or malformed key is a wiring mistake, surfaced here.
  if(!/^site_[A-Za-z0-9_-]+$/.test(options.siteSourceKey || '')) throw new Error('invalid_site_source_key');
  const doc = options.document || globalThis.document;
  const here = options.location || globalThis.location;
  const nav = options.navigator || globalThis.navigator;
  let storage = options.storage;
  if (!storage) { try { storage = globalThis.localStorage; } catch {} }
  const now = options.now || Date.now;
  const listen = options.addEventListener || ((name, callback) => globalThis.addEventListener(name, callback));
  const send = options.fetch || ((url, init) => globalThis.fetch(url, init));
  const consent = options.consentCookie || {name:'infinite_experiment_consent',grantedValue:'granted',deniedValue:'denied'};
  const personName = options.personCookieName || '__Host-infinite-person';
  const assignmentPrefix = '__Host-infinite-exp-';
  let exposed = false;
  let revoked = false;
  let ownerDecision = null;
  const stored = key => { try { return storage && storage.getItem(key); } catch { return null; } };
  function cookie(name) {
    const found = (doc.cookie || '').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));
    return found.length === 1 ? found[0].slice(name.length+1) : null;
  }
  function put(name,value,maxAge=31536000) {
    if (here.protocol !== 'https:' || !/^[A-Za-z0-9_-]+$/.test(name)) return;
    try { doc.cookie = name+'='+encodeURIComponent(value)+'; Path=/; Secure; SameSite=Lax; Max-Age='+maxAge; } catch {}
  }
  // The decision in force: 'granted' for an explicit first-party grant; 'denied' for an explicit negative (revocation,
  // the owner's false/'denied', a stored 'denied'); 'not_required' only under that deployment policy without either;
  // false when undecided or unreadable (an undecided required site, a throwing getter, a privacy signal without a grant).
  function decision() {
    if (!doc || !here || here.protocol !== 'https:' || nav.webdriver === true) return false;
    if(revoked) return 'denied';
    let owner;
    try { owner=options.getConsentDecision && options.getConsentDecision(); } catch { return false; }
    if(owner === false || owner === 'denied') return 'denied';
    if(owner === true || owner === 'granted') return 'granted';
    if(ownerDecision !== null) return ownerDecision ? 'granted' : 'denied';
    const choice=stored(options.consentStorageKey || 'infinite_analytics_consent');
    if(choice==='denied') return 'denied';
    if(choice==='granted') return 'granted';
    if(nav.doNotTrack==='1' || nav.globalPrivacyControl===true) return false;
    return options.consentMode === 'not_required' ? 'not_required' : false;
  }
  // 'granted' for an explicit first-party grant, 'not_required' only under that deployment policy without one, false otherwise.
  function permission() { const state=decision(); return state==='denied' ? false : state; }
  function allowed() { return permission() !== false; }
  // The consent cookie records an EXPLICIT decision only and fails closed: 'granted' for an explicit grant, 'denied' for an
  // explicit negative (revocation, the owner's false/'denied', a stored 'denied'). Nothing is written under a not_required
  // policy without a choice, and nothing is written for a bare privacy signal (DNT/GPC), an undecided required site or an
  // unreadable owner: those suppress this visit — the beacon stays off here and the router passes on its own
  // (privacy_signal / consent_required) — but persist no denial, exactly as the site's own gate
  // (.github/scripts/inject-analytics.cjs __infiniteConsentGate) treats a bare signal as "wait", never as a stored opt-out.
  // A stale 'granted' cookie the page can no longer vouch for is expired in that case, so the router (where an explicit
  // grant overrides a privacy signal) never enrols on a grant the page does not currently hold.
  // Only an explicit negative leaves no experiment identifier behind: the person cookie and every assignment cookie expire
  // (the middleware sets neither HttpOnly), so a later grant enrols as a new person. An undecided site, an unreadable owner
  // or a privacy signal keeps the identity for the decision to come.
  function bridge() {
    const state=decision();
    if(state==='granted') put(consent.name,consent.grantedValue);
    else if(state==='denied') put(consent.name,consent.deniedValue);
    else if(state===false && cookie(consent.name)===consent.grantedValue) put(consent.name,'',0);
    if(state==='denied') {
      let names=[];
      try { names=(doc.cookie || '').split(';').map(s=>s.trim().split('=')[0]); } catch {}
      for(const name of names) if(name===personName || name.startsWith(assignmentPrefix)) put(name,'',0);
    }
    return state!==false && state!=='denied';
  }
  // Read the existing stored decision after the owning consent runtime processes the event.
  // The event payload itself never grants capture permission.
  listen('infinite:analytics-consent-change',event=>{
    // A denial always vetoes further collection, even if the owner's persistence failed.
    // Grants must come from the owning UI/getter, never from an arbitrary event payload.
    if(event && event.detail && event.detail.granted === false) revoked=true;
    queueMicrotask(bridge);
  });
  listen('storage',event=>{
    const key=options.consentStorageKey || 'infinite_analytics_consent';
    if(event && event.key !== null && event.key !== key) return;
    ownerDecision=null;
    const choice=stored(key);
    if(choice==='denied') revoked=true;
    else if(choice==='granted') revoked=false;
    bridge();
  });
  function context() {
    try {
      if(!allowed()) return null;
      const meta=doc.querySelector('meta[name="infinite-experiment"]');
      if(!meta || meta.content.length>2048) return null;
      const artifact=JSON.parse(meta.content);
      if(!artifact || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(artifact.experimentId)) return null;
      const value=cookie(assignmentPrefix+artifact.experimentId);
      if(!value || value.length>4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return null;
      const payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.split('.')[0].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
      // The person cookie the middleware issued must be present exactly once and agree with the signed assignment.
      if(payload.schemaVersion!==2 || payload.host!==here.hostname || artifact.pagePath!==here.pathname || payload.expiresAt<=now()
        || !Number.isSafeInteger(payload.expiresAt) || !Number.isSafeInteger(payload.enrolledAt) || payload.enrolledAt>now()
        || !['control','test'].includes(payload.variant) || !/^[a-f0-9]{32}$/.test(payload.personId || '') || cookie(personName)!==payload.personId
        || ['experimentId','revision','variant'].some(k=>payload[k]!==artifact[k])
        || !payload.artifact || !/^[a-f0-9]{64}$/.test(artifact.contentSha256)
        || payload.artifact.contentSha256!==artifact.contentSha256) return null;
      return {payload,artifact};
    } catch { return null; }
  }
  async function sha256Hex(text) {
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
    return Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
  }
  // The Infinite pixel's anonymousId, when the site can supply it. Absent is null; it never blocks the exposure.
  function visitorId() {
    try { const id=options.getVisitorId && options.getVisitorId(); return typeof id==='string' && id.length>0 && id.length<=128 ? id : null; } catch { return null; }
  }
  // One beacon per person per revision: the eventId is derived, so a reload or a retry names the SAME row.
  // The body never carries the signed assignment; the server verifies what it needs from its own records.
  async function recordExposure() {
    if(exposed || !allowed()) return;
    // Defer until the document is parsed and visible; the marker and the cookies are read only then.
    if(doc.readyState==='loading') { doc.addEventListener('DOMContentLoaded',recordExposure,{once:true}); return; }
    if(doc.visibilityState==='hidden') { doc.addEventListener('visibilitychange',recordExposure); return; }
    const c=context(); if(!c) return;
    exposed=true;
    try {
      const eventId=await sha256Hex('exposure:v1:'+c.payload.experimentId+':'+c.payload.revision+':'+c.payload.personId);
      // Consent may have been withdrawn while the digest was computed; the state reported is the one in force at the post.
      const consentState=permission(); if(!consentState) { exposed=false; return; }
      const body={
        siteSourceKey:options.siteSourceKey,
        eventId,
        experimentId:c.payload.experimentId,revision:c.payload.revision,arm:c.payload.variant,
        personId:c.payload.personId,
        visitorId:visitorId(),
        occurredAt:new Date(now()).toISOString(),
        url:here.origin+here.pathname,
        contentSha256:c.artifact.contentSha256,
        consentState,
        enrolledAt:c.payload.enrolledAt,
      };
      await send(options.exposurePath || '/infinite/experiment',{
        method:'POST',keepalive:true,credentials:'same-origin',
        headers:{'content-type':'application/json'},body:JSON.stringify(body),
      });
    } catch { exposed=false; } // A transient failure may retry on the next navigation.
  }
  function loaded() { return bridge() ? recordExposure() : undefined; }
  // Deprecated no-op: a v1 call site passed its result to an analytics initialiser. The v2 client configures no provider.
  function bootstrap() { return undefined; }
  // Call only from the owning consent UI's validated decision handler.
  function setConsentDecision(granted) { if(typeof granted==='boolean') {ownerDecision=granted;revoked=!granted;bridge();} }
  return {bootstrap,loaded,bridgeConsent:bridge,setConsentDecision,recordExposure};
}
