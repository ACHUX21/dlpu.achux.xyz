/* npm ci; python3 scripts/assemble.py; python3 -m http.server 8765 -d _site
 * npm run audit -- --out=/workspace/codex/shots2
 * Uses system Chrome. Checks all rendered text (including SVG, placeholders and
 * pseudo content) at 4.5:1, regardless of font size. No accessibility exemptions.
 * Reads computed foreground/opacity and samples the actual painted background
 * with text temporarily hidden. This handles gradients, alpha, SVG shapes and
 * inherited backgrounds without treating transparent as black.
 */
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const args = process.argv.slice(2);
const option = (name, fallback) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const base = option('base', 'http://127.0.0.1:8765');
const out = option('out', '/workspace/codex/shots2');
const shotsOnly = args.includes('--screenshots');
const failures = [], errors = [], checks = [];

// Runs in Chrome, including text below the fold but excluding clipped/offcanvas,
// hidden and occluded-by-modal content. Range rectangles track wrapped text.
async function scan(page, label) {
  await page.evaluate(() => window.scrollTo({top:0,left:0,behavior:"instant"}));
  const text = await page.evaluate(() => {
    const items = [];
    const modal = document.querySelector('dialog[open]');
    const root = modal || document.querySelector('.sidebar.open') || document.body;
    const hidden = el => {
      if (!el.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) return true;
      return !!el.closest('script,style,noscript,option,template');
    };
    function record(el, value, rects, pseudo) {
      if (!value.trim() || hidden(el)) return;
      const css = getComputedStyle(el, pseudo);
      let opacity = pseudo ? Number(css.opacity) : 1;
      for (let p = el; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
      const color = el instanceof SVGElement ? css.fill : css.color;
      const visibleRects = Array.from(rects).map(r => ({x:r.x + scrollX, y:r.y + scrollY, width:r.width, height:r.height})).filter(r => {
        if (r.width < 1 || r.height < 1 || r.x + r.width <= 0 || r.x >= innerWidth || r.y + r.height <= 0) return false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const pc = getComputedStyle(p), pr = p.getBoundingClientRect();
          if (/(hidden|clip|auto|scroll)/.test(pc.overflowX) && (r.x >= pr.right + scrollX || r.x + r.width <= pr.left + scrollX)) return false;
          if (/(hidden|clip|auto|scroll)/.test(pc.overflowY) && (r.y >= pr.bottom + scrollY || r.y + r.height <= pr.top + scrollY)) return false;
        }
        return true;
      });
      if (visibleRects.length) items.push({text:value.trim().slice(0,110), selector:el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(typeof el.className==='string'?'.'+el.className.trim().replace(/\s+/g,'.'):''), color, opacity, rects:visibleRects});
    }
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const n = walk.currentNode, el = n.parentElement;
      if (!el || !n.textContent.trim() || hidden(el)) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      record(el, n.textContent, range.getClientRects());
    }
    root.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=range]):not([type=hidden]),textarea').forEach(el => {
      record(el, el.value || el.placeholder || '', [el.getBoundingClientRect()], el.value ? null : '::placeholder');
    });
    root.querySelectorAll('select').forEach(el => record(el, el.selectedOptions[0]?.text || '', [el.getBoundingClientRect()]));
    // Generated content on this site is limited to short symbols/decorations.
    root.querySelectorAll('*').forEach(el => ['::before','::after'].forEach(p => {
      const content = getComputedStyle(el,p).content;
      if (content && !['none','normal','""'].includes(content)) record(el, content, [el.getBoundingClientRect()], p);
    }));
    return items;
  });
  const hide = await page.addStyleTag({content: '* { -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; } .lesson-figure svg text, .lesson-figure svg tspan, .hero-art svg text, .graph-drawing text, .lab-svg text, svg text, svg tspan { fill: transparent !important; stroke: transparent !important; }'});
  let png;
  try { png = await page.screenshot({fullPage:true, animations:'disabled'}); }
  finally { await hide.evaluate(el=>el.remove()); }
  const result = await page.evaluate(async ({text, image}) => {
    const img = new Image(); img.src = image; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const rgb = value => {
      const c=document.createElement('canvas').getContext('2d');c.fillStyle=value;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data];
    };
    const lum = c => c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);
    const bad=[];
    for(const item of text){
      const fg=rgb(item.color),alpha=fg[3]/255*item.opacity;
      if(alpha===0)continue;
      let worst=Infinity,background;
      for(const r of item.rects){
        // Inset prevents sampling control borders and adjacent text lines.
        const left=Math.max(0,r.x+Math.min(8,r.width/3)),right=Math.min(img.width-1,r.x+r.width-Math.min(8,r.width/3));
        for(const fy of [.4,.6])for(let x=left;x<=right;x+=Math.max(2,(right-left)/20)){
          const y=Math.min(img.height-1,Math.max(0,Math.floor(r.y+r.height*fy)));
          const bg=[...ctx.getImageData(Math.floor(x),y,1,1).data];
          const painted=fg.slice(0,3).map((v,i)=>v*alpha+bg[i]*(1-alpha));
          const a=lum(painted),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
          if(ratio<worst){worst=ratio;background=bg.slice(0,3)}
        }
      }
      if(worst<4.5)bad.push({...item,rects:undefined,ratio:+worst.toFixed(3),background});
    }
    return {count:text.length, failures:bad, overflow:document.documentElement.scrollWidth>innerWidth+1};
  }, {text,image:'data:image/png;base64,'+png.toString('base64')});
  checks.push({label,count:result.count,failures:result.failures.length,overflow:result.overflow});
  console.log(`${label}: ${result.count} text; ${result.failures.length} failures`);
  for (const f of result.failures) failures.push({page:label,...f});
  if (result.overflow) errors.push(`${label}: horizontal page overflow`);
}

