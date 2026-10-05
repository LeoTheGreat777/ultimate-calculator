function updateCreatorLanguage(){const e=document.querySelector('#createdBy');if(e)e.textContent=document.documentElement.lang==='el'?'Δημιουργήθηκε από Leonidas Kampaxis':'Created by Leonidas Kampaxis';}
updateCreatorLanguage();
document.querySelector('#langButton')?.addEventListener('click',()=>requestAnimationFrame(updateCreatorLanguage));
