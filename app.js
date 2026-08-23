gsap.registerPlugin(Draggable);

/* ================================================ CONSTANTS */
const ITEM_W=220, ITEM_H=220, GAP=18, COLS=12;
const THEME_NAMES={void:'VOID',cream:'CREAM',aurora:'AURORA',ember:'EMBER',arctic:'ARCTIC',neon:'NEON',forest:'FOREST',midnight:'MIDNIGHT',rose:'ROSE',cobalt:'COBALT'};
const THEME_BG={void:'#080808',cream:'#f2ede6',aurora:'#060d1a',ember:'#0f0806',arctic:'#f0f6fc',neon:'#08040f',forest:'#060f08',midnight:'#03060f',rose:'#120810',cobalt:'#030610'};

/* ================================================ STATE */
let currentTheme=localStorage.getItem('cg-theme')||'void';
let menuOpen=false, lbIndex=-1;
let filteredIndices=[];
let activeEvent=null, activeCousins=new Set(), activeMedia='all';
let advTitle='', advDesc='', advCousins=[];
let currentScale=1, canvasX=0, canvasY=0;
let draggableInst=null, toastTimer=null;
let slideshowActive=false, slideshowTimer=null, slideshowInterval=4000;
let favorites=new Set(JSON.parse(localStorage.getItem('cg-favorites')||'[]'));
let onlyFavorites=false;
let rxA=0, ryA=0, rx2A=0, ry2A=0, mxA=0, myA=0;
let bgParticles=[], bgRaf=0, auroraTick=0, emberTick=0;
const TRAIL_COUNT=8;
const trailPos=Array.from({length:TRAIL_COUNT},()=>({x:0,y:0}));
const isTouch=window.matchMedia('(pointer:coarse)').matches;
const isMobile=()=>window.innerWidth<=1024;

/* ================================================ DOM */
const viewport=document.getElementById('viewport');
const canvasWrap=document.getElementById('canvas-wrap');
const grid=document.getElementById('grid');
const header=document.getElementById('header');
const footer=document.getElementById('footer');
const zoomEl=document.getElementById('zoom');
const lb=document.getElementById('lightbox');
const lbMedia=document.getElementById('lb-media');
const lbBack=document.getElementById('lb-back');
const mapView=document.getElementById('mapview');
const mapRight=document.getElementById('map-right');
const menuPanel=document.getElementById('menu-panel');
const menuBtn=document.getElementById('menu-btn');
const menuGrid=document.getElementById('menu-grid');
const themeWipe=document.getElementById('theme-wipe');
const themeLbl=document.getElementById('theme-lbl');
const fcount=document.getElementById('fcount');
const fchips=document.getElementById('fchips');
const fdate=document.getElementById('fdate');
const zlbl=document.getElementById('zlbl');
const zthumb=document.getElementById('zthumb');
const nores=document.getElementById('nores');
const toast=document.getElementById('toast');
const cdot=document.getElementById('cdot');
const cring=document.getElementById('cring');
const cring2=document.getElementById('cring2');
const clabel=document.getElementById('clabel');
const bgCanvas=document.getElementById('bg-canvas');
const bgCtx=bgCanvas.getContext('2d');

function applyTheme(t){document.documentElement.dataset.theme=t;}
applyTheme(currentTheme);

/* ================================================ MENU */
function buildMenu(){
  const makeSection=(title,items)=>{
    const sec=document.createElement('div'); sec.className='msec';
    const h=document.createElement('h3'); h.textContent=title;
    const ul=document.createElement('ul');
    items.forEach(it=>ul.appendChild(it));
    sec.append(h,ul); return sec;
  };
  const mkLink=(text,id,date,active,onClick)=>{
    const li=document.createElement('li');
    const btn=document.createElement('button');
    btn.className='mlink'+(active?' active':'');
    if(id) btn.dataset.id=id;
    btn.innerHTML=`<span class="ldot"></span>${text}${date?`<span class="ldate">${date}</span>`:''}`;
    btn.addEventListener('click',onClick); li.appendChild(btn); return li;
  };
  const evItems=[mkLink('All Events',null,null,!activeEvent,()=>setEvent(null))];
  EVENTS.forEach(ev=>evItems.push(mkLink(ev.name,ev.id,ev.date,activeEvent===ev.id,()=>setEvent(ev.id))));
  const coItems=[mkLink('Everyone',null,null,activeCousins.size===0,()=>toggleCousin(null))];
  COUSINS.forEach(c=>{
    const li=mkLink(c.name,c.id,null,activeCousins.has(c.id),()=>toggleCousin(c.id));
    li.classList.add('mlink-li-with-view');
    const viewBtn=document.createElement('button');
    viewBtn.className='mlink-view-btn';
    viewBtn.type='button';
    viewBtn.title="View "+c.name+"'s profile";
    viewBtn.setAttribute('aria-label',"View "+c.name+"'s profile");
    viewBtn.textContent='👤';
    viewBtn.addEventListener('click',e=>{e.stopPropagation();menuBtn.click();openProfile(c.id);});
    li.appendChild(viewBtn);
    coItems.push(li);
  });
  const mItems=[
    mkLink('All Media','all',null,activeMedia==='all',()=>{activeMedia='all';updateMediaLinks();applyFilters();centerGrid()}),
    mkLink('Photos','photo',null,activeMedia==='photo',()=>{activeMedia='photo';updateMediaLinks();applyFilters();centerGrid()}),
    mkLink('Videos','video',null,activeMedia==='video',()=>{activeMedia='video';updateMediaLinks();applyFilters();centerGrid()}),
    mkLink('❤ Favorites','__favorites__',null,onlyFavorites,()=>toggleFavoritesFilter()),
  ];
  // This Month helper
  const now = new Date();
  const thisMonthLabel = now.toLocaleString('default',{month:'long',year:'numeric'});
  const qaItems=[
    mkLink('📊 Stats',null,null,false,()=>{menuBtn.click();document.getElementById('stats-btn')?.click();}),
    mkLink('🗺 Map',null,null,false,()=>{menuBtn.click();document.getElementById('map-btn')?.click();}),
    mkLink('▶ Slideshow',null,null,false,()=>{menuBtn.click();document.getElementById('slide-btn')?.click();}),
    mkLink('🔀 Shuffle',null,null,false,()=>{menuBtn.click();chaosShuffle();}),
    mkLink('🎲 Surprise Me',null,null,false,()=>{menuBtn.click();document.getElementById('surprise-btn')?.click();}),
    mkLink('📅 This Month',null,null,false,()=>{menuBtn.click();filterThisMonth();}),
    mkLink('⚡ Sups',null,null,false,()=>{menuBtn.click();openSups();}),
    mkLink('📖 Yearbook',null,null,false,()=>{menuBtn.click();openYearbook();}),
    mkLink('🎨 Theme Toggle',null,null,false,()=>{toggleThemeOnClick();}),
    mkLink('📲 Install App',null,null,false,()=>{window.location.href='install.html';}),
  ];
  menuGrid.innerHTML='';
  menuGrid.append(makeSection('Events',evItems),makeSection('People',coItems),makeSection('Media',mItems),makeSection('Features',qaItems));
}

/* ================================================ GRID */
const gridItems=[];

/* Build a single grid-item element (shared by desktop and mobile paths) */
function makeGridItem(m, i, mobile){
  const w=ITEM_W, h=ITEM_H;
  const col=i%COLS, row=Math.floor(i/COLS);
  const x=col*(w+GAP), y=row*(h+GAP);
  const div=document.createElement('div');
  div.className='gitem';
  div.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
  const inner=document.createElement('div'); inner.className='ginner';
  const mw=document.createElement('div'); mw.className='gmedia';

  if(m.t==='photo'){
    const img=document.createElement('img');
    img.src=m.src; img.alt=m.title; img.loading='lazy'; img.decoding='async';
    img.onerror=function(){
      mw.innerHTML=`<div class="gph"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>${m.title}</span></div>`;
    };
    mw.appendChild(img);
  } else if(mobile){
    /* On mobile: skip live <video> in grid — massive memory/CPU saver.
       Show a static poster image (or blank) with a play badge instead.
       The actual video loads only when the lightbox opens. */
    const ph=document.createElement('div'); ph.className='gph gvph';
    ph.innerHTML=`<svg width="36" height="36" viewBox="0 0 24 24" fill="rgba(255,255,255,.7)"><path d="M8 5v14l11-7z"/></svg>`;
    mw.appendChild(ph);
    const play=document.createElement('div'); play.className='gplay';
    play.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>';
    inner.appendChild(play);
    const badge=document.createElement('div'); badge.className='gbadge'; badge.textContent='VIDEO';
    inner.appendChild(badge);
  } else {
    const vid=document.createElement('video');
    vid.src=m.src; vid.muted=true; vid.loop=true; vid.playsInline=true; vid.preload='metadata';
    vid.addEventListener('loadedmetadata',()=>{try{vid.currentTime=0.5}catch(_){}});
    vid.onerror=function(){
      mw.innerHTML=`<div class="gph"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>${m.title}</span></div>`;
    };
    mw.appendChild(vid);
    const play=document.createElement('div'); play.className='gplay';
    play.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>';
    inner.appendChild(play);
    const badge=document.createElement('div'); badge.className='gbadge'; badge.textContent='VIDEO';
    inner.appendChild(badge);
  }

  const ov=document.createElement('div'); ov.className='goverlay';
  const gt=document.createElement('div'); gt.className='gtitle'; gt.textContent=m.title;
  ov.appendChild(gt); mw.appendChild(ov);
  const gn=document.createElement('div'); gn.className='gnum';
  gn.textContent='#'+String(i+1).padStart(3,'0');
  inner.appendChild(mw); inner.appendChild(gn);
  div.appendChild(inner);

  if(!isTouch){
    div.addEventListener('mousemove',e=>tiltItem(e,div,inner));
    div.addEventListener('mouseleave',()=>gsap.to(inner,{rotateX:0,rotateY:0,duration:.5,ease:'elastic.out(1,.5)',transformPerspective:600}));
  }
  div.addEventListener('click',()=>{ if(compareMode){selectForCompare_byMediaIdx(i);return;} if(themeOnClick){const _ts=Object.keys(THEME_NAMES).filter(t=>t!==currentTheme);if(_ts.length)switchTheme(_ts[Math.floor(Math.random()*_ts.length)]);} openLb(i); });
  return {el:div, inner, m, x, y, i};
}

const _ric = window.requestIdleCallback || (cb=>setTimeout(()=>cb({timeRemaining:()=>16}),1));

function buildGrid(){
  grid.innerHTML=''; gridItems.length=0;
  const mobile=isMobile();

  if(mobile){
    /* ---- MOBILE: chunked rendering ---- */
    const FIRST=50, CHUNK=50;
    const frag=document.createDocumentFragment();
    const end1=Math.min(FIRST,MEDIA.length);
    for(let i=0;i<end1;i++){
      const gi=makeGridItem(MEDIA[i],i,true);
      frag.appendChild(gi.el);
      gridItems.push(gi);
    }
    grid.appendChild(frag);
    applyFilters();

    /* Render the rest in idle-time chunks so the first 50 paint fast */
    let cursor=end1;
    function renderChunk(deadline){
      if(cursor>=MEDIA.length) return;
      const chunkFrag=document.createDocumentFragment();
      while(cursor<MEDIA.length && (deadline.timeRemaining()>4 || cursor<end1+CHUNK)){
        const gi=makeGridItem(MEDIA[cursor],cursor,true);
        chunkFrag.appendChild(gi.el);
        gridItems.push(gi);
        cursor++;
      }
      grid.appendChild(chunkFrag);
      /* Keep hidden items hidden per current filter state */
      applyFiltersQuick();
      if(cursor<MEDIA.length) _ric(renderChunk);
    }
    _ric(renderChunk);

  } else {
    /* ---- DESKTOP: render all at once (unchanged) ---- */
    const frag=document.createDocumentFragment();
    MEDIA.forEach((m,i)=>{
      const gi=makeGridItem(m,i,false);
      frag.appendChild(gi.el);
      gridItems.push(gi);
    });
    grid.appendChild(frag);
    const rows=Math.ceil(MEDIA.length/COLS);
    const totalW=COLS*(ITEM_W+GAP)-GAP, totalH=rows*(ITEM_H+GAP)-GAP;
    grid.style.width=totalW+'px'; grid.style.height=totalH+'px';
    canvasWrap.style.width=totalW+'px'; canvasWrap.style.height=totalH+'px';
    initDraggable();
    applyFilters();
  }
}

/* Lightweight filter sync for mid-render chunks (no animation) */
function applyFiltersQuick(){
  gridItems.forEach(it=>{
    let show=true;
    if(activeEvent&&it.m.e!==activeEvent) show=false;
    if(activeMedia!=='all'&&it.m.t!==activeMedia) show=false;
    if(onlyFavorites&&!favorites.has(it.m.src)) show=false;
    if(activeCousins.size>0){
      if(activeCousins.size===1){const [only]=[...activeCousins];if(!(it.m.c.length===1&&it.m.c[0]===only)) show=false;}
      else{if(![...activeCousins].every(c=>it.m.c.includes(c))) show=false;}
    }
    it.el.style.display=show?'':'none';
  });
}

function tiltItem(e,el,inner){
  const r=el.getBoundingClientRect();
  const dx=(e.clientX-r.left-r.width/2)/(r.width/2);
  const dy=(e.clientY-r.top-r.height/2)/(r.height/2);
  gsap.to(inner,{rotateY:dx*14,rotateX:-dy*14,duration:.3,ease:'power2.out',transformPerspective:700});
}

function initDraggable(){
  if(draggableInst) draggableInst.forEach(d=>d.kill());
  let vx=0,vy=0,lastX=0,lastY=0,lastT=0;
  draggableInst=Draggable.create(canvasWrap,{
    type:'x,y',bounds:getBounds(),edgeResistance:.65,
    onDragStart(){viewport.classList.add('dragging');vx=0;vy=0;lastX=this.x;lastY=this.y;lastT=Date.now()},
    onDrag(){const now=Date.now(),dt=Math.max(1,now-lastT);vx=(this.x-lastX)/dt*16;vy=(this.y-lastY)/dt*16;lastX=this.x;lastY=this.y;lastT=now},
    onDragEnd(){
      viewport.classList.remove('dragging');canvasX=this.x;canvasY=this.y;
      const b=getBounds();
      const tx=Math.max(b.minX,Math.min(b.maxX,canvasX+vx*18));
      const ty=Math.max(b.minY,Math.min(b.maxY,canvasY+vy*18));
      gsap.to(canvasWrap,{x:tx,y:ty,duration:.9,ease:'power3.out',
        onUpdate:()=>{canvasX=gsap.getProperty(canvasWrap,'x');canvasY=gsap.getProperty(canvasWrap,'y')}});
    },
  });
}


function getBounds(){
  const vw=window.innerWidth,vh=window.innerHeight;
  const gw=(parseFloat(grid.style.width)||vw)*currentScale;
  const gh=(parseFloat(grid.style.height)||vh)*currentScale;
  const margin=200;
  return{minX:margin-gw,maxX:vw-margin,minY:margin-gh,maxY:vh-margin};
}

function centerGrid(){
  if(isMobile()) return;
  const vw=window.innerWidth;
  const gw=parseFloat(grid.style.width)||0;
  const HEADER_H=58;
  let tx=(vw-gw)/2, ty=HEADER_H+20;
  const b=getBounds();
  tx=Math.max(b.minX,Math.min(b.maxX,tx));
  ty=Math.max(b.minY,Math.min(b.maxY,ty));
  canvasX=tx; canvasY=ty;
  gsap.set(canvasWrap,{x:tx,y:ty});
  if(draggableInst) setTimeout(()=>draggableInst.forEach(d=>d.update()),60);
}

