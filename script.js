const $=id=>document.getElementById(id);
const COLORS=['#e17076','#faa774','#a695e7','#7bc862','#6ec9cb','#65aadd','#ee7aae'];
const col=s=>COLORS[[...s].reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length];
let db=null,user=null,me='local',cur='general',unsubM=null,names={},chats=[{id:'general',name:'Общий чат'}];
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let prof={},lastMs=[];
const local={}; // fallback if no db
function av(el,name){el.textContent=(name||'?')[0].toUpperCase();el.style.background=col(name||'?')}
function renderList(){
 $('list').innerHTML='';
 chats.forEach(c=>{const b=document.createElement('button');b.className='ch'+(c.id===cur?' on':'');
  b.innerHTML='<div class="av"></div><div><b>'+esc(c.name)+'</b><small>Открыть чат</small></div>';
  av(b.firstChild,c.name);b.onclick=()=>open(c.id);$('list').appendChild(b)});
}
function open(id){
 cur=id;const c=chats.find(x=>x.id===id)||{name:id};
 $('hname').textContent=c.name;av($('hav'),c.name);$('hsub').textContent=db?'онлайн-чат':'локальный режим';
 $('app').classList.add('chat');renderList();
 if(unsubM)unsubM();
 if(db){unsubM=db.collection('chats/'+id+'/msgs').orderBy('t','desc').limit(300).onSnapshot(s=>draw(s.docs.map(d=>d.data()).reverse()),()=>{})}
 else draw(local[id]||[]);
}
async function nameOf(ids){
 const need=ids.filter(i=>!(i in names));if(!need.length||!user||!user.profiles)return;
 try{const p=await user.profiles(need);need.forEach(i=>names[i]=(p[i]&&p[i].name)||'Участник');}catch(e){need.forEach(i=>names[i]='Участник')}
}
async function draw(ms){
 lastMs=ms;
 await nameOf([...new Set(ms.map(m=>m.u))]);
 const box=$('msgs'),stick=box.scrollHeight-box.scrollTop-box.clientHeight<120;
 box.innerHTML='';
 if(!ms.length){box.innerHTML='<div class="empty">Сообщений пока нет. Напишите первым!</div>';return}
 ms.forEach(m=>{
  const d=document.createElement('div'),mine=m.u===me;d.className='m'+(mine?' me':'');
  let h=mine?'':'<div class="n">'+esc(prof[m.u]||names[m.u]||'Участник')+'</div>';
  if(typeof m.img==='string'&&m.img.startsWith('data:image/'))h+='<img src="'+esc(m.img)+'">';
  if(typeof m.file==='string'&&m.file.startsWith('data:'))h+='<a class="f" href="'+esc(m.file)+'" download="'+esc(m.fn||'file')+'">📄 <span>'+esc(m.fn||'файл')+'</span></a>';
  if(typeof m.text==='string'&&m.text)h+='<div class="tx">'+esc(m.text)+'</div>';
  const t=new Date(m.t);h+='<div class="t">'+t.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div>';
  d.innerHTML=h;box.appendChild(d)});
 if(stick||true)box.scrollTop=box.scrollHeight;
}
async function post(extra){
 const m=Object.assign({u:me,t:Date.now()},extra);
 if(db){try{await db.collection('chats/'+cur+'/msgs').doc(m.t+'-'+Math.random().toString(36).slice(2,6)).set(m)}catch(e){alert('Не удалось отправить: '+(e.message||e.code))}}
 else{(local[cur]=local[cur]||[]).push(m);draw(local[cur])}
}
function sendText(){const v=$('in').value.trim();if(!v)return;$('in').value='';$('in').style.height='';post({text:v})}
$('send').onclick=sendText;
$('in').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText()}};
$('in').oninput=e=>{e.target.style.height='auto';e.target.style.height=Math.min(120,e.target.scrollHeight)+'px'};
$('back').onclick=()=>$('app').classList.remove('chat');
$('ab').onclick=()=>$('file').click();
const E='😀😂😍😎🥳😭😡👍👎🙏❤️🔥🎉✅❌👀🤝💪😴🤔'.match(/\p{Extended_Pictographic}\uFE0F?/gu);
E.forEach(e=>{const b=document.createElement('button');b.textContent=e;b.onclick=()=>{$('in').value+=e;$('in').focus()};$('emo').appendChild(b)});
$('eb').onclick=()=>{const s=$('emo').style;s.display=s.display==='flex'?'none':'flex'};
function toImg(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{
 let w=i.width,h=i.height,k=Math.min(1,1000/Math.max(w,h)),q=.8,out;const c=document.createElement('canvas');
 for(let n=0;n<6;n++){c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);out=c.toDataURL('image/jpeg',q);if(out.length<230000)break;k*=.75;q-=.08}
 out.length<240000?res(out):rej()};i.onerror=rej;i.src=r.result};r.readAsDataURL(file)})}
