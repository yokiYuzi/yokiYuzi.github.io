import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const modulesRoot=process.env.JADE_MODULES || path.join(process.env.TEMP || '.', 'jade-home-qa', 'node_modules');
const {default:lighthouse}=await import(pathToFileURL(path.join(modulesRoot,'lighthouse/core/index.js')));
const {default:puppeteer}=await import(pathToFileURL(path.join(modulesRoot,'puppeteer-core/lib/puppeteer/puppeteer-core.js')));
const {default:defaultConfig}=await import(pathToFileURL(path.join(modulesRoot,'lighthouse/core/config/default-config.js')));
import ReviewScreenshot from './review-screenshot.mjs';
const [name='desktop', width='1440', height='810', kind='desktop'] = process.argv.slice(2);
const directory=path.resolve(process.env.JADE_REPORTS || 'design/homepage/qa/results');
await fs.mkdir(directory,{recursive:true});
process.env.JADE_REVIEW_FILE=path.join(directory,name+'-review.json');
// Lighthouse's documented page transport; a pipe avoids the saturated IPv4 pool.
const targetUrl=process.env.JADE_URL || 'http://127.0.0.1:8765/';
const localTls=new URL(targetUrl).protocol==='https:' && ['localhost','127.0.0.1','[::1]'].includes(new URL(targetUrl).hostname);
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,pipe:true,acceptInsecureCerts:localTls,args:['--disable-gpu',...(localTls?['--ignore-certificate-errors']:[])]});
const page=await browser.newPage();
try {
  const result=await lighthouse(targetUrl, {output:['json','html'], logLevel:'error'}, {
    ...defaultConfig,
    artifacts:defaultConfig.artifacts.map(a=>a.id==='FullPageScreenshot'?{...a,gatherer:{instance:new ReviewScreenshot()}}:a),
    settings:{formFactor:kind,screenEmulation:{mobile:kind==='mobile',width:Number(width),height:Number(height),deviceScaleFactor:1,disabled:false},
      onlyCategories:['performance','accessibility'],
      throttlingMethod:kind==='desktop'?'provided':'simulate',
      maxWaitForLoad:30000,
      ...(name.includes('blocked')?{blockedUrlPatterns:['*/assets/jade/art/*']}:{}),
    },
  },page);
  await fs.writeFile(path.join(directory,name+'.json'),result.report[0]);
  await fs.writeFile(path.join(directory,name+'.html'),result.report[1].replace(/^[ \t]+$/gm,''));
  const lhr=result.lhr;
  const devtoolsLog=result.artifacts.DevtoolsLog||result.artifacts.DevtoolsLogError||[];
  const failedRequests=lhr.audits['network-requests']?.details?.items?.filter(i=>i.statusCode<200||i.statusCode>=400).map(i=>({url:i.url,status:i.statusCode}));
  await fs.writeFile(path.join(directory,name+'-network.json'),JSON.stringify({transport:process.env.JADE_OFFLINE==='1'?'filesystem via DevTools, layout only':'real HTTP',runtimeError:lhr.runtimeError,failedRequests,protocols:[...new Set(devtoolsLog.filter(e=>e.method==='Network.responseReceived').map(e=>e.params.response.protocol))],loadFailures:devtoolsLog.filter(e=>e.method==='Network.loadingFailed').map(e=>e.params)},null,2));
  for(const [suffix,data] of [['viewport',lhr.audits['final-screenshot']?.details?.data],['full',lhr.fullPageScreenshot?.screenshot?.data]]) {
    if(data) await fs.writeFile(path.join(directory,name+'-'+suffix+'.png'),Buffer.from(data.split(',')[1],'base64'));
  }
  const ids=['largest-contentful-paint','cumulative-layout-shift','total-blocking-time','speed-index'];
  console.log(JSON.stringify({name,scores:Object.fromEntries(Object.entries(lhr.categories).map(([k,v])=>[k,v.score])),metrics:Object.fromEntries(ids.map(id=>[id,lhr.audits[id]?.numericValue])),failures:Object.values(lhr.audits).filter(a=>a.score!==null&&a.score<1&&['binary','numeric'].includes(a.scoreDisplayMode)).map(a=>({id:a.id,title:a.title,score:a.score})),artRequests:lhr.audits['network-requests']?.details?.items?.filter(i=>i.url.includes('/assets/jade/art/')).map(i=>({url:i.url,size:i.transferSize,status:i.statusCode,mimeType:i.mimeType})),screenshots:!!lhr.fullPageScreenshot},null,2));
} finally {await browser.close();}