/* ================================================ FILTERS */
function setEvent(id){
  activeEvent=id;
  document.querySelectorAll('.msec:nth-child(1) .mlink').forEach(el=>{
    el.classList.toggle('active',(!el.dataset.id&&id===null)||el.dataset.id===id);
  });
  applyFilters(); centerGrid();
}

function toggleCousin(id){
  if(!id){activeCousins.clear();}
  else{activeCousins.has(id)?activeCousins.delete(id):activeCousins.add(id);}
  document.querySelectorAll('.msec:nth-child(2) .mlink[data-id]').forEach(el=>{
    el.classList.toggle('active',activeCousins.has(el.dataset.id));
  });
  const allBtn=document.querySelector('.msec:nth-child(2) .mlink:not([data-id])');
  if(allBtn) allBtn.classList.toggle('active',activeCousins.size===0);
  applyFilters(); centerGrid();
}

function updateMediaLinks(){
  document.querySelectorAll('.msec:nth-child(3) .mlink').forEach(el=>{
    if(el.dataset.id==='__favorites__') return; // independent toggle, not part of the all/photo/video group
    el.classList.toggle('active',el.dataset.id===activeMedia);
  });
}

function resetItemPositions(){
  gridItems.forEach(it=>{
    gsap.to(it.el,{x:0,y:0,duration:.35,ease:'power2.out'});
  });
}

function applyFilters(){
  let visible=0; filteredIndices=[];
  const showItems=[], hideItems=[];

  gridItems.forEach(it=>{
    let show=true;
    if(activeEvent&&it.m.e!==activeEvent) show=false;
    if(activeMedia!=='all'&&it.m.t!==activeMedia) show=false;
    if(onlyFavorites&&!favorites.has(it.m.src)) show=false;
    // Cousins filter: show every pic that includes ALL selected cousins (solo or grouped)
    if(activeCousins.size>0){
      if(![...activeCousins].every(c=>it.m.c.includes(c))) show=false;
    }
    // Advanced search: title/desc partial match, cousins exact single
    if(show&&advTitle&&!it.m.title.toLowerCase().includes(advTitle)) show=false;
    if(show&&advDesc&&!it.m.desc.toLowerCase().includes(advDesc)) show=false;
    if(show&&advCousins.length>0){
      if(!advCousins.every(ac=>it.m.c.some(mc=>mc===ac||COUSINS.find(x=>x.id===mc)?.name.toLowerCase()===ac))) show=false;
    }
    show ? showItems.push(it) : hideItems.push(it);
  });


  const mobile=isMobile();

  // Hide filtered-out items
  hideItems.forEach(it=>{
    if(mobile){
      it.el.style.display='none';
    } else {
      gsap.to(it.el,{opacity:0,scale:.85,duration:.25,ease:'power2.in',
        onComplete:()=>{it.el.style.display='none';gsap.set(it.el,{scale:1});}});
    }
  });

  // Repack visible items into grid from top-left
  const cols=COLS;
  showItems.forEach((it,i)=>{
    const col=i%cols, row=Math.floor(i/cols);
    const x=col*(ITEM_W+GAP), y=row*(ITEM_H+GAP);
    it.el.style.display='';
    if(mobile){
      /* Mobile: CSS grid handles layout, no GSAP needed */
      it.el.style.opacity='1';
      gsap.set(it.el,{x:0,y:0,scale:1,clearProps:'transform'});
    } else {
      gsap.to(it.el,{x:x-it.x,y:y-it.y,opacity:1,scale:1,duration:.4,ease:'power2.out',delay:i*.008});
    }
    filteredIndices.push(it.i);
    visible++;
  });

  fcount.textContent=`${visible} / ${MEDIA.length} MEMORIES`;
  nores.classList.toggle('show',visible===0);
  updateChips(); updateZThumb();
}

/* ---- CHIPS (clickable to remove) ---- */
function updateChips(){
  fchips.innerHTML='';
  const addChip=(lbl,onRemove)=>{
    const c=document.createElement('div'); c.className='fchip';
    c.innerHTML=lbl+'<span class="fchip-x">×</span>';
    c.addEventListener('click',onRemove);
    fchips.appendChild(c);
  };
  if(activeEvent){const ev=EVENTS.find(e=>e.id===activeEvent);if(ev) addChip(ev.name,()=>setEvent(null));}
  activeCousins.forEach(id=>{const c=COUSINS.find(x=>x.id===id);if(c) addChip(c.name,()=>toggleCousin(id));});
  if(activeMedia!=='all') addChip(activeMedia.toUpperCase(),()=>{activeMedia='all';updateMediaLinks();applyFilters();});
  if(onlyFavorites) addChip('❤ Favorites',()=>toggleFavoritesFilter());
  if(advTitle) addChip(`"${advTitle}"`,()=>{advTitle='';applyFilters();});
}

/* ================================================ LIGHTBOX */
function openLb(idx){lbIndex=idx; lb.classList.add('open'); populateLb(idx); document.addEventListener('keydown',lbKey);}
function closeLb(){lb.classList.remove('open');const v=lbMedia.querySelector('video');if(v)v.pause();document.removeEventListener('keydown',lbKey);stopSlideshow();}
function navLb(dir){stopSlideshow();
  const cur=filteredIndices.indexOf(lbIndex);
  let next;
  if(cur===-1) next=dir===1?filteredIndices[0]:filteredIndices[filteredIndices.length-1];
  else{const ni=cur+dir;if(ni<0||ni>=filteredIndices.length)return;next=filteredIndices[ni];}
  if(next!==undefined){populateLb(next);lbIndex=next;}
}
function lbKey(e){if(e.key==='Escape')closeLb();else if(e.key==='ArrowLeft')navLb(-1);else if(e.key==='ArrowRight')navLb(1);}
// Lightbox image transform state (with pan-to-cursor zoom support)
let lbRotation=0, lbZoomScale=1, lbPanX=0, lbPanY=0;
let lbIsDragging=false, lbDragStartX=0, lbDragStartY=0, lbDragPanX=0, lbDragPanY=0;
function lbApplyTransform(animate){
  const el=lbMedia.querySelector('img,video');
  if(!el) return;
  el.style.transition=animate===false?'none':'transform .18s ease';
  el.style.transform=`translate(${lbPanX}px,${lbPanY}px) rotate(${lbRotation}deg) scale(${lbZoomScale})`;
  el.style.cursor=lbZoomScale>1?'grab':'default';
  const zv=document.getElementById('lb-zoom-val');
  if(zv) zv.textContent=Math.round(lbZoomScale*100)+'%';
}
function lbResetTransform(){lbRotation=0;lbZoomScale=1;lbPanX=0;lbPanY=0;lbApplyTransform();}
function lbZoomAtPoint(factor, clientX, clientY){
  const wrap=document.getElementById('lb-media-wrap');
  if(!wrap) return;
  const rect=wrap.getBoundingClientRect();
  const mx=clientX-rect.left-rect.width/2;
  const my=clientY-rect.top-rect.height/2;
  const prevScale=lbZoomScale;
  lbZoomScale=Math.max(0.25,Math.min(6,lbZoomScale*factor));
  lbPanX=mx-(mx-lbPanX)*(lbZoomScale/prevScale);
  lbPanY=my-(my-lbPanY)*(lbZoomScale/prevScale);
  lbApplyTransform(false);
  const zv=document.getElementById('lb-zoom-val');
  if(zv) zv.textContent=Math.round(lbZoomScale*100)+'%';
}

function populateLb(idx){
  const m=MEDIA[idx]; if(!m)return;
  const ev=EVENTS.find(e=>e.id===m.e);
  lbResetTransform();
  lbMedia.innerHTML='';

  // Keep nav buttons
  ['lb-prev','lb-next'].forEach(bid=>{
    const old=document.getElementById(bid);
    if(old) lbMedia.appendChild(old);
  });

  // re-add prev/next if they got wiped
  if(!document.getElementById('lb-prev')){
    const prev=document.createElement('button'); prev.className='lb-nav lb-prev'; prev.id='lb-prev';
    prev.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>';
    prev.addEventListener('click',e=>{e.stopPropagation();navLb(-1)});
    lbMedia.appendChild(prev);
  }
  if(!document.getElementById('lb-next')){
    const next=document.createElement('button'); next.className='lb-nav lb-next'; next.id='lb-next';
    next.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18l6-6-6-6"/></svg>';
    next.addEventListener('click',e=>{e.stopPropagation();navLb(1)});
    lbMedia.appendChild(next);
  }

  const mtype=document.getElementById('lb-media-type');
  const toolbar=document.getElementById('lb-toolbar');

  if(m.t==='photo'){
    const img=document.createElement('img'); img.src=m.src; img.alt=m.title;
    img.style.cssText='max-width:100%;max-height:100%;object-fit:contain;transform-origin:center center;user-select:none;-webkit-user-drag:none';
    img.onerror=()=>{
      const ph=document.createElement('div');
      ph.style.cssText='display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px;color:var(--text-muted)';
      ph.innerHTML=`<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span style="font-family:monospace;font-size:11px;letter-spacing:.2em">${m.title}</span>`;
      lbMedia.insertBefore(ph,lbMedia.firstChild);
    };
    lbMedia.insertBefore(img,lbMedia.firstChild);
    document.getElementById('lb-dl').href=m.src; document.getElementById('lb-dl').download=m.src;
    if(toolbar) toolbar.style.display='flex';
    if(mtype) mtype.textContent='Photo';
    gsap.from(img,{scale:.9,opacity:0,duration:.4,ease:'power3.out'});
  } else {
    const vid=document.createElement('video'); vid.src=m.src; vid.controls=true; vid.autoplay=true;
    vid.style.cssText='max-width:100%;max-height:100%;transform-origin:center center';
    lbMedia.insertBefore(vid,lbMedia.firstChild);
    document.getElementById('lb-dl').href=m.src; document.getElementById('lb-dl').download=m.src;
    if(toolbar) toolbar.style.display='none'; // hide rotate/zoom for videos
    if(mtype) mtype.textContent='Video';
  }
  document.getElementById('lb-tag').textContent=m.t==='video'?'Video Memory':'Memory';
  document.getElementById('lb-title').textContent=m.title;
  document.getElementById('lb-desc').textContent=m.desc;
  document.getElementById('lb-event').textContent=ev?.name||m.e;
  document.getElementById('lb-date').textContent=ev?.date||'—';
  document.getElementById('lb-cousins').textContent=m.c.map(id=>COUSINS.find(c=>c.id===id)?.name||id).join(', ');
  document.getElementById('lb-num').textContent='#'+String(idx+1).padStart(3,'0');
  const zv=document.getElementById('lb-zoom-val');
  if(zv) zv.textContent='100%';
  updateLbFavIcon(idx);
}

/* ================================================ ZOOM */
function doZoom(delta,cx,cy){
  const oldScale=currentScale;
  currentScale=Math.max(0.25,Math.min(3,currentScale+delta));
  const vw=window.innerWidth,vh=window.innerHeight;
  const pivX=cx!==undefined?cx:vw/2;
  const pivY=cy!==undefined?cy:vh/2;
  let newX=pivX-(pivX-canvasX)*(currentScale/oldScale);
  let newY=pivY-(pivY-canvasY)*(currentScale/oldScale);
  const b=getBounds();
  newX=Math.max(b.minX,Math.min(b.maxX,newX));
  newY=Math.max(b.minY,Math.min(b.maxY,newY));
  canvasX=newX; canvasY=newY;
  gsap.to(canvasWrap,{x:newX,y:newY,scale:currentScale,duration:.4,ease:'power2.out',
    onComplete:()=>{if(draggableInst)draggableInst.forEach(d=>{d.update();d.applyBounds(getBounds());});}});
  zlbl.textContent=Math.round(currentScale*100)+'%';
  updateZThumb(); showToast(Math.round(currentScale*100)+'%');
}

function resetZoom(){
  const old=currentScale; currentScale=1;
  const vw=window.innerWidth,vh=window.innerHeight;
  const newX=vw/2-(vw/2-canvasX)*(1/old);
  const newY=vh/2-(vh/2-canvasY)*(1/old);
  canvasX=newX; canvasY=newY;
  gsap.to(canvasWrap,{x:newX,y:newY,scale:1,duration:.5,ease:'back.out(1.3)',
    onComplete:()=>{if(draggableInst)draggableInst.forEach(d=>d.update());}});
  zlbl.textContent='100%'; updateZThumb(); showToast('RESET');
}

function updateZThumb(){
  const pct=(currentScale-0.25)/(3-0.25);
  zthumb.style.top=(1-pct)*46+'px';
}

/* ================================================ THEME SWITCH */
function switchTheme(t,wx,wy){
  if(t===currentTheme) return;
  themeWipe.style.setProperty('--wx',(wx||50)+'%');
  themeWipe.style.setProperty('--wy',(wy||50)+'%');
  themeWipe.style.background=THEME_BG[t];
  themeWipe.classList.remove('active'); void themeWipe.offsetWidth; themeWipe.classList.add('active');
  setTimeout(()=>{
    currentTheme=t; applyTheme(t);
    themeLbl.textContent=THEME_NAMES[t];
    document.querySelectorAll('.tdot').forEach(d=>d.classList.toggle('active',d.dataset.t===t));
    localStorage.setItem('cg-theme',t);
    createParticles();
  },80);
  setTimeout(()=>themeWipe.classList.remove('active'),800);
}

/* ================================================ MAP */
// Pin coordinates within the SVG viewBox (840 x 580), positioned over state areas
const MAP_GROUPS={
  nashville:{svgX:277,svgY:139,city:'Nashville, TN',evs:['nashville2023','nashville2025']},
  atlanta:{svgX:391,svgY:222,city:'Atlanta, GA',evs:['atlanta','famReunion']},
  florida:{svgX:535,svgY:402,city:'Central Florida',evs:['florida']},
};

