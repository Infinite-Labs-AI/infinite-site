(()=>{
const artifacts=[...document.querySelectorAll('.ws-artifact')];
function activate(node,active){node.dataset.active=String(active);node.setAttribute('aria-pressed',String(active));
if(node.dataset.work==='content'){node.querySelector('.sheet-copy').innerHTML=active?'A useful idea.<br>A post worth reading.':'Worth<br>their time.';node.querySelector('.sheet-format').textContent=active?'SHORT POST / EXAMPLE':'CAROUSEL IDEA / EXAMPLE'}
if(node.dataset.work==='tests'){node.querySelector('.test-mode').textContent=active?'PROPOSED TEST':'CURRENT MESSAGE';node.querySelector('.test-message').textContent=active?'Get customers\nafter you ship.':'Grow faster\nwith AI agents.';node.querySelector('.test-question').textContent=active?'Test an outcome-led promise.':'What if the outcome was clearer?'}
}
artifacts.forEach(node=>{activate(node,false);node.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')activate(node,true)});node.addEventListener('pointerleave',()=>{if(!node.matches(':focus-visible'))activate(node,false)});node.addEventListener('focus',()=>{if(node.matches(':focus-visible'))activate(node,true)});node.addEventListener('blur',()=>activate(node,false));node.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){e.preventDefault();activate(node,node.dataset.active!=='true')}});node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(node,node.dataset.active!=='true')}if(e.key==='Escape')activate(node,false)});});
})();