$('file').onchange=async e=>{
 const f=e.target.files[0];e.target.value='';if(!f)return;
 try{
  if(f.type.startsWith('image/')){post({img:await toImg(f)})}
  else{if(f.size>150000){alert('Файл слишком большой (максимум ~150 КБ)');return}
   const r=new FileReader();r.onload=()=>post({file:r.result,fn:f.name});r.readAsDataURL(f)}
 }catch(x){alert('Не удалось загрузить файл')}
};
$('new').onclick=async()=>{
 const n=(prompt('Название нового чата')||'').trim();if(!n)return;
 const id='c'+Date.now().toString(36);
 if(db){try{await db.collection('chats').doc(id).set({name:n,t:Date.now()});open(id)}catch(e){alert('Ошибка')}}
 else{chats.push({id,name:n});renderList();open(id)}
};
const card=$('card'),ov=$('ov');
function closeOv(){ov.style.display='none'}
function panel(title,body,back){card.innerHTML='<h3>'+(back?'<button class="ib" id="pb0">←</button>':'')+'<span>'+title+'</span><button class="ib" id="px">✕</button></h3>'+body;
 ov.style.display='flex';$('px').onclick=closeOv;if(back)$('pb0').onclick=back}
$('more').onclick=e=>{e.stopPropagation();const s=$('menu').style;s.display=s.display==='block'?'none':'block'};
document.addEventListener('click',()=>{$('menu').style.display='none'});
ov.onclick=e=>{if(e.target===ov)closeOv()};
async function settings(){
 let owner=false;try{owner=!!(user&&user.isOwner&&await user.isOwner())}catch(e){}
 panel('Настройки','<button class="row" id="s1">🛟 Поддержка</button><button class="row" id="s2">👤 Редактировать профиль</button>'+(owner&&db?'<button class="row" id="s3">📥 Обращения</button>':''));
 $('s1').onclick=support;$('s2').onclick=profile;if($('s3'))$('s3').onclick=tickets}
$('mset').onclick=settings;
$('srch').onclick=()=>{
 panel('Поиск людей','<input id="sq" placeholder="Имя"><div id="res"></div>');
 const q=$('sq');let seq=0;
 const run=async()=>{const my=++seq,v=q.value.trim().toLowerCase(),found={};
  if(v){Object.keys(prof).forEach(i=>{if(i!==me&&(prof[i]||'').toLowerCase().includes(v))found[i]=prof[i]});
   try{if(user&&user.search){const r=await user.search(q.value.trim());r.forEach(h=>{if(h.id&&h.id!==me&&!found[h.id])found[h.id]=prof[h.id]||h.name})}}catch(e){}}
  if(my!==seq)return;const box=$('res');box.innerHTML='';
  const ids=Object.keys(found);
  if(!ids.length){box.innerHTML='<div class="ok" style="color:var(--mut)">'+(v?'Никого не найдено':'Введите имя')+'</div>';return}
  ids.forEach(i=>{const b=document.createElement('button');b.className='row';b.innerHTML='<div class="av"></div><span>'+esc(found[i]||'Участник')+'</span>';
   av(b.firstChild,found[i]||'?');b.onclick=()=>openDm(i,found[i]||'Участник');box.appendChild(b)})};
 q.oninput=run;q.focus();run()};