function buildMap(){
  // Build stats panel
  const totalCount=MEDIA.length;
  const maxLoc=Object.values(MAP_GROUPS).reduce((m,g)=>Math.max(m,g.evs.reduce((s,id)=>s+MEDIA.filter(x=>x.e===id).length,0)),0);
  mapRight.innerHTML=`
    <div class="map-stats-head">
      <div class="map-stats-title">Total Memories</div>
      <div class="map-total">${totalCount}</div>
      <div class="map-total-lbl">Across ${Object.keys(MAP_GROUPS).length} Locations</div>
    </div>
    <div class="map-loc-list" id="map-loc-list"></div>
    <div class="map-persons" id="map-persons">
      <div class="map-persons-title">By Person</div>
    </div>
  `;
  const locList=document.getElementById('map-loc-list');
  Object.entries(MAP_GROUPS).forEach(([key,g])=>{
    const cnt=g.evs.reduce((s,id)=>s+MEDIA.filter(x=>x.e===id).length,0);
    const pct=Math.round(cnt/maxLoc*100);
    const evNames=g.evs.map(id=>EVENTS.find(e=>e.id===id)?.name||id);
    const locEl=document.createElement('div'); locEl.className='map-loc';
    locEl.innerHTML=`
      <div class="map-loc-top">
        <div class="map-loc-city">${g.city}</div>
        <div class="map-loc-cnt">${cnt}</div>
      </div>
      <div class="map-loc-bar"><div class="map-loc-fill" style="width:0%" data-pct="${pct}%"></div></div>
      <div class="map-loc-evs">${evNames.map(n=>`<div class="map-loc-ev">· ${n}</div>`).join('')}</div>
    `;
    locEl.addEventListener('click',()=>{closeMap();setEvent(g.evs[0]);});
    locList.appendChild(locEl);
  });
  // Person stats
  const personsEl=document.getElementById('map-persons');
  const maxP=Math.max(...COUSINS.map(c=>MEDIA.filter(m=>m.c.includes(c.id)).length));
  COUSINS.forEach(c=>{
    const cnt=MEDIA.filter(m=>m.c.includes(c.id)).length;
    const pct=Math.round(cnt/maxP*100);
    const row=document.createElement('div'); row.className='map-person-row';
    row.innerHTML=`<div class="map-person-name">${c.name}</div><div class="map-person-bar"><div class="map-person-fill" style="width:0%" data-pct="${pct}%"></div></div><div class="map-person-cnt">${cnt}</div>`;
    personsEl.appendChild(row);
  });
  mapRight.innerHTML+=`<button class="map-filter-btn" id="map-filter-all">VIEW ALL MEMORIES →</button>`;
  document.getElementById('map-filter-all')?.addEventListener('click',()=>{closeMap();setEvent(null);});

  // Build SVG pins over the map
  const mapLeft=document.querySelector('.map-left');
  mapLeft.querySelectorAll('.mpin').forEach(p=>p.remove());
  // The SVG is 840x580 in viewBox. We need to convert to % of container.
  Object.entries(MAP_GROUPS).forEach(([key,g])=>{
    const cnt=g.evs.reduce((s,id)=>s+MEDIA.filter(x=>x.e===id).length,0);
    const pin=document.createElement('div'); pin.className='mpin';
    // Position as % of the .map-left container. SVG viewBox 840x580 fills container.
    const lx=(g.svgX/840*100).toFixed(2);
    const ly=(g.svgY/580*100).toFixed(2);
    pin.style.left=lx+'%'; pin.style.top=ly+'%';
    pin.innerHTML=`
      <div class="mpin-rings">
        <div class="mpin-ring"></div>
        <div class="mpin-ring"></div>
        <div class="mpin-ring"></div>
      </div>
      <div class="mpin-core"></div>
      <div class="mpin-label">${g.city}</div>
      <div class="mpin-badge">${cnt}</div>
    `;
    pin.addEventListener('click',()=>{closeMap();setEvent(g.evs[0]);});
    mapLeft.appendChild(pin);
  });
}

function openMap(){
  buildMap();
  mapView.classList.add('open');
  document.getElementById('map-btn').classList.add('active');
  // Animate bar fills after open
  setTimeout(()=>{
    document.querySelectorAll('.map-loc-fill,.map-person-fill').forEach(el=>{
      el.style.width=el.dataset.pct;
    });
  },400);
}
function closeMap(){
  mapView.classList.remove('open');
  document.getElementById('map-btn').classList.remove('active');
}

/* ================================================ CURSOR */
function setupCursor(){
  if(isTouch) return;
  const trails=[];
  for(let i=0;i<TRAIL_COUNT;i++){
    const d=document.createElement('div'); d.className='c-trail';
    document.body.appendChild(d); trails.push(d);
  }
  document.addEventListener('mousemove',e=>{
    mxA=e.clientX; myA=e.clientY;
    gsap.set(cdot,{x:mxA,y:myA}); gsap.set(clabel,{x:mxA,y:myA});
    trailPos.unshift({x:mxA,y:myA});
    if(trailPos.length>TRAIL_COUNT) trailPos.length=TRAIL_COUNT;
  });
  const tick=()=>{
    rxA+=(mxA-rxA)*.14; ryA+=(myA-ryA)*.14;
    rx2A+=(mxA-rx2A)*.07; ry2A+=(myA-ry2A)*.07;
    gsap.set(cring,{x:rxA,y:ryA}); gsap.set(cring2,{x:rx2A,y:ry2A});
    trails.forEach((d,i)=>{
      const p=trailPos[i];
      if(p){const age=i/TRAIL_COUNT; gsap.set(d,{x:p.x,y:p.y,opacity:(1-age)*.45,scale:1-age*.6});}
    });
    requestAnimationFrame(tick);
  };
  tick();
  document.body.addEventListener('mouseover',e=>{
    const t=e.target.closest('button,a,.gitem,.tdot,.zbtn,.logo');
    if(t){document.body.classList.add('cur-hover');
      clabel.textContent=t.closest('.gitem')?'VIEW':t.closest('a[href*="instagram"]')?'VISIT':t.closest('.tdot')?'THEME':'';}
  });
  document.body.addEventListener('mouseout',e=>{
    if(e.target.closest('button,a,.gitem,.tdot,.zbtn,.logo')) document.body.classList.remove('cur-hover');
  });
  viewport.addEventListener('mousedown',()=>{document.body.classList.add('cur-drag');document.body.classList.remove('cur-hover');});
  document.addEventListener('mouseup',()=>document.body.classList.remove('cur-drag'));
}

/* ================================================ BACKGROUND */
function resizeBg(){
  if(isMobile()){bgCanvas.width=1;bgCanvas.height=1;bgParticles=[];return;}
  bgCanvas.width=window.innerWidth;bgCanvas.height=window.innerHeight;createParticles();
}
function createParticles(){
  if(isMobile()){bgParticles=[];return;}
  const n=Math.floor(window.innerWidth*window.innerHeight/14000);
  bgParticles=[];
  for(let i=0;i<n;i++) bgParticles.push(new Particle(window.innerWidth,window.innerHeight,currentTheme,true));
}
function drawBg(){
  bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
  if(currentTheme==='aurora') drawAurora(bgCanvas.width,bgCanvas.height);
  else if(currentTheme==='ember') drawEmberBg(bgCanvas.width,bgCanvas.height);
  else if(currentTheme==='neon') drawNeonBg(bgCanvas.width,bgCanvas.height);
  bgParticles.forEach(p=>{p.update();p.draw(bgCtx,currentTheme);});
}
function drawAurora(W,H){
  auroraTick+=.004;
  [{y:H*.35,col:'rgba(77,255,210,0.035)',amp:80,freq:.003,phase:auroraTick},
   {y:H*.45,col:'rgba(167,139,250,0.025)',amp:100,freq:.002,phase:auroraTick*.7},
   {y:H*.55,col:'rgba(77,255,210,0.02)',amp:60,freq:.005,phase:auroraTick*1.3}].forEach(w=>{
    bgCtx.beginPath();bgCtx.moveTo(0,w.y);
    for(let x=0;x<=W;x+=4) bgCtx.lineTo(x,w.y+Math.sin(x*w.freq+w.phase)*w.amp);
    bgCtx.lineTo(W,H);bgCtx.lineTo(0,H);bgCtx.closePath();bgCtx.fillStyle=w.col;bgCtx.fill();
  });
}
function drawEmberBg(W,H){
  emberTick+=.01;
  const grad=bgCtx.createRadialGradient(W/2,H,0,W/2,H,H*.6);
  grad.addColorStop(0,`rgba(255,107,53,${.03+Math.sin(emberTick)*.01})`);
  grad.addColorStop(1,'rgba(0,0,0,0)');
  bgCtx.fillStyle=grad; bgCtx.fillRect(0,0,W,H);
}
function drawNeonBg(W,H){
  const grad=bgCtx.createRadialGradient(W*.3,H*.4,0,W*.3,H*.4,W*.6);
  grad.addColorStop(0,'rgba(255,45,120,.03)');
  grad.addColorStop(.5,'rgba(0,245,255,.015)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  bgCtx.fillStyle=grad; bgCtx.fillRect(0,0,W,H);
}

class Particle{
  constructor(W,H,theme,init=false){
    this.W=W;this.H=H;this.theme=theme;
    this.vx=0;this.vy=0;this.size=1;this.opacity=0;this.maxOpacity=.3;this.life=0;this.maxLife=300;
    this.x=Math.random()*W;this.y=Math.random()*H;
    this.reset(init);
    if(init){this.x=Math.random()*W;this.y=Math.random()*H;this.opacity=Math.random()*this.maxOpacity;}
  }
  reset(init=false){
    const W=this.W,H=this.H;
    if(this.theme==='ember'){this.x=Math.random()*W;this.y=init?Math.random()*H:H+10;this.vx=(Math.random()-.5)*.8;this.vy=-(Math.random()*1.5+.5);this.size=Math.random()*2.5+.5;}
    else if(this.theme==='aurora'){this.x=Math.random()*W;this.y=Math.random()*H;this.vx=(Math.random()-.5)*.2;this.vy=(Math.random()-.5)*.2;this.size=Math.random()*1.5+.5;}
    else if(this.theme==='arctic'){this.x=Math.random()*W;this.y=init?Math.random()*H:-10;this.vx=(Math.random()-.5)*.4;this.vy=Math.random()*.8+.2;this.size=Math.random()*2+.5;}
    else if(this.theme==='cream'){this.x=Math.random()*W;this.y=init?Math.random()*H:H+10;this.vx=(Math.random()-.5)*.2;this.vy=-(Math.random()*.3+.05);this.size=Math.random()*1.5+.3;}
    else if(this.theme==='neon'){this.x=Math.random()*W;this.y=Math.random()*H;this.vx=(Math.random()-.5)*.3;this.vy=(Math.random()-.5)*.3;this.size=Math.random()*1.8+.3;}
    else if(this.theme==='forest'){this.x=Math.random()*W;this.y=init?Math.random()*H:-10;this.vx=(Math.random()-.5)*.2;this.vy=Math.random()*.5+.1;this.size=Math.random()*2+.5;}
    else{this.x=Math.random()*W;this.y=Math.random()*H;this.vx=(Math.random()-.5)*.05;this.vy=(Math.random()-.5)*.05;this.size=Math.random()*1.2+.2;}
    this.maxOpacity=Math.random()*.5+.1;
    if(!init) this.opacity=0;
    this.maxLife=200+Math.random()*300;
    this.life=init?Math.random()*this.maxLife:0;
  }
  update(){
    this.x+=this.vx;this.y+=this.vy;this.life++;
    const half=this.maxLife/2;
    if(this.life<half) this.opacity=Math.min(this.maxOpacity,this.opacity+this.maxOpacity/half);
    else this.opacity=Math.max(0,this.maxOpacity-(this.life-half)/half*this.maxOpacity);
    if(this.theme==='ember') this.vx+=(Math.random()-.5)*.06;
    if(this.life>=this.maxLife||this.x<-20||this.x>this.W+20||this.y<-20||this.y>this.H+20) this.reset();
  }
  draw(ctx,theme){
    if(this.opacity<=.01) return;
    ctx.save();ctx.globalAlpha=this.opacity;
    if(theme==='ember'){const g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size*2);g.addColorStop(0,'#ff6b35');g.addColorStop(.5,'#ffd700');g.addColorStop(1,'transparent');ctx.fillStyle=g;}
    else if(theme==='aurora') ctx.fillStyle=Math.random()>.5?'rgba(77,255,210,.8)':'rgba(167,139,250,.8)';
    else if(theme==='arctic') ctx.fillStyle='rgba(180,220,255,.7)';
    else if(theme==='cream') ctx.fillStyle='rgba(181,84,30,.35)';
    else if(theme==='neon') ctx.fillStyle=Math.random()>.5?'rgba(255,45,120,.8)':'rgba(0,245,255,.8)';
    else if(theme==='forest') ctx.fillStyle='rgba(212,160,23,.4)';
    else if(theme==='midnight') ctx.fillStyle='rgba(192,200,216,.5)';
    else if(theme==='rose') ctx.fillStyle='rgba(232,160,176,.5)';
    else if(theme==='cobalt') ctx.fillStyle='rgba(77,143,255,.7)';
    else ctx.fillStyle='rgba(232,201,126,.7)';
    ctx.beginPath();ctx.arc(this.x,this.y,theme==='ember'?this.size*2:this.size,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}

/* ================================================ TOAST */
let ssPaused=false, ssRafId=null, ssStartTime=0, ssDuration=5000, ssPool=[], ssPos=0;
function ssUpdateBar(){
  if(!slideshowActive||ssPaused) return;
  const elapsed=Date.now()-ssStartTime;
  const pct=Math.min(100,(elapsed/ssDuration)*100);
  const fill=document.getElementById('ss-fill');
  const clock=document.getElementById('ss-clock');
  if(fill) fill.style.width=pct+'%';
  if(clock) clock.textContent=Math.max(0,Math.ceil((ssDuration-elapsed)/1000))+'s';
  if(pct<100) ssRafId=requestAnimationFrame(ssUpdateBar);
}
function startSlideshow(){
  if(filteredIndices.length===0) return;
  slideshowActive=true; ssPaused=false;
  document.getElementById('slide-btn').textContent='■ STOP';
  document.getElementById('slide-btn').classList.add('active');
  document.getElementById('ss-overlay')?.classList.add('show');
  document.getElementById('ss-pause').textContent='⏸';
  ssPool=[...filteredIndices].sort(()=>Math.random()-.5); ssPos=0;
  const next=()=>{
    if(!slideshowActive) return;
    const idx=ssPool[ssPos%ssPool.length]; ssPos++;
    openLb(idx);
    if(ssRafId) cancelAnimationFrame(ssRafId);
    ssStartTime=Date.now();
    const fill=document.getElementById('ss-fill');
    if(fill){fill.style.transition='none';fill.style.width='0%';}
    ssUpdateBar();
    slideshowTimer=setTimeout(next,ssDuration);
  };
  next();
}
function stopSlideshow(){
  slideshowActive=false; ssPaused=false;
  clearTimeout(slideshowTimer); slideshowTimer=null;
  if(ssRafId){cancelAnimationFrame(ssRafId);ssRafId=null;}
  document.getElementById('slide-btn').textContent='▶ PLAY';
  document.getElementById('slide-btn').classList.remove('active');
  document.getElementById('ss-overlay')?.classList.remove('show');
}

function showToast(msg){
  toast.textContent=msg;toast.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),1400);
}

/* ================================================ PRELOADER */
function startPreloader(){
  const plTitle=document.getElementById('pl-title');
  const plCount=document.getElementById('pl-count');
  'THE COUSINS'.split('').forEach((ch,i)=>{
    const s=document.createElement('span');
    s.textContent=ch===' '?'\u00a0':ch;
    s.style.animationDelay=`${.2+i*.045}s`;
    plTitle.appendChild(s);
  });
  let pct=0;
  const tick=()=>{pct=Math.min(100,pct+Math.random()*4+1);if(plCount) plCount.textContent=Math.floor(pct)+'%';if(pct<100) requestAnimationFrame(tick);};
  tick();

  /* Reveal-the-page logic, pulled out so every path (success, GSAP missing,
     GSAP throwing, or the hard fallback timer) can call the same code and
     only run it once. This is what used to be stuck behind a single
     gsap.to(...) call with no error handling. */
  let preloaderHidden=false;
  const hidePreloader=()=>{
    if(preloaderHidden) return;
    preloaderHidden=true;
    const pl=document.getElementById('preloader');
    if(pl){pl.style.opacity='0';pl.style.display='none';}
    header.classList.add('show');footer.classList.add('show');zoomEl.classList.add('show');
    centerGrid();animateGridIn();
    fdate.textContent=new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}).toUpperCase();
  };

  setTimeout(()=>{
    if(typeof gsap==='undefined'){
      /* GSAP CDN blocked/offline/failed — skip the fade animation entirely
         rather than leaving the visitor stuck behind the preloader forever. */
      hidePreloader();
      return;
    }
    try{
      gsap.to('#preloader',{opacity:0,duration:.6,ease:'power2.inOut',onComplete:hidePreloader});
    }catch(err){
      console.error('Preloader fade animation failed, revealing page anyway:',err);
      hidePreloader();
    }
  },1600);

  /* Absolute fallback: whatever else goes wrong above, never leave the
     visitor staring at a stuck preloader for more than a few seconds. */
  setTimeout(hidePreloader,4000);
}

