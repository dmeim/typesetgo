import { launchFixtureBrowser, artifactPath, assertBrowserClean } from "../runtime.mjs";
import { expect } from "@playwright/test";
const browser = await launchFixtureBrowser();
const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
const errors=[];p.on('pageerror',e=>errors.push(e.message));let fail1984=true;let themeFetches=0;
await p.addInitScript(()=>localStorage.setItem('typesetgo_settings',JSON.stringify({mode:'words',wordTarget:10,soundEnabled:false,showOnScreenKeyboard:true,ghostWriterEnabled:true,ghostWriterSpeed:60})));
await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();if(u.pathname.startsWith('/words/')&&!u.pathname.endsWith('/manifest.json'))return r.fulfill({json:['cat']});if(u.pathname==='/themes/manifest.json')return r.fulfill({json:{themes:['typesetgo','fire-force','1984'],default:'typesetgo'}});if(u.pathname.startsWith('/themes/')&&!u.pathname.endsWith('/manifest.json')){themeFetches++;if(u.pathname.endsWith('/1984.json')&&fail1984)return r.fulfill({status:503,body:'Fixture temporary failure'});await new Promise(r=>setTimeout(r,1000));}return r.continue();});
try{
await p.goto('http://127.0.0.1:4317');const i=p.getByRole('textbox',{name:'Typing practice',exact:true});await expect(i).toBeEnabled();
await expect(p.locator('[data-key]')).toHaveCount(51);console.log('startup theme fetches',themeFetches);
await i.fill('x ');await expect(p.locator('[data-next-key=true][data-key=c]')).toHaveCount(1);await expect(p.locator('[data-next-key=true][data-key=Backspace]')).toHaveCount(0);
await p.waitForTimeout(1000);await expect(p.locator('[data-ghost-caret]')).toHaveCount(1);
const ghost=await p.locator('[data-ghost-caret]').boundingBox();console.log('historical error correction guidance + elapsed ghost PASS',ghost);
await p.setViewportSize({width:260,height:700});await expect(p.locator('[data-key]')).toHaveCount(0);
await p.setViewportSize({width:900,height:850});await expect(p.locator('[data-key]')).toHaveCount(51);console.log('keyboard260→900 recovery PASS');
await p.setViewportSize({width:390,height:844});
await i.press('Tab');await p.getByRole('button',{name:'Change theme',exact:true}).click();const dialog=p.getByRole('dialog',{name:'Theme',exact:true});await expect(dialog).toBeVisible();await expect(p.getByText('Loading themes…',{exact:true})).toBeVisible();await expect(dialog.getByRole('alert')).toContainText('1 themes could not be loaded');
fail1984=false;await dialog.getByRole('button',{name:'Retry',exact:true}).click();await expect(dialog.getByRole('alert')).toHaveCount(0);await expect(p.getByText('Loading themes…',{exact:true})).toHaveCount(0);
let b=await dialog.boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(390);expect(b.height).toBeLessThanOrEqual(844);console.log('narrow dialog + catalog loading/error/retry PASS',b);
await dialog.getByRole('button',{name:'Collapse all',exact:true}).click();await expect(dialog.getByRole('button',{name:'Fire Force variants',exact:true})).toHaveCount(0);
await dialog.getByRole('searchbox',{name:'Search themes',exact:true}).fill('Fire Force');await dialog.getByRole('button',{name:'Fire Force variants',exact:true}).click();
const drawer=dialog.locator('#theme-variants-fire-force');await expect(drawer).toBeVisible();console.log('drawer height',await drawer.evaluate(e=>({client:e.clientHeight,scroll:e.scrollHeight})));
const light=drawer.getByRole('button',{name:/light mode/}).first();await light.click();await expect(light).toHaveAttribute('aria-pressed','true');
await p.screenshot({path:artifactPath("practice-final-theme-narrow.png")});
await p.setViewportSize({width:1280,height:900});await expect(drawer).toBeVisible();b=await dialog.boundingBox();expect(b.x+b.width).toBeLessThanOrEqual(1280);
await p.setViewportSize({width:640,height:450});await expect.poll(async()=>(await dialog.boundingBox()).height).toBeLessThanOrEqual(450);b=await dialog.boundingBox();expect(b.height).toBeLessThanOrEqual(450);expect(b.x+b.width).toBeLessThanOrEqual(640);console.log('wide resize + compact200%-equivalent viewport PASS',b);
await p.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(p.getByRole('button',{name:'Change theme',exact:true})).toBeFocused();
console.log('errors',errors);
}finally{await assertBrowserClean(browser); await browser.close();}
