(() => {
  'use strict';
  const courses=window.DLPU_COURSES||{};
  function refresh(){
    document.querySelectorAll('[data-course]').forEach(card=>{
      const slug=card.dataset.course,course=courses[slug];if(!course)return;
      let state={reviewed:[]};try{const saved=JSON.parse(localStorage.getItem(course.storageKey));if(Array.isArray(saved?.reviewed))state=saved}catch{}
      const done=course.topics.filter(t=>state.reviewed.includes(t.id)).length;
      const last=course.topics.find(t=>t.id===state[course.lastTopicKey]);
      const method=course.methods.find(m=>'method/'+m.id===state.lastRoute);
      const next=last&&!state.reviewed.includes(last.id)?last:course.topics.slice(last?course.topics.indexOf(last)+1:0).find(t=>!state.reviewed.includes(t.id))||course.topics.find(t=>!state.reviewed.includes(t.id))||last||course.topics[0];
      card.querySelector('[data-course-count]').textContent=`${done} / ${course.topics.length} lessons · ${Math.round(100*done/course.topics.length)}%`;
      const meter=card.querySelector('[role="progressbar"]');meter.setAttribute('aria-valuenow',String(done));meter.firstElementChild.style.width=`${100*done/course.topics.length}%`;
      card.querySelector('[data-course-resume]').textContent=(last||method?'Continue: ':'Start: ')+(method?method.title:next.id+' · '+next.title);
      card.href=slug+'/#'+(method?'method/'+method.id:'topic/'+next.id);
      if(slug==='math'&&(last||method)){const link=document.querySelector('.hero-actions .action-primary');link.textContent='Continue learning ↗';link.href=card.href;}
    });
  }
  refresh();window.addEventListener('storage',refresh);window.addEventListener('pageshow',refresh);
})();