function animateGridIn(){
  if(isMobile()){
    /* On mobile: just add a CSS fade-in class instead of 700 GSAP tweens */
    grid.classList.add('grid-reveal');
    return;
  }
  const items=gridItems.filter(it=>it.el.style.display!=='none');
  /* Cap stagger so animation finishes in ≤3s regardless of item count */
  const stagger=Math.min(0.016, 2.5/Math.max(items.length,1));
  items.forEach((it,i)=>{
    gsap.fromTo(it.el,
      {opacity:0,scale:.72,y:28,rotation:(Math.random()-.5)*6},
      {opacity:1,scale:1,y:0,rotation:0,duration:.55,delay:i*stagger,ease:'back.out(1.4)'}
    );
  });
}

/* ================================================ EVENTS */
function bindEvents(){
  // Theme dots
  document.querySelectorAll('.tdot').forEach(dot=>{
    dot.addEventListener('click',e=>{
      const r=dot.getBoundingClientRect();
      const wx=((r.left+r.width/2)/window.innerWidth)*100;
      const wy=((r.top+r.height/2)/window.innerHeight)*100;
      switchTheme(dot.dataset.t,wx,wy);
    });
  });

  // Menu
  menuBtn.addEventListener('click',()=>{
    menuOpen=!menuOpen;
    menuPanel.classList.toggle('open',menuOpen);
    menuBtn.classList.toggle('open',menuOpen);
    if(menuOpen){buildMenu();const links=menuPanel.querySelectorAll('.mlink,.adv-input,.adv-btn');gsap.from(links,{opacity:0,y:-6,stagger:.02,duration:.3,ease:'power2.out',delay:.05});}
  });

  // Logo → reset all filters
  document.getElementById('logo-btn').addEventListener('click',()=>{
    activeEvent=null;activeCousins.clear();activeMedia='all';advTitle='';advDesc='';advCousins=[];
    resetItemPositions();applyFilters();centerGrid();
  });

  // Lightbox
  lbBack.addEventListener('click',closeLb);
  document.getElementById('lb-prev').addEventListener('click',e=>{e.stopPropagation();navLb(-1)});
  document.getElementById('lb-next').addEventListener('click',e=>{e.stopPropagation();navLb(1)});
  document.getElementById('lb-close').addEventListener('click',closeLb);

  // Lightbox rotate
  document.getElementById('lb-rot-l').addEventListener('click',()=>{lbRotation-=90;lbApplyTransform();});
  document.getElementById('lb-rot-r').addEventListener('click',()=>{lbRotation+=90;lbApplyTransform();});
  // Lightbox zoom
  document.getElementById('lb-zi').addEventListener('click',()=>lbZoomAtPoint(1.3,window.innerWidth/2,window.innerHeight/2));
  document.getElementById('lb-zo').addEventListener('click',()=>lbZoomAtPoint(0.75,window.innerWidth/2,window.innerHeight/2));
  document.getElementById('lb-zr').addEventListener('click',()=>{lbResetTransform();});
  // Pinch-to-zoom on lightbox image (touch)
  let lbPinchDist=0;
  lb.addEventListener('touchstart',e=>{
    if(e.touches.length===2){lbPinchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);}
  },{passive:true});
  lb.addEventListener('touchmove',e=>{
    if(e.touches.length===2){
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      if(lbPinchDist>0){const ratio=d/lbPinchDist;const cx=(e.touches[0].clientX+e.touches[1].clientX)/2;const cy=(e.touches[0].clientY+e.touches[1].clientY)/2;lbZoomAtPoint(ratio,cx,cy);lbPinchDist=d;}
    }
  },{passive:true});
  // Mouse wheel zoom on lightbox — zooms to cursor position
  lb.addEventListener('wheel',e=>{
    if(!lb.classList.contains('open')) return;
    e.stopPropagation();
    if(lbMedia.querySelector('img')){
      e.preventDefault();
      const factor=e.deltaY<0?1.12:0.89;
      lbZoomAtPoint(factor,e.clientX,e.clientY);
    }
  },{passive:false});

  // Pan when zoomed in — drag image inside lightbox
  lbMedia.addEventListener('mousedown',e=>{
    if(lbZoomScale<=1||!lbMedia.querySelector('img')) return;
    e.preventDefault(); lbIsDragging=true;
    lbDragStartX=e.clientX; lbDragStartY=e.clientY;
    lbDragPanX=lbPanX; lbDragPanY=lbPanY;
    lbMedia.style.cursor='grabbing';
  });
  window.addEventListener('mousemove',e=>{
    if(!lbIsDragging) return;
    lbPanX=lbDragPanX+(e.clientX-lbDragStartX);
    lbPanY=lbDragPanY+(e.clientY-lbDragStartY);
    lbApplyTransform(false);
  });
  window.addEventListener('mouseup',()=>{
    if(lbIsDragging){lbIsDragging=false;lbMedia.style.cursor=lbZoomScale>1?'grab':'default';}
  });

  // Slideshow
  document.getElementById('slide-btn').addEventListener('click',()=>slideshowActive?stopSlideshow():startSlideshow());
  document.getElementById('ss-pause')?.addEventListener('click',()=>{
    if(!slideshowActive) return;
    ssPaused=!ssPaused;
    document.getElementById('ss-pause').textContent=ssPaused?'▶':'⏸';
    if(ssPaused){
      clearTimeout(slideshowTimer);
      if(ssRafId){cancelAnimationFrame(ssRafId);ssRafId=null;}
    } else {
      // resume: recalculate remaining time based on bar position
      const fill=document.getElementById('ss-fill');
      const pct=fill?parseFloat(fill.style.width)||0:0;
      const remaining=ssDuration*(1-pct/100);
      ssStartTime=Date.now()-ssDuration*(pct/100);
      ssUpdateBar();
      slideshowTimer=setTimeout(()=>{
        const next=()=>{
          if(!slideshowActive) return;
          const idx=ssPool[ssPos%ssPool.length]; ssPos++;
          openLb(idx);
          ssStartTime=Date.now();
          const f=document.getElementById('ss-fill');
          if(f){f.style.transition='none';f.style.width='0%';}
          ssUpdateBar();
          slideshowTimer=setTimeout(next,ssDuration);
        };
        next();
      },remaining);
    }
  });

  // Map
  document.getElementById('map-btn').addEventListener('click',()=>mapView.classList.contains('open')?closeMap():openMap());
  document.getElementById('map-close').addEventListener('click',closeMap);
  mapView.addEventListener('click',e=>{if(e.target===mapView)closeMap();});

  // Zoom
  document.getElementById('zin').addEventListener('click',()=>doZoom(.15));
  document.getElementById('zout').addEventListener('click',()=>doZoom(-.15));
  document.getElementById('zrst').addEventListener('click',()=>resetZoom());
  viewport.addEventListener('wheel',e=>{
    e.preventDefault();
    if(e.ctrlKey||e.metaKey){
      doZoom(e.deltaY<0?.1:-.1,e.clientX,e.clientY);
    } else {
      // Scroll vertically normally, horizontally with shift
      const speed=1.2;
      const dx=e.shiftKey?-e.deltaY*speed:-e.deltaX*speed;
      const dy=e.shiftKey?0:-e.deltaY*speed;
      const b=getBounds();
      canvasX=Math.max(b.minX,Math.min(b.maxX,canvasX+dx));
      canvasY=Math.max(b.minY,Math.min(b.maxY,canvasY+dy));
      gsap.to(canvasWrap,{x:canvasX,y:canvasY,duration:.15,ease:'power1.out',
        onUpdate:()=>{canvasX=gsap.getProperty(canvasWrap,'x');canvasY=gsap.getProperty(canvasWrap,'y');}});
      if(draggableInst) draggableInst.forEach(d=>d.update());
    }
  },{passive:false});

  // Touch swipe in lightbox
  let tsx=0,tsy=0;
  lb.addEventListener('touchstart',e=>{tsx=e.touches[0].clientX;tsy=e.touches[0].clientY},{passive:true});
  lb.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-tsx,dy=e.changedTouches[0].clientY-tsy;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>50) navLb(dx<0?1:-1);
  },{passive:true});

  // Keyboard
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&menuOpen){menuOpen=false;menuPanel.classList.remove('open');menuBtn.classList.remove('open');}
  });

  // Resize
  window.addEventListener('resize',()=>{
    resizeBg();
    if(draggableInst) draggableInst.forEach(d=>d.applyBounds(getBounds()));
  });
  bindNewFeatures();
}

/* ================================================ MOBILE ENHANCEMENTS */
function initMobile(){
  if(!isTouch) return;

  // Suppress pull-to-refresh / rubber-band reload on iOS Safari.
  // iOS treats an overscroll (dragging past the top or bottom of a
  // scrollable area) as a signal to bounce the whole document, which in
  // turn can trigger the browser's pull-to-refresh reload. We track the
  // touch's vertical movement and cancel the gesture only when it would
  // overscroll past the edge of the scrollable viewport, so normal
  // scrolling inside the gallery still works.
  let ptrStartY=0;
  viewport.addEventListener('touchstart',e=>{
    ptrStartY=e.touches[0].clientY;
  },{passive:true});

  viewport.addEventListener('touchmove',e=>{
    if(lb.classList.contains('open')) return;
    const touchY=e.touches[0].clientY;
    const draggingDown=touchY>ptrStartY;
    const scrollTop=viewport.scrollTop;
    const maxScroll=viewport.scrollHeight-viewport.clientHeight;
    const atTop=scrollTop<=0;
    const atBottom=scrollTop>=maxScroll-1;
    if((atTop&&draggingDown)||(atBottom&&!draggingDown)){
      e.preventDefault();
    }
  },{passive:false});

  // Hide the swipe hint after first swipe in lightbox
  let hintDismissed=false;
  lb.addEventListener('touchend',()=>{
    if(!hintDismissed){
      hintDismissed=true;
      const hint=document.getElementById('lb-swipe-hint');
      if(hint) hint.style.display='none';
    }
  },{passive:true,once:false});

  // Double-tap to close lightbox on the media area (not on controls)
  let lastTap=0;
  const lbMediaWrap=document.getElementById('lb-media-wrap');
  if(lbMediaWrap){
    lbMediaWrap.addEventListener('touchend',e=>{
      const now=Date.now();
      if(now-lastTap<300&&e.changedTouches.length===1){
        const t=e.target;
        if(!t.closest('.lb-nav')&&!t.closest('.lb-close')){
          closeLb();
        }
      }
      lastTap=now;
    },{passive:true});
  }

  // Mobile: on resize (orientation change), re-center if grid reflows
  window.addEventListener('orientationchange',()=>{
    setTimeout(()=>{
      // Reset canvas position on orientation change (mobile only)
      canvasX=0; canvasY=0;
      gsap.set(canvasWrap,{x:0,y:0});
    },350);
  });

  // Prevent body scroll when lightbox is open
  const origOpenLb=window.openLb;
  lb.addEventListener('transitionend',()=>{
    if(lb.classList.contains('open')){
      document.body.style.overflow='hidden';
    } else {
      document.body.style.overflow='';
    }
  });
}

/* ================================================ FEATURE: SURPRISE ME */
function surpriseMe(){
  const pool=filteredIndices.length>0?filteredIndices:MEDIA.map((_,i)=>i);
  const idx=pool[Math.floor(Math.random()*pool.length)];
  openLb(idx);
  showToast('🎲 SURPRISE!');
}

/* ================================================ FEATURE: ON THIS MONTH */
function buildOnThisDay(){
  const now=new Date();
  const monthIdx=now.getMonth();
  const abbrs=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const abbr=abbrs[monthIdx];
  const matchingEvents=EVENTS.filter(ev=>ev.date&&ev.date.startsWith(abbr));
  if(matchingEvents.length===0) return null;
  const matchingMedia=MEDIA.map((m,i)=>({m,i})).filter(({m})=>matchingEvents.some(ev=>ev.id===m.e));
  return{matchingEvents,matchingMedia,monthIdx,abbr};
}

function openOTD(){
  const otdView=document.getElementById('otd-view');
  const otdBody=document.getElementById('otd-body');
  const data=buildOnThisDay();
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  if(!data||data.matchingMedia.length===0){
    const now=new Date();
    otdBody.innerHTML=`<div class="otd-empty">No memories tagged for <strong>${months[now.getMonth()]}</strong> yet.<br>The archive grows with time — check back!</div>`;
  } else {
    const monthName=months[data.monthIdx];
    const evNames=data.matchingEvents.map(e=>e.name+' ('+e.date+')').join(' · ');
    otdBody.innerHTML=`
      <div class="otd-header-info">
        <div class="otd-month">${monthName.toUpperCase()}</div>
        <div class="otd-count">${data.matchingMedia.length} MEMORIES FROM THIS MONTH</div>
        <div class="otd-events">${evNames}</div>
      </div>
      <div class="otd-grid" id="otd-grid"></div>
      <button class="otd-filter-btn" id="otd-filter-all">VIEW ALL ${data.matchingMedia.length} IN GALLERY →</button>
    `;
    const otdGrid=document.getElementById('otd-grid');
    const maxItems=window.innerWidth<=768?9:16;
    data.matchingMedia.slice(0,maxItems).forEach(({m,i})=>{
      const card=document.createElement('div'); card.className='otd-card';
      if(m.t==='photo'){
        card.innerHTML=`<img src="${m.src}" alt="${m.title}" loading="lazy"><div class="otd-card-title">${m.title}</div>`;
      } else {
        card.innerHTML=`<div class="otd-card-vid"><svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,.8)"><path d="M8 5v14l11-7z"/></svg></div><div class="otd-card-title">${m.title}</div>`;
      }
      card.addEventListener('click',()=>{closeOTD();openLb(i);});
      otdGrid.appendChild(card);
    });
    document.getElementById('otd-filter-all').addEventListener('click',()=>{
      closeOTD();
      setEvent(data.matchingEvents[0].id);
    });
    gsap.from(otdGrid.children,{opacity:0,y:12,stagger:.03,duration:.4,ease:'power2.out',delay:.1});
  }
  otdView.classList.add('open');
  document.getElementById('otd-btn').classList.add('active');
}

function closeOTD(){
  document.getElementById('otd-view').classList.remove('open');
  document.getElementById('otd-btn').classList.remove('active');
}

