import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
const modulesRoot=process.env.JADE_MODULES || path.join(process.env.TEMP || '.', 'jade-home-qa', 'node_modules');
const {default:FullPageScreenshot}=await import(pathToFileURL(path.join(modulesRoot,'lighthouse/core/gather/gatherers/full-page-screenshot.js')));
export default class ReviewScreenshot extends FullPageScreenshot {
  async startInstrumentation(context) {
    const session=context.driver.defaultSession;
    if(process.env.JADE_OFFLINE==='1') {
      const root=path.resolve(process.env.JADE_ROOT || process.cwd());
      const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
      session.on('Fetch.requestPaused',async event=>{
        try {
          const url=new URL(event.request.url);
          if(url.hostname==='cdn.jsdelivr.net' && url.pathname.startsWith('/npm/katex@0.16.11/')) {
            const vendor=path.resolve(modulesRoot,'katex');
            const file=path.resolve(vendor,url.pathname.slice('/npm/katex@0.16.11/'.length));
            if(!file.startsWith(vendor+path.sep)) throw new Error('Outside pinned vendor directory');
            const body=await fs.readFile(file);
            await session.sendCommand('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:mime[path.extname(file)]||'application/octet-stream'},{name:'Access-Control-Allow-Origin',value:'*'}],body:body.toString('base64')});
            return;
          }
          if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) {await session.sendCommand('Fetch.failRequest',{requestId:event.requestId,errorReason:'BlockedByClient'});return;}
          let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
          if(!file.startsWith(path.resolve(root)+path.sep)&&file!==path.resolve(root)) throw new Error('Outside workspace');
          if((await fs.stat(file)).isDirectory()) file=path.join(file,'index.html');
          if(process.env.JADE_BLOCK_ART==='1'&&file.includes(path.join('assets','jade','art'))) throw new Error('Intentional texture failure');
          const body=await fs.readFile(file);
          await session.sendCommand('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:mime[path.extname(file)]||'application/octet-stream'},{name:'Content-Length',value:String(body.length)}],body:body.toString('base64')});
        }catch {await session.sendCommand('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:404,body:''}).catch(()=>{});}
      });
      await session.sendCommand('Fetch.enable',{patterns:[{urlPattern:'*'}]});
    }
    if(process.env.JADE_NOJS==='1') await session.sendCommand('Emulation.setScriptExecutionDisabled',{value:true});
    // Keep synthetic Lighthouse visits out of the existing production counters.
    await context.driver.defaultSession.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
      source:"try { sessionStorage.setItem('vt_' + location.pathname, '1'); } catch (_) {}"
    });
  }
  async stopInstrumentation(context) {
    if(process.env.JADE_NOJS==='1') await context.driver.defaultSession.sendCommand('Emulation.setScriptExecutionDisabled',{value:false});
  }
  async _resizeViewport() { /* Preserve svh: a full-height emulation changes the actual design. */ }
  async getArtifact(context) {
    const artifact=await super.getArtifact(context);
    const review=await context.driver.executionContext.evaluate(() => {
      const dimensions=()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1});
      const initial=dimensions();
      if(!document.body.classList.contains('home-jade')) return {path:location.pathname,initial,title:document.title,main:!!document.querySelector('main'),navigationLinks:document.querySelectorAll('.nav-links a').length,canvasCount:document.querySelectorAll('canvas').length,controlsCount:document.querySelectorAll('.field-tools').length,mathNodes:document.querySelectorAll('mjx-container, .katex').length,mathErrors:document.querySelectorAll('mjx-merror, .katex-error').length};
      const title=document.querySelector('h1');
      const menu=document.querySelector('.menu-toggle');
      const links=document.querySelector('.nav-links');
      const menuReview={visible:!!menu&&getComputedStyle(menu).display!=='none'};
      if(menuReview.visible) {
        menu.click();
        menuReview.open=menu.getAttribute('aria-expanded')==='true'&&getComputedStyle(links).display!=='none';
        menuReview.targetSizes=[...links.querySelectorAll('a')].map(a=>({label:a.textContent.trim(),height:a.getBoundingClientRect().height}));
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        menuReview.escapeCloses=menu.getAttribute('aria-expanded')==='false'&&document.activeElement===menu;
        menu.blur();
      }
      const nodes=[...document.body.querySelectorAll('*')].filter(n=>!['SCRIPT','STYLE'].includes(n.tagName)&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim()));
      const sizes=nodes.map(n=>[n,n.style.fontSize,parseFloat(getComputedStyle(n).fontSize)]);
      sizes.forEach(([n,,size])=>n.style.fontSize=(size*2)+'px');
      const zoom200=dimensions();
      zoom200.overflow=zoom200.document>initial.viewport+1;
      zoom200.offenders=nodes.filter(n=>{const r=n.getBoundingClientRect();return r.right>initial.viewport+1&&getComputedStyle(n).display!=='none';}).map(n=>({tag:n.tagName,class:n.className,text:n.textContent.slice(0,80),parent:n.parentElement.outerHTML.slice(0,600),right:n.getBoundingClientRect().right})).slice(0,12);
      sizes.forEach(([n,size])=>n.style.fontSize=size);
      const art=document.querySelector('.cw-jade__art img');
      return {initial,zoom200,menu:menuReview,title:title?.textContent.trim(),titleSize:getComputedStyle(title).fontSize,canvasCount:document.querySelectorAll('canvas').length,controlsCount:document.querySelectorAll('.field-tools').length,legacyArtCount:document.querySelectorAll('.home-hero__svg,.home-hero__mobile').length,art:art?{src:art.currentSrc,loaded:art.complete&&art.naturalWidth>0,width:art.naturalWidth,height:art.naturalHeight}:null,artHeight:document.querySelector('.cw-jade__art')?.getBoundingClientRect().height,colors:{ink:getComputedStyle(title).color,paper:getComputedStyle(document.body).backgroundColor}};
    },{args:[],useIsolation:false});
    if(review.path?.startsWith('/resume/')) {
      await context.driver.defaultSession.sendCommand('Emulation.setEmulatedMedia',{media:'print'});
      review.print=await context.driver.executionContext.evaluate(()=>({header:getComputedStyle(document.querySelector('body > header')).display,canvas:getComputedStyle(document.querySelector('.orbital-world')).display,controls:getComputedStyle(document.querySelector('.field-tools')).display,mainWidth:document.querySelector('main').getBoundingClientRect().width,bodyColor:getComputedStyle(document.body).color}),{args:[],useIsolation:false});
      await context.driver.defaultSession.sendCommand('Emulation.setEmulatedMedia',{media:''});
    }
    if(process.env.JADE_KEYBOARD==='1' && !review.path) {
      const session=context.driver.defaultSession;
      const press=async(key,code)=>{
        await session.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});
        await session.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code});
      };
      await context.driver.executionContext.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();document.body.removeAttribute('tabindex');},{args:[],useIsolation:false});
      await press('Tab',9);
      const skip=await context.driver.executionContext.evaluate(()=>document.activeElement.classList.contains('skip-link'),{args:[],useIsolation:false});
      await press('Tab',9);
      const brand=await context.driver.executionContext.evaluate(()=>document.activeElement.classList.contains('brand'),{args:[],useIsolation:false});
      await press('Tab',9);
      const third=await context.driver.executionContext.evaluate(()=>({tag:document.activeElement.tagName,classes:document.activeElement.className,focusVisible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineWidth}),{args:[],useIsolation:false});
      review.keyboard={skip,brand,third};
      if(third.classes.includes('menu-toggle')) {
        await press('Enter',13);
        review.keyboard.enterOpens=await context.driver.executionContext.evaluate(()=>document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true',{args:[],useIsolation:false});
        await press('Escape',27);
        review.keyboard.escapeCloses=await context.driver.executionContext.evaluate(()=>document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false'&&document.activeElement.classList.contains('menu-toggle'),{args:[],useIsolation:false});
      }
    }
    await fs.writeFile(process.env.JADE_REVIEW_FILE,JSON.stringify(review,null,2));
    return artifact;
  }
}
