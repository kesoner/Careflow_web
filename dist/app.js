/* CareFlow presentation interactions. All consent and product data are synthetic and memory-only. */
(() => {
  'use strict';
  const init=()=>{
    const dialog=document.querySelector('#detail-dialog');
    const content=document.querySelector('#detail-content');
    const closeButton=document.querySelector('.close-dialog');
    const menu=document.querySelector('.menu-toggle');
    const nav=document.querySelector('#header-links');
    const announce=document.querySelector('.global-announcement');
    const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let opener=null,consent=null,navigationRequest=0;
    const localDate=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const today=localDate(new Date());
    const expiryDate=new Date();expiryDate.setDate(expiryDate.getDate()+30);
    const defaultExpiry=localDate(expiryDate);
    const scopeNames={costs:'照護方式與費用',policy:'保單給付摘要',funds:'試算資金與情境'};
    const recipientNames={family:'家人（示範）',specialist:'信託專員（示範）',facility:'安養機構（示範）'};
    const cases={
      prepare:{kicker:'01 / 提前準備',title:'現在，先準備。',lead:'把未來的照護，放進今天的安排。',body:'先整理資金與收支，再比較不同照護費用能支應的時間。',steps:['整理目前資金與每月收入。','選擇照護方式，輸入每月費用。','比較費用情境，再與專員確認。'],step:0,cta:'從我的安排開始'},
      together:{kicker:'02 / 家庭協作',title:'和家人，一起看。',lead:'讓關心有入口，也讓分享有界線。',body:'讓遠方的家人一起理解安排。分享範圍與期限，始終由本人決定。',steps:['選擇協助對象與資料範圍。','確認示範期限與用途。','需要時調整或撤回分享設定。'],consent:true,cta:'體驗分享設定'},
      change:{kicker:'03 / 事件後更新',title:'費用，改變了。',lead:'更新一次，重新看清每月缺口。',body:'照護費或收入變了，把更新前後的安排放在一起比較。',steps:['更新照護方式與新的每月費用。','查看支應期間與未確認給付。','保留情境摘要，送請專員確認。'],step:1,cta:'更新示範費用'}
    };

    const mobile=window.matchMedia('(max-width:650px)');
    const reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
    const header=document.querySelector('.site-header');
    const main=document.querySelector('main');
    const expo=t=>t>=1?1:1-Math.pow(2,-10*t);
    const clamp=t=>Math.max(0,Math.min(1,t));
    let shell=dialog.querySelector('.detail-shell');
    if(!shell){shell=document.createElement('div');shell.className='detail-shell';[...dialog.children].forEach(node=>shell.append(node));dialog.append(shell);}
    shell.setAttribute('data-lenis-prevent','');
    let backdrop=dialog.querySelector('.detail-overlay');
    if(!backdrop){backdrop=document.createElement('div');backdrop.className='detail-overlay';backdrop.setAttribute('aria-hidden','true');dialog.prepend(backdrop);}
    const drawer={phase:'closed',progress:0,opacity:0,cancel:null,promise:Promise.resolve(true),returnFocus:true};
    const menuState={phase:'closed',progress:0,desired:false,cancel:null,promise:Promise.resolve(true)};
    let mainWasInert=false,resizeTimer;
    const drawerActive=()=>drawer.phase!=='closed';
    const menuActive=()=>menuState.phase!=='closed';
    function overlay(source,phase){
      document.body.classList.toggle('dialog-open',drawerActive());
      document.body.classList.toggle('menu-open',menuActive());
      window.dispatchEvent(new CustomEvent('careflow:overlaychange',{detail:{open:drawerActive()||menuActive(),source,phase}}));
    }
    function timeline(controller,duration,draw){
      controller.cancel?.();
      return new Promise(resolve=>{
        let raf=0,done=false;const start=performance.now();
        const finish=ok=>{if(done)return;done=true;cancelAnimationFrame(raf);controller.cancel=null;resolve(ok);};
        controller.cancel=()=>finish(false);
        if(reduced.matches||!duration){draw(duration);finish(true);return;}
        const tick=now=>{const elapsed=reduced.matches?duration:Math.min(duration,now-start);draw(elapsed);if(elapsed>=duration)finish(true);else raf=requestAnimationFrame(tick);};
        draw(0);raf=requestAnimationFrame(tick);
      });
    }
    function paintDrawer(){
      shell.style.transform='translate3d('+((1-drawer.progress)*100).toFixed(5)+'%,0,0)';
      backdrop.style.opacity=String(drawer.opacity);
      dialog.dataset.phase=drawer.phase;
    }
    function restoreOpener(){
      if(opener?.isConnected&&opener.getClientRects().length&&!opener.closest('[inert]'))opener.focus({preventScroll:true});
      else if(mobile.matches)menu.focus({preventScroll:true});
    }
    async function close(returnFocus=true){
      if(drawer.phase==='closed')return true;
      if(drawer.phase==='closing')return drawer.promise;
      drawer.cancel?.();drawer.returnFocus=returnFocus;drawer.phase='closing';overlay('dialog','closing');
      const from=drawer.progress,fromOpacity=drawer.opacity;
      drawer.promise=timeline(drawer,700,time=>{
        drawer.progress=from*(1-expo(clamp(time/700)));
        drawer.opacity=fromOpacity*(1-expo(clamp((time-200)/500)));
        paintDrawer();
      });
      const completed=await drawer.promise;if(!completed)return false;
      drawer.phase='closed';drawer.progress=0;drawer.opacity=0;paintDrawer();
      if(dialog.open)dialog.close();
      overlay('dialog','closed');if(drawer.returnFocus)restoreOpener();window.CareFlowMotion?.refresh();
      return true;
    }
    function clearMenuStyles(){
      nav.style.removeProperty('transform');
      nav.querySelectorAll('a').forEach(link=>{link.style.removeProperty('transform');link.style.removeProperty('opacity');});
    }
    async function setMenu(open,options={}){
      const desired=Boolean(open&&mobile.matches);
      if(desired===menuState.desired&&(menuState.phase==='open'||menuState.phase==='opening'||(!desired&&(menuState.phase==='closed'||menuState.phase==='closing'))))return menuState.promise;
      menuState.cancel?.();menuState.desired=desired;menu.setAttribute('aria-expanded',String(desired));
      if(desired){
        if(menuState.phase==='closed'){mainWasInert=Boolean(main?.inert);if(main)main.inert=true;}
        nav.classList.add('is-open');header.classList.add('menu-is-active');nav.inert=false;nav.removeAttribute('aria-hidden');menuState.phase='opening';
      }else menuState.phase='closing';
      overlay('menu',menuState.phase);
      const from=menuState.progress,duration=options.immediate?0:desired?850:650;
      const links=[...nav.querySelectorAll('a')];
      menuState.promise=timeline(menuState,duration,time=>{
        const p=duration?expo(clamp(time/duration)):1;
        menuState.progress=from+((desired?1:0)-from)*p;
        nav.style.transform='translate3d(0,'+(-100*(1-menuState.progress)).toFixed(5)+'%,0)';
        links.forEach((link,index)=>{
          const entry=duration?expo(clamp((time-120-index*70)/480)):1;
          const lp=desired?Math.max(from,entry):menuState.progress;
          link.style.opacity=String(lp);link.style.transform='translate3d(0,'+((1-lp)*24).toFixed(3)+'px,0)';
        });
      });
      const completed=await menuState.promise;if(!completed)return false;
      menuState.phase=desired?'open':'closed';
      if(desired){menuState.progress=1;nav.querySelector('a')?.focus({preventScroll:true});}
      else{
        menuState.progress=0;nav.classList.remove('is-open');header.classList.remove('menu-is-active');
        nav.inert=mobile.matches;
        if(mobile.matches)nav.setAttribute('aria-hidden','true');else nav.removeAttribute('aria-hidden');
        if(main)main.inert=mainWasInert;clearMenuStyles();
        if(options.returnFocus!==false&&mobile.matches&&!drawerActive())menu.focus({preventScroll:true});
      }
      overlay('menu',menuState.phase);window.CareFlowMotion?.refresh();return true;
    }
    async function goToProduct(step){
      const request=++navigationRequest;
      const result=await Promise.all([close(false),setMenu(false,{returnFocus:false})]);
      if(result.some(ok=>!ok)||request!==navigationRequest)return;
      window.CareFlowDemo?.goToStep?.(step);
      if(window.CareFlowMotion?.scrollTo)window.CareFlowMotion.scrollTo('#experience');
      else document.querySelector('#experience')?.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
    }
    function focusable(root){
      return [...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node=>node.getClientRects().length&&!node.closest('[hidden],[inert]')&&getComputedStyle(node).visibility!=='hidden');
    }
    function revealTags(){
      document.querySelectorAll('.situation-tag:not(.is-tag-visible)').forEach(tag=>{
        // Webflow e-27 measures its untransformed vertical resting position.
        // Reading only the vertical bounds avoids clipped horizontal transforms.
        const bounds=tag.getBoundingClientRect();
        if(reduced.matches||(bounds.top<=innerHeight*.8&&bounds.bottom>=0))tag.classList.add('is-tag-visible');
      });
    }
    function bodyMarkup(v){return `<div class="detail-body"><span class="eyebrow">${v.kicker}</span><h2 id="detail-title">${v.title}</h2><p class="detail-lead">${v.lead}</p><p>${v.body}</p><ol class="detail-steps">${v.steps.map((s,i)=>`<li><span>0${i+1}</span>${s}</li>`).join('')}</ol>${v.consent?`<button type="button" class="detail-action" data-switch-consent>${v.cta} ↗</button>`:`<a class="detail-action" href="#experience" data-demo-step="${v.step}">${v.cta} ↗</a>`}</div>`;}
    function consentResult(){
      if(!consent)return '';
      if(consent.revoked)return `<section class="consent-result" aria-live="polite"><h3>示範授權已撤回</h3><p>已停止本次示範分享。</p></section>`;
      return `<section class="consent-result" aria-live="polite"><h3>示範分享範圍已設定</h3><p>對象：${escape(recipientNames[consent.recipient])}<br>範圍：${consent.scopes.map(s=>escape(scopeNames[s])).join('、')}<br>期限：${escape(consent.expiry)}<br>用途：協助理解本次照護財務情境。</p><p class="quiet-note">僅模擬設定，未傳送資料。</p><button type="button" data-revoke-consent>撤回示範授權</button></section>`;
    }
    function consentMarkup(){return `<div class="detail-body"><span class="eyebrow">PERMISSION / 分享界線</span><h2 id="detail-title">需要協助，<br>也保有自己的界線。</h2><p class="detail-lead">試設一次分享對象、範圍與期限。</p><p>僅模擬分享設定，不傳送資料。</p><form class="detail-form" id="consent-form"><label for="consent-recipient">協助對象<select id="consent-recipient" name="recipient"><option value="family">家人（示範）</option><option value="specialist">信託專員（示範）</option><option value="facility">安養機構（示範）</option></select></label><fieldset><legend>允許查看的資料</legend><label><input type="checkbox" name="scope" value="costs" checked>照護方式與費用</label><label><input type="checkbox" name="scope" value="policy">保單給付摘要</label><label><input type="checkbox" name="scope" value="funds">試算資金與情境</label></fieldset><label for="consent-expiry">示範授權期限<input id="consent-expiry" name="expiry" type="date" min="${today}" value="${defaultExpiry}" required></label><p class="form-error" id="consent-error" role="alert"></p><button type="submit" class="detail-action">儲存示範分享範圍 ↗</button></form><div id="consent-result">${consentResult()}</div></div>`;}
    function fillPanel(type){
      if(cases[type])content.innerHTML=bodyMarkup(cases[type]);
      else if(type==='consent')content.innerHTML=consentMarkup();
      else if(type==='photos')content.innerHTML='<div class="detail-body"><span class="eyebrow">PHOTOGRAPHY / 圖片來源</span><h2 id="detail-title">真實生活，<br>真實的關心。</h2><p class="detail-lead">網站照片來自 Pexels 攝影師。</p><ul class="photo-sources"><li><a href="https://www.pexels.com/photo/grandparents-with-their-granddaughters-standing-by-the-shore-5637766/" target="_blank" rel="noopener noreferrer">陽光下的陪伴 ↗</a><span>RDNE Stock project</span></li><li><a href="https://www.pexels.com/photo/smiling-asian-grandmother-with-granddaughter-filling-dim-sum-in-kitchen-7363946/" target="_blank" rel="noopener noreferrer">祖孫的日常 ↗</a><span>Angela Roma</span></li><li><a href="https://www.pexels.com/photo/elderly-caregiver-assisting-senior-woman-at-home-29372727/" target="_blank" rel="noopener noreferrer">居家陪伴 ↗</a><span>Jsme MILA</span></li><li><a href="https://www.pexels.com/photo/a-cozy-couch-near-the-window-and-plants-6914713/" target="_blank" rel="noopener noreferrer">生活的空間 ↗</a><span>Aleks Michajlowicz</span></li></ul><p>照片用於情境呈現，不代表真實客戶或合作機構。</p><a class="text-link" href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">Pexels 使用授權 ↗</a></div>';
      else content.innerHTML='<div class="detail-body"><span class="eyebrow">ABOUT / 競賽提案</span><h2 id="detail-title">照護財務管家，<br>CareFlow。</h2><p class="detail-lead">從照護事件出發，讓安養信託安排持續更新。</p><p>AI 整理資訊，程式重算情境，由本人與信託專員把關。建議以六個月、160 萬元，先驗證整理、試算與覆核流程。</p><details class="prototype-note"><summary>原型範圍與試算假設</summary><p>本頁使用合成資料與固定收支試算，未計入利息、通膨、投資波動及相關費用，非完整動態信託模型。影片採 820 萬元情境，互動試算採 240 萬元情境，兩者不是同一組案例與模型。</p><p>AI 整理、事件提醒與外部資料串接屬提案規劃。目前操作僅在本頁示範，不傳送資料或執行給付。正式服務仍須完成授權、合作與銀行審查。</p></details><a class="detail-action" href="#experience" data-demo-step="0">體驗產品原型 ↗</a></div>';

      shell.scrollTop=0;
    }
    async function openPanel(type,trigger){
      navigationRequest++;
      if(trigger)opener=trigger;else if(!drawerActive())opener=document.activeElement;
      fillPanel(type);if(menuActive())setMenu(false,{returnFocus:false});drawer.returnFocus=true;
      if(drawer.phase==='open'||drawer.phase==='opening'){closeButton.focus({preventScroll:true});return drawer.promise;}
      drawer.cancel?.();drawer.phase='opening';if(!dialog.open)dialog.showModal();overlay('dialog','opening');
      const from=drawer.progress,fromOpacity=drawer.opacity;paintDrawer();closeButton.focus({preventScroll:true});
      drawer.promise=timeline(drawer,1000,time=>{
        drawer.progress=from+(1-from)*expo(clamp(time/1000));
        drawer.opacity=fromOpacity+(1-fromOpacity)*expo(clamp(time/500));paintDrawer();
      });
      const completed=await drawer.promise;if(completed){drawer.phase='open';paintDrawer();overlay('dialog','open');}return completed;
    }
    menu.addEventListener('click',()=>{navigationRequest++;setMenu(!menuState.desired);});
    closeButton.addEventListener('click',()=>close());
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('click',event=>{if(event.target===dialog||event.target===backdrop)close();});
    dialog.addEventListener('close',()=>{
      // A queued native close event may arrive after a rapid reopen.
      if(dialog.open||drawer.phase==='closed')return;
      drawer.cancel?.();drawer.phase='closed';drawer.progress=0;drawer.opacity=0;paintDrawer();overlay('dialog','closed');
      if(drawer.returnFocus)restoreOpener();window.CareFlowMotion?.refresh();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&drawerActive()){event.preventDefault();close();return;}
      if(event.key==='Escape'&&!drawerActive()&&menuActive()){event.preventDefault();setMenu(false);return;}
      if(event.key!=='Tab')return;
      const scope=drawerActive()?shell:menuActive()?header:null;if(!scope)return;
      const targets=focusable(scope),first=targets[0],last=targets[targets.length-1];
      if(!first){event.preventDefault();return;}
      if(event.shiftKey&&(document.activeElement===first||!scope.contains(document.activeElement))){event.preventDefault();last.focus({preventScroll:true});}
      else if(!event.shiftKey&&(document.activeElement===last||!scope.contains(document.activeElement))){event.preventDefault();first.focus({preventScroll:true});}
    });
    document.addEventListener('click',event=>{
      const trigger=event.target.closest('[data-open]');
      if(trigger){event.preventDefault();openPanel(trigger.dataset.open,trigger);return;}
      if(event.target.closest('[data-switch-consent]')){openPanel('consent');return;}
      if(event.target.closest('[data-revoke-consent]')){
        if(consent)consent.revoked=true;
        const result=document.querySelector('#consent-result');result.innerHTML=consentResult();result.setAttribute('tabindex','-1');result.focus({preventScroll:true});announce.textContent='示範授權已撤回。';return;
      }
      const step=event.target.closest('[data-demo-step]');
      if(step){event.preventDefault();goToProduct(Number(step.dataset.demoStep));return;}
      const menuLink=event.target.closest('.header-links a[href^="#"]');
      if(menuLink&&menuActive()){
        event.preventDefault();const request=++navigationRequest,target=menuLink.getAttribute('href');
        setMenu(false,{returnFocus:false}).then(ok=>{
          if(!ok||request!==navigationRequest)return;
          const destination=document.querySelector(target);
          if(window.CareFlowMotion?.scrollTo)window.CareFlowMotion.scrollTo(target);
          else destination?.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
          destination?.setAttribute('tabindex','-1');destination?.focus({preventScroll:true});
        });return;
      }
      if(event.target===nav&&menuActive())setMenu(false);
    });
    document.addEventListener('submit',event=>{
      if(event.target.id!=='consent-form')return;event.preventDefault();
      const data=new FormData(event.target),recipient=String(data.get('recipient')),expiry=String(data.get('expiry')),scopes=data.getAll('scope').filter(s=>Object.hasOwn(scopeNames,s));
      const error=document.querySelector('#consent-error');
      if(!Object.hasOwn(recipientNames,recipient)||!scopes.length){error.textContent='請選擇對象與至少一項資料範圍。';return;}
      const parsed=/^\d{4}-\d{2}-\d{2}$/.test(expiry)?new Date(expiry+'T00:00:00'):null;
      if(!parsed||!Number.isFinite(parsed.getTime())||localDate(parsed)!==expiry||expiry<today){error.textContent='請選擇有效的示範授權期限。';return;}
      consent={recipient,expiry,scopes,revoked:false};error.textContent='';
      const result=document.querySelector('#consent-result');result.innerHTML=consentResult();result.setAttribute('tabindex','-1');result.focus({preventScroll:true});
      announce.textContent='示範分享範圍已設定，沒有真實資料被分享。';
      result.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'nearest'});
    });
    document.querySelectorAll('details').forEach(el=>el.addEventListener('toggle',()=>window.CareFlowMotion?.refresh()));
    mobile.addEventListener('change',()=>{
      if(!mobile.matches&&menuActive())setMenu(false,{immediate:true,returnFocus:false});
      else if(!menuActive()){nav.inert=mobile.matches;if(mobile.matches)nav.setAttribute('aria-hidden','true');else nav.removeAttribute('aria-hidden');}
    });
    window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(revealTags,150);},{passive:true});
    window.addEventListener('scroll',revealTags,{passive:true});
    reduced.addEventListener('change',revealTags);
    nav.inert=mobile.matches;if(mobile.matches)nav.setAttribute('aria-hidden','true');
    paintDrawer();document.documentElement.classList.add('interactions-ready');revealTags();
    window.CareFlowSite={
      openPanel,closePanel:close,
      getConsent:()=>consent?JSON.parse(JSON.stringify(consent)):null,
      getOverlayState:()=>({dialog:{phase:drawer.phase,progress:drawer.progress,opacity:drawer.opacity},menu:{phase:menuState.phase,progress:menuState.progress},open:drawerActive()||menuActive()})
    };
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
