(()=>{
const hero=document.querySelector('.hero'),copy=hero.querySelector('.hero-center');
const layer=document.createElement('div');layer.className='possibility-layer';layer.setAttribute('role','group');layer.setAttribute('aria-label','Interactive examples of marketing work');hero.prepend(layer);
const controls=document.createElement('div');controls.className='trail-controls';controls.innerHTML='<span>Possibilities</span><button type="button">Replay entrance</button>';document.body.append(controls);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const templates=[
['ad','<div class="peek-ad"><div class="ad-flip-scene"><div class="ad-flipper"><img class="ad-front" src="/assets/infinite-option-10/ag1-ads/studio-product.webp" alt="Product-focused ad concept"><img class="ad-back" src="/assets/infinite-option-10/ag1-ads/morning-routine.webp" alt="Morning-routine ad concept"></div></div><small>CREATIVE 01 / EXAMPLE</small></div>'],
['headline','<div class="peek-headline"><small>A NEW ANGLE</small><p class="rewriting-copy">A little less noise.<br>A lot more you.</p><span class="rewrite-caret" aria-hidden="true"></span></div>'],
['collaboration','<div class="peek-collab"><small>A COLLABORATION IDEA</small><div class="people"><svg class="collab-thread" viewBox="0 0 112 34" aria-hidden="true"><path d="M14 26 Q52 0 99 25"/></svg><i>A</i><i>M</i><i>J<span class="collab-check" aria-hidden="true">✓</span></i></div><p>Your people’s people.</p></div>'],
['website','<div class="peek-site"><div class="chrome">moss.example<span class="page-progress" aria-hidden="true"></span></div><div class="site-viewport"><div class="site-scroll"><div class="site"><b>moss</b><p>Know what<br>to build next.</p><span>Start free ↗</span></div><div class="site-product"><small>FROM FEEDBACK TO FORWARD</small><strong>Your next release,<br>a little clearer.</strong><div class="mini-roadmap"><b>Product roadmap</b><div><i></i>Bring feedback together <em>Now</em></div><div><i></i>Find the useful patterns <em>Next</em></div><div><i></i>Share what’s coming <em>Later</em></div></div></div></div><span class="site-scrollbar" aria-hidden="true"></span></div><small>SCROLL A LITTLE FURTHER · EXAMPLE</small></div>']
];
const nodes=templates.map(([kind,html])=>{const node=document.createElement('div');node.className='possibility';node.dataset.kind=kind;node.innerHTML=html;node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-pressed','false');node.setAttribute('aria-label',{ad:'Flip the ad to another creative',headline:'Rewrite the headline',collaboration:'Reveal a creator collaboration',website:'Scroll the example website'}[kind]);layer.append(node);return node});
const activeStates=new Map();
const originalHeadline='A little less noise.\nA lot more you.';
const alternateHeadline='Good things happen\nwhen the right people\nfind you.';
function resetTimer(state){clearTimeout(state.timer);state.timer=0}
function rewrite(node,active,state){const p=node.querySelector('.rewriting-copy');resetTimer(state);if(!active||reduced.matches){p.textContent=active?alternateHeadline:originalHeadline;node.dataset.phase='ready';return}
node.dataset.phase='rewriting';let current=Array.from(p.textContent),next=Array.from(alternateHeadline),index=0;
function type(){if(!state.active)return;index=Math.min(next.length,index+2);p.textContent=next.slice(0,index).join('');if(index<next.length)state.timer=setTimeout(type,38);else{node.dataset.phase='ready';state.timer=0}}
function erase(){if(!state.active)return;current=current.slice(0,Math.max(0,current.length-6));p.textContent=current.join('');if(current.length)state.timer=setTimeout(erase,30);else state.timer=setTimeout(type,90)}erase();}
function activate(node,active){const state=activeStates.get(node);if(state.active===active)return;state.active=active;node.dataset.active=String(active);node.setAttribute('aria-pressed',String(active));
if(node.dataset.kind==='headline')rewrite(node,active,state);
if(node.dataset.kind==='ad')node.querySelector('small').textContent=active?'CREATIVE 02 / EXAMPLE':'CREATIVE 01 / EXAMPLE';
if(node.dataset.kind==='collaboration')node.querySelector('.peek-collab>p').textContent=active?'An introduction, made.':'Your people’s people.';
}
nodes.forEach(node=>{activeStates.set(node,{active:false,timer:0});node.dataset.active='false';
node.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')activate(node,true)});
node.addEventListener('pointerleave',()=>{if(!node.matches(':focus-visible'))activate(node,false)});
node.addEventListener('focus',()=>{if(node.matches(':focus-visible'))activate(node,true)});
node.addEventListener('blur',()=>activate(node,false));
node.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){e.preventDefault();activate(node,!activeStates.get(node).active)}});
node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(node,!activeStates.get(node).active)}if(e.key==='Escape')activate(node,false)});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)nodes.forEach(node=>activate(node,false))});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function layout(){nodes.forEach(n=>n.style.transition='none');layer.style.width=document.documentElement.clientWidth+'px';const r=layer.getBoundingClientRect(),safe=copy.getBoundingClientRect(),mobile=matchMedia('(max-width:1100px)').matches;
nodes.forEach((node,i)=>{const right=i>1,lower=i===1||i===2,width=node.offsetWidth,height=node.offsetHeight;let x,y;
if(mobile){x=r.width*(right?.75:.25)-width/2;y=lower?(matchMedia('(max-width:760px)').matches?170:192):12;x=clamp(x,9,r.width-width-9)}
else{const center=right?safe.right+(r.right-safe.right)/2:r.left+(safe.left-r.left)/2;x=center-r.left-width/2;if(right)x=clamp(x,safe.right-r.left+22,r.width-width-12);else x=clamp(x,12,safe.left-r.left-width-22);y=clamp(r.height*(lower?.71:.27)-height/2,8,r.height-height-12)}
node.style.setProperty('--x',x+'px');node.style.setProperty('--y',y+'px');node.style.setProperty('--r',(right?4:-4)+'deg');});void layer.offsetHeight;nodes.forEach(n=>n.style.removeProperty('transition'));}
let frame=0;
function reveal(){nodes.forEach(node=>activate(node,false));cancelAnimationFrame(frame);nodes.forEach(n=>n.classList.remove('is-visible'));layout();if(reduced.matches){nodes.forEach(n=>n.classList.add('is-visible'));layer.dataset.visible='4';return;}layer.dataset.visible='0';frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{nodes.forEach(n=>n.classList.add('is-visible'));layer.dataset.visible='4'})});}
controls.querySelector('button').onclick=reveal;
new ResizeObserver(layout).observe(copy);window.addEventListener('resize',layout);reduced.addEventListener('change',reveal);
layout();reveal();
})();
