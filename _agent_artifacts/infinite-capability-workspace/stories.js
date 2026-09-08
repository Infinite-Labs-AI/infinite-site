(() => {
 const section=document.querySelector('.customer-stories'); if(!section)return;
 const tabs=[...section.querySelectorAll('[role=tab]')],panels=[...section.querySelectorAll('[role=tabpanel]')];
 function select(index){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});}
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(i));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();select(next);tabs[next].focus();});});
 const dialog=section.querySelector('dialog');let opener;
 section.querySelectorAll('[data-story-open]').forEach(button=>button.addEventListener('click',()=>{opener=button;dialog.querySelector('.result-dialog-subtitle').textContent=panels[Number(button.dataset.storyOpen)].querySelector('h3').textContent;dialog.showModal();}));
 dialog.querySelector('.result-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>opener?.focus());
})();
