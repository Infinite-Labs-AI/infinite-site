
import {readFileSync,writeFileSync,mkdirSync,realpathSync,lstatSync} from 'node:fs';
import {resolve,join,dirname,sep,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const hash=html=>createHash('sha256').update(html).digest('hex');
const segment=s=>typeof s==='string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(s);
function relative(p) {
  if(typeof p!=='string' || !p || isAbsolute(p) || p.split(/[\\/]/).some(x=>!x || x==='.' || x==='..')) throw new Error('invalid_path');
  return p;
}
function cleanTarget(root,path) {
  let current=root;
  for(const part of path.split('/')) {
    current=join(current,part);
    try { if(lstatSync(current).isSymbolicLink()) throw new Error('target_symlink'); }
    catch(e) { if(e.code!=='ENOENT') throw e; }
  }
  return current;
}
export function buildExperimentArtifacts({repoRoot,outputDirectory,siteOrigin,definitions}) {
  const root=realpathSync(repoRoot);
  const output=cleanTarget(root,relative(outputDirectory));
  const origin=new URL(siteOrigin);
  if(origin.protocol!=='https:' || origin.origin!==siteOrigin || origin.username || origin.password) throw new Error('invalid_origin');
  if(!Array.isArray(definitions) || definitions.length>2) throw new Error('invalid_definitions');
  if(new Set(definitions.map(e=>e.id)).size!==definitions.length || new Set(definitions.map(e=>e.pagePath)).size!==definitions.length) throw new Error('duplicate_experiment');
  // Every source is read through the checkout's real path and must stay inside it.
  function source(path) {
    const file=realpathSync(resolve(root,relative(path)));
    if(!file.startsWith(root+sep)) throw new Error('source_escape');
    return readFileSync(file,'utf8');
  }
  const pending=[];
  const experiments=definitions.map(def=>{
    const allocation=def.allocationBasisPoints;
    if(!segment(def.id) || !segment(def.revision) || !/^\/(?:[A-Za-z0-9_-]+\/?)*(?:[A-Za-z0-9_-]+\.html)?$/.test(def.pagePath)
      || def.pagePath.startsWith('/__infinite_experiments')
      || ![def.startsAt,def.enrollmentEndsAt,def.endsAt].every(t=>Number.isSafeInteger(t)&&t>=0)
      || def.startsAt>=def.enrollmentEndsAt || def.enrollmentEndsAt>def.endsAt
      // This version freezes an exact 50/50 split, the only allocation the runtime accepts.
      || !allocation || allocation.control!==5000 || allocation.test!==5000) throw new Error('invalid_definition');
    const sources=def.sources || {};
    if(!sources.original) throw new Error('missing_original_source');
    const variants={};
    for(const variant of ['control','test']) {
      const input=source(sources[variant]);
      // Leave raw text/comment contents byte-for-byte intact; JS may mention these HTML tags.
      if(input.includes('\u0000')) throw new Error('invalid_html_source');
      const raw=[];
      const markup=input.replace(/<!--[\s\S]*?-->|<(script|style|textarea|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
        value=>'\u0000RAW'+(raw.push(value)-1)+'\u0000');
      if(input.length>5000000 || (markup.match(/<head(?:\s[^>]*)?>/gi)||[]).length!==1 || !/<\/head>/i.test(markup)
        || /<meta\b[^>]*\bname=["']infinite-experiment["']/i.test(markup)) throw new Error('invalid_html_source');
      const contentSha256=hash(input);
      const marker={experimentId:def.id,revision:def.revision,pagePath:def.pagePath,variant,contentSha256};
      const metadata=JSON.stringify(marker).replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/</g,'&lt;');
      const canonical=origin.origin+def.pagePath;
      const html=markup.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi,'')
        .replace(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi,'')
        .replace(/<head(?:\s[^>]*)?>/i,head=>head+'\n<meta name="infinite-experiment" content=\''+metadata+'\'>\n<link rel="canonical" href="'+canonical+'">\n<meta property="og:url" content="'+canonical+'">')
        .replace(/\u0000RAW(\d+)\u0000/g,(_match,index)=>raw[Number(index)]);
      const path='/__infinite_experiments/'+def.id+'/'+def.revision+'/'+variant+'.html';
      const target=cleanTarget(output,path.slice(1));
      variants[variant]={path,sha256:hash(html),contentSha256};
      pending.push({target,html});
    }
    // Byte-level proof that control is the untouched page: the original's pre-decoration hash must equal control's.
    const originalContentSha256=hash(source(sources.original));
    if(originalContentSha256!==variants.control.contentSha256) throw new Error('control_is_not_original');
    // Key order is normative (types.ts ServingExperiment): the runtime binds every assignment to the JSON serialisation
    // of this object, so identical content must always serialise to identical bytes. Nothing else in the definition is carried.
    return {id:def.id,revision:def.revision,pagePath:def.pagePath,startsAt:def.startsAt,enrollmentEndsAt:def.enrollmentEndsAt,endsAt:def.endsAt,
      allocationBasisPoints:{control:allocation.control,test:allocation.test},originalContentSha256,
      variants:{control:variants.control,test:variants.test}};
  });
  // Validate/read every source first. Nothing is written for a rejected source/definition.
  for(const {target,html} of pending) {mkdirSync(dirname(target),{recursive:true});writeFileSync(target,html);}
  return {manifest:{schemaVersion:2,experiments},files:pending.map(({target})=>target)};
}
