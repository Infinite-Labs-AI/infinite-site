/* Three original, code-native interaction sketches. No external assets or tracking. */
(()=>{
const hero=document.querySelector('.hero');
const canvas=document.createElement('canvas');canvas.className='living-hero';canvas.setAttribute('aria-hidden','true');hero.prepend(canvas);
const ctx=canvas.getContext('2d');if(!ctx)return;
const hint=document.createElement('div');hint.className='interaction-hint';hero.append(hint);
const dock=document.createElement('div');dock.className='interaction-picker';dock.innerHTML='<div role="tablist" aria-label="Hero interaction idea"><button role="tab" data-mode="work" aria-selected="true">Work previews</button><button role="tab" data-mode="internet" aria-selected="false" tabindex="-1">Tiny studio</button><button role="tab" data-mode="curious" aria-selected="false" tabindex="-1">Curious ∞</button><button role="tab" data-mode="signals" aria-selected="false" tabindex="-1">Signals</button></div><button class="motion-toggle" aria-label="Pause hero motion" aria-pressed="false">Pause Ⅱ</button>';document.body.append(dock);

const work=document.createElement('div');work.className='work-previews';work.setAttribute('aria-label','Illustrative examples of marketing work');work.innerHTML=`
<article class="work-preview work-ad" aria-label="Example ad creative"><div class="ad-piece"><img src="../../assets/infinite-option-10/ag1-ads/studio-product.webp" alt="Green product pack and drink in a lime-colored advertising scene"><div class="ad-headline">Daily greens.<br>Done simply.</div><span class="ad-shop">Discover the routine ↗</span></div><small class="output-caption">Ads <span>Example</span></small></article>
<article class="work-preview work-site" aria-label="Example SaaS startup landing page"><div class="site-browser"><i></i><i></i><i></i><span>usemoss.example</span><b>↗</b></div><div class="saas-nav"><b><span>▧</span> moss</b><span>Product &nbsp; Pricing <em>Sign in</em></span></div><div class="saas-hero"><small>CUSTOMER FEEDBACK, CONNECTED</small><h3>Know what your<br>customers need next.</h3><p>Turn scattered feedback into a clear roadmap.</p><span class="saas-cta">Start free →</span><div class="saas-product"><div class="saas-product-bar"><b>moss / feedback</b><span>＋ Add feedback</span></div><div class="saas-product-layout"><div class="saas-rail"><b>Inbox</b><span>Insights</span><span>Roadmap</span></div><div class="saas-rows"><div><i></i><span>Connect our customer tools</span><b>24</b></div><div><i></i><span>A simpler reporting view</span><b>18</b></div><div><i></i><span>Share updates with the team</span><b>12</b></div></div></div></div></div><small class="output-caption">SaaS landing page <span>Example</span></small></article>
<div class="work-pill work-influencer"><span class="pill-icon" aria-hidden="true">◎</span><span>Creators your people listen to.</span><small>INFLUENCER</small></div>
<div class="work-pill work-ab"><span class="pill-icon ab-icon" aria-hidden="true">A/B</span><span>A landing page worth testing.</span></div>
`;hero.append(work);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=false,mode='work',w=1,h=1,mobile=false,visible=true,raf=0,time=0,previous=0;
let pointer={x:-999,y:-999,active:false},gaze={x:0,y:0};
const buttons=[...dock.querySelectorAll('[data-mode]')],motion=dock.querySelector('.motion-toggle');
try{const stored=localStorage.getItem('infinite-hero-interaction-v2');if(['work','internet','curious','signals'].includes(stored))mode=stored}catch{}
function label(){hint.textContent=mobile?'A LITTLE WORLD AT THE EDGE OF THE PAGE':mode==='internet'?'SIX LITTLE ROOMS. ONE MARKETING TEAM.':mode==='curious'?'SOMEONE’S CURIOUS ABOUT YOU.':'MOVE AROUND THE EDGES. SEE WHAT CONNECTS.';if(reduced.matches)hint.textContent+=' · STILL VIEW';}
function setMode(next){mode=next;stop();canvas.dataset.mode=mode;hero.dataset.heroMode=mode;buttons.forEach(b=>{const on=b.dataset.mode===mode;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});try{localStorage.setItem('infinite-hero-interaction-v2',mode)}catch{}time=0;gaze={x:0,y:0};label();motionState();render();start();}
buttons.forEach((b,i)=>{b.onclick=()=>setMode(b.dataset.mode);b.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%buttons.length;if(e.key==='ArrowLeft')n=(i+buttons.length-1)%buttons.length;if(e.key==='Home')n=0;if(e.key==='End')n=buttons.length-1;if(n!==undefined){e.preventDefault();setMode(buttons[n].dataset.mode);buttons[n].focus()}}});
function motionState(){motion.disabled=reduced.matches||mode==='work';motion.textContent=mode==='work'?'Still':reduced.matches?'Motion off':paused?'Play ▷':'Pause Ⅱ';motion.setAttribute('aria-pressed',String(paused||reduced.matches||mode==='work'));motion.setAttribute('aria-label',mode==='work'?'Static work previews':paused?'Play hero motion':'Pause hero motion');label();}
motion.onclick=()=>{paused=!paused;motionState();if(paused)stop();else start();render()};
function stop(){cancelAnimationFrame(raf);raf=0;previous=0;}
function start(){if(mode!=='work'&&!raf&&visible&&!document.hidden&&!paused&&!reduced.matches)raf=requestAnimationFrame(tick)}
function tick(t){raf=0;if(mode==='work'||!visible||document.hidden||paused||reduced.matches)return;if(previous)time+=Math.min(40,t-previous)/1000;previous=t;render();raf=requestAnimationFrame(tick)}
function resize(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;mobile=w<761;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);label();render();start()}
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else stop()},{threshold:0}).observe(hero);
document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
reduced.addEventListener('change',()=>{motionState();if(reduced.matches)stop();else start();render()});
function track(e){const r=canvas.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top,active:true};if(paused||reduced.matches)render()}
hero.addEventListener('pointermove',track,{passive:true});hero.addEventListener('pointerdown',track,{passive:true});hero.addEventListener('pointerleave',()=>{pointer.active=false;if(paused||reduced.matches)render()});
const ink='#667799',edge='#b1bdd8',blue='#5155eb',light='#edf1ff',mint='#d9e6da';
function polygon(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.6;ctx.stroke()}}
function rect(x,y,a,b,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),a,b)}
function text(str,x,y,size=4,color=ink){ctx.fillStyle=color;ctx.font=size+'px monospace';ctx.fillText(str,x,y)}
function letter(x,y,color='#fdfdff'){rect(x,y,8,5,color);ctx.strokeStyle='#929fd1';ctx.lineWidth=.5;ctx.strokeRect(Math.round(x),Math.round(y),8,5);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4,y+3);ctx.lineTo(x+8,y);ctx.stroke()}
function person(x,y,color,look=0,phase=0){const walk=Math.sin(phase)>0?1:0;rect(x-2,y-14,5,5,'#7885a8');rect(x-1,y-13,4,4,'#f6f2ec');rect(x+(look>0?2:0),y-12,1,1,'#56627e');rect(x-2,y-8,6,7,color);rect(x-4,y-7,2,4,color);rect(x+4,y-7,2,4,color);rect(x-1,y-1,2,5,'#78829b');rect(x+2,y-1,2,5-walk,'#78829b');rect(x-2,y+3,3,2,'#556078');rect(x+2,y+3-walk,3,2,'#556078')}
const roomNames=['AD AGENCY','FILM STUDIO','PHOTOSHOOT','LEADS','CONTENT','WEBSITE'];
function line(points,color=ink,width=.8){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke()}
function plant(x,y){rect(x-3,y,7,7,'#c7c0df');rect(x,y-11,2,12,'#93af9b');rect(x-4,y-8,5,3,'#b6cdb7');rect(x+2,y-12,4,4,'#acc5ae')}
function desk(x=22,y=44){polygon([[x,y],[x+22,y-10],[x+43,y],[x+21,y+11]],'#f9faff',edge);polygon([[x+21,y+11],[x+43,y],[x+43,y+3],[x+21,y+14]],'#bdc9e3');rect(x+5,y+4,2,16,'#a3b2ce');rect(x+34,y+5,2,13,'#a3b2ce')}
function monitor(x,y,active=false){rect(x,y,20,15,'#8598ba');rect(x+1,y+1,18,12,active?'#e6e5ff':'#eef4ff');rect(x+8,y+15,4,4,'#a1b2cf');rect(x+4,y+19,12,2,'#adbbd4')}
function camera(x,y){rect(x,y,12,8,'#7385a7');rect(x+12,y+2,4,5,'#5d6f91');rect(x+3,y-3,5,3,'#899cbc');line([[x+6,y+8],[x+6,y+22]],'#8092b4',1);line([[x+6,y+12],[x-1,y+24]],'#8092b4',1);line([[x+6,y+12],[x+13,y+24]],'#8092b4',1)}
function softbox(x,y,active){polygon([[x,y],[x+9,y-4],[x+12,y+5],[x+3,y+10]],active?'#fff5cd':'#f5f8ff','#a7b6d0');line([[x+6,y+10],[x+6,y+29]],'#9baac4',.8);line([[x+6,y+26],[x+1,y+31]],'#9baac4');line([[x+6,y+26],[x+11,y+31]],'#9baac4')}
function scene(cx,cy,kind,scale){const near=pointer.active&&Math.abs(pointer.x-cx)<50*scale&&Math.abs(pointer.y-cy)<48*scale;const active=near&&!paused&&!reduced.matches;const t=paused||reduced.matches?0:time;
ctx.save();ctx.translate(cx-48*scale,cy-49*scale);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
const accents=['#d6d4f1','#d0e1db','#e7d9e7','#d2def4','#e7decd','#d6def0'];
polygon([[4,56],[48,78],[93,55],[49,33]],'#e3e9f8');polygon([[4,56],[48,78],[48,83],[4,61]],'#ced8ee');polygon([[48,78],[93,55],[93,60],[48,83]],'#bbc9e4');
for(let i=1;i<5;i++)line([[4+i*9,56+i*4.5],[49+i*9,33+i*4.5]],'#f8faff',.5);
polygon([[4,56],[4,18],[49,0],[49,33]],'#eef2ff',edge);polygon([[49,0],[93,20],[93,55],[49,33]],accents[kind],edge);
// A little name plate makes each room understandable without more website copy.
ctx.save();ctx.textAlign='center';text(roomNames[kind],48,92,4.7,near?blue:'#8999b8');ctx.restore();
if(kind===0){
 // Advertising: campaign boards, two creatives, a strategist and a client.
 polygon([[11,24],[39,12],[39,35],[11,47]],'#fff',edge);
 polygon([[14,26],[24,22],[24,34],[14,39]],active?'#918af2':'#c0c5ef');
 polygon([[27,20],[36,16],[36,28],[27,32]],'#f2dea8');
 line([[15,41],[34,33]],'#a9b8d6');desk(29,44);letter(39,40,'#e0defa');letter(50,43,'#f7e7b7');
 person(26,59,'#899ac5',pointer.x-cx,t);person(65,61,blue,pointer.x-cx,0);plant(80,45);
 if(active){line([[61,48],[52,41]],blue,1.3);rect(18,29,3,2,'#fff')}
 text('A / B',56,15,4,'#929bb9');
}else if(kind===1){
 // Film: set backdrop, a camera, boom microphone and clapperboard.
 polygon([[57,15],[85,28],[85,58],[57,45]],'#a8c3bb',edge);
 polygon([[57,45],[85,58],[70,66],[44,53]],'#c4d8d1');
 person(70,52,'#ac9ccd',pointer.x-cx,0);camera(21,40);person(18,62,'#718eaa',pointer.x-cx,0);
 line([[32,25],[66,17],[76,22]],'#95a5bf',1);rect(74,21,6,3,'#74849e');
 rect(13,26,14,8,'#f5f6fc');rect(13,23,14,3,'#7887a4');for(let n=0;n<4;n++)rect(14+n*3,23,1,3,'#eff4ff');
 if(active){polygon([[37,43],[66,33],[66,55]],'#fff8db40');rect(23,42,2,2,'#c6debc')}
}else if(kind===2){
 // Photography: a cyclorama, a product plinth and two softboxes.
 polygon([[48,15],[79,29],[79,53],[48,39]],'#fbfaff',edge);
 polygon([[48,39],[79,53],[64,65],[33,51]],'#fff');
 polygon([[56,45],[64,42],[71,46],[63,50]],'#ccd7ed');polygon([[56,45],[63,50],[63,60],[56,55]],'#bfcde5');polygon([[63,50],[71,46],[71,55],[63,60]],'#aebedb');
 rect(61,36,5,10,blue);rect(62,33,3,3,'#929be3');rect(62,39,3,3,'#dcddff');
 softbox(32,24,active);softbox(79,40,active);camera(20,47);person(17,67,'#a698be',pointer.x-cx,0);
 if(active)line([[55,33],[58,35],[55,36]],'#fbf0b7',1.2);
}else if(kind===3){
 // Leads: one signal map and an incoming message delivered to the desk.
 polygon([[12,23],[39,12],[39,38],[12,49]],'#edf4ff',edge);
 line([[18,34],[31,22],[34,33],[22,40],[18,34]],'#adbce0');
 [[18,34],[31,22],[34,33],[22,40]].forEach((pt,i)=>rect(pt[0]-1,pt[1]-1,3,3,i===1&&active?blue:'#9eadd2'));
 desk(31,46);monitor(39,28,active);rect(42,31,12,2,'#b5c6e5');rect(42,36,7,1,blue);person(63,65,'#769aaa',pointer.x-cx,0);
 const travel=active?(Math.sin(t*1.2)+1)*7:4;letter(17+travel,57-travel*.25,'#fff7d9');plant(81,48);
}else if(kind===4){
 // Content: a writer, editing screen, posted ideas and a small printer.
 polygon([[12,24],[39,13],[39,34],[12,45]],'#fff9ec',edge);
 [[16,26],[26,22],[18,35],[29,31]].forEach((pt,i)=>{polygon([[pt[0],pt[1]],[pt[0]+6,pt[1]-2],[pt[0]+6,pt[1]+4],[pt[0],pt[1]+6]],i%2?'#dad4f5':'#d0dfdc')});
 desk(27,46);monitor(35,28,active);for(let n=0;n<4;n++)rect(38,31+n*2,n===2?8:12,1,n===2?blue:'#b6c3db');
 person(48,66,'#b19bbf',pointer.x-cx,0);if(active)rect(44+(Math.floor(t*2)%2),51,4,2,'#f5efec');
 rect(74,42,12,10,'#b5c2dc');rect(75,43,10,3,'#8197b7');rect(77,48,7,9+(active?Math.floor(t%2):0),'#fafbff');rect(79,51,3,1,'#c5cee0');
}else{
 // Website: one large monitor showing a page being assembled.
 monitor(48,19,active);rect(50,21,16,2,'#b8c7e2');rect(51,25,14,4,active?'#9b97ee':'#c5c9ef');rect(51,30,6,2,'#ccd8e7');rect(59,30,6,2,'#ddd4e9');
 polygon([[24,47],[50,36],[78,49],[51,63]],'#f9fbff',edge);polygon([[51,63],[78,49],[78,52],[51,66]],'#b8c7e3');rect(33,54,2,13,'#a1b2d0');rect(70,55,2,9,'#a1b2d0');
 rect(44,49,15,3,'#b7c8e1');rect(61,53,3,2,'#acbeda');person(51,72,'#798ac4',pointer.x-cx,0);plant(15,46);
 polygon([[12,24],[32,16],[32,35],[12,43]],'#edf3ff',edge);line([[16,27],[20,25],[17,31],[21,30]],'#a2b3d3');line([[25,23],[28,25],[25,30]],'#a2b3d3');
 if(active){polygon([[60,24],[60,29],[63,27]],'#fff');rect(56,52,2,2,'#f3e9e6')}
}
ctx.restore();return near;
}
function drawInternet(){const scale=mobile?Math.min(1.08,(w/3-12)/96):Math.min(w<1100?1.33:1.62,h/300);let hovered=-1;
for(let i=0;i<6;i++){let cx,cy;if(mobile){cx=w*((i%3)+.5)/3;cy=i<3?66:176}else{const side=i<3?0:1,row=i%3;cx=side?w-Math.min(146,w*.135):Math.min(143,w*.135);cy=h*(.19+row*.31)+(side?5:0)}if(scene(cx,cy,i,scale))hovered=i}
const names=['AD AGENCY · FINDING THE ANGLE','FILM STUDIO · SETTING THE SCENE','PHOTOSHOOT · GETTING THE SHOT','LEADS · A SIGNAL COMING IN','CONTENT · SOMETHING WORTH SAYING','WEBSITE · MAKING IT CLEAR'];const message=hovered>=0?names[hovered]:'SIX LITTLE ROOMS. ONE MARKETING TEAM.';if(hint.textContent!==message+(reduced.matches?' · STILL VIEW':''))hint.textContent=message+(reduced.matches?' · STILL VIEW':'');canvas.dataset.rooms='6';
}
function drawCurious(){const cx=mobile?w*.53:w-Math.min(163,w*.15),cy=mobile?75:Math.min(250,h*.5);const active=pointer.active&&!paused&&!reduced.matches;const tx=active?Math.max(-1,Math.min(1,(pointer.x-cx)/240)):Math.sin(time*.3)*.2,ty=active?Math.max(-1,Math.min(1,(pointer.y-cy)/190)):0;if(!paused&&!reduced.matches){gaze.x+=(tx-gaze.x)*.07;gaze.y+=(ty-gaze.y)*.07;}const size=mobile?.68:.94;ctx.save();ctx.translate(cx,cy);ctx.scale(size,size);ctx.fillStyle='#7582bf13';ctx.beginPath();ctx.ellipse(0,68,65,7,0,0,Math.PI*2);ctx.fill();ctx.translate(gaze.x*9,gaze.y*4+(paused||reduced.matches?0:Math.sin(time*1.3)*2));ctx.rotate(gaze.x*.075);ctx.strokeStyle=blue;ctx.lineWidth=20;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();for(let i=0;i<=160;i++){const t=i/160*Math.PI*2,x=73*Math.cos(t)/(1+.4*Math.sin(t)**2),y=31*Math.sin(2*t);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.stroke();
 const blink=!paused&&!reduced.matches&&time%5.9>5.72;for(const x of [-44,44]){ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,-1,12,blink?1.5:15,0,0,Math.PI*2);ctx.fill();if(!blink){ctx.fillStyle='#273553';ctx.beginPath();ctx.arc(x+gaze.x*4,-1+gaze.y*4,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(x+gaze.x*4-1,-4+gaze.y*4,2,2)}}ctx.restore();
 if(!mobile){ctx.fillStyle='#a0a8c2';ctx.font='10px Inter, sans-serif';ctx.fillText(active?'oh, hello.':'just looking around.',Math.min(91,w*.08),Math.min(247,h*.5));ctx.strokeStyle='#bfc6e9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.min(100,w*.09),Math.min(265,h*.5+18));ctx.quadraticCurveTo(157,292,185,273);ctx.stroke()}}
function drawSignals(){const points=[];const t=paused||reduced.matches?0:time;for(let side=0;side<2;side++){const cx=mobile?w*(side?.76:.24):side?w-135:135,cy=mobile?73:Math.min(260,h*.5);for(let i=0;i<23;i++){const a=i/23*Math.PI*2,r=mobile?47:76;let x=cx+r*Math.cos(a)/(1+.4*Math.sin(a)**2),y=cy+r*.5*Math.sin(2*a);x+=Math.sin(t*.4+i)*2;y+=Math.cos(t*.35+i)*2;const distance=Math.hypot(pointer.x-x,pointer.y-y);const near=pointer.active&&distance<190&&!paused&&!reduced.matches;if(near){const force=(1-distance/190)*.1;const targetX=Math.max(cx-r-10,Math.min(cx+r+10,pointer.x));x+=(targetX-x)*force;y+=(Math.max(cy-r,Math.min(cy+r,pointer.y))-y)*force}points.push({x,y,near,side,i})}}
 for(let i=0;i<points.length;i++){const p=points[i];for(let j=i+1;j<points.length;j++){const q=points[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(p.side===q.side&&d<(mobile?18:31)&&(p.near||i%3===0)){ctx.strokeStyle=p.near?'#6c70dc35':'#aeb7da24';ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}ctx.fillStyle=p.near?blue:p.i%5===0?'#7776df':'#bac4e1';const s=p.i%5===0?5:3;ctx.fillRect(Math.round(p.x-s/2),Math.round(p.y-s/2),s,s)}
}
function render(){ctx.clearRect(0,0,w,h);if(mode==='work'){}else if(mode==='internet')drawInternet();else if(mode==='curious')drawCurious();else drawSignals();canvas.dataset.paused=String(paused||reduced.matches)}
motionState();setMode(mode);resize();
})();
