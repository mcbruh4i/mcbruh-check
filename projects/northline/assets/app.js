(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const previewMode = $('meta[name="preview-mode"]')?.content === 'true' || location.protocol === 'file:';
  const state = { csrf: '', user: null };
  const layer = $('#auth-layer');
  const registerForm = $('#register-form');
  const loginForm = $('#login-form');
  const quoteForm = $('#quote-form');
  $('#year-now').textContent = new Date().getFullYear();

  async function loadSession() {
    if (previewMode) { state.csrf = 'preview-token'; fillCsrf(); return; }
    try {
      const r = await fetch('session.php', {credentials:'same-origin', headers:{Accept:'application/json'}});
      const d = await r.json();
      if (d.ok) { state.csrf=d.csrf||''; state.user=d.authenticated?d.user:null; fillCsrf(); }
    } catch (_) {}
  }
  function fillCsrf(){ $$('.csrf-field').forEach(el => el.value=state.csrf); }
  loadSession();

  function showSubstep(form,name){
    $$('.auth-substep',form).forEach(el => { const active=el.dataset.substep===name; el.hidden=!active; el.classList.toggle('active',active); });
    const focusable=$(`.auth-substep[data-substep="${name}"] input:not([type=hidden])`,form); setTimeout(()=>focusable?.focus(),80);
  }
  function resetSubsteps(form){ showSubstep(form,'identifier'); }
  function isValidIdentifier(input,v){
    const looksEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if(input.name==='identifier') return looksEmail || v.replace(/\D/g,'').length>=7;
    return looksEmail;
  }

  function setStep(name) {
    $$('.auth-step',layer).forEach(el => { const active=el.dataset.authStep===name; el.hidden=!active; el.classList.toggle('active',active); });
    const dots=$$('.auth-progress span',layer); if(dots.length){dots[0].classList.toggle('active',name==='account');dots[1].classList.toggle('active',name==='vehicle'||name==='success');}
    $('.auth-progress',layer).style.visibility=name==='success'?'hidden':'visible';
    const focusable=$(`[data-auth-step="${name}"] input:not([type=hidden]), [data-auth-step="${name}"] button`,layer); setTimeout(()=>focusable?.focus(),80);
  }
  function setMode(mode) {
    const login=mode==='login'; registerForm.hidden=login; loginForm.hidden=!login;
    $$('[data-auth-mode]',layer).forEach(b=>{const on=b.dataset.authMode===mode;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    resetSubsteps(registerForm); resetSubsteps(loginForm);
    status(registerForm,''); status(loginForm,'');
  }
  $$('[data-continue]').forEach(btn=>btn.addEventListener('click',()=>{
    const form=btn.closest('form');
    const input=$('.auth-substep[data-substep="identifier"] input',form);
    const v=input.value.trim();
    let msg='';
    if(!v)msg='Required'; else if(!isValidIdentifier(input,v))msg=input.name==='identifier'?'Enter a valid email or mobile number.':'Enter a valid email.';
    invalid(input,msg);
    if(msg){ input.focus(); return; }
    $$('.identifier-echo',form).forEach(el=>el.textContent=v);
    showSubstep(form,'credentials');
  }));
  $$('[data-change-identifier]').forEach(btn=>btn.addEventListener('click',()=>{
    const form=btn.closest('form');
    showSubstep(form,'identifier');
  }));
  function openAuth(mode='register') {
    layer.hidden=false; document.body.classList.add('body-lock'); setMode(mode);
    setStep(state.user?'vehicle':'account');
  }
  function closeAuth(){layer.hidden=true;document.body.classList.remove('body-lock');}
  $$('[data-open-auth]').forEach(b=>b.addEventListener('click',()=>openAuth(b.dataset.openAuth)));
  $$('[data-close-auth]').forEach(b=>b.addEventListener('click',closeAuth));
  $$('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.authMode)));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!layer.hidden)closeAuth();});
  layer.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;const els=$$('button:not([disabled]),input:not([disabled]),textarea:not([disabled])',layer).filter(x=>!x.closest('[hidden]'));if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  $$('[data-toggle-password]').forEach(b=>b.addEventListener('click',()=>{const input=b.parentElement.querySelector('input');const show=input.type==='password';input.type=show?'text':'password';b.textContent=show?'Hide':'Show';}));

  function status(form,message,type='fail'){const el=$('.auth-status',form);el.textContent=message;el.className=`auth-status ${type}`;}
  function invalid(input,message){input.setAttribute('aria-invalid',message?'true':'false');return message;}
  function validateAccount(form) {
    let first=null;
    $$('input[required]',form).forEach(input=>{
      let msg='';const v=input.value.trim();
      if(!v)msg='Required';else if(input.name==='identifier'&&!isValidIdentifier(input,v))msg='Enter a valid email or mobile number.';else if(input.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))msg='Invalid email';else if(input.name==='phone'&&v.replace(/\D/g,'').length<7)msg='Invalid phone';else if(input.name==='password'&&v.length<8)msg='Use at least 8 characters';else if(input.type==='checkbox'&&!input.checked)msg='Required';
      if(invalid(input,msg)&&!first)first=input;
    });
    first?.focus();return !first;
  }
  async function submitAccount(form) {
    if(!validateAccount(form)){status(form,'Please check the highlighted information.');return;}
    const btn=$('.auth-submit',form);btn.disabled=true;status(form,'');
    try {
      let data;
      if(previewMode){await new Promise(r=>setTimeout(r,550));data={ok:true,user:{name:form.elements.name?.value||'Preview Seller',email:form.elements.email?.value||form.elements.identifier?.value||'',phone:form.elements.phone?.value||''},csrf:'preview-token-2'};}
      else {const r=await fetch('auth.php',{method:'POST',body:new FormData(form),credentials:'same-origin',headers:{Accept:'application/json'}});data=await r.json();if(!r.ok||!data.ok)throw new Error(data.message||'Unable to continue.');}
      state.user=data.user;state.csrf=data.csrf||state.csrf;fillCsrf();setStep('vehicle');
    } catch(err){status(form,err.message||'Unable to continue.');}
    finally{btn.disabled=false;}
  }
  registerForm.addEventListener('submit',e=>{e.preventDefault();submitAccount(registerForm);});
  loginForm.addEventListener('submit',e=>{e.preventDefault();submitAccount(loginForm);});

  const vehicleRules={
    vehicle:v=>v.trim().length>=2?'':'Enter the make and model.',
    year:v=>{const y=Number(v),max=new Date().getFullYear()+1;return /^\d{4}$/.test(v)&&y>=1900&&y<=max?'':`Enter a year from 1900 to ${max}.`;},
    mileage:v=>{const n=Number(v.replace(/\D/g,''));return v.trim()&&n<=2000000?'':'Enter a valid mileage.';},
    condition:v=>v.trim().length>=10?'':'Add at least 10 characters.'
  };
  function validateVehicleInput(input){const msg=vehicleRules[input.name]?.(input.value)||'';input.setAttribute('aria-invalid',msg?'true':'false');const e=$(`#${input.name}-error`);if(e)e.textContent=msg;return !msg;}
  quoteForm.addEventListener('input',e=>{if(e.target.name==='mileage')e.target.value=e.target.value.replace(/[^0-9,]/g,'');if(e.target.matches('input,textarea')&&e.target.getAttribute('aria-invalid')==='true')validateVehicleInput(e.target);});
  quoteForm.addEventListener('submit',async e=>{
    e.preventDefault();const inputs=$$('input:not([type=hidden]):not([name=website]),textarea',quoteForm);const valid=inputs.every(validateVehicleInput);if(!valid){quoteForm.querySelector('[aria-invalid=true]')?.focus();status(quoteForm,'Please review the vehicle details.');return;}
    const btn=$('.auth-submit',quoteForm);btn.disabled=true;status(quoteForm,'');
    try{
      let data;if(previewMode){await new Promise(r=>setTimeout(r,650));data={ok:true};}
      else{const r=await fetch('submit.php',{method:'POST',body:new FormData(quoteForm),credentials:'same-origin',headers:{Accept:'application/json'}});data=await r.json();if(!r.ok||!data.ok)throw new Error(data.message||'Unable to send your vehicle.');}
      if(data.csrf){state.csrf=data.csrf;fillCsrf();}quoteForm.reset();setStep('success');
    }catch(err){status(quoteForm,err.message||'Unable to send your vehicle.');btn.disabled=false;}
  });
  $('[data-logout]').addEventListener('click',async()=>{
    if(!previewMode){const fd=new FormData();fd.set('csrf_token',state.csrf);try{await fetch('logout.php',{method:'POST',body:fd,credentials:'same-origin'});}catch(_){}}
    state.user=null;state.csrf=previewMode?'preview-token':'';fillCsrf();setMode('login');setStep('account');
  });

  // Scroll choreography
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;const reveals=$$('.motion-reveal');reveals.forEach(el=>el.style.transitionDelay=`${Number(el.dataset.delay||0)}ms`);
  if(!reduce&&'IntersectionObserver'in window){const ob=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('is-visible');ob.unobserve(x.target);}}),{threshold:.14,rootMargin:'0px 0px -7% 0px'});reveals.forEach(x=>ob.observe(x));}else reveals.forEach(x=>x.classList.add('is-visible'));
  const progress=$('.scroll-progress span'),trackFill=$('.track-line span'),trackCar=$('.track-car'),journey=$('.journey');let ticking=false;
  function paint(){const max=document.documentElement.scrollHeight-innerHeight,ratio=max>0?Math.min(1,scrollY/max):0;if(progress)progress.style.transform=`scaleX(${ratio})`;if(journey&&trackFill&&trackCar&&innerWidth>900&&!reduce){const r=journey.getBoundingClientRect(),travel=journey.offsetHeight-innerHeight,local=Math.max(0,Math.min(1,-r.top/Math.max(1,travel)));trackFill.style.transform=`scaleY(${local})`;trackCar.style.top=`${local*100}%`;}ticking=false;}
  addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(paint);ticking=true;}},{passive:true});addEventListener('resize',paint,{passive:true});paint();
  $$('.faq-item button').forEach(b=>b.addEventListener('click',()=>{const item=b.closest('.faq-item'),opening=!item.classList.contains('open');item.classList.toggle('open',opening);b.setAttribute('aria-expanded',String(opening));}));
  const counter=$('[data-count]');if(counter&&!reduce&&'IntersectionObserver'in window){new IntersectionObserver((es,ob)=>{if(!es[0].isIntersecting)return;const end=Number(counter.dataset.count),start=performance.now();function f(now){const t=Math.min(1,(now-start)/900);counter.textContent=Math.round(end*(1-Math.pow(1-t,3)));if(t<1)requestAnimationFrame(f);}requestAnimationFrame(f);ob.disconnect();},{threshold:.8}).observe(counter);}else if(counter)counter.textContent=counter.dataset.count;
})();