/* ================================================ FEATURE: STATS DASHBOARD */
function openStats(){
  buildStats();
  document.getElementById('stats-view').classList.add('open');
  document.getElementById('stats-btn').classList.add('active');
}
function closeStats(){
  document.getElementById('stats-view').classList.remove('open');
  document.getElementById('stats-btn').classList.remove('active');
}
function buildStats(){
  const body=document.getElementById('stats-body');
  const photos=MEDIA.filter(m=>m.t==='photo').length;
  const videos=MEDIA.filter(m=>m.t==='video').length;
  const total=MEDIA.length;
  const photoPct=Math.round(photos/total*100);
  const videoPct=100-photoPct;
  const cousinCounts=COUSINS.map(c=>({
    ...c,
    count:MEDIA.filter(m=>m.c.includes(c.id)).length,
    solo:MEDIA.filter(m=>m.c.length===1&&m.c[0]===c.id).length,
    grouped:MEDIA.filter(m=>m.c.length>1&&m.c.includes(c.id)).length,
  })).sort((a,b)=>b.count-a.count);
  const maxC=cousinCounts[0].count;
  const eventCounts=EVENTS.map(ev=>({
    ...ev,
    count:MEDIA.filter(m=>m.e===ev.id).length,
    photos:MEDIA.filter(m=>m.e===ev.id&&m.t==='photo').length,
    videos:MEDIA.filter(m=>m.e===ev.id&&m.t==='video').length,
  })).sort((a,b)=>b.count-a.count);
  const maxE=eventCounts[0].count;
  const biggestGroup=MEDIA.reduce((best,m)=>m.c.length>(best?.c.length||0)?m:best,null);
  const soloKing=cousinCounts.reduce((best,c)=>c.solo>best.solo?c:best);
  const mostGrouped=cousinCounts[0];
  const avgGroup=(MEDIA.reduce((s,m)=>s+m.c.length,0)/total).toFixed(1);

  body.innerHTML=`
    <div class="stats-grid">
      <div class="stats-card stats-card-wide">
        <div class="stats-card-title">THE ARCHIVE</div>
        <div class="stats-totals">
          <div class="stats-total-item"><div class="stats-big-num">${total}</div><div class="stats-big-lbl">TOTAL</div></div>
          <div class="stats-total-item"><div class="stats-big-num">${photos}</div><div class="stats-big-lbl">PHOTOS</div></div>
          <div class="stats-total-item"><div class="stats-big-num">${videos}</div><div class="stats-big-lbl">VIDEOS</div></div>
          <div class="stats-total-item"><div class="stats-big-num">${EVENTS.length}</div><div class="stats-big-lbl">EVENTS</div></div>
        </div>
        <div class="stats-split-bar">
          <div class="stats-split-photo" id="sbar-photo" style="width:0%"></div>
          <div class="stats-split-video" id="sbar-video" style="width:0%"></div>
        </div>
        <div class="stats-split-legend">
          <span class="stats-split-dot stats-split-dot-photo"></span><span>${photoPct}% Photos</span>
          <span class="stats-split-dot stats-split-dot-video"></span><span>${videoPct}% Videos</span>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-title">BY COUSIN · appearances in archive</div>
        <div class="stats-bars">
          ${cousinCounts.map(c=>`
            <div class="stats-bar-row">
              <div class="stats-bar-name">${c.name}</div>
              <div class="stats-bar-track"><div class="stats-bar-fill" data-pct="${Math.round(c.count/maxC*100)}%" style="width:0%"></div></div>
              <div class="stats-bar-val">${c.count}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-title">BY EVENT · memory count</div>
        <div class="stats-bars">
          ${eventCounts.map(ev=>`
            <div class="stats-bar-row">
              <div class="stats-bar-name">${ev.name.replace('Nashville TN ','Nash ').replace('Atlanta GA ','ATL ').replace('Reunion','Reunion')}</div>
              <div class="stats-bar-track"><div class="stats-bar-fill" data-pct="${Math.round(ev.count/maxE*100)}%" style="width:0%"></div></div>
              <div class="stats-bar-val">${ev.count}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-title">FUN FACTS</div>
        <div class="stats-fun">
          <div><div class="stats-fun-lbl">MOST IN FRAME</div><div class="stats-fun-val">${mostGrouped.name} — ${mostGrouped.count} memories</div></div>
          <div><div class="stats-fun-lbl">SOLO QUEEN/KING</div><div class="stats-fun-val">${soloKing.name} — ${soloKing.solo} solo shots</div></div>
          <div><div class="stats-fun-lbl">BIGGEST SQUAD SHOT</div><div class="stats-fun-val">${biggestGroup?.title||'—'} (${biggestGroup?.c.length||0} people)</div></div>
          <div><div class="stats-fun-lbl">AVG COUSINS / MEMORY</div><div class="stats-fun-val">${avgGroup} cousins</div></div>
        </div>
        <div class="stats-cousin-solos">
          ${cousinCounts.map(c=>`<div class="stats-solo-row"><span class="stats-solo-name">${c.name}</span><span class="stats-solo-val">${c.solo} solos · ${c.grouped} group</span></div>`).join('')}
        </div>
      </div>
    </div>
  `;
  setTimeout(()=>{
    const sp=document.getElementById('sbar-photo');
    const sv=document.getElementById('sbar-video');
    if(sp) sp.style.width=photoPct+'%';
    if(sv) sv.style.width=videoPct+'%';
    body.querySelectorAll('.stats-bar-fill').forEach(el=>{el.style.width=el.dataset.pct;});
  },280);
}

/* ================================================ FEATURE: SHARE CARD GENERATOR */
function generateShareCard(mediaIdx){
  const m=MEDIA[mediaIdx];
  if(!m){showToast('No memory selected');return;}
  if(m.t!=='photo'){showToast('Share cards work with photos only 📸');return;}
  const ev=EVENTS.find(e=>e.id===m.e);
  const cousinsStr=m.c.map(id=>COUSINS.find(c=>c.id===id)?.name||id).join(', ');
  const W=800,H=1020;
  const canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');

  const draw=(imgEl)=>{
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#ffffff';
    ctx.shadowColor='rgba(0,0,0,0.22)';
    ctx.shadowBlur=40;
    ctx.shadowOffsetY=12;
    ctx.fillRect(36,30,W-72,H-60);
    ctx.shadowColor='transparent';

    const photoX=56,photoY=56,photoW=W-112,photoH=660;
    if(imgEl){
      ctx.save();
      ctx.beginPath();
      ctx.rect(photoX,photoY,photoW,photoH);
      ctx.clip();
      ctx.drawImage(imgEl,photoX,photoY,photoW,photoH);
      ctx.restore();
    } else {
      ctx.fillStyle='#e8e8e8';
      ctx.fillRect(photoX,photoY,photoW,photoH);
      ctx.fillStyle='#aaaaaa';
      ctx.font='18px monospace';
      ctx.textAlign='center';
      ctx.fillText(m.title,W/2,photoY+photoH/2);
    }

    ctx.textAlign='center';
    ctx.fillStyle='#111111';
    ctx.font='bold 52px Georgia, serif';
    ctx.fillText(m.title,W/2,56+photoH+72);

    ctx.fillStyle='#555555';
    ctx.font='20px monospace';
    ctx.fillText((ev?.name||m.e)+(ev?.date?' · '+ev.date:''),W/2,56+photoH+110);

    if(cousinsStr&&cousinsStr!==''){
      ctx.fillStyle='#888888';
      ctx.font='16px monospace';
      ctx.fillText('with '+cousinsStr,W/2,56+photoH+142);
    }

    ctx.fillStyle='#cccccc';
    ctx.font='13px monospace';
    ctx.letterSpacing='0.15em';
    ctx.fillText('THE COUSINS | memories',W/2,H-32);

    try{
      const dataUrl=canvas.toDataURL('image/png');
      const a=document.createElement('a');
      a.href=dataUrl;
      a.download='memory-'+m.src.replace(/\.[^.]+$/,'')+'.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Share card saved! 🎉');
    }catch(e){showToast('Export failed — try a different browser');}
  };

  const img=new Image();
  img.onload=()=>draw(img);
  img.onerror=()=>draw(null);
  img.src=m.src;
}

/* ================================================ FEATURE: COMPARE / DUETS */
let compareMode=false;
let compareSelected=[];

function toggleCompareMode(){
  compareMode=!compareMode;
  const btn=document.getElementById('compare-btn');
  const hint=document.getElementById('compare-hint');
  btn.classList.toggle('active',compareMode);
  compareSelected=[];
  gridItems.forEach(it=>it.el.classList.remove('compare-sel'));
  updateCompareBadge();
  if(compareMode){
    hint.style.display='flex';
    showToast('Pick 2 photos to compare side by side');
  } else {
    hint.style.display='none';
  }
}

function selectForCompare_byMediaIdx(mediaIdx){
  const m=MEDIA[mediaIdx];
  if(!m){return;}
  if(m.t!=='photo'){showToast('Compare only works with photos 📸');return;}
  const gi=gridItems.find(it=>it.i===mediaIdx);
  if(!gi) return;
  const pos=compareSelected.indexOf(mediaIdx);
  if(pos>-1){
    compareSelected.splice(pos,1);
    gi.el.classList.remove('compare-sel');
  } else if(compareSelected.length<2){
    compareSelected.push(mediaIdx);
    gi.el.classList.add('compare-sel');
  } else {
    showToast('Already have 2 selected — deselect one first');
  }
  updateCompareBadge();
  if(compareSelected.length===2) setTimeout(openCompare,200);
}

function updateCompareBadge(){
  const badge=document.getElementById('compare-badge');
  if(!badge) return;
  badge.textContent=compareSelected.length+'/2';
  badge.style.display=compareSelected.length>0?'inline':'none';
}

function openCompare(){
  if(compareSelected.length!==2) return;
  const [ia,ib]=compareSelected;
  const ma=MEDIA[ia],mb=MEDIA[ib];
  const eva=EVENTS.find(e=>e.id===ma.e),evb=EVENTS.find(e=>e.id===mb.e);
  const cousinsA=ma.c.map(id=>COUSINS.find(c=>c.id===id)?.name||id).join(', ');
  const cousinsB=mb.c.map(id=>COUSINS.find(c=>c.id===id)?.name||id).join(', ');
  document.getElementById('cmp-left-img').src=ma.src;
  document.getElementById('cmp-right-img').src=mb.src;
  document.getElementById('cmp-left-num').textContent='#'+String(ia+1).padStart(3,'0');
  document.getElementById('cmp-right-num').textContent='#'+String(ib+1).padStart(3,'0');
  document.getElementById('cmp-left-title').textContent=ma.title;
  document.getElementById('cmp-right-title').textContent=mb.title;
  document.getElementById('cmp-left-meta').textContent=(eva?.name||ma.e)+(eva?.date?' · '+eva.date:'');
  document.getElementById('cmp-right-meta').textContent=(evb?.name||mb.e)+(evb?.date?' · '+evb.date:'');
  document.getElementById('cmp-left-cousins').textContent='with '+cousinsA;
  document.getElementById('cmp-right-cousins').textContent='with '+cousinsB;
  document.getElementById('cmp-view').classList.add('open');
  compareMode=false;
  document.getElementById('compare-btn').classList.remove('active');
  document.getElementById('compare-hint').style.display='none';
  compareSelected=[];
  gridItems.forEach(it=>it.el.classList.remove('compare-sel'));
  updateCompareBadge();
}

function closeCompare(){
  document.getElementById('cmp-view').classList.remove('open');
}

/* ================================================ FEATURE: WHAT'S NEW */
const WN_KEY='cousins-update-v2';
function showWhatsNew(){
  const view=document.getElementById('whatsnew-view');
  if(!view) return;
  const dateEl=document.getElementById('wn-date');
  if(dateEl){
    const now=new Date();
    dateEl.textContent=now.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}).toUpperCase();
  }
  const dismiss=()=>{
    view.classList.remove('open');
    /* always show on next open */
  };
  document.getElementById('wn-got-it').addEventListener('click',dismiss);
  document.getElementById('wn-close').addEventListener('click',dismiss);
  view.addEventListener('click',e=>{if(e.target===view)dismiss();});
  setTimeout(()=>view.classList.add('open'),800);
}

/* ================================================ BIND NEW FEATURES */
function bindNewFeatures(){
  showWhatsNew();
  bindAllNewFeatures();
  document.getElementById('surprise-btn').addEventListener('click',surpriseMe);

  const otdBtn=document.getElementById('otd-btn');
  const otdView=document.getElementById('otd-view');
  otdBtn.addEventListener('click',()=>otdView.classList.contains('open')?closeOTD():openOTD());
  document.getElementById('otd-close').addEventListener('click',closeOTD);
  otdView.addEventListener('click',e=>{if(e.target===otdView)closeOTD();});

  const statsBtn=document.getElementById('stats-btn');
  const statsView=document.getElementById('stats-view');
  statsBtn.addEventListener('click',()=>statsView.classList.contains('open')?closeStats():openStats());
  document.getElementById('stats-close').addEventListener('click',closeStats);
  statsView.addEventListener('click',e=>{if(e.target===statsView)closeStats();});

  document.getElementById('compare-btn').addEventListener('click',toggleCompareMode);
  document.getElementById('cmp-close').addEventListener('click',closeCompare);
  document.getElementById('cmp-view').addEventListener('click',e=>{if(e.target===document.getElementById('cmp-view'))closeCompare();});

  document.getElementById('lb-share-btn').addEventListener('click',()=>{
    if(lbIndex>=0) generateShareCard(lbIndex);
    else showToast('Open a memory first');
  });

  document.getElementById('lb-cmp-btn').addEventListener('click',()=>{
    const idx=lbIndex;
    if(idx<0){showToast('Open a memory first');return;}
    const m=MEDIA[idx];
    if(m.t!=='photo'){showToast('Compare only works with photos 📸');return;}
    closeLb();
    compareMode=true;
    document.getElementById('compare-btn').classList.add('active');
    compareSelected=[idx];
    const gi=gridItems.find(it=>it.i===idx);
    if(gi) gi.el.classList.add('compare-sel');
    document.getElementById('compare-hint').style.display='flex';
    updateCompareBadge();
    showToast('Now pick a second photo to compare!');
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(document.getElementById('otd-view').classList.contains('open')) closeOTD();
      if(document.getElementById('stats-view').classList.contains('open')) closeStats();
      if(document.getElementById('cmp-view').classList.contains('open')) closeCompare();
      if(compareMode) toggleCompareMode();
    }
  });

  const otdData=buildOnThisDay();
  if(otdData&&otdData.matchingMedia.length>0){
    setTimeout(()=>openOTD(),2400);
  }
}




let themeOnClick = JSON.parse(localStorage.getItem('cg-theme-on-click') ?? 'true');

/* ================================================ FEATURE: RELATED MEMORIES */
function populateRelated(idx) {
  const relatedEl = document.getElementById('lb-related');
  const strip = document.getElementById('lb-related-strip');
  if (!relatedEl || !strip) return;
  const m = MEDIA[idx];
  if (!m) { relatedEl.style.display = 'none'; return; }

  // Find related by shared cousins — all matches, then pick 3 at random
  const allRelated = MEDIA.map((x, i) => ({ x, i, shared: m.c.filter(c => x.c.includes(c)).length }))
    .filter(({ i, shared }) => i !== idx && shared > 0);
  // Shuffle and pick 3
  for(let j=allRelated.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[allRelated[j],allRelated[k]]=[allRelated[k],allRelated[j]];}
  const related = allRelated.slice(0, 3);

  if (related.length === 0) { relatedEl.style.display = 'none'; return; }
  strip.innerHTML = '';
  related.forEach(({ x, i }) => {
    const thumb = document.createElement('div');
    thumb.className = 'lb-related-thumb';
    if (x.t === 'photo') {
      const img = document.createElement('img');
      img.src = x.src; img.alt = x.title; img.loading = 'lazy';
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = '<div class="lb-rt-vid"><svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,.8)"><path d="M8 5v14l11-7z"/></svg></div>';
    }
    thumb.addEventListener('click', () => { populateLb(i); lbIndex = i; });
    thumb.title = x.title;
    strip.appendChild(thumb);
  });
  relatedEl.style.display = 'block';
}

// Patch populateLb to also populate related memories
const _origPopulateLb = populateLb;
populateLb = function(idx) {
  _origPopulateLb(idx);
  setTimeout(() => populateRelated(idx), 50);
}

/* ================================================ FEATURE: FUZZY SEARCH AUTOCOMPLETE */
function fuzzyMatch(query, text) {
  query = query.toLowerCase(); text = text.toLowerCase();
  if (text.includes(query)) return true;
  let qi = 0;
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) qi++;
  }
  return qi === query.length;
}

/* ================================================ FEATURE: THIS MONTH */
function filterThisMonth() {
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();
  // Find events whose dates fall in this month/year
  const matchingEvs = EVENTS.filter(ev => {
    if (!ev.date) return false;
    const d = new Date(ev.date);
    return !isNaN(d) && d.getMonth()===m && d.getFullYear()===y;
  });
  if (matchingEvs.length === 0) {
    showToast('📅 No memories this month yet!');
    return;
  }
  // Filter grid to matching events
  gridItems.forEach(it => {
    const show = matchingEvs.some(ev => ev.id === it.m.e);
    it.el.style.display = show ? '' : 'none';
  });
  filteredIndices = gridItems.filter(it=>it.el.style.display!=='none').map(it=>it.i);
  const vis = filteredIndices.length;
  fcount.textContent = vis + ' / ' + MEDIA.length + ' MEMORIES';
  const visItems = gridItems.filter(it=>it.el.style.display!=='none');
  reflowGrid(visItems, true);
  showToast('📅 Showing '+now.toLocaleString('default',{month:'long'})+' memories');
}

