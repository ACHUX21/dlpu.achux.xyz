(() => {
  'use strict';
  const card=document.querySelector('.card-live[href="math/"]');
  const course=window.DLPU_COURSE;
  if(!card||!course)return;
  function refresh(){
    let state={reviewed:[]};
    try {const saved=JSON.parse(localStorage.getItem('discrete-studio-v1'));if(Array.isArray(saved?.reviewed))state=saved;}catch{}
    const done=course.topics.filter(t=>state.reviewed.includes(t.id)).length;
    const last=course.topics.find(t=>t.id===state.lastLesson);
    const next=last&&!state.reviewed.includes(last.id)?last:course.topics.slice(last?course.topics.indexOf(last)+1:0).find(t=>!state.reviewed.includes(t.id))||course.topics.find(t=>!state.reviewed.includes(t.id))||last||course.topics[0];
    card.querySelector('[data-course-count]').textContent=`${done} / ${course.topics.length} lessons · ${Math.round(100*done/course.topics.length)}%`;
    const meter=card.querySelector('[role="progressbar"]');
    meter.setAttribute('aria-valuenow',String(done));meter.firstElementChild.style.width=`${100*done/course.topics.length}%`;
    card.querySelector('[data-course-resume]').textContent=(last?'Continue: ':'Start: ')+next.id+' · '+next.title;
    card.href='math/#topic/'+next.id;
    if(last){const link=document.querySelector('.hero-actions .action-primary');link.textContent='Continue learning ↗';link.href=card.href;}
  }
  refresh();window.addEventListener('storage',refresh);window.addEventListener('pageshow',refresh);
})();