(async()=>{
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  try {
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
      const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
      await context.addInitScript(()=>sessionStorage.setItem('dlpu-broadcast-boot','1'));
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(`${page.url()}: ${e.message}`));
      page.on('console',msg=>{if(msg.type()==='error')errors.push(`${page.url()}: ${msg.text()}`)});
      const go=async(url)=>{await page.goto(base+url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);};
      const capture=async(label)=>scan(page,`${viewport.width} ${label}`);
      const targets=[['hub','/'],['math','/math/'],['translate','/math/#method/translate'],['lesson','/math/#topic/1.1'],['timetable','/timetable/']];
      for(const [name,url] of targets){await go(url);await page.screenshot({path:path.join(out,`${name}-${viewport.width}x${viewport.height}.png`),fullPage:true});if(!shotsOnly)await capture(url);}
      if(shotsOnly){await context.close();continue;}
      await go('/math/');
      const routes=await page.evaluate(()=>[...new Set(['desk','main','topic','methods','method','practice','lab','exam','sources',...TOPICS.flatMap(t=>['topic/'+t.id,'practice/'+t.id]),...CHAPTERS.map(c=>'practice/c'+c.id),...METHODS.map(m=>'method/'+m.id)])]);
      for(const route of routes){
        await page.evaluate(r=>{location.hash=r},route);
        await page.waitForTimeout(20);
        await capture('/math/#'+route);
      }
      for(const mode of ['logic','quant','relations','graph','algebra']){
        await page.evaluate(()=>{location.hash='lab'});await page.waitForTimeout(20);
        await page.locator(`[data-lab="${mode}"]`).click();await capture('lab '+mode);
        if(mode==='relations'){await page.locator('#stage-final').click();await capture('closure additions')}
        if(mode==='logic'){await page.locator('#logic-formula').fill('(');await page.locator('#logic-run').click();await capture('formula error')}
      }
      await page.evaluate(()=>{location.hash='practice'});await page.waitForTimeout(20);
      await page.locator('#begin').click();await capture('quiz question');
      if(await page.locator('input[name="answer"]').count())await page.locator('input[name="answer"]').first().check();
      else await page.locator('#numeric-answer').fill('0');
      await page.locator('#check-answer').click();await capture('quiz feedback');
      await page.evaluate(()=>{location.hash='methods'});await page.waitForTimeout(20);
      await page.locator('.search-launch').click();await capture('course search');await page.locator('.dialog-close').click();
      await page.locator('.hub-command').click();await capture('command palette');await page.locator('.command-close').click();
      if(viewport.width===390){await page.locator('.menu-btn').click();await capture('mobile navigation');}
      await go('/timetable/');
      for(let week=11;week<=19;week++){
        await page.locator('#weekSelector').selectOption(String(week));
        if(viewport.width===390){for(let day=0;day<5;day++){await page.locator(`.day-tabs [data-day="${day}"]`).click();await capture(`week ${week} day ${day}`)}}
        else await capture('week '+week);
      }
      await page.locator('#weekSelector').selectOption('11');
      if(viewport.width===390)await page.locator('.day-tabs [data-day="0"]').click();
      await page.locator('.course-card:visible').first().click();await capture('course briefing');
      await context.close();
    }
  } catch(e) { errors.push(e.stack || String(e)); } finally {await browser.close()}
  const unique=[...new Map(failures.map(f=>[`${f.selector}|${f.text}|${f.color}|${f.background}|${f.ratio}`,f])).values()];
  await fs.writeFile(path.join(out,'contrast-report.json'),JSON.stringify({checks,failures,errors},null,2));
  console.log(`${checks.length} states; ${checks.reduce((n,c)=>n+c.count,0)} text checks; ${failures.length} contrast failures (${unique.length} unique); ${errors.length} errors.`);
  console.log(JSON.stringify({failures:unique,errors},null,2));
  if(failures.length||errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