/* ================================================ FEATURE: SUPS (Surprise Random) */
function openSups() {
  // "Sups" — open a random memory straight away
  if (!MEDIA.length) return;
  const pool = filteredIndices.length ? filteredIndices : MEDIA.map((_,i)=>i);
  const idx = pool[Math.floor(Math.random()*pool.length)];
  openLb(idx);
  showToast('⚡ Sups! Check this one');
}

function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const clearBtn = document.getElementById('search-clear');
  if (!input || !results) return;
  // escape menu-panel's overflow:hidden + backdrop-filter (which creates a
  // containing block for fixed elements) — otherwise dropdown gets clipped
  document.body.appendChild(results);
  let activeIdx = -1;

  function positionResults() {
    const wrap = document.getElementById('search-wrap');
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    results.style.left = r.left + 'px';
    results.style.width = r.width + 'px';
    results.style.top = (r.bottom + 6) + 'px';
  }

  function closeResults() {
    results.style.display = 'none';
    activeIdx = -1;
  }

  function runSearch() {
    positionResults();
    const q = input.value.trim();
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
    if (q.length < 1) { closeResults(); return; }
    activeIdx = -1;
    results.innerHTML = '';

    const cousins = [], events = [], memories = [];
    COUSINS.forEach(c => { if (fuzzyMatch(q, c.name)) cousins.push({ label: c.name, sub: MEDIA.filter(m=>m.c.includes(c.id)).length+' memories', type: 'cousin', icon: '👤', action: () => { toggleCousin(null); setTimeout(() => toggleCousin(c.id), 50); } }); });
    EVENTS.forEach(ev => { if (fuzzyMatch(q, ev.name)) events.push({ label: ev.name, sub: ev.date||'', type: 'event', icon: '🗓', action: () => setEvent(ev.id) }); });
    let mc = 0;
    MEDIA.forEach((m, i) => { if (mc < 5 && fuzzyMatch(q, m.title)) { const ev=EVENTS.find(e=>e.id===m.e); memories.push({ label: m.title, sub: ev?.name||'', type: 'memory', icon: m.t==='video'?'🎬':'📸', action: () => openLb(i) }); mc++; } });

    const allMatches = [];
    const addGroup = (arr, label) => {
      if (!arr.length) return;
      const lbl = document.createElement('span');
      lbl.className = 'sri-group-label'; lbl.textContent = label;
      results.appendChild(lbl);
      arr.forEach(match => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.dataset.type = match.type;
        item.innerHTML = `<div class="sri-icon ${match.type}">${match.icon}</div><div style="flex:1;min-width:0"><div class="sri-label">${match.label}</div>${match.sub?`<div class="sri-sub">${match.sub}</div>`:''}</div><span class="sri-badge ${match.type}">${match.type.toUpperCase()}</span>`;
        item.addEventListener('click', () => {
          match.action();
          input.value = ''; closeResults();
          if (clearBtn) clearBtn.style.display = 'none';
          if (menuOpen) { menuBtn.click(); }
        });
        results.appendChild(item);
        allMatches.push(item);
      });
    };
    addGroup(cousins, 'Cousins');
    addGroup(events, 'Events');
    addGroup(memories, 'Memories');

    if (!allMatches.length) {
      results.innerHTML = `<div class="search-no-results">No results for "${q}"</div>`;
    }
    results.style.display = 'block';
  }

  input.addEventListener('input', runSearch);

  // Keyboard navigation
  input.addEventListener('keydown', e => {
    const items = results.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx+1, items.length-1); items.forEach((it,i)=>it.classList.toggle('active',i===activeIdx)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx-1, 0); items.forEach((it,i)=>it.classList.toggle('active',i===activeIdx)); }
    else if (e.key === 'Enter') { if (activeIdx >= 0 && items[activeIdx]) items[activeIdx].click(); }
    else if (e.key === 'Escape') { closeResults(); input.blur(); }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = ''; closeResults(); clearBtn.style.display = 'none'; input.focus();
    });
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('#search-wrap') && !e.target.closest('#search-results')) closeResults();
  });

  window.addEventListener('resize', () => { if (results.style.display !== 'none') positionResults(); });
  window.addEventListener('scroll', () => { if (results.style.display !== 'none') positionResults(); }, true);
}

/* ================================================ FEATURE: REFLOW + SHUFFLE */
function reflowGrid(items, animate) {
  if (isMobile()) return;
  items.forEach((it, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const newX = col * (ITEM_W + GAP);
    const newY = row * (ITEM_H + GAP);
    const curGsapX = parseFloat(gsap.getProperty(it.el, 'x')) || 0;
    const curGsapY = parseFloat(gsap.getProperty(it.el, 'y')) || 0;
    const fromX = (it.x + curGsapX) - newX;
    const fromY = (it.y + curGsapY) - newY;
    it.x = newX; it.y = newY;
    it.el.style.left = newX + 'px'; it.el.style.top = newY + 'px';
    if (animate) {
      gsap.fromTo(it.el, {x: fromX, y: fromY}, {x: 0, y: 0, duration: 0.5, ease: 'power3.out', delay: idx * 0.008});
    } else {
      gsap.set(it.el, {x: 0, y: 0});
    }
  });
  if (!items.length) return;
  const rows = Math.ceil(items.length / COLS);
  const totalH = rows * (ITEM_H + GAP) - GAP;
  const totalW = COLS * (ITEM_W + GAP) - GAP;
  grid.style.height = totalH + 'px';
  grid.style.width = totalW + 'px';
  canvasWrap.style.width = totalW + 'px'; canvasWrap.style.height = totalH + 'px';
  if (draggableInst) {
    // Update immediately then again after animations settle
    draggableInst.forEach(d => { try { d.update(); d.applyBounds(getBounds()); } catch(_) {} });
    setTimeout(() => {
      if (draggableInst) draggableInst.forEach(d => { try { d.update(); d.applyBounds(getBounds()); } catch(_) {} });
    }, 600);
  }
}

function chaosShuffle() {
  const btn = document.getElementById('shuffle-btn');
  if (btn) { btn.classList.add('spinning'); setTimeout(() => btn.classList.remove('spinning'), 500); }
  const visible = [...gridItems].filter(it => it.el.style.display !== 'none');
  visible.sort(() => Math.random() - 0.5);
  filteredIndices = visible.map(it => it.i);
  reflowGrid(visible, true);
  showToast('🔀 SHUFFLED');
}

// Keyboard shortcut: Spacebar triggers chaos shuffle when not in a modal
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !lb.classList.contains('open') &&
      !document.getElementById('speedtag-view')?.classList.contains('open') &&
      document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    chaosShuffle();
  }
});

/* ================================================ FEATURE: LONG-PRESS PREVIEW */
function initLongPress() {
  if (!isTouch) {
    // Desktop: long-press is less needed; bind on touch devices only
    return;
  }
  let pressTimer = null;
  const preview = document.getElementById('lp-preview');
  const lpImg = document.getElementById('lp-img');
  const lpTitle = document.getElementById('lp-title');

  document.addEventListener('touchstart', e => {
    const gitem = e.target.closest('.gitem');
    if (!gitem) return;
    const idx = gridItems.findIndex(it => it.el === gitem);
    if (idx < 0) return;
    const m = MEDIA[gridItems[idx].i];
    if (!m || m.t !== 'photo') return;
    pressTimer = setTimeout(() => {
      lpImg.src = m.src;
      lpTitle.textContent = m.title;
      preview.classList.add('show');
    }, 500);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  }, { passive: true });

  document.addEventListener('touchmove', () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  }, { passive: true });

  preview.addEventListener('click', e => {
    preview.classList.remove('show');
  });
}

/* ================================================ FEATURE: SPEED-TAG GAME */
let stScore = 0, stTimer = null, stTimeLeft = 10, stAnswered = false, stMaxTime = 10;
const stPhotoPool = MEDIA.filter(m => m.t === 'photo' && m.c.length >= 1);

function openSpeedTag() {
  stScore = 0;
  document.getElementById('st-score').textContent = '0';
  document.getElementById('speedtag-view').classList.add('open');
  loadNextSTRound();
}
function closeSpeedTag() {
  clearInterval(stTimer);
  document.getElementById('speedtag-view').classList.remove('open');
}

function loadNextSTRound() {
  const nextBtn = document.getElementById('st-next-btn');
  const resultMsg = document.getElementById('st-result-msg');
  if (nextBtn) { nextBtn.disabled = true; }
  if (resultMsg) { resultMsg.textContent = ''; resultMsg.style.color = ''; }
  stAnswered = false;

  // Pick random photo
  const photo = stPhotoPool[Math.floor(Math.random() * stPhotoPool.length)];
  const correctCousin = photo.c[Math.floor(Math.random() * photo.c.length)];

  // Set photo blurred
  const img = document.getElementById('st-img');
  if (img) { img.src = photo.src; img.className = ''; }

  // Clue: event name
  const ev = EVENTS.find(e => e.id === photo.e);
  const clue = document.getElementById('st-clue');
  if (clue) clue.textContent = '📍 ' + (ev ? ev.name : photo.e);

  // Build choices: correct + up to 2 wrong
  const wrong = COUSINS.filter(c => !photo.c.includes(c.id)).sort(() => Math.random() - 0.5).slice(0, 2);
  const choices = [
    ...COUSINS.filter(c => c.id === correctCousin),
    ...wrong
  ].sort(() => Math.random() - 0.5);

  const choicesEl = document.getElementById('st-choices');
  if (choicesEl) {
    choicesEl.innerHTML = '';
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'st-choice';
      btn.textContent = c.name;
      btn.addEventListener('click', () => {
        if (stAnswered) return;
        stAnswered = true;
        clearInterval(stTimer);
        const correct = c.id === correctCousin;
        btn.classList.add(correct ? 'correct' : 'wrong');
        // Mark correct answer
        choicesEl.querySelectorAll('.st-choice').forEach(b => {
          b.disabled = true;
          if (b.textContent === COUSINS.find(cx => cx.id === correctCousin)?.name) b.classList.add('correct');
        });
        if (correct) {
          stScore += Math.ceil(stTimeLeft);
          document.getElementById('st-score').textContent = stScore;
          if (resultMsg) { resultMsg.textContent = '✓ Correct! +' + Math.ceil(stTimeLeft) + ' pts'; resultMsg.style.color = '#4caf50'; }
        } else {
          if (resultMsg) { resultMsg.textContent = '✗ Thats ' + COUSINS.find(cx => cx.id === correctCousin)?.name; resultMsg.style.color = '#e53935'; }
        }
        // Reveal photo
        if (img) img.classList.add('reveal');
        if (nextBtn) nextBtn.disabled = false;
      });
      choicesEl.appendChild(btn);
    });
  }

  // Start timer
  stTimeLeft = stMaxTime;
  updateSTTimer();
  stTimer = setInterval(() => {
    stTimeLeft -= 0.1;
    updateSTTimer();
    if (stTimeLeft <= 0) {
      clearInterval(stTimer);
      if (!stAnswered) {
        stAnswered = true;
        if (choicesEl) choicesEl.querySelectorAll('.st-choice').forEach(b => { b.disabled = true; if (b.textContent === COUSINS.find(cx => cx.id === correctCousin)?.name) b.classList.add('correct'); });
        if (img) img.classList.add('reveal');
        if (resultMsg) { resultMsg.textContent = 'Time up! That was ' + COUSINS.find(cx => cx.id === correctCousin)?.name; resultMsg.style.color = '#e53935'; }
        if (nextBtn) nextBtn.disabled = false;
      }
    }
  }, 100);
}

function updateSTTimer() {
  const num = document.getElementById('st-timer-num');
  const prog = document.getElementById('st-prog');
  const pct = Math.max(0, stTimeLeft / stMaxTime);
  if (num) num.textContent = Math.ceil(stTimeLeft);
  if (prog) {
    prog.style.strokeDashoffset = 125.6 * (1 - pct);
    prog.style.stroke = pct > 0.5 ? 'var(--accent)' : pct > 0.25 ? '#ffa726' : '#e53935';
  }
}

/* ================================================ FEATURE: COUSIN SUPERLATIVES */
function buildSuperlatives() {
  const grid = document.getElementById('sups-grid');
  if (!grid) return;

  const cousinCounts = COUSINS.map(c => ({
    ...c,
    count: MEDIA.filter(m => m.c.includes(c.id)).length,
    solo: MEDIA.filter(m => m.c.length === 1 && m.c[0] === c.id).length,
    grouped: MEDIA.filter(m => m.c.length > 1 && m.c.includes(c.id)).length,
    photos: MEDIA.filter(m => m.t === 'photo' && m.c.includes(c.id)).length,
    videos: MEDIA.filter(m => m.t === 'video' && m.c.includes(c.id)).length,
  }));

  const mostPhotos = [...cousinCounts].sort((a,b) => b.photos - a.photos)[0];
  const mostVideos = [...cousinCounts].sort((a,b) => b.videos - a.videos)[0];
  const soloKing = [...cousinCounts].sort((a,b) => b.solo - a.solo)[0];
  const groupLover = [...cousinCounts].sort((a,b) => b.grouped - a.grouped)[0];
  const mostOverall = [...cousinCounts].sort((a,b) => b.count - a.count)[0];
  const leastPhotos = [...cousinCounts].sort((a,b) => a.count - b.count)[0];

  // Multi-cousin appearances
  const biggestGroup = MEDIA.reduce((best, m) => m.c.length > (best?.c.length || 0) ? m : best, null);
  const bgCousins = biggestGroup?.c.map(id => COUSINS.find(c => c.id === id)?.name || id).join(', ') || '—';

  const sups = [
    { emoji: '📸', title: 'Most Snapped', name: mostOverall.name, reason: mostOverall.count + ' memories · undeniable main character energy' },
    { emoji: '🤳', title: 'Solo Queen/King', name: soloKing.name, reason: soloKing.solo + ' solo shots · camera magnet, no backup needed' },
    { emoji: '👥', title: 'Squad MVP', name: groupLover.name, reason: groupLover.grouped + ' group appearances · never misses a collab' },
    { emoji: '🎬', title: 'Video Star', name: mostVideos.name, reason: mostVideos.videos + ' video moments · born for the lens' },
    { emoji: '🏆', title: 'Photo Legend', name: mostPhotos.name, reason: mostPhotos.photos + ' photos · model behavior every time' },
    { emoji: '🫥', title: 'Mystery Cousin', name: leastPhotos.name, reason: leastPhotos.count + ' memories · rare sighting, mythical status' },
    { emoji: '🎭', title: 'Biggest Squad', name: bgCousins, reason: 'Most cousins in a single frame · ' + (biggestGroup?.title || '—') },
    { emoji: '⚡', title: 'Chaos Agent', name: (() => { const c = cousinCounts.find(x => x.id === 'nabiha') || cousinCounts[2]; return c.name; })(), reason: 'Consistently found at the center of the action' },
    { emoji: '🌟', title: 'Aura On Max', name: (() => { const c = cousinCounts.find(x => x.id === 'hassaan') || cousinCounts[4]; return c.name; })(), reason: 'Jummah blessed, aura unmatched, vibes immaculate' },
    { emoji: '📱', title: 'Content Creator', name: (() => { const c = cousinCounts.find(x => x.id === 'maryam') || cousinCounts[3]; return c.name; })(), reason: 'TikTok era unlocked · seventeen selfies and counting' },
    { emoji: '🛋️', title: 'Most Relaxed', name: (() => { const c = cousinCounts.find(x => x.id === 'talha') || cousinCounts[1]; return c.name; })(), reason: 'Documented sleeping, sitting, and chilling · unbothered king' },
    { emoji: '🚀', title: 'Future Legend', name: (() => { const c = cousinCounts.find(x => x.id === 'zubair') || cousinCounts[5]; return c.name; })(), reason: 'Every appearance is an event · rare but iconic' },
  ];

  grid.innerHTML = '';
  sups.forEach(s => {
    const card = document.createElement('div');
    card.className = 'sup-card';
    card.innerHTML = '<div class="sup-emoji">' + s.emoji + '</div><div class="sup-title">' + s.title + '</div><div class="sup-name">' + s.name + '</div><div class="sup-reason">' + s.reason + '</div>';
    grid.appendChild(card);
  });
}