async function openDm(other,name){
 if(!db||me==='local'){closeOv();alert('Личные чаты работают в онлайн-режиме');return}
 const id='dm_'+[me,other].map(x=>x.replace(/[^A-Za-z0-9_-]/g,'')).sort().join('__');
 try{await db.collection('chats').doc(id).set({name:'Личный чат',members:[me,other],t:Date.now()})}catch(e){alert('Не удалось открыть чат');return}
 names[other]=names[other]||name;
 if(!chats.find(c=>c.id===id))chats.push({id,name:prof[other]||name,members:[me,other]});
 closeOv();open(id)}
async function profile(){
 await nameOf([me]);
 panel('Редактировать профиль','<input id="pn" maxlength="30" placeholder="Ваше имя"><button class="pb" id="ps">Сохранить</button><div class="ok" id="pm"></div>',settings);
 $('pn').value=prof[me]||names[me]||'';
 $('ps').onclick=async()=>{const v=$('pn').value.trim();if(!v)return;
  try{if(db&&me!=='local')await db.doc('profiles/'+me).set({name:v});prof[me]=v;$('pm').textContent='Сохранено';draw(lastMs)}
  catch(e){$('pm').textContent='Не удалось сохранить'}}}
function support(){
 panel('Поддержка','<textarea id="st" rows="5" placeholder="Расскажите, что произошло"></textarea><button class="pb" id="ss">Отправить</button><div class="ok" id="sm"></div>',settings);
 $('ss').onclick=async()=>{const v=$('st').value.trim();if(!v)return;
  try{if(!db||me==='local')throw 0;const t=Date.now();
   await db.collection('support/'+me+'/tickets').doc(String(t)).set({text:v,t});
   await db.doc('support/'+me).set({name:prof[me]||names[me]||'Участник',last:v,t});
   $('st').value='';$('sm').textContent='Скоро ответим'}
  catch(e){$('sm').textContent='Не удалось отправить'}}}
async function tickets(){
 panel('Обращения','<div id="tl">Загрузка…</div>',settings);
 try{const r=await db.collection('support').orderBy('t','desc').limit(50).get();
  $('tl').innerHTML=r.docs.length?r.docs.map(d=>{const x=d.data();return '<div class="tk"><b>'+esc(x.name||'Участник')+'</b> <small>'+new Date(x.t).toLocaleString()+'</small><div class="tx">'+esc(String(x.last||''))+'</div></div>'}).join(''):'Пока нет обращений'}
 catch(e){$('tl').textContent='Не удалось загрузить'}}
(async()=>{
 renderList();open('general');
 try{
  user=await claude.use('user');db=await claude.use('db');
  if(user&&user.id)me=await user.id();
 }catch(e){}
 if(!db){$('note').textContent='Локальный режим: войдите в claude.ai, чтобы общаться с другими.';return}
 $('hsub').textContent='онлайн-чат';
 try{if(user&&user.can&&(await user.can('data.write'))===false){$('note').textContent='Только чтение: у вас нет прав писать сообщения.'}}catch(e){}
 db.collection('profiles').onSnapshot(s=>{s.docs.forEach(d=>{prof[d.id]=(d.data()||{}).name});draw(lastMs)},()=>{});
 db.collection('chats').onSnapshot(async s=>{
  const raw=s.docs.map(d=>Object.assign({id:d.id},d.data()||{})).filter(c=>!Array.isArray(c.members)||c.members.includes(me));
  await nameOf([...new Set(raw.filter(c=>Array.isArray(c.members)).map(c=>c.members.find(x=>x!==me)).filter(Boolean))]);
  const extra=raw.map(c=>{const o=Array.isArray(c.members)&&c.members.find(x=>x!==me);return{id:c.id,name:o?(prof[o]||names[o]||'Участник'):(c.name||c.id),members:c.members}});
  chats=[{id:'general',name:'Общий чат'}].concat(extra);renderList()},()=>{});
 open('general');
})();
