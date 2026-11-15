/* Learning scaffolds are extracted from the reviewed lessons and question bank.
 * Suggested preparation follows course order; difficulty is an editorial estimate.
 * No new mathematical examples or answers are generated here.
 */
(() => {
  'use strict';
  const T = window.TOPICS, M = window.METHODS, Q = window.QUESTIONS;
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const doc = html => { const d = document.createElement('div'); d.innerHTML = html; return d; };
  const plain = html => doc(html).textContent.trim();
  const sentence = s => s.split(/(?<=\.)\s+/)[0];
  const glossary = new Map();
  T.forEach(t => doc(t.html).querySelectorAll('p > strong').forEach(el => {
    const term = el.textContent.trim(), text = el.parentElement.textContent.trim();
    const tail = text.slice(text.indexOf(term) + term.length);
    if (/^[a-z][a-z /-]{2,35}$/i.test(term) && /^\s+(is|are|means|when)\b/.test(tail) && !glossary.has(term.toLowerCase())) {
      glossary.set(term.toLowerCase(), {term, text:sentence(text), id:t.id});
    }
  }));
  const cache = new Map();
  function plan(t) {
    if (cache.has(t.id)) return cache.get(t.id);
    const d = doc(t.html), headings = [...d.querySelectorAll('h3,h2')].map(el=>el.textContent.trim());
    let goals = headings.filter(h => !/worked|source|slide|advanced|course example/i.test(h)).slice(0,3).map(h => {
      if(h==='Six operators, one master table')return 'Use the master table for the six operators';
      return /^(recognize|translate|build|evaluate|construct|classify|write|push|use|prove|describe|compose|draw|model|match|decide|read|simplify|work|correct|follow)\b/i.test(h) ? h : 'Explain '+h[0].toLowerCase()+h.slice(1);
    });
    if (!goals.length) goals = [...d.querySelectorAll('p > strong')].map(el=>el.textContent.trim()).filter(s=>/^[a-z][a-z -]+$/i.test(s)).slice(0,3).map(s=>'Define '+s);
    const paragraphs=[...d.querySelectorAll('p')].filter(p=>!p.querySelector('em'));
    const key=sentence(paragraphs[0]?.textContent || t.title);
    const method=M.find(m=>m.topic===t.id);
    const caution=method?.trap || sentence(paragraphs.find(p=>/\b(not|must|cannot|counterexample|avoid)\b/i.test(p.textContent))?.textContent || '');
    const previous=T[T.indexOf(t)-1];
    const level=/proof|algorithm|inference/i.test(t.title)?'Multi-step':Number(t.id.split('.')[1])===1?'Foundations':'Guided practice';
    const result={goals,key,caution,previous,level};cache.set(t.id,result);return result;
  }
  function briefing(t, method) {
    const p=plan(t), goals=method?[method.steps[0],method.steps.at(-1)]:p.goals;
    const minutes=method?Math.max(3, Math.ceil(method.steps.length*1.5)):t.minutes;
    return `<section class="learning-brief" aria-label="Learning objectives"><div class="learning-meta"><span class="study-chip">◷ ${minutes} min ${method?'practice estimate':'read'}</span><span class="study-chip" title="Estimated from the lesson sequence and whether it includes proofs or algorithms">Difficulty · ${p.level} (est.)</span></div><h2>By the end of this you can…</h2><ul class="learning-objectives">${goals.map(g=>`<li>${escape(g.replace(/\.$/,''))}</li>`).join('')}</ul><div class="prerequisites"><span>Prerequisites <small>· suggested course order</small></span>${p.previous?`<a class="study-chip" href="#topic/${p.previous.id}">${escape(p.previous.id+' '+p.previous.title)} ↗</a>`:'<span class="study-chip">Start here · no earlier lesson</span>'}</div></section>`;
  }
  function callout(kind,title,text) {
    return text?`<aside class="learning-callout ${kind}"><span class="callout-icon" aria-hidden="true">${{idea:'✦',mistake:'!',try:'↗'}[kind]}</span><div><strong>${title}</strong><p>${escape(text)}</p></div></aside>`:'';
  }
  function translationSteps(list) {
    const first=list.querySelector('li');if(!first)return;
    const parts=first.innerHTML.split(/\s+(?=Let p =|The access condition is)/);
    if(parts.length<3)return;
    first.innerHTML='<p>'+parts[0]+'</p><ol class="worked-steps">'+parts.slice(1).map(part=>'<li>'+part+'</li>').join('')+'</ol>';
    first.classList.add('example-with-steps');
  }
  function article(t) {
    const d=doc(t.html);
    d.querySelector('p')?.classList.add('source-line');
    d.querySelectorAll('ol').forEach(list=>{
      const section=[...d.querySelectorAll('h3')].filter(h=>h.compareDocumentPosition(list)&Node.DOCUMENT_POSITION_FOLLOWING).at(-1);
      list.classList.add(/translations/i.test(section?.textContent)?'worked-examples':'worked-steps');
      if(/translations/i.test(section?.textContent))translationSteps(list);
    });
    d.querySelectorAll('table').forEach(table=>{
      if(/^(line|step)$/i.test(table.querySelector('th')?.textContent.trim()||''))table.classList.add('worked-table');
      const wrap=document.createElement('div');wrap.className='lesson-table';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Lesson table; scroll horizontally if needed');table.replaceWith(wrap);wrap.append(table);
    });
    d.querySelectorAll('p').forEach(p=>{
      if(/^(Source correction:|Fallacy:|Traps?:|R⁺ does not)/i.test(p.textContent.trim()))p.classList.add('source-caution');
    });
    d.querySelectorAll('strong').forEach((strong,i)=>{
      const definition=glossary.get(strong.textContent.toLowerCase());
      if(!definition || strong.closest('table'))return;
      const span=document.createElement('span');span.className='glossary-term';span.tabIndex=0;
      const id=`term-${t.id.replace('.','-')}-${i}`;span.setAttribute('aria-describedby',id);
      strong.replaceWith(span);span.append(strong);
      const tooltip=document.createElement('span');tooltip.className='definition-tooltip';tooltip.id=id;tooltip.setAttribute('role','tooltip');tooltip.textContent=definition.text+' · Lesson '+definition.id;span.append(tooltip);
    });
    d.querySelectorAll('h3').forEach(h=>{const h2=document.createElement('h2');h2.innerHTML=h.innerHTML;h.replaceWith(h2)});
    return d.innerHTML;
  }
  function worked(t) {
    const d=doc(t.html), headings=[...d.querySelectorAll('h3,h2')];
    const h=headings.find(h=>/worked/i.test(h.textContent)) || headings.find(h=>/source example|source exercise|construct a|work from|read the source/i.test(h.textContent));
    if(!h)return '';
    let html='';for(let n=h.nextElementSibling;n&&!/^H[23]$/.test(n.tagName);n=n.nextElementSibling)html+=n.outerHTML;
    if(!html)return '';
    const content=doc(html);content.querySelectorAll('ol').forEach(el=>{el.classList.add(/translations/i.test(h.textContent)?'worked-examples':'worked-steps');if(/translations/i.test(h.textContent))translationSteps(el)});
    content.querySelectorAll('table').forEach(el=>{if(/^(line|step)$/i.test(el.querySelector('th')?.textContent||''))el.classList.add('worked-table');el.outerHTML='<div class="lesson-table" tabindex="0" role="region" aria-label="Worked example table">'+el.outerHTML+'</div>'});
    return `<section class="worked-source"><div class="eyebrow">WORKED EXAMPLE · FROM LESSON ${t.id}</div><h2>${escape(h.textContent)}</h2><div class="article">${content.innerHTML}</div><a class="text-link" href="#topic/${t.id}">Read the full explanation ↗</a></section>`;
  }
  function quiz(t, method) {
    // Prefer a question whose existing wording matches the method's cue.
    const list=Q.filter(q=>q.topic===t.id);
    const cue=method?.cue.toLowerCase().split(/\s*·\s*/)||[];
    const q=list.find(q=>cue.some(w=>q.prompt.toLowerCase().includes(w)))||list[0];
    if(!q)return callout('try','Try it','Explain the main definition without looking, then work through an example from this lesson.');
    return `<section class="understanding" data-quick-question="${escape(q.id)}" aria-labelledby="understanding-title"><div class="eyebrow">CHECK YOUR UNDERSTANDING / 理解</div><h2 id="understanding-title"><span aria-hidden="true">↗</span> Try it before moving on</h2><p class="quick-prompt">${escape(q.prompt)}</p>${q.type==='choice'?`<div class="quick-choices">${q.choices.map((c,i)=>`<button type="button" class="quick-choice" data-answer="${i}" aria-pressed="false"><span class="choice-letter">${String.fromCharCode(65+i)}</span><span>${escape(c)}</span></button>`).join('')}</div>`:'<form class="quick-number"><label for="quick-answer">Your answer (number or fraction)</label><div class="lab-form"><input id="quick-answer" required inputmode="decimal" autocomplete="off" placeholder="Your answer"><button class="button primary">Check answer</button></div></form>'}<div class="quick-feedback" role="status" aria-live="polite"></div><p class="learning-footnote">From the existing lesson question bank · Attempts save on this device.</p></section>`;
  }
  function bindQuiz(record) {
    const mount=document.querySelector('[data-quick-question]');if(!mount)return;
    const q=Q.find(q=>q.id===mount.dataset.quickQuestion);let checked=false;
    function check(value){
      if(checked)return;
      if(!Number.isFinite(value)){mount.querySelector('.quick-feedback').textContent='Enter a finite number or a fraction such as 1/2.';return;}
      checked=true;const good=q.type==='choice'?value===q.answer:Math.abs(value-q.answer)<1e-8;
      record(q,good);
      mount.querySelectorAll('[data-answer]').forEach(b=>{const i=Number(b.dataset.answer);b.setAttribute('aria-pressed',String(i===value));b.classList.toggle('correct',i===q.answer);b.classList.toggle('wrong',i===value&&!good);b.disabled=true;});
      const feedback=mount.querySelector('.quick-feedback');feedback.className='quick-feedback '+(good?'correct':'wrong');
      feedback.innerHTML=`<strong>${good?'✓ Correct.':'! Let’s repair that step.'}</strong><p>${escape(q.explanation)}</p><p>Answer: ${escape(q.type==='choice'?q.choices[q.answer]:q.answer)}</p><button type="button" class="button small" data-retry>Try again</button>`;
      mount.querySelector('[data-retry]').onclick=()=>{checked=false;mount.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=false;b.classList.remove('correct','wrong');b.setAttribute('aria-pressed','false')});feedback.className='quick-feedback';feedback.replaceChildren();mount.querySelector('[data-answer], input')?.focus()};
    }
    mount.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>check(Number(b.dataset.answer)));
    const form=mount.querySelector('form');if(form)form.onsubmit=e=>{e.preventDefault();const raw=form.querySelector('input').value.trim();let n=NaN;if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(raw)){const parts=raw.split('/').map(Number);n=parts.length===2?parts[0]/parts[1]:parts[0]}check(n)};
  }
  function progress(state) {
    const done=T.filter(t=>state.reviewed.includes(t.id)).length, percent=Math.round(100*done/T.length);
    return `<section class="course-progress" aria-label="Course progress"><div><span class="eyebrow">YOUR COURSE / ${percent}%</span><span>${done} of ${T.length} lessons complete</span></div><div class="course-meter" role="progressbar" aria-label="Lessons complete" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${T.length}"><span style="width:${percent}%"></span></div><small>Reading progress · saved on this device</small></section>`;
  }
  function ring(done,total) {
    const percent=Math.round(100*done/total);
    return `<span class="chapter-ring" aria-label="${done} of ${total} lessons complete"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-track" cx="22" cy="22" r="18"/><circle class="ring-value" cx="22" cy="22" r="18" pathLength="100" stroke-dasharray="${percent} 100"/></svg><span>${percent}%</span></span>`;
  }
  window.Learning={plan,briefing,callout,article,worked,quiz,bindQuiz,progress,ring};
})();