// Continuous wheel interpolation with native-scroll fallback.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.Lenis) return;
  const lenis = new Lenis({
    autoRaf: true,
    duration: 1.05,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.9,
    anchors: { offset: 0 },
    stopInertiaOnNavigate: true
  });
  window.__siteScroll = lenis;
  document.addEventListener('visibilitychange', () => document.hidden ? lenis.stop() : lenis.start());
})();


// One continuous route through the entire site. The car follows scroll direction.
(() => {
  const layer = document.querySelector('.site-route-layer');
  const map = document.querySelector('.site-route-map');
  const path = document.querySelector('#site-route-path');
  const shadow = document.querySelector('.site-route-shadow');
  const gradient = document.querySelector('#routeGradient');
  const car = document.querySelector('.route-car');
  if (!layer || !map || !path || !gradient || !car) return;

  const VB_W = 1000, VB_H = 10000;
  const desktopRoute = 'M70 120 C113.3 255.6 334.7 662.2 330 933.3 C325.3 1204.4 42 1475.6 42 1746.7 C42 2017.8 330 2288.9 330 2560 C330 2831.1 42 3102.2 42 3373.3 C42 3644.4 330 3915.6 330 4186.7 C330 4457.8 42 4728.9 42 5000 C42 5271.1 330 5542.2 330 5813.3 C330 6084.4 42 6355.6 42 6626.7 C42 6897.8 330 7168.9 330 7440 C330 7711.1 42 7982.2 42 8253.3 C42 8524.4 330 8795.6 330 9066.7 C330 9337.8 90 9744.5 42 9880';
  const mobileRoute = 'M55 120 C80.8 255.6 213.8 662.2 210 933.3 C206.2 1204.4 32 1475.6 32 1746.7 C32 2017.8 210 2288.9 210 2560 C210 2831.1 32 3102.2 32 3373.3 C32 3644.4 210 3915.6 210 4186.7 C210 4457.8 32 4728.9 32 5000 C32 5271.1 210 5542.2 210 5813.3 C210 6084.4 32 6355.6 32 6626.7 C32 6897.8 210 7168.9 210 7440 C210 7711.1 32 7982.2 32 8253.3 C32 8524.4 210 8795.6 210 9066.7 C210 9337.8 61.7 9744.5 32 9880';
  const darkClasses = new Set(['site-header','hero','make-ticker','journey','voices','final-cta']);
  const terra = '#E87552', forest = '#2F6654';
  let docHeight = 1, pathLength = 1, lastScroll = scrollY, direction = 1;
  let target = {x:0,y:0,a:0}, current = {x:0,y:0,a:0};
  let animating = false;

  function isWarmSection(el) {
    return [...darkClasses].some(c => el.classList.contains(c)) || el.tagName === 'FOOTER';
  }
  function rebuildGradient() {
    docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    layer.style.height = `${docHeight}px`;
    const routeD = innerWidth <= 1200 ? mobileRoute : desktopRoute;
    path.setAttribute('d', routeD); shadow.setAttribute('d', routeD);
    pathLength = path.getTotalLength();
    gradient.replaceChildren();
    const add = (offset,color) => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg','stop');
      stop.setAttribute('offset',`${Math.max(0,Math.min(100,offset))}%`);
      stop.setAttribute('stop-color',color); gradient.appendChild(stop);
    };
    // Hard color changes: green only on paper/white; terracotta on every colored area.
    const manifesto = document.querySelector('.manifesto');
    const plateScene = document.querySelector('.plate-scene');
    const journey = document.querySelector('.journey');
    const condition = document.querySelector('.condition-grid');
    const voices = document.querySelector('.voices');
    const faq = document.querySelector('.faq');
    const finalCta = document.querySelector('.final-cta');
    const pageTop = el => el.getBoundingClientRect().top + window.scrollY;
    const at = el => pageTop(el) / docHeight * 100;
    const edge = (offset,from,to) => { add(offset,from); add(offset,to); };
    add(0,terra);
    edge(at(manifesto),terra,forest);
    edge(at(plateScene),forest,terra);
    edge((pageTop(plateScene)+plateScene.offsetHeight)/docHeight*100,terra,forest);
    edge(at(journey),forest,terra);
    edge(at(condition),terra,forest);
    edge(at(voices),forest,terra);
    edge(at(faq),terra,forest);
    edge(at(finalCta),forest,terra);
    add(100,terra);
    updateTarget(true);
  }
  function shortestAngle(from,to) {
    let d = (to - from + 540) % 360 - 180; return from + d;
  }
  function updateTarget(immediate=false) {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, scrollY / max));
    const now = scrollY; if (Math.abs(now-lastScroll) > .5) direction = now > lastScroll ? 1 : -1; lastScroll = now;
    const p = path.getPointAtLength(progress * pathLength);
    const ahead = path.getPointAtLength(Math.min(pathLength, progress * pathLength + 8));
    const base = Math.atan2((ahead.y-p.y) * docHeight/VB_H,(ahead.x-p.x) * innerWidth/VB_W) * 180/Math.PI + 90;
    target.x = p.x/VB_W * innerWidth; target.y = p.y/VB_H * docHeight; target.a = base + (direction < 0 ? 180 : 0);
    target.a = shortestAngle(current.a,target.a);
    if (immediate) current={...target};
    if (!animating) {animating=true;requestAnimationFrame(paint);}
  }
  function paint() {
    current.x += (target.x-current.x)*.22; current.y += (target.y-current.y)*.22; current.a += (target.a-current.a)*.18;
    const halfW = car.offsetWidth / 2, halfH = car.offsetHeight / 2;
    car.style.transform = `translate3d(${current.x-halfW}px,${current.y-halfH}px,0) rotate(${current.a}deg)`;
    const moving = Math.abs(target.x-current.x)>0.15 || Math.abs(target.y-current.y)>0.15 || Math.abs(target.a-current.a)>0.2;
    if (moving) requestAnimationFrame(paint); else animating=false;
  }
  addEventListener('scroll',()=>updateTarget(),{passive:true});
  addEventListener('resize',()=>requestAnimationFrame(rebuildGradient),{passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(()=>requestAnimationFrame(rebuildGradient)).observe(document.body);
  rebuildGradient();
})();