function openSups() {
  buildSuperlatives();
  document.getElementById('sups-view').classList.add('open');
}
function closeSups() {
  document.getElementById('sups-view').classList.remove('open');
}

/* ================================================ FEATURE: BIRTHDAY/COUNTDOWN WIDGET */
function initCountdown() {
  // Next planned event (hardcoded based on known events; extend as needed)
  const nextEvents = [
    { name: 'Atlanta Summer 2026', date: new Date('2026-07-19') },
    { name: 'NY / NJ September 2026 Wedding', date: new Date('2026-09-27') },
    { name: 'Hassaan Birthday', date: new Date('2026-10-28') },
    { name: 'Zubair Birthday', date: new Date('2026-11-10') },
    { name: 'Nabiha Birthday', date: new Date('2026-12-7') },
  ];
  const now = new Date();
  const upcoming = nextEvents.filter(e => e.date > now).sort((a,b) => a.date - b.date)[0];
  if (!upcoming) return;

  const widget = document.getElementById('countdown-widget');
  const evName = document.getElementById('cd-event-name');
  const nums = document.getElementById('cd-nums');
  if (!widget || !evName || !nums) return;

  evName.textContent = upcoming.name;
  widget.classList.add('show');

  function tick() {
    const diff = upcoming.date - new Date();
    if (diff <= 0) { widget.style.display='none'; return; }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    nums.innerHTML = [
      { n: days, l: 'DAYS' }, { n: hours, l: 'HRS' }, { n: mins, l: 'MIN' }
    ].map(u => '<div class="cd-unit"><div class="cd-num">' + u.n + '</div><div class="cd-unit-lbl">' + u.l + '</div></div>').join('');
  }
  tick();
  setInterval(tick, 60000);

  document.getElementById('cd-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    widget.classList.add('cd-minimized');
  });
  widget.addEventListener('click', () => {
    if (widget.classList.contains('cd-minimized')) {
      widget.classList.remove('cd-minimized');
    }
  });
}

/* ================================================ FEATURE: SPOTIFY MIXTAPE WIDGET */
const SPOTIFY_PLAYLIST_URI = 'spotify:playlist:2XQK6Z5sIv9Y78VeMCxwJu';
let spotifyController = null;

function initSpotifyWidget() {
  // Lives inside the menu panel now (moved off the fixed floating widget),
  // so there's no minimize/pill state to manage — it just shows/plays
  // whenever the menu is open.
  const widget = document.getElementById('spotify-widget');
  const playerWrap = document.getElementById('sp-player-wrap');
  const dot = document.getElementById('sp-dot');
  if (!widget || !playerWrap) return;

  function boot(IFrameAPI) {
    const options = {
      uri: SPOTIFY_PLAYLIST_URI,
      width: '100%',
      height: 152,
    };
    IFrameAPI.createController(playerWrap, options, (controller) => {
      spotifyController = controller;
      controller.addListener('playback_update', (e) => {
        const d = e && e.data;
        if (!d) return;
        widget.classList.toggle('sp-playing', !d.isPaused);
        if (dot) dot.style.animationPlayState = d.isPaused ? 'paused' : 'running';
      });
      controller.addListener('ready', () => {
        widget.classList.add('sp-ready');
      });
    });
  }

  if (window.SpotifyIframeApi) {
    boot(window.SpotifyIframeApi);
  } else {
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      window.SpotifyIframeApi = IFrameAPI;
      boot(IFrameAPI);
    };
  }
}

/* ================================================ THEME-ON-CLICK TOGGLE */
function toggleThemeOnClick() {
  themeOnClick = !themeOnClick;
  localStorage.setItem('cg-theme-on-click', JSON.stringify(themeOnClick));
  const btn = document.getElementById('theme-click-btn');
  if (btn) btn.classList.toggle('active', themeOnClick);
  showToast(themeOnClick ? '🎨 Theme-on-click ON' : '🎨 Theme-on-click OFF');
}

/* ================================================ FEATURE: FAVORITES */
function toggleFavorite(mediaIdx){
  const m=MEDIA[mediaIdx]; if(!m) return;
  if(favorites.has(m.src)){
    favorites.delete(m.src);
    showToast('Removed from favorites');
  } else {
    favorites.add(m.src);
    showToast('❤ Added to favorites');
  }
  localStorage.setItem('cg-favorites',JSON.stringify([...favorites]));
  updateLbFavIcon(mediaIdx);
  if(onlyFavorites) applyFilters();
}
function updateLbFavIcon(mediaIdx){
  const btn=document.getElementById('lb-fav-btn');
  const m=MEDIA[mediaIdx];
  if(!btn||!m) return;
  btn.classList.toggle('active',favorites.has(m.src));
}
function toggleFavoritesFilter(){
  onlyFavorites=!onlyFavorites;
  const btn=document.querySelector('.mlink[data-id="__favorites__"]');
  if(btn) btn.classList.toggle('active',onlyFavorites);
  applyFilters(); centerGrid();
  showToast(onlyFavorites?'❤ Showing favorites only':'Showing everything again');
}

/* ================================================ FEATURE: YEARBOOK / POSTER MAKER */
let ybSource='favorites', ybLayout=16, ybPicks=[];

function ybGetPool(){
  let pool;
  if(ybSource==='favorites') pool=MEDIA.map((m,i)=>i).filter(i=>favorites.has(MEDIA[i].src));
  else if(ybSource==='filtered') pool=filteredIndices.length?[...filteredIndices]:MEDIA.map((_,i)=>i);
  else pool=MEDIA.map((_,i)=>i);
  return pool.filter(i=>MEDIA[i].t==='photo');
}

function openYearbook(){
  ybSource = favorites.size>=4 ? 'favorites' : (filteredIndices.length && filteredIndices.length<MEDIA.length ? 'filtered' : 'all');
  document.getElementById('yearbook-view').classList.add('open');
  ybSyncControls();
  ybReroll();
}
function closeYearbook(){
  document.getElementById('yearbook-view').classList.remove('open');
}
function ybSyncControls(){
  document.querySelectorAll('.yb-src-btn').forEach(b=>b.classList.toggle('active',b.dataset.src===ybSource));
  document.querySelectorAll('.yb-layout-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.n)===ybLayout));
}
function ybSetSource(src){ ybSource=src; ybSyncControls(); ybReroll(); }
function ybSetLayout(n){ ybLayout=n; ybSyncControls(); ybReroll(); }
function ybReroll(){
  const pool=ybGetPool();
  const shuffled=[...pool].sort(()=>Math.random()-0.5);
  ybPicks=shuffled.slice(0,ybLayout);
  ybRenderPreview();
}
function ybRenderPreview(){
  const grid=document.getElementById('yb-preview-grid');
  const count=document.getElementById('yb-count');
  if(!grid) return;
  const pool=ybGetPool();
  if(count) count.textContent=pool.length+' photo'+(pool.length===1?'':'s')+' available'+(ybSource==='favorites'?' in favorites':ybSource==='filtered'?' in current filter':'');
  const cols=Math.round(Math.sqrt(ybLayout));
  grid.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  grid.innerHTML='';
  for(let i=0;i<ybLayout;i++){
    const cell=document.createElement('div'); cell.className='yb-cell';
    const idx=ybPicks[i];
    if(idx!==undefined){
      const m=MEDIA[idx];
      const img=document.createElement('img'); img.src=m.src; img.alt=m.title; img.loading='lazy';
      cell.appendChild(img);
      cell.title='Click to swap';
      cell.addEventListener('click',()=>{
        const p=ybGetPool();
        const used=new Set(ybPicks);
        const avail=p.filter(x=>!used.has(x));
        if(!avail.length){ showToast('No more photos to swap in'); return; }
        ybPicks[i]=avail[Math.floor(Math.random()*avail.length)];
        ybRenderPreview();
      });
    } else {
      cell.classList.add('yb-cell-empty');
      cell.innerHTML='<span>+</span>';
    }
    grid.appendChild(cell);
  }
  const genBtn=document.getElementById('yb-generate-btn');
  if(genBtn) genBtn.disabled=pool.length===0;
}

function ybTruncate(s,n){ return s&&s.length>n? s.slice(0,n-1)+'…' : (s||''); }
function ybRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function exportYearbook(){
  const picks=ybPicks.filter(i=>i!==undefined).map(i=>MEDIA[i]);
  if(!picks.length){ showToast('No photos to include yet'); return; }
  const title=(document.getElementById('yb-title-input')?.value||'').trim()||'The Cousins';
  const subtitle=(document.getElementById('yb-subtitle-input')?.value||'').trim()||new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const cols=Math.round(Math.sqrt(ybLayout));
  const rows=Math.ceil(picks.length/cols);
  const cellSize=260, gap=10, pad=44, headerH=140, footerH=56;
  const W=pad*2+cols*cellSize+(cols-1)*gap;
  const H=headerH+rows*cellSize+(rows-1)*gap+footerH+pad;
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');

  const genBtn=document.getElementById('yb-generate-btn');
  if(genBtn){ genBtn.disabled=true; genBtn.textContent='Generating…'; }

  ctx.fillStyle='#fdfaf5';
  ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.fillStyle='#161616';
  ctx.font='bold 54px Georgia, serif';
  ctx.fillText(title,W/2,74);
  ctx.fillStyle='#8a8a8a';
  ctx.font='16px monospace';
  ctx.fillText(subtitle.toUpperCase(),W/2,104);
  ctx.strokeStyle='#d8d0c0';
  ctx.beginPath(); ctx.moveTo(pad,headerH-24); ctx.lineTo(W-pad,headerH-24); ctx.stroke();

  const positions=picks.map((m,i)=>{
    const col=i%cols, row=Math.floor(i/cols);
    return {m,x:pad+col*(cellSize+gap),y:headerH+row*(cellSize+gap)};
  });

  function drawCell(p,img){
    ctx.save();
    ctx.beginPath();
    ybRoundRect(ctx,p.x,p.y,cellSize,cellSize,10);
    ctx.clip();
    if(img){
      const scale=Math.max(cellSize/img.width,cellSize/img.height);
      const iw=img.width*scale, ih=img.height*scale;
      ctx.drawImage(img,p.x+(cellSize-iw)/2,p.y+(cellSize-ih)/2,iw,ih);
    } else {
      ctx.fillStyle='#e8e2d6'; ctx.fillRect(p.x,p.y,cellSize,cellSize);
    }
    const grad=ctx.createLinearGradient(0,p.y+cellSize-70,0,p.y+cellSize);
    grad.addColorStop(0,'rgba(0,0,0,0)'); grad.addColorStop(1,'rgba(0,0,0,.62)');
    ctx.fillStyle=grad; ctx.fillRect(p.x,p.y+cellSize-70,cellSize,70);
    ctx.restore();
    ctx.textAlign='left';
    ctx.fillStyle='#fff';
    ctx.font='13px monospace';
    ctx.fillText(ybTruncate(p.m.title,26),p.x+10,p.y+cellSize-30);
    const names=p.m.c.map(id=>COUSINS.find(c=>c.id===id)?.name||id).join(', ');
    ctx.fillStyle='rgba(255,255,255,.75)';
    ctx.font='10px monospace';
    ctx.fillText(ybTruncate(names,32),p.x+10,p.y+cellSize-14);
  }

  function finalize(){
    ctx.textAlign='center';
    ctx.fillStyle='#a8a196';
    ctx.font='11px monospace';
    ctx.fillText('THE COUSINS · '+picks.length+' MEMORIES · GENERATED '+new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase(),W/2,H-24);
    try{
      const dataUrl=canvas.toDataURL('image/png');
      const a=document.createElement('a');
      a.href=dataUrl; a.download='cousins-yearbook-'+Date.now()+'.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      showToast('📖 Yearbook poster saved!');
    }catch(e){ showToast('Export failed — try a different browser'); }
    if(genBtn){ genBtn.disabled=false; genBtn.textContent='⬇ Generate & Download Poster'; }
  }

  if(!positions.length){ finalize(); return; }
  let loaded=0;
  positions.forEach(p=>{
    const img=new Image();
    img.onload=()=>{ drawCell(p,img); loaded++; if(loaded===positions.length) finalize(); };
    img.onerror=()=>{ drawCell(p,null); loaded++; if(loaded===positions.length) finalize(); };
    img.src=p.m.src;
  });
}

/* ================================================ FEATURE: COUSIN PROFILE PAGES */
function hashStr(s){
  let h=0;
  for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; }
  return Math.abs(h);
}

function buildProfile(cousinId){
  const cousin=COUSINS.find(c=>c.id===cousinId);
  if(!cousin) return null;
  const items=MEDIA.map((m,i)=>({m,i})).filter(x=>x.m.c.includes(cousinId));
  const total=items.length;
  const photos=items.filter(x=>x.m.t==='photo').length;
  const videos=items.filter(x=>x.m.t==='video').length;
  const solo=items.filter(x=>x.m.c.length===1).length;
  const grouped=total-solo;

  const withCounts={};
  items.forEach(x=>{ x.m.c.forEach(id=>{ if(id!==cousinId) withCounts[id]=(withCounts[id]||0)+1; }); });
  const withEntries=Object.entries(withCounts).sort((a,b)=>b[1]-a[1]);
  const topWith=withEntries[0]?{cousin:COUSINS.find(c=>c.id===withEntries[0][0]),count:withEntries[0][1]}:null;

  const eventCounts=EVENTS.map(ev=>({...ev,count:items.filter(x=>x.m.e===ev.id).length})).filter(e=>e.count>0).sort((a,b)=>b.count-a.count);
  const topEvent=eventCounts[0]||null;

  const soloPhotos=items.filter(x=>x.m.t==='photo'&&x.m.c.length===1);
  const anyPhotos=items.filter(x=>x.m.t==='photo');
  const pickFrom=soloPhotos.length?soloPhotos:(anyPhotos.length?anyPhotos:items);
  const candid=pickFrom.length?pickFrom[hashStr(cousinId)%pickFrom.length]:null;

  return {cousin,total,photos,videos,solo,grouped,topWith,eventCounts,topEvent,candid,items};
}

function openProfile(cousinId){
  const data=buildProfile(cousinId);
  if(!data){ showToast('No memories for this cousin yet'); return; }
  renderProfile(data);
  document.getElementById('profile-view').classList.add('open');
}
function closeProfile(){
  document.getElementById('profile-view').classList.remove('open');
}

