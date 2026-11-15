// The circuit worker controls /circuits/ only. Cache cleanup is course-specific.
const ROOT=new URL('./',self.location.href);
const PREFIX='dlpu-circuits-'+ROOT.pathname.replace(/\W/g,'_')+'-';
const CACHE=PREFIX+'broadcast-v1';
const FILES=['../shell.css','../shell.js','./','index.html','theme.js','theme.css','style.css','learning.js','learning.css','focus.js','app.js','content.js','data.js','icon.svg','reviewed-course.pdf','assets/branch-current-references.png','assets/thevenin-load-port.png','assets/rl-decay-example.png','assets/parallel-current-examples.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(file=>new URL(file,ROOT).href))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==ROOT.origin||(!url.pathname.startsWith(ROOT.pathname)&&!['/shell.css','/shell.js'].includes(url.pathname)))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)))}return response}).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match(event.request)||(event.request.mode==='navigate'?await cache.match(ROOT.href):null)||Response.error()}));
});
