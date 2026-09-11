
import {isExperimentArtifactPath} from './runtime.mjs';
export function composeExperimentMiddleware(siteMiddleware,routeExperiment,{next,rewrite}) {
  return async function middleware(request) {
    if(isExperimentArtifactPath(new URL(request.url).pathname)) {
      return new Response('Not found',{status:404,headers:{'cache-control':'private, no-store','cdn-cache-control':'no-store','vercel-cdn-cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
    }
    const original=await siteMiddleware(request);
    // Never evaluate a flag or rewrite past a site's auth, redirect or direct response.
    if(!original.headers.has('x-middleware-next')) return original;
    const decision=await routeExperiment(request);
    if(decision.kind==='not_found') return new Response('Not found',{status:404,headers:decision.headers});
    const headers=new Headers(original.headers);
    for(const [key,value] of Object.entries(decision.headers)) {
      // The router joins several Set-Cookie values with '\n'; each becomes its own header.
      if(key.toLowerCase()==='set-cookie') { for(const part of value.split('\n')) if(part) headers.append(key,part); }
      else if(key.toLowerCase()==='vary' && headers.has(key)) headers.set(key,headers.get(key)+', '+value);
      else headers.set(key,value);
    }
    if(decision.kind==='rewrite') {
      headers.delete('x-middleware-next');
      return rewrite(new URL(decision.destination,request.url),{headers});
    }
    return next({headers});
  };
}