function renderProfile(data){
  const body=document.getElementById('profile-body');
  const titleEl=document.getElementById('profile-modal-title');
  if(!body) return;
  const {cousin,total,photos,videos,solo,grouped,topWith,eventCounts,topEvent,candid,items}=data;
  if(titleEl) titleEl.textContent=cousin.name.toUpperCase()+"'S FILE";

  body.innerHTML=`
    <div class="profile-hero">
      <div class="profile-hero-media">
        ${candid?(candid.m.t==='photo'?`<img src="${candid.m.src}" alt="${candid.m.title}">`:`<video src="${candid.m.src}" muted loop autoplay playsinline></video>`):'<div class="profile-hero-empty">No memories yet</div>'}
      </div>
      <div class="profile-hero-info">
        <div class="profile-hero-tag">Cousin Profile</div>
        <div class="profile-hero-name">${cousin.name}</div>
        <div class="profile-hero-sub">${total} memor${total===1?'y':'ies'} in the archive</div>
        <button class="profile-wrapped-btn" id="profile-wrapped-btn">🎁 ${cousin.name}'s Wrapped</button>
      </div>
    </div>
    <div class="profile-stats-grid">
      <div class="profile-stat"><div class="profile-stat-num">${total}</div><div class="profile-stat-lbl">TOTAL</div></div>
      <div class="profile-stat"><div class="profile-stat-num">${photos}</div><div class="profile-stat-lbl">PHOTOS</div></div>
      <div class="profile-stat"><div class="profile-stat-num">${videos}</div><div class="profile-stat-lbl">VIDEOS</div></div>
      <div class="profile-stat"><div class="profile-stat-num">${solo}</div><div class="profile-stat-lbl">SOLO</div></div>
      <div class="profile-stat"><div class="profile-stat-num">${grouped}</div><div class="profile-stat-lbl">GROUP</div></div>
    </div>
    <div class="profile-info-row">
      <div class="profile-info-card">
        <div class="profile-info-lbl">MOST PHOTOGRAPHED WITH</div>
        <div class="profile-info-val">${topWith?topWith.cousin.name+' — '+topWith.count+' memories together':'—'}</div>
      </div>
      <div class="profile-info-card">
        <div class="profile-info-lbl">TOP EVENT</div>
        <div class="profile-info-val">${topEvent?topEvent.name+' — '+topEvent.count+' memories':'—'}</div>
      </div>
    </div>
    <div class="profile-events">
      ${eventCounts.map(ev=>`
        <div class="profile-event-row">
          <div class="profile-event-name">${ev.name}</div>
          <div class="profile-event-track"><div class="profile-event-fill" style="width:${Math.round(ev.count/(eventCounts[0].count||1)*100)}%"></div></div>
          <div class="profile-event-val">${ev.count}</div>
        </div>`).join('')}
    </div>
    <div class="profile-gallery-lbl">MEMORIES</div>
    <div class="profile-gallery" id="profile-gallery"></div>
  `;

  const gal=document.getElementById('profile-gallery');
  items.slice(0,24).forEach(x=>{
    const cell=document.createElement('div'); cell.className='profile-g-cell';
    if(x.m.t==='photo'){
      const img=document.createElement('img'); img.src=x.m.src; img.alt=x.m.title; img.loading='lazy';
      cell.appendChild(img);
    } else {
      cell.innerHTML='<div class="profile-g-vid"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div>';
    }
    cell.addEventListener('click',()=>{ closeProfile(); openLb(x.i); });
    gal.appendChild(cell);
  });

  const wb=document.getElementById('profile-wrapped-btn');
  if(wb) wb.addEventListener('click',()=>openWrapped(cousin.id));
}

/* ================================================ FEATURE: WRAPPED */
let wrappedSlides=[], wrappedIdx=0, wrappedTimer=null, wrappedCousinId=null;
const WRAPPED_SLIDE_MS=4200;

function buildWrappedSlides(cousinId){
  const data=buildProfile(cousinId);
  if(!data) return [];
  const {cousin,total,photos,videos,solo,topWith,topEvent,items}=data;
  const photoItems=items.filter(x=>x.m.t==='photo');
  const hero=photoItems.length?photoItems[hashStr(cousinId+'wrapped')%photoItems.length]:null;
  const soloPct=total?Math.round(solo/total*100):0;

  return [
    {type:'intro',subtitle:'YOUR COUSINS',title:cousin.name.toUpperCase(),emoji:'🎁'},
    {type:'stat',big:total,label:'memories in the archive',sub:'and counting…',emoji:'📸'},
    {type:'split',big:photos+' PHOTOS',big2:videos+' VIDEOS',label:'how it breaks down',emoji:'🎬'},
    topEvent?{type:'stat',big:topEvent.name,label:'your biggest event',sub:topEvent.count+' memories there',emoji:'📍'}:null,
    topWith?{type:'stat',big:topWith.cousin.name,label:'your ride or die',sub:topWith.count+' memories together',emoji:'🤝'}:null,
    {type:'stat',big:soloPct+'%',label:'solo shots',sub:soloPct>=50?'certified main character':'squad-first energy',emoji:soloPct>=50?'🤳':'👥'},
    hero?{type:'photo',media:hero,label:'a signature shot',emoji:'✨'}:null,
    {type:'outro',title:cousin.name,sub:total+' memories · '+(data.eventCounts.length)+' events · endless chaos',emoji:'🎉'},
  ].filter(Boolean);
}

function openWrapped(cousinId){
  wrappedCousinId=cousinId;
  wrappedSlides=buildWrappedSlides(cousinId);
  if(!wrappedSlides.length){ showToast('Not enough memories yet for a Wrapped'); return; }
  wrappedIdx=0;
  document.getElementById('wrapped-view').classList.add('open');
  wrRenderProgress();
  wrRenderSlide();
  wrStartTimer();
}
function closeWrapped(){
  clearTimeout(wrappedTimer);
  document.getElementById('wrapped-view').classList.remove('open');
}
function wrRenderProgress(){
  const track=document.getElementById('wrapped-progress');
  if(!track) return;
  track.innerHTML='';
  wrappedSlides.forEach((_,i)=>{
    const seg=document.createElement('div'); seg.className='wr-seg';
    const fill=document.createElement('div'); fill.className='wr-seg-fill'; fill.id='wr-seg-fill-'+i;
    seg.appendChild(fill); track.appendChild(seg);
  });
}
function wrStartTimer(){
  clearTimeout(wrappedTimer);
  const fill=document.getElementById('wr-seg-fill-'+wrappedIdx);
  if(fill){
    fill.style.transition='none'; fill.style.width='0%';
    requestAnimationFrame(()=>{ fill.style.transition='width '+WRAPPED_SLIDE_MS+'ms linear'; fill.style.width='100%'; });
  }
  wrappedTimer=setTimeout(()=>wrNav(1),WRAPPED_SLIDE_MS);
}
function wrPause(){
  clearTimeout(wrappedTimer);
  const fill=document.getElementById('wr-seg-fill-'+wrappedIdx);
  if(fill){ const cs=getComputedStyle(fill).width; fill.style.transition='none'; fill.style.width=cs; }
}
function wrResume(){
  const wview=document.getElementById('wrapped-view');
  const fill=document.getElementById('wr-seg-fill-'+wrappedIdx);
  if(!fill||!wview||!wview.classList.contains('open')) return;
  const stageW=fill.parentElement.offsetWidth||1;
  const currentPx=parseFloat(fill.style.width)||0;
  const fraction=Math.min(1,Math.max(0,currentPx/stageW));
  const remainMs=Math.max(200,WRAPPED_SLIDE_MS*(1-fraction));
  requestAnimationFrame(()=>{ fill.style.transition='width '+remainMs+'ms linear'; fill.style.width='100%'; });
  wrappedTimer=setTimeout(()=>wrNav(1),remainMs);
}
function wrNav(dir){
  for(let i=0;i<wrappedSlides.length;i++){
    const f=document.getElementById('wr-seg-fill-'+i);
    if(!f) continue;
    if(i<wrappedIdx+dir){ f.style.transition='none'; f.style.width='100%'; }
    else if(i>wrappedIdx+dir){ f.style.transition='none'; f.style.width='0%'; }
  }
  wrappedIdx+=dir;
  if(wrappedIdx<0) wrappedIdx=0;
  if(wrappedIdx>=wrappedSlides.length){ closeWrapped(); return; }
  wrRenderSlide();
  wrStartTimer();
}
function wrRenderSlide(){
  const s=wrappedSlides[wrappedIdx];
  const stage=document.getElementById('wrapped-stage');
  if(!stage||!s) return;
  let html='';
  if(s.type==='intro'){
    html=`<div class="wr-emoji">${s.emoji}</div><div class="wr-subtitle">${s.subtitle}</div><div class="wr-title-big">${s.title}</div>`;
  } else if(s.type==='outro'){
    html=`<div class="wr-emoji">${s.emoji}</div><div class="wr-title-big">${s.title}</div><div class="wr-outro-sub">${s.sub}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
        <button class="wr-replay-btn" id="wr-replay-btn">↻ Replay</button>
        <button class="wr-save-btn" id="wr-save-btn">⬇ Save Recap</button>
      </div>`;
  } else if(s.type==='split'){
    html=`<div class="wr-emoji">${s.emoji}</div><div class="wr-split-row"><div class="wr-split-item">${s.big}</div><div class="wr-split-item">${s.big2}</div></div><div class="wr-label">${s.label}</div>`;
  } else if(s.type==='photo'){
    html=`<div class="wr-photo-wrap"><img src="${s.media.m.src}" alt=""></div><div class="wr-label">${s.emoji} ${s.label}</div>`;
  } else {
    html=`<div class="wr-emoji">${s.emoji}</div><div class="wr-big">${s.big}</div><div class="wr-label">${s.label}</div>${s.sub?`<div class="wr-sub">${s.sub}</div>`:''}`;
  }
  stage.innerHTML=html;
  const rb=document.getElementById('wr-replay-btn');
  if(rb) rb.addEventListener('click',e=>{ e.stopPropagation(); openWrapped(wrappedCousinId); });
  const sb=document.getElementById('wr-save-btn');
  if(sb) sb.addEventListener('click',e=>{ e.stopPropagation(); exportWrappedCard(wrappedCousinId); });
}

function exportWrappedCard(cousinId){
  const data=buildProfile(cousinId);
  if(!data){ showToast('Nothing to export'); return; }
  const {cousin,total,photos,videos,topWith,topEvent}=data;
  const W=800,H=1000;
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  const grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#1a1a2e'); grad.addColorStop(1,'#16213e');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.fillStyle='#e8c97e';
  ctx.font='14px monospace';
  ctx.fillText('COUSINS WRAPPED',W/2,90);
  ctx.fillStyle='#fff';
  ctx.font='bold 64px Georgia, serif';
  ctx.fillText(cousin.name,W/2,170);

  const lines=[
    total+' total memories',
    photos+' photos · '+videos+' videos',
    topEvent?'Biggest event: '+topEvent.name:'',
    topWith?'Most with: '+topWith.cousin.name:'',
  ].filter(Boolean);
  ctx.font='22px monospace';
  ctx.fillStyle='rgba(255,255,255,.85)';
  lines.forEach((l,i)=>ctx.fillText(l,W/2,260+i*46));

  ctx.fillStyle='rgba(255,255,255,.4)';
  ctx.font='12px monospace';
  ctx.fillText('THE COUSINS | memories',W/2,H-40);

  try{
    const dataUrl=canvas.toDataURL('image/png');
    const a=document.createElement('a');
    a.href=dataUrl; a.download='wrapped-'+cousin.id+'.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('🎁 Wrapped card saved!');
  }catch(e){ showToast('Export failed — try a different browser'); }
}

/* ================================================ BIND ALL NEW FEATURES */
function bindAllNewFeatures() {
  // Shuffle button
  document.getElementById('shuffle-btn')?.addEventListener('click', chaosShuffle);

  // Theme-on-click toggle
  const tcBtn = document.getElementById('theme-click-btn');
  if (tcBtn) { tcBtn.classList.toggle('active', themeOnClick); tcBtn.addEventListener('click', toggleThemeOnClick); }

  // Speed-Tag
  document.getElementById('speedtag-btn')?.addEventListener('click', openSpeedTag);
  document.getElementById('st-close')?.addEventListener('click', closeSpeedTag);
  document.getElementById('speedtag-view')?.addEventListener('click', e => { if (e.target === document.getElementById('speedtag-view')) closeSpeedTag(); });
  document.getElementById('st-next-btn')?.addEventListener('click', loadNextSTRound);

  // Superlatives
  document.getElementById('sups-btn')?.addEventListener('click', openSups);
  document.getElementById('sups-close')?.addEventListener('click', closeSups);
  document.getElementById('sups-view')?.addEventListener('click', e => { if (e.target === document.getElementById('sups-view')) closeSups(); });

  // Search quick button in header
  document.getElementById('search-quick-btn')?.addEventListener('click', () => {
    if (!menuOpen) menuBtn.click();
    setTimeout(() => { document.getElementById('search-input')?.focus(); }, 200);
  });

  // Search autocomplete
  initSearch();

  // Long-press preview
  initLongPress();

  // Countdown widget
  initCountdown();

  // Spotify mixtape widget
  initSpotifyWidget();

  // Favorites (lightbox heart)
  document.getElementById('lb-fav-btn')?.addEventListener('click', () => {
    if (lbIndex < 0) { showToast('Open a memory first'); return; }
    toggleFavorite(lbIndex);
    const btn = document.getElementById('lb-fav-btn');
    if (btn) { btn.classList.remove('fav-pop'); void btn.offsetWidth; btn.classList.add('fav-pop'); }
  });

  // Yearbook / poster maker
  document.getElementById('yb-close')?.addEventListener('click', closeYearbook);
  document.getElementById('yearbook-view')?.addEventListener('click', e => { if (e.target === document.getElementById('yearbook-view')) closeYearbook(); });
  document.querySelectorAll('.yb-src-btn').forEach(b => b.addEventListener('click', () => ybSetSource(b.dataset.src)));
  document.querySelectorAll('.yb-layout-btn').forEach(b => b.addEventListener('click', () => ybSetLayout(Number(b.dataset.n))));
  document.getElementById('yb-reroll-btn')?.addEventListener('click', ybReroll);
  document.getElementById('yb-generate-btn')?.addEventListener('click', exportYearbook);

  // Cousin profile
  document.getElementById('profile-close')?.addEventListener('click', closeProfile);
  document.getElementById('profile-view')?.addEventListener('click', e => { if (e.target === document.getElementById('profile-view')) closeProfile(); });

  // Wrapped
  document.getElementById('wrapped-close')?.addEventListener('click', closeWrapped);
  document.getElementById('wr-tap-left')?.addEventListener('click', () => wrNav(-1));
  document.getElementById('wr-tap-right')?.addEventListener('click', () => wrNav(1));
  const wrStageEl = document.getElementById('wrapped-stage');
  if (wrStageEl) {
    wrStageEl.addEventListener('pointerdown', wrPause);
    wrStageEl.addEventListener('pointerup', wrResume);
    wrStageEl.addEventListener('pointerleave', wrResume);
  }

  // ESC closes all new modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSpeedTag();
      closeSups();
      closeYearbook();
      closeProfile();
      closeWrapped();
      document.getElementById('lp-preview')?.classList.remove('show');
    }
  });
}

/* ================================================ INIT */
function init(){
  applyTheme(currentTheme);
  themeLbl.textContent=THEME_NAMES[currentTheme];
  document.querySelectorAll('.tdot').forEach(d=>d.classList.toggle('active',d.dataset.t===currentTheme));
  buildGrid();
  setupCursor();
  resizeBg();
  if(!isMobile()){
    /* Background canvas animation runs only on desktop — too CPU-heavy for phones.
       Paused via the Page Visibility API whenever the tab isn't visible, so it
       doesn't keep burning CPU/battery in a background tab. */
    let bgRafId=null;
    const bgLoop=()=>{drawBg();bgRafId=requestAnimationFrame(bgLoop);};
    const startBgLoop=()=>{if(bgRafId===null) bgLoop();};
    const stopBgLoop=()=>{if(bgRafId!==null){cancelAnimationFrame(bgRafId);bgRafId=null;}};
    startBgLoop();
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden) stopBgLoop(); else startBgLoop();
    });
  }
  bindEvents();
  initMobile();
  startPreloader();
}
window.startApp = init;
init();