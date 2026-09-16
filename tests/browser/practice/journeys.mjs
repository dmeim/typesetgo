import { launchFixtureBrowser, artifactPath, assertBrowserClean } from "../runtime.mjs";
import { expect } from "@playwright/test";
const browser = await launchFixtureBrowser();
const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
await page.route('**/*', async route => {
  const u = new URL(route.request().url());
  if (!['127.0.0.1','localhost'].includes(u.hostname)) return route.abort();
  if (u.pathname.startsWith('/words/') && !u.pathname.endsWith('/manifest.json')) return route.fulfill({json:['cat']});
  if (u.pathname.startsWith('/quotes/') && !u.pathname.endsWith('/manifest.json')) { await new Promise(r=>setTimeout(r,500)); return route.fulfill({json:[{quote:'cat dog',author:'Fixture Author',source:'Fixture',date:'2026'}]}); }
  return route.continue();
});
const input=page.getByRole('textbox',{name:'Typing practice',exact:true});
const words=page.locator('[data-typing-word]');
const results=page.getByRole('region',{name:'Test results'});
try {
await page.goto('http://127.0.0.1:4317');
await expect(input).toBeEnabled();
await page.getByRole('button',{name:'words',exact:true}).click();
await expect(words).toHaveCount(25);
await page.getByRole('button',{name:'10',exact:true}).click(); await expect(words).toHaveCount(10);
await page.getByRole('button',{name:'50',exact:true}).click(); await expect(words).toHaveCount(50);
await page.getByRole('button',{name:'10',exact:true}).click(); await expect(words).toHaveCount(10);
console.log('counts25→10→50→10 PASS');
await input.focus(); await page.keyboard.press('Tab'); await expect(input).not.toBeFocused();
await input.fill('cattt'); await expect(page.locator('[data-typing-caret]')).toHaveCount(1);
await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await expect(input).toHaveValue('cat');
await input.fill(Array(10).fill('cat').join(' ')+' '); await expect(results).toBeVisible();
const oldText=Array(10).fill('cat').join(' ');
await page.getByTitle('Settings',{exact:true}).click();
const dialog=page.getByRole('dialog'); await expect(dialog).toBeVisible();

await dialog.getByRole('slider',{name:'Text Size',exact:true}).focus(); await page.keyboard.press('Enter'); await expect(page.locator('[aria-label="Test results"]')).toBeAttached(); await expect(dialog).toBeVisible();
await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(results).toBeVisible();
await page.getByRole('button',{name:'Repeat Test',exact:true}).click(); await expect(input).toBeEnabled(); await expect(words).toHaveCount(10); await expect(input).toHaveValue('');
console.log('finish→settings→repeat PASS', (await words.allTextContents()).join(' ').replace(/\s+/g,' ').trim());
await input.fill(oldText+' '); await expect(results).toBeVisible();
await page.getByRole('button',{name:'↻ Next Test',exact:true}).click(); await expect(input).toBeEnabled();
await page.getByRole('button',{name:'quote',exact:true}).click(); await expect(page.getByText('Fixture Author',{exact:true})).toBeVisible(); await expect(words).toHaveCount(2);
await input.fill('cattt d'); await expect(results).toHaveCount(0); await expect(input).toHaveValue('cattt d');
await input.fill('cattt dog'); await expect(results).toBeVisible();
console.log('cold Quote + word-aligned completion PASS');
await page.screenshot({path:artifactPath("practice-final-results-wide.png")});
console.log('errors',errors);
} finally {await assertBrowserClean(browser); await browser.close();}
