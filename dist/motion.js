/* CareFlow: independently implemented from measured Crosswalk timelines.
 * No published Webflow code is included. No-JS content stays readable. */
(() => {
  'use strict';
  const start = () => {
    const html = document.documentElement;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const header = document.querySelector('.site-header');
    const hero = document.querySelector('.hero');
    const curtain = document.querySelector('.hero-curtain');
    const introStripes = [...document.querySelectorAll('[data-intro-stripe]')];
    const parts = [...document.querySelectorAll('[data-machine-part]')];
    const heroLines = [...document.querySelectorAll('[data-hero-line]')];
    const subtitle = document.querySelector('.hero-subtitle');
    const arrow = document.querySelector('.scroll-indicator');
    const splitRecords = [], originalText = new WeakMap();
    const services = [...document.querySelectorAll('.service-row')].map((element, index) => ({
      element, index, tag: element.querySelector('.service-tag'),
      number: element.querySelector('.service-number'), description: element.querySelector('.service-description'),
      started: -1, top: 0, height: 1,
    }));
    const stories = [...document.querySelectorAll('.story-section')].map(element => ({
      element, sticky: element.querySelector('.story-sticky'), track: element.querySelector('.story-track'),
      panels: [...element.querySelectorAll('.story-panel')], media: [...element.querySelectorAll('[data-story-media]')],
      rail: element.querySelector('.story-index-rail'), progressBar: element.querySelector('.story-progress'),
      top: 0, range: 1, start: 0, end: 1, raw: 0, progress: 0, x: 0, active: -1, navigationProgress: null,
    })).filter(item => item.sticky && item.track);
    const wipes = [...document.querySelectorAll('[data-wipe-scene]')].map(element => ({
      element, sticky: element.querySelector('.photo-scene-inner'), image: element.querySelector('[data-wipe-image]'),
      stripes: [...element.querySelectorAll('[data-wipe-stripe]')], top: 0, range: 1, start: 0, end: 1, raw: 0, progress: 0,
    }));
    const valueMachines = [...document.querySelectorAll('[data-value-machine]')].map(element => ({
      element, nodes: [...element.querySelectorAll('[data-scroll-rotate]')], top: 0, height: 1,
    }));
    const finals = [...document.querySelectorAll('[data-final-machine]')].map(element => ({
      element, sticky: element.querySelector('.final-machine-sticky'),
      paths: [...element.querySelectorAll('[data-flow-path]')].map(path => {
        let length = 0; try { length = path.getTotalLength(); } catch (_) { /* Static geometry. */ }
        return { path, length };
      }), nodes: [...element.querySelectorAll('[data-flow-node]')], top: 0, range: 1, progress: 0,
    }));
    const rotors = [...document.querySelectorAll('[data-rotor]')].map(element => ({
      element, direction: Number(element.dataset.rotor) < 0 ? -1 : 1,
      period: Number(element.dataset.rotorDuration) || (element.closest('[data-final-machine]') ? 2 : 3),
      owner: element.closest('[data-final-machine],[data-value-machine],.hero,.service-row') || element,
      top: 0, height: 1, clock: 0, lastClock: 0,
    }));
    const reveals = [...document.querySelectorAll('[data-reveal]')];
    const parallax = [...document.querySelectorAll('[data-parallax]')].map(element => ({ element, top: 0, height: 1 }));
    const themes = [...document.querySelectorAll('[data-nav-theme]')].filter(element => element !== header).map(element => ({
      element, theme: element.dataset.navTheme, top: 0, height: 1,
    }));
    // Exact published assembly delays, directions (em), and durations (seconds).
    const introMap = [
      [0,25,1.16,2],[0,-15,1.41,2],[0,15,1.16,2],[0,-25,1.37,2],
      [0,25,1.36,2],[0,-15,1.61,2],[0,15,1.36,2],[0,-25,1.57,2],
      [0,25,1.47,2],[0,-15,1.72,2],[0,15,1.47,2],[0,-25,1.68,2],
      [20,0,1.72,2.41],[20,0,1.96,2.41],[0,5,2.12,2.41],[0,-5,2.24,2.41],
      [0,5,2.36,2.41],[0,-5,2.48,2.41],[0,5,2.60,2.41],[0,-5,2.72,2.41],
      [-20,0,2.06,2.41],[-20,0,2.16,2.41],
    ];
    let reduced = preference.matches, lenis = null, overlayOpen = false, nativeOverlayOpen = false;
    let frame = 0, measureFrame = 0, lastTime = 0, rotorTime = 0, introTime = 0;
    let introRunning = false, introComplete = false, headerHeight = 80;
    let viewportWidth = innerWidth, viewportHeight = innerHeight, lastWidth = -1;
    let focusNavigation = false, dirty = true, safetyTimer = 0, measurePending = false;
    const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
    const power4Out = value => 1 - (1 - clamp(value)) ** 5;
    const expoOut = value => value >= 1 ? 1 : value <= 0 ? 0 : 1 - 2 ** (-10 * value);
    const phase = (time, delay, duration, easing = power4Out) => easing(clamp((time - delay) / duration));
    const pageY = () => scrollY || pageYOffset || 0;
    const metrics = (element, y) => {
      const rect = element.getBoundingClientRect(); return { top: rect.top + y, height: Math.max(1, rect.height) };
    };
    const rangeProgress = (y, top, height) => clamp((y + viewportHeight - top) / (height + viewportHeight));
    const needsPause = () => reduced || document.hidden || overlayOpen || nativeOverlayOpen || introRunning;
    function syncScrollLock() {
      if (!lenis) return;
      if (needsPause()) lenis.stop(); else lenis.start();
    }
    function createLenis() {
      if (lenis || reduced || typeof window.Lenis !== 'function') return;
      try {
        lenis = new window.Lenis({
          duration: 1.2, easing: time => Math.min(1, 1.001 - 2 ** (-10 * time)),
          direction: 'vertical', gestureDirection: 'vertical', smooth: true,
          mouseMultiplier: 1, smoothTouch: false, touchMultiplier: 2, infinite: false,
        });
        lenis.on('scroll', () => { dirty = true; requestTick(); }); syncScrollLock();
      } catch (error) { lenis = null; console.warn('CareFlow native scroll fallback:', error.message); }
    }

    function buildText(element, type) {
      if (!originalText.has(element)) originalText.set(element, element.innerHTML);
      const source = document.createElement('span'); source.innerHTML = originalText.get(element);
      if (source.querySelector('a,button,input,select,textarea')) return null;
      const accessibleText = source.innerText || source.textContent || '';
      const srText = document.createElement('span'); srText.className = 'cf-sr-text'; srText.textContent = accessibleText;
      const content = document.createElement('span'); content.className = 'cf-split-content'; content.setAttribute('aria-hidden','true');
      const tokens = [], units = [];
      const graphemes = text => typeof Intl.Segmenter === 'function'
        ? [...new Intl.Segmenter('zh-Hant',{granularity:'grapheme'}).segment(text)].map(item => item.segment) : Array.from(text);
      function walk(node) {
        if (node.nodeType === Node.TEXT_NODE) graphemes(node.textContent).forEach(text => tokens.push({text}));
        else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'BR') tokens.push({br:true}); else [...node.childNodes].forEach(walk);
        }
      }
      [...source.childNodes].forEach(walk);
      element.replaceChildren(srText,content); element.classList.add('cf-split');
      if (type === 'lines') {
        const measuring = tokens.map(token => {
          const span = document.createElement(token.br ? 'br' : 'span');
          if (!token.br) span.textContent = token.text;
          content.append(span); return {...token,span};
        });
        const lines = []; let line = '', previousTop = null;
        measuring.forEach(token => {
          if (token.br) { lines.push(line); line = ''; previousTop = null; return; }
          const top = token.span.getBoundingClientRect().top;
          if (previousTop !== null && Math.abs(top-previousTop)>3) { lines.push(line); line=''; }
          line += token.text; previousTop=top;
        });
        if (line) lines.push(line);
        content.replaceChildren();
        lines.forEach(text => {
          const mask=document.createElement('span'); mask.className='cf-line-mask';
          const unit=document.createElement('span'); unit.className='cf-line'; unit.textContent=text;
          mask.append(unit); content.append(mask); units.push(unit);
        });
      } else tokens.forEach(token => {
        if (token.br) return content.append(document.createElement('br'));
        const mask=document.createElement('span'); mask.className='cf-char-mask';
        const unit=document.createElement('span'); unit.className='cf-char'; unit.textContent=token.text;
        if (/^\s+$/.test(token.text)) mask.classList.add('cf-space');
        mask.append(unit); content.append(mask); units.push(unit);
      });
      return {element,type,units,top:0,height:1,progress:0,last:-1,
        wipe:wipes.find(item=>item.element.contains(element)),hero:element.hasAttribute('data-hero-line')};
    }
    function prepareText(rebuild=false) {
      if (!rebuild) document.querySelectorAll('[data-split]').forEach(element => {
        const record=buildText(element,element.dataset.split==='lines'?'lines':'chars'); if(record)splitRecords.push(record);
      });
      else splitRecords.forEach((record,index)=>{
        if(record.type==='lines'){const fresh=buildText(record.element,record.type);if(fresh)splitRecords[index]=fresh;}
      });
      heroLines.forEach(element=>{
        if(element.querySelector(':scope > .cf-hero-line-mask'))return;
        const mask=document.createElement('span');mask.className='cf-hero-line-mask';
        const line=document.createElement('span');line.className='cf-hero-line';
        while(element.firstChild)line.append(element.firstChild);
        mask.append(line);element.append(mask);
      });
    }
    function setIntro(time) {
      introTime=time;
      parts.forEach(element=>{
        const entry=introMap[Number(element.dataset.machinePart)-1]||[0,5,1.16,2];
        const p=phase(time,entry[2],entry[3]);
        element.style.translate=`${(entry[0]*(1-p)).toFixed(4)}em ${(entry[1]*(1-p)).toFixed(4)}em`;
        element.style.opacity=p.toFixed(5);
      });
      introStripes.forEach((stripe,index)=>{
        const side=index===0||index===introStripes.length-1;
        const delay=side?(index===0?.01:.69):.16+(index-1)/11*.5;
        stripe.style.height=`${(100*(1-phase(time,delay,1))).toFixed(5)}%`;
      });
      if(curtain)curtain.style.visibility=time>=1.7?'hidden':'visible';
      heroLines.forEach((element,index)=>{
        const line=element.querySelector('.cf-hero-line');
        if(line)line.style.translate=`0 ${(5*(1-phase(time,2.79+index*.3,1.27))).toFixed(5)}em`;
      });
      if(subtitle)subtitle.style.opacity=phase(time,3.75,1).toFixed(5);
      if(header)header.style.translate=`0 ${(-5*(1-phase(time,3.96,1.18))).toFixed(5)}em`;
      if(arrow){const p=phase(time,3.97,1.17);arrow.style.opacity=p.toFixed(5);arrow.style.translate=`0 ${(5*(1-p)).toFixed(5)}em`;}
      html.style.setProperty('--intro-progress',String(clamp(time/5.33)));
    }
    function finishIntro() {
      introRunning=false;introComplete=true;setIntro(5.33);clearTimeout(safetyTimer);
      html.classList.remove('cf-intro-running');html.classList.add('cf-intro-complete','hero-entered');
      if(hero)hero.classList.add('hero-entered');if(curtain)curtain.setAttribute('aria-hidden','true');
      syncScrollLock();dirty=true;requestTick();window.dispatchEvent(new CustomEvent('careflow:introcomplete'));
    }
    function replayIntro() {
      if(reduced){finishIntro();return;}
      scrollToTarget(0,{behavior:'instant'});introTime=0;introRunning=true;introComplete=false;
      html.classList.add('cf-intro-running');html.classList.remove('cf-intro-complete','hero-entered');
      setIntro(0);syncScrollLock();clearTimeout(safetyTimer);
      safetyTimer=setTimeout(finishIntro,7500);lastTime=0;requestTick();
    }
    function measure() {
      measureFrame=0;if(document.hidden){measurePending=true;return;}measurePending=false;
      viewportWidth=innerWidth;viewportHeight=innerHeight;
      if(lastWidth!==-1&&Math.abs(lastWidth-viewportWidth)>.5)prepareText(true);lastWidth=viewportWidth;
      headerHeight=header?header.getBoundingClientRect().height:80;html.style.setProperty('--header-height',`${headerHeight}px`);
      const y=pageY();
      stories.forEach(item=>{
        item.element.classList.toggle('is-static-story',reduced);item.element.classList.toggle('is-horizontal-story',!reduced);
        if(reduced)item.track.style.removeProperty('transform');
      });
      stories.forEach(item=>{
        const box=metrics(item.element,y);item.top=box.top;
        item.stickyTravel=Math.max(0,box.height-item.sticky.getBoundingClientRect().height);
        const tiny=viewportWidth<=479;
        item.start=item.top-(tiny?viewportHeight:0);
        item.range=tiny?viewportHeight+.6*box.height:.9*box.height;
        item.end=item.start+item.range;
        item.element.style.setProperty('--story-distance',`${viewportWidth*2.115}px`);
      });
      wipes.forEach((item,index)=>{
        const box=metrics(item.element,y);item.top=box.top;item.height=box.height;
        item.stickyHeight=item.sticky?.getBoundingClientRect().height||viewportHeight;
        item.start=item.top-viewportHeight;item.range=box.height+viewportHeight+(index===0?40:0);item.end=item.start+item.range;
      });
      finals.forEach(item=>{const box=metrics(item.element,y);item.top=box.top;item.range=Math.max(1,box.height-(item.sticky?.getBoundingClientRect().height||viewportHeight));});
      [splitRecords,services,valueMachines,parallax,themes].forEach(collection=>collection.forEach(item=>Object.assign(item,metrics(item.element,y))));
      rotors.forEach(item=>Object.assign(item,metrics(item.owner,y)));
      lenis?.resize?.();dirty=true;render(1);requestTick();
    }
    function refresh(){if(document.hidden){measurePending=true;return;}if(!measureFrame)measureFrame=requestAnimationFrame(measure);}
    function renderText(record,y,delta) {
      if(record.hero)return;
      const raw=reduced?1:record.wipe?record.wipe.progress:rangeProgress(y,record.top,record.height);
      const blend=delta>=1?1:1-Math.exp(-delta/.16);record.progress+=(raw-record.progress)*blend;
      if(Math.abs(record.progress-raw)<.0001)record.progress=raw;
      if(Math.abs(record.last-record.progress)<.00004&&record.last>=0)return;record.last=record.progress;
      const count=Math.max(1,record.units.length-1);
      record.units.forEach((unit,index)=>{
        const p=reduced?1:record.wipe?phase(record.progress*1.5,.24+index/count*.4,.05):record.type==='chars'?phase(record.progress*1.3,index/count*.3,1):phase(record.progress*.3,.01,.14);
        unit.style.translate=`0 ${(100*(1-p)).toFixed(4)}%`;
        if(record.wipe)unit.style.opacity=p.toFixed(5);
      });
      record.element.classList.toggle('is-visible',record.progress>.05||reduced);
    }
    function render(delta) {
      const y=pageY();let pending=false,navTheme='light',wipeNavTheme=null;
      if(header){
        const at=y+Math.min(headerHeight/2,48);
        themes.forEach(item=>{if(at>=item.top&&at<item.top+item.height)navTheme=item.theme;});
        header.classList.toggle('is-scrolled',y>24);
      }
      wipes.forEach((item,sceneIndex)=>{
        const raw=reduced?.5:clamp((y-item.start)/item.range);item.raw=raw;
        item.progress+=(raw-item.progress)*(delta>=1?1:1-Math.exp(-delta/.16));
        if(Math.abs(item.progress-raw)<.0001)item.progress=raw;else pending=true;
        const p=item.progress;item.element.style.setProperty('--wipe-progress',p.toFixed(5));
        const time=p*1.5;
        const stickyTop=Math.min(Math.max(item.top-y,0),item.top+item.height-item.stickyHeight-y);
        const headerY=Math.min(headerHeight/2,48);let headerCovered=0;
        item.stripes.forEach((stripe,index)=>{
          const stagger=index/Math.max(1,item.stripes.length-1)*.2;
          const closeStart=sceneIndex===0?.83:.81,closeDuration=sceneIndex===0?.47:.45;
          const opening=phase(time,stagger,.45),closing=phase(time,closeStart+stagger,closeDuration);
          const height=reduced?0:time<closeStart+stagger?100*(1-opening):100;
          const translation=reduced||time<closeStart+stagger?0:100*(1-closing);
          stripe.style.height=`${height.toFixed(4)}%`;stripe.style.translate=`0 ${translation.toFixed(4)}%`;
          const stripeHeight=height/100*item.stickyHeight;
          const stripeTop=stickyTop+translation/100*stripeHeight;
          if(headerY>=stripeTop&&headerY<stripeTop+stripeHeight)headerCovered++;
        });
        if(stickyTop<=headerY&&stickyTop+item.stickyHeight>=headerY){
          item.headerCovered=headerCovered/Math.max(1,item.stripes.length);
          wipeNavTheme=item.element.dataset.wipeTheme==='dark'?'light':item.headerCovered>=.5?'dark':'light';
        }
        const imageProgress=clamp(time/(sceneIndex===0?1.34:1.5));
        if(item.image)item.image.style.translate=`0 ${reduced?0:(30*(1-imageProgress)).toFixed(4)}%`;
      });
      if(header)header.dataset.navTheme=header.classList.contains('menu-is-active')?'dark':wipeNavTheme||navTheme;
      splitRecords.forEach(record=>{
        renderText(record,y,delta);
        const target=reduced?1:record.wipe?record.wipe.progress:rangeProgress(y,record.top,record.height);
        if(Math.abs(record.progress-target)>.0001)pending=true;
      });
      reveals.forEach(element=>element.classList.add('is-visible'));
      services.forEach(item=>{
        if(item.started<0&&(reduced||y+viewportHeight*.8>=item.top))item.started=performance.now();
        const elapsed=item.started<0?0:(performance.now()-item.started)/1000;
        const sign=item.element.dataset.enterFrom==='right'?1:item.element.dataset.enterFrom==='left'?-1:item.index%2?1:-1;
        const p=reduced?1:item.started<0?0:phase(elapsed,0,2,expoOut);
        if(item.tag)item.tag.style.translate=`${(sign*100*(1-p)).toFixed(4)}% 0`;
        if(item.number)item.number.style.opacity=(reduced?1:phase(elapsed,1.3,.5,expoOut)).toFixed(4);
        if(item.description)item.description.style.opacity=(reduced?1:phase(elapsed,.5,.5,expoOut)).toFixed(4);
        if(item.started>=0&&elapsed<2)pending=true;
      });
      valueMachines.forEach(item=>{
        const p=reduced?0:rangeProgress(y,item.top,item.height);
        item.nodes.forEach((node,index)=>{
          const input=Number(node.dataset.scrollRotate);
          const turn=Number.isFinite(input)&&input!==0?(Math.abs(input)<=1?input*360:input):(index%2?-360:360);
          const from=Number(node.dataset.rotateFrom)||0;node.style.rotate=`${(from+p*turn).toFixed(4)}deg`;
        });
      });
      stories.forEach(item=>{
        const raw=reduced?0:item.navigationProgress!==null?item.navigationProgress:clamp((y-item.start)/item.range);item.raw=raw;
        const coefficient=viewportWidth<=479?.5:.2;
        item.progress+=(raw-item.progress)*(delta>=1?1:1-(1-coefficient)**(delta*60));
        if(Math.abs(item.progress-raw)<.00001)item.progress=raw;else pending=true;
        const p=item.progress;item.x=reduced?0:-2.115*viewportWidth*p;
        item.element.style.setProperty('--story-progress',p.toFixed(6));
        if(!reduced)item.track.style.transform=`translate3d(${item.x.toFixed(4)}px,0,0)`;
        if(item.progressBar)item.progressBar.style.setProperty('--story-progress',p.toFixed(6));
        const ranges=[[0,.35,-7,-20],[.1,.7,0,-20],[.44,1,0,-17],[.8,1,0,-10]];
        item.media.forEach((media,index)=>{const r=ranges[index%4],local=clamp((p-r[0])/(r[1]-r[0]));media.style.translate=`${reduced?0:(r[2]+(r[3]-r[2])*local).toFixed(4)}% 0`;});
        const step=clamp(Math.round(p*3),0,3);
        if(item.rail){
          item.rail.style.setProperty('--story-progress',p.toFixed(6));item.rail.style.setProperty('--story-step',String(step));
          item.rail.querySelectorAll('[data-story-index]').forEach((node,index)=>node.classList.toggle('is-active',index===step));
        }
        if(step!==item.active){item.active=step;item.element.dataset.activePanel=String(step);
          item.panels.forEach((panel,index)=>panel.classList.toggle('is-active',!reduced&&index===step));
          item.element.dispatchEvent(new CustomEvent('careflow:storychange',{detail:{index:step,progress:p}}));}
      });
      finals.forEach(item=>{
        const p=reduced?1:clamp((y-item.top)/item.range);item.progress=p;item.element.style.setProperty('--final-progress',p.toFixed(5));
        item.paths.forEach(({path,length},index)=>{
          const local=reduced?1:phase(p,.04+index*.065,.28);
          if(length){path.style.strokeDasharray=`${length} ${length}`;path.style.strokeDashoffset=(length*(1-local)).toFixed(4);}
        });
        item.nodes.forEach((node,index)=>{
          const local=reduced?1:phase(p,.1+index*.045,.3);node.style.opacity=local.toFixed(5);
          node.style.rotate=`${reduced?0:((1-local)*(index%2?-90:90)+p*(index%2?-120:120)).toFixed(4)}deg`;
        });
      });
      rotors.forEach(item=>{
        const visible=item.top<y+viewportHeight&&item.top+item.height>y;
        const elapsed=Math.max(0,rotorTime-item.lastClock);item.lastClock=rotorTime;
        if(!reduced&&visible&&!overlayOpen&&!nativeOverlayOpen){item.clock+=elapsed;item.element.style.rotate=`${((item.clock/item.period)*360*item.direction%360).toFixed(4)}deg`;pending=true;}
        else if(reduced)item.element.style.rotate='0deg';
      });
      parallax.forEach(item=>{
        if(item.element.hasAttribute('data-wipe-image'))return;
        const speed=Number(item.element.dataset.parallax)||.08;
        const shift=reduced?0:clamp((y+viewportHeight/2-item.top-item.height/2)*speed,-90,90);
        item.element.style.setProperty('--parallax-y',`${shift.toFixed(4)}px`);
      });
      if(hero){const p=reduced?0:clamp(y/Math.max(1,hero.offsetHeight));hero.style.setProperty('--hero-progress',p.toFixed(5));}
      dirty=false;return pending;
    }
    function tick(time) {
      frame=0;if(document.hidden)return;
      const elapsed=lastTime?Math.max(0,(time-lastTime)/1000):1/60;
      const delta=Math.min(.25,elapsed);lastTime=time;lenis?.raf(time);
      if(!overlayOpen&&!nativeOverlayOpen)rotorTime+=elapsed;
      if(introRunning&&!overlayOpen&&!nativeOverlayOpen){setIntro(Math.min(5.33,introTime+elapsed));if(introTime>=5.33)finishIntro();}
      const pending=render(delta);if(lenis||introRunning||pending||dirty)requestTick();
    }
    function requestTick(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
    function resolveTarget(target) {
      if(target instanceof Element)return target;if(typeof target!=='string'||!target)return null;
      let id=target.startsWith('#')?target.slice(1):target;try{id=decodeURIComponent(id);}catch(_){}
      const byId=document.getElementById(id);if(byId)return byId;
      try{return document.querySelector(target);}catch(_){return null;}
    }
    function positionFor(target) {
      const story=stories.find(item=>!reduced&&item.element.contains(target));
      if(story){const panel=target.closest('.story-panel');if(panel){const index=story.panels.indexOf(panel);return story.start+clamp(Math.max(0,index)*.76375/2.115)*story.range;}return story.top;}
      return target.getBoundingClientRect().top+pageY()-headerHeight-18;
    }
    function clearPanelNavigation(){stories.forEach(item=>{item.navigationProgress=null;item.element.removeAttribute('data-panel-navigation');});dirty=true;requestTick();}
    function scrollToTarget(target,options={}) {
      const node=resolveTarget(target);let top=typeof target==='number'?target:node?positionFor(node):null;if(top===null)return false;
      clearPanelNavigation();
      const story=node&&!reduced?stories.find(item=>item.element.contains(node)):null;
      const panel=story?node.closest('.story-panel'):null;
      if(story&&panel){
        // Source tiny starts before pinning and desktop may finish after unpinning.
        // Explicit panel navigation holds that panel while keeping keyboard focus
        // inside the visible sticky viewport. Manual scrolling restores source mapping.
        story.navigationProgress=clamp(Math.max(0,story.panels.indexOf(panel))*.76375/2.115);
        story.element.dataset.panelNavigation='focus';
        top=clamp(top,story.top,story.top+story.stickyTravel);
      }
      if(introRunning)finishIntro();
      const immediate=reduced||['instant','auto'].includes(options.behavior)||options.immediate;
      if(lenis&&!overlayOpen&&!nativeOverlayOpen)lenis.scrollTo(Math.max(0,top),{immediate,duration:1.2,...options});
      else window.scrollTo({top:Math.max(0,top),behavior:immediate?'instant':'smooth'});
      dirty=true;requestTick();return true;
    }
    function focusTarget(target) {
      if(!target.matches('a[href],button,input,select,textarea,[tabindex]')){target.setAttribute('tabindex','-1');target.addEventListener('blur',()=>target.removeAttribute('tabindex'),{once:true});}
      focusNavigation=true;try{target.focus({preventScroll:true});}catch(_){}focusNavigation=false;
    }
    window.addEventListener('careflow:overlaychange',event=>{overlayOpen=Boolean(event.detail?.open);syncScrollLock();lastTime=0;requestTick();});
    // App document handlers run first and may defer scrolling until a drawer exits.
    window.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const source=event.target instanceof Element?event.target:null;
      if(source?.closest('[data-skip-intro],[data-intro-skip]'))return finishIntro();
      if(source?.closest('[data-replay-intro],[data-intro-replay]'))return replayIntro();
      const anchor=source?.closest('a[href^="#"]');
      if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self'))return;
      const hash=anchor.getAttribute('href'),target=hash&&hash!=='#'?resolveTarget(hash):null;if(!target)return;
      event.preventDefault();if(location.hash!==hash)history.pushState(null,'',hash);scrollToTarget(target);focusTarget(target);
    });
    document.addEventListener('focusin',event=>{
      if(focusNavigation||reduced||!(event.target instanceof Element))return;
      const story=stories.find(item=>item.element.contains(event.target));if(!story)return;
      const target=event.target;
      requestAnimationFrame(()=>{
        if(document.activeElement!==target)return;
        const rect=target.getBoundingClientRect();
        if(rect.left<0||rect.right>viewportWidth||rect.top<headerHeight||rect.bottom>viewportHeight)scrollToTarget(target,{behavior:'instant'});
      });
    });
    addEventListener('wheel',clearPanelNavigation,{passive:true});
    addEventListener('touchstart',clearPanelNavigation,{passive:true});
    addEventListener('pointerdown',clearPanelNavigation,{passive:true});
    addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)&&!(event.target instanceof Element&&event.target.matches('input,textarea,select')))clearPanelNavigation();});
    addEventListener('scroll',()=>{dirty=true;requestTick();},{passive:true});
    addEventListener('resize',refresh,{passive:true});addEventListener('orientationchange',refresh,{passive:true});
    addEventListener('hashchange',()=>scrollToTarget(location.hash,{behavior:'auto'}));addEventListener('load',refresh,{once:true});
    addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;lenis?.stop();});
    addEventListener('pageshow',event=>{if(event.persisted){lastTime=0;syncScrollLock();refresh();}});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){if(frame)cancelAnimationFrame(frame);if(measureFrame)cancelAnimationFrame(measureFrame);frame=measureFrame=0;lastTime=0;}
      else{lastTime=0;refresh();requestTick();}syncScrollLock();
    });
    function mediaChanged(){reduced=preference.matches;clearPanelNavigation();html.classList.toggle('reduced-motion',reduced);if(reduced){finishIntro();lenis?.destroy();lenis=null;}else createLenis();refresh();requestTick();}
    if(preference.addEventListener)preference.addEventListener('change',mediaChanged);else preference.addListener(mediaChanged);
    if('ResizeObserver'in window){const observer=new ResizeObserver(refresh),main=document.querySelector('main');if(main)observer.observe(main);stories.forEach(item=>observer.observe(item.sticky));}
    if('MutationObserver'in window){const observer=new MutationObserver(()=>{const next=Boolean(document.querySelector('dialog[open]'));if(next!==nativeOverlayOpen){nativeOverlayOpen=next;syncScrollLock();requestTick();}});observer.observe(document.body,{attributes:true,attributeFilter:['open'],subtree:true});}
    document.querySelectorAll('details').forEach(element=>element.addEventListener('toggle',refresh));
    document.querySelectorAll('img').forEach(image=>{if(!image.complete)image.addEventListener('load',refresh,{once:true});});
    if(document.fonts?.ready)document.fonts.ready.then(()=>{prepareText(true);refresh();});
    function getState(){return{
      reduced,visible:!document.hidden,scrollY:pageY(),viewport:{width:viewportWidth,height:viewportHeight},
      intro:{running:introRunning,complete:introComplete,time:introTime,duration:5.33,parts:parts.length,stripes:introStripes.length},
      lenis:{enabled:Boolean(lenis),paused:needsPause(),overlayOpen:overlayOpen||nativeOverlayOpen},
      stories:stories.map(item=>({id:item.element.id,top:item.top,start:item.start,end:item.end,range:item.range,raw:item.raw,progress:item.progress,x:item.x,endX:-2.115*viewportWidth,navigationProgress:item.navigationProgress})),
      wipes:wipes.map(item=>({id:item.element.id,top:item.top,start:item.start,end:item.end,range:item.range,raw:item.raw,progress:item.progress,headerCovered:item.headerCovered})),
      final:finals.map(item=>({progress:item.progress,paths:item.paths.length,nodes:item.nodes.length})),
      text:{blocks:splitRecords.length,lines:splitRecords.filter(item=>item.type==='lines').length},rotors:rotors.length,services:services.length,measurePending,
    };}
    window.CareFlowMotion={refresh,scrollTo:scrollToTarget,replayIntro,skipIntro:finishIntro,
      get reduced(){return reduced;},get lenis(){return lenis;},debugGetState:getState,debug:{getState},getState};
    prepareText();html.classList.add('cf-motion','motion-ready');html.classList.toggle('reduced-motion',reduced);createLenis();measure();
    if(reduced||(location.hash&&location.hash!=='#top')||pageY()>80)finishIntro();else replayIntro();
    if(location.hash&&location.hash!=='#top')requestAnimationFrame(()=>scrollToTarget(location.hash,{behavior:'instant'}));
    window.dispatchEvent(new CustomEvent('careflow:motionready'));
  };
  const safeStart=()=>{try{start();}catch(error){
    try{window.CareFlowMotion?.lenis?.destroy();}catch(_){}
    const html=document.documentElement;html.classList.remove('cf-motion','motion-ready','cf-intro-running');html.classList.add('cf-intro-complete','hero-entered');
    html.classList.remove('lenis','lenis-smooth','lenis-stopped','lenis-scrolling');
    document.querySelectorAll('.hero-curtain,.wipe-mask').forEach(element=>element.style.display='none');
    document.querySelectorAll('[data-reveal]').forEach(element=>element.classList.add('is-visible'));
    document.querySelectorAll('.story-section').forEach(element=>{element.classList.add('is-static-story');element.classList.remove('is-horizontal-story');});
    console.warn('CareFlow readable motion fallback:',error);
  }};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',safeStart,{once:true});else safeStart();
})();
