import { launchFixtureBrowser, artifactPath, assertBrowserClean } from "../runtime.mjs";
import { expect } from "@playwright/test";
const browser = await launchFixtureBrowser();
async function open(delay){
 const p=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 p.on('pageerror',e=>console.log('pageerror',e.message));
 await p.addInitScript(({delay})=>{window.__sessionDelay=delay; localStorage.setItem('typesetgo_settings',JSON.stringify({mode:'words',wordTarget:10,soundEnabled:false}));},{delay});
 await p.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort(); if(u.pathname.startsWith('/words/')&&!u.pathname.endsWith('/manifest.json'))return r.fulfill({json:['cat']});return r.continue();});
 await p.goto('http://127.0.0.1:4317/?ranked');
 await expect(p.getByRole('textbox',{name:'Typing practice'})).toBeEnabled();
 return p;
}
try{
 const p=await open(800); const i=p.getByRole('textbox',{name:'Typing practice'});
 await expect.poll(async()=>p.locator('[data-typing-word]').allTextContents()).toEqual(Array(10).fill('dog'));
 await i.fill(Array(10).fill('dog').join(' ')+' ');
 await expect(p.getByRole('region',{name:'Test results'})).toBeVisible();
 await expect.poll(()=>p.evaluate(()=>window.__mutations.filter(x=>x.name==='typingSessions:finalizeSession').length)).toBe(1);
 const final=await p.evaluate(()=>window.__mutations.find(x=>x.name==='typingSessions:finalizeSession'));
 console.log('ranked adoption+finalization',final.args.sessionId,final.args.typedText);
 const count=await p.evaluate(()=>window.__mutations.filter(x=>x.name==='typingSessions:startSession').length);
 await p.getByRole('button',{name:'Repeat Test',exact:true}).click();
 await expect(i).toHaveValue('');await expect(p.locator('[data-typing-word]')).toHaveCount(10);
 await p.waitForTimeout(1000);
 expect(await p.evaluate(()=>window.__mutations.filter(x=>x.name==='typingSessions:startSession').length)).toBe(count);
 await i.fill(Array(10).fill('dog').join(' ')+' ');
 await expect.poll(()=>p.evaluate(()=>window.__mutations.filter(x=>x.name==='testResults:saveResult').length)).toBe(1);
 expect(await p.evaluate(()=>window.__mutations.filter(x=>x.name==='typingSessions:finalizeSession').length)).toBe(1);
 console.log('exact Repeat stays history-only PASS'); await p.close();
 const slow=await open(1800); const si=slow.getByRole('textbox',{name:'Typing practice'});
 await expect.poll(()=>slow.evaluate(()=>window.__mutations.some(x=>x.name==='typingSessions:startSession'))).toBe(true);
 await si.fill('c');await si.fill('');
 await slow.waitForTimeout(2000);await expect(slow.locator('[data-typing-word]')).toHaveCount(10);
 expect((await slow.locator('[data-typing-word]').allTextContents()).join('')).toContain('cat');
 expect(await slow.evaluate(()=>window.__mutations.some(x=>x.name==='typingSessions:cancelSession'))).toBe(true);
 await si.fill(Array(10).fill('cat').join(' ')+' ');
 await expect.poll(()=>slow.evaluate(()=>window.__mutations.filter(x=>x.name==='testResults:saveResult').length)).toBe(1);
 expect(await slow.evaluate(()=>window.__mutations.filter(x=>x.name==='typingSessions:finalizeSession').length)).toBe(0);
 console.log('late server prompt rejected after type→erase; unranked save PASS');await slow.close();
}finally{await assertBrowserClean(browser); await browser.close();}
