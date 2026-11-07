/* Layout and interaction review. External services are local fixtures; no messages are published. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const modules=process.env.JADE_MODULES || path.join(process.env.TEMP,'jade-home-qa/node_modules');
const {default:puppeteer}=await import(pathToFileURL(path.join(modules,'puppeteer-core/lib/puppeteer/puppeteer-core.js')));
const root=path.resolve(process.env.JADE_ROOT || '.');
const output=process.env.JADE_REPORTS || path.join(process.env.TEMP,'jade-interior-qa');
const vendor=path.join(process.env.TEMP,'jade-interior-qa/vendor');
await fs.mkdir(output,{recursive:true});
const routes=process.argv[2]?.split(',') || ['/resume/','/archives/','/blog/','/column/','/visitors/','/guestbook/','/blog/posts/ecg762-hw7/','/column/posts/lake-mead-autumn/','/column/posts/exam-clock/'];
const widths=(process.env.JADE_WIDTHS || '1440,390').split(',').map(Number);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.mp4':'video/mp4'};
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,pipe:true,args:['--disable-gpu']});
const results=[];
try {
  for(const route of routes) for(const width of widths) {
    const page=await browser.newPage();
    const errors=[],missing=[],writes=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width,height:width<800?844:1000,deviceScaleFactor:1});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.evaluateOnNewDocument(()=>{sessionStorage.setItem('vt_'+location.pathname,'1'); localStorage.clear();});
    await page.setRequestInterception(true);
    page.on('request',async request=>{
      const url=new URL(request.url());
      const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
      const respond=data=>request.respond({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(data)});
      try {
        let file;
        if(url.hostname==='jade-review.local') {
          file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
          if(file!==root&&!file.startsWith(root+path.sep)) return request.abort();
          if((await fs.stat(file)).isDirectory()) file=path.join(file,'index.html');
        } else if(url.hostname==='cdn.jsdelivr.net'&&url.pathname.startsWith('/npm/katex@0.16.11/')) {
          file=path.join(modules,'katex',url.pathname.slice('/npm/katex@0.16.11/'.length));
        } else if(url.hostname==='d3js.org') file=path.join(vendor,'d3.js');
        else if(url.pathname.includes('topojson@3')) file=path.join(vendor,'topojson.js');
        else if(url.pathname.includes('world-atlas@2')) file=path.join(vendor,'world.json');
        else if(url.hostname.endsWith('firebaseio.com')) {
          if(request.method()==='OPTIONS') return request.respond({status:204,headers:cors,body:''});
          if(request.method()!=='GET') { writes.push({url:request.url(),method:request.method(),body:request.postData()}); return respond({name:'preview-post'}); }
          if(url.pathname.endsWith('/likes.json')) return respond(3);
          if(url.pathname==='/guestbook.json') return respond({a:{name:'Preview reader',message:'A local preview of a short note about research and learning.',ts:Date.now()-3600000,likes:3},b:{name:'Preview visitor',message:'A second note for checking the message layout.',ts:Date.now()-86400000,likes:1}});
          if(url.pathname==='/locations.json') return respond({london:{lat:51.51,lon:-.13,country:'United Kingdom',country_code:'GB',city:'London',count:8,last_visit:Date.now()-3600000}});
          if(url.pathname==='/recents.json') return respond({one:{city:'London',country:'United Kingdom',country_code:'GB',ts:Date.now()-3600000}});
          return respond(null);
        } else if(['ipapi.co','ipwhois.app','ipwho.is','ip-api.com'].includes(url.hostname)) return respond({city:'London',country:'United Kingdom',country_name:'United Kingdom',country_code:'GB',latitude:51.51,longitude:-.13,success:true});
        else return request.respond({status:404,body:''});
        await request.respond({status:200,headers:cors,contentType:mime[path.extname(file).toLowerCase()]||'application/octet-stream',body:await fs.readFile(file)});
      } catch {
        if(url.hostname==='jade-review.local') missing.push(url.pathname);
        await request.respond({status:404,body:''}).catch(()=>{});
      }
    });
    await page.goto('https://jade-review.local'+route,{waitUntil:'networkidle0',timeout:30000});
    await page.evaluate(()=>document.fonts.ready);
    const name=(route.replace(/^\//,'').replace(/\/$/,'').replaceAll('/','-')||'home')+'-'+width;
    await page.screenshot({path:path.join(output,name+'.png')});
    const review=await page.evaluate(()=>({
      title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      canvas:document.querySelectorAll('canvas,.field-tools').length,
      math:document.querySelectorAll('.katex').length,mathErrors:document.querySelectorAll('.katex-error').length,
      art:[...document.querySelectorAll('.jade-masthead__art img')].map(n=>({src:n.currentSrc,loaded:n.complete&&n.naturalWidth>0})),
      links:[...document.querySelectorAll('.nav-links a')].map(n=>n.getAttribute('href'))
    }));
    assert.ok(review.scrollWidth<=width+1,`${name}: horizontal overflow ${review.scrollWidth}`);
    assert.equal(review.canvas,0,`${name}: old artwork controls`);
    assert.equal(review.mathErrors,0,`${name}: math rendering`);
    assert.ok(review.art.every(a=>a.loaded),`${name}: artwork loaded`);
    const menu=await page.$('.menu-toggle');
    if(menu&&await menu.isVisible()) {
      await menu.focus(); await page.keyboard.press('Enter');
      assert.equal(await menu.evaluate(n=>n.getAttribute('aria-expanded')),'true');
      await page.keyboard.press('Escape');
      assert.equal(await menu.evaluate(n=>n.getAttribute('aria-expanded')),'false');
      review.menu=true;
    }
    if(route==='/blog/') {
      const button=await page.$('button.cat-header'); assert.ok(button);
      await button.focus(); await page.keyboard.press('Enter');
      assert.equal(await button.evaluate(n=>n.getAttribute('aria-expanded')),'true');
      assert.ok(await page.$eval('.cat-extras',n=>!n.hidden));
      await page.keyboard.press('Enter');
      assert.ok(await page.$eval('.cat-extras',n=>n.hidden));
      review.categories=await page.$$eval('.category-block',nodes=>nodes.length);
    }
    if(route==='/archives/') { review.archiveRows=await page.$$eval('.arc-post-row',nodes=>nodes.length); assert.ok(review.archiveRows>0); }
    if(route==='/visitors/') { review.mapCountries=await page.$$eval('#world-map path',nodes=>nodes.length); assert.ok(review.mapCountries>100); }
    if(route==='/guestbook/') {
      await page.click('#submit-btn'); assert.equal(writes.length,0,'Empty message must not submit');
      await page.click('#gb-anon'); assert.ok(await page.$eval('#gb-name',n=>n.disabled));
      await page.click('#gb-anon');
      await page.type('#gb-name','Preview test'); await page.type('#gb-msg','Local interaction check.');
      assert.match(await page.$eval('#char-counter',n=>n.textContent),/24\s*\/\s*500/);
      await page.click('#submit-btn');
      await page.waitForFunction(()=>document.querySelector('#submit-status').classList.contains('ok'));
      assert.equal(writes.length,1,'Only the mocked message is submitted');
      assert.equal(JSON.parse(writes[0].body).city,null,'Location remains opt-in');
      await page.click('#sort-top'); assert.ok(await page.$eval('#sort-top',n=>n.classList.contains('active')));
      await page.click('#like-a'); await page.waitForFunction(()=>document.querySelector('#like-a').getAttribute('aria-pressed')==='true');
      review.form=true;
    }
    if(route==='/resume/') {
      await page.emulateMediaType('print');
      review.print=await page.evaluate(()=>({header:getComputedStyle(document.querySelector('body>header')).display,button:getComputedStyle(document.querySelector('.btn-print')).display,art:getComputedStyle(document.querySelector('.jade-masthead__art')).display}));
      assert.deepEqual(Object.values(review.print),['none','none','none']);
      await page.emulateMediaType('screen');
    }
    if(route.includes('exam-clock')) {
      const time=await page.$eval('#clock',n=>n.textContent); assert.match(time,/\d\d:\d\d:\d\d/);
      await page.waitForFunction(old=>document.querySelector('#clock').textContent!==old,{},time);
      review.clock=true;
    } else {
      review.zoom200=await page.evaluate(()=>{
        // Scale each KaTeX expression at its root so its internal em-based geometry stays intact.
        const nodes=[...document.body.querySelectorAll('*')].filter(n=>!['SCRIPT','STYLE'].includes(n.tagName)&&!n.closest('.katex')&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())).concat([...document.querySelectorAll('.katex')]);
        const sizes=nodes.map(n=>[n,n.style.fontSize,parseFloat(getComputedStyle(n).fontSize)]);
        sizes.forEach(([n,,size])=>n.style.fontSize=size*2+'px');
        const result={width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollX,offenders:[...document.body.querySelectorAll("*")].filter(n=>{
          if(n.getBoundingClientRect().right+scrollX<=innerWidth+1||getComputedStyle(n).display==='none') return false;
          for(let parent=n.parentElement;parent&&parent!==document.body;parent=parent.parentElement) {
            if(['auto','hidden','clip','scroll'].includes(getComputedStyle(parent).overflowX)&&parent.getBoundingClientRect().right+scrollX<=innerWidth+1) return false;
          }
          return true;
        }).map(n=>({tag:n.tagName,class:n.className,text:n.textContent.slice(0,60),right:n.getBoundingClientRect().right})).slice(0,10)};
        if(result.scrollWidth>innerWidth+1) {
          result.probes={};
          for(const selector of ['.katex','table','pre','header','footer','button']) {
            const style=document.createElement('style');style.textContent=selector+'{display:none!important}';document.head.append(style);
            result.probes[selector]=document.documentElement.scrollWidth;style.remove();
          }
        }
        sizes.forEach(([n,size])=>n.style.fontSize=size);
        return result;
      });
      assert.ok(review.zoom200.scrollWidth<=width+1,`${name}: text zoom overflow ${JSON.stringify(review.zoom200)}`);
    }
    assert.deepEqual(missing,[],`${name}: missing local assets`);
    assert.deepEqual(errors,[],`${name}: browser errors`);
    await page.evaluate(()=>{const hero=document.querySelector('.jade-masthead');if(hero)scrollTo(0,hero.offsetTop+hero.offsetHeight);});
    if(await page.$('.jade-masthead')) await page.screenshot({path:path.join(output,name+'-content.png')});
    review.livephotos=await page.$$eval('[data-live-photo]',nodes=>nodes.length);
    if(review.livephotos) {
      await page.$eval('.live-photo-gallery',node=>node.scrollIntoView({block:'start'}));
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-live-photo] img')].filter(n=>n.getBoundingClientRect().top<innerHeight).every(n=>n.complete&&n.naturalWidth>0));
      await page.screenshot({path:path.join(output,name+'-photos.png')});
    }
    results.push({route,width,...review,errors,missing});
    console.log(JSON.stringify({route,width,ok:true,math:review.math,categories:review.categories,form:review.form}));
    await fs.writeFile(path.join(output,'review.json'),JSON.stringify(results,null,2));
    await page.close();
  }
} finally { await browser.close(); }
