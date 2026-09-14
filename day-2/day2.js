'use strict';
const $=id=>document.getElementById(id);
const film=$('film'),audio=$('narration'),video=$('footage'),stage=$('stage');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let rooms,activeKey,room,lastSection=-1,lastCue=-1,returnFocus,raf,loadToken=0;
const clock=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
async function loadRooms(){
 $('retry').hidden=true;$('load-status').textContent='Preparing your rooms…';
 try{const res=await fetch('rooms.json?v=1');if(!res.ok)throw Error('rooms');rooms=await res.json();
 document.querySelectorAll('.room-card').forEach(b=>{b.disabled=false;b.querySelector('.length').textContent=clock(rooms[b.dataset.room].duration)+' · WITH LOVE';});
 $('load-status').textContent='Choose any room. Your message begins when you enter.';
 }catch{$('load-status').textContent='Your rooms could not load. Please try again.';$('retry').hidden=false;}
}
function openRoom(key,trigger){
 if(!rooms?.[key])return;
 loadToken++;activeKey=key;room=rooms[key];returnFocus=trigger;lastSection=-1;lastCue=-1;
 $('finish').hidden=true;$('transcript').hidden=true;stage.classList.remove('finished','paused');
 $('room-title').textContent=room.title;$('media-status').textContent='Opening your message…';$('seek').max=room.duration;$('seek').value=0;
 $('room-art').dataset.room=key;$('room-art').style.backgroundImage=`url('assets/${key}.jpg')`;
 $('transcript-copy').replaceChildren(...room.sections.flatMap(s=>{const h=document.createElement('h3'),p=document.createElement('p');h.textContent=s.title;p.textContent=s.text;return[h,p];}));
 film.showModal();document.body.style.overflow='hidden';audio.src=`assets/${key}.mp3`;audio.load();update();startAtmosphere();play();$('close').focus();
}
async function play(){
 const token=loadToken;
 if(audio.ended){audio.currentTime=0;$('finish').hidden=true;stage.classList.remove('finished');}
 try{await audio.play();if(token!==loadToken)return;if(video.classList.contains('active')&&!reduced)video.play().catch(()=>{});}
 catch{if(token===loadToken)$('media-status').textContent='Tap Play to hear your message.';}
}
function pause(){audio.pause();video.pause();}
function closeRoom(){loadToken++;pause();film.close();audio.removeAttribute('src');audio.load();video.removeAttribute('src');video.load();document.body.style.overflow='';cancelAnimationFrame(raf);returnFocus?.focus();}
function setScene(section){
 $('chapter-number').textContent=`CHAPTER ${lastSection+1} OF 4`;$('chapter-title').textContent=section.title;
 const isRoom=['mirror','rain','garden'].includes(section.visual);
 if(isRoom){video.classList.remove('active');video.pause();$('room-art').style.backgroundImage=`url('assets/${section.visual}.jpg')`;}
 else{const source=new URL(`../assets/video/${section.visual}.mp4`,location.href).href;
 if(video.src!==source){video.classList.remove('active');video.src=source;video.load();}
 video.oncanplay=()=>{if(!film.open||room.timeline[lastSection]?.visual!==section.visual)return;video.classList.add('active');if(!audio.paused&&!reduced)video.play().catch(()=>{});};
 if(video.readyState>=3){video.classList.add('active');if(!audio.paused&&!reduced)video.play().catch(()=>{});}}
}
function update(){
 if(!room||!film.open)return;const t=audio.currentTime||0;
 let section=0;for(let i=0;i<room.timeline.length;i++)if(t>=room.timeline[i].start)section=i;
 if(section!==lastSection){lastSection=section;setScene(room.timeline[section]);}
 let cue=0;for(let i=0;i<room.cues.length;i++)if(t>=room.cues[i].start)cue=i;
 if(cue!==lastCue){lastCue=cue;$('caption').textContent=room.cues[cue].text;}
 $('seek').value=t;$('seek').setAttribute('aria-valuetext',`${clock(t)} of ${clock(room.duration)}`);$('time').textContent=`${clock(t)} / ${clock(room.duration)}`;
}
audio.addEventListener('timeupdate',update);
audio.addEventListener('playing',()=>{stage.classList.remove('paused');$('play').textContent='Pause';$('play').setAttribute('aria-label','Pause narration');$('media-status').textContent='';if(video.classList.contains('active')&&!reduced)video.play().catch(()=>{});});
audio.addEventListener('pause',()=>{stage.classList.add('paused');$('play').textContent='Play';$('play').setAttribute('aria-label','Play narration');video.pause();});
audio.addEventListener('waiting',()=>{if(!film.open)return;$('media-status').textContent='Your message is loading…';video.pause();stage.classList.add('paused');});
audio.addEventListener('error',()=>{if(film.open)$('media-status').textContent='Audio could not load. Tap Play to retry, or choose Read along.';});
audio.addEventListener('ended',()=>{$('finish').hidden=false;stage.classList.add('finished');$('caption').textContent='I am capable. I can figure this out. I can do this.';$('play').textContent='Replay';$('play').setAttribute('aria-label','Replay narration');$('again').focus();});
video.addEventListener('error',()=>video.classList.remove('active'));
$('play').onclick=()=>{if(audio.paused){if(audio.error)audio.load();play();}else pause();};
$('mute').onclick=()=>{audio.muted=!audio.muted;$('mute').textContent=audio.muted?'Sound off':'Sound on';$('mute').setAttribute('aria-label',audio.muted?'Unmute narration':'Mute narration');};
$('seek').addEventListener('input',()=>{audio.currentTime=Number($('seek').value);$('finish').hidden=true;stage.classList.remove('finished');update();if(video.classList.contains('active')&&Number.isFinite(video.duration))video.currentTime=(audio.currentTime-room.timeline[lastSection].start)%video.duration;});
$('again').onclick=()=>{audio.currentTime=0;$('finish').hidden=true;stage.classList.remove('finished');update();play();};
$('close').onclick=$('return').onclick=closeRoom;
film.addEventListener('cancel',e=>{e.preventDefault();if(!$('transcript').hidden){$('transcript').hidden=true;$('read').focus();}else closeRoom();});
$('read').onclick=()=>{pause();$('transcript').hidden=false;$('hide-transcript').focus();};
$('hide-transcript').onclick=()=>{$('transcript').hidden=true;$('read').focus();};
document.querySelectorAll('.room-card').forEach(b=>b.onclick=()=>openRoom(b.dataset.room,b));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&film.open)pause();});
$('retry').onclick=loadRooms;
const canvas=$('atmosphere'),ctx=canvas.getContext('2d');
function startAtmosphere(){
 cancelAnimationFrame(raf);if(reduced||!ctx)return;
 const w=canvas.width=innerWidth,h=canvas.height=innerHeight;
 const particles=Array.from({length:activeKey==='rain'?90:40},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.8+.5,s:Math.random()*.65+.2,a:Math.random()*.35+.12}));let previous=performance.now();
 function draw(now){const dt=Math.min(32,now-previous)/16.67;previous=now;if(!film.open)return;ctx.clearRect(0,0,w,h);const moving=!audio.paused&&!stage.classList.contains('paused');
 for(const p of particles){if(moving){p.y+=activeKey==='rain'?p.s*13*dt:-p.s*dt;p.x+=activeKey==='rain'?-p.s*2*dt:Math.sin(now/2400+p.r)*.22*dt;if(p.y>h+20)p.y=-20;if(p.y<-25)p.y=h+20;if(p.x<0)p.x=w;}ctx.globalAlpha=p.a;
 if(activeKey==='rain'){ctx.strokeStyle='#d4e9f4';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-3,p.y+14+p.r*4);ctx.stroke();}
 else{ctx.fillStyle='#ffe5a1';ctx.shadowBlur=9;ctx.shadowColor='#ffe1a0';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}}ctx.globalAlpha=1;raf=requestAnimationFrame(draw);}
 raf=requestAnimationFrame(draw);
}
window.addEventListener('resize',()=>{if(film.open)startAtmosphere();});loadRooms();
