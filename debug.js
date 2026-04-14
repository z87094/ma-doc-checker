const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://reicapitalguys.com/upload/?loanid=1201037&token=v3.MjAyNi00.a9a4c378bffe836a130bf0417fd9a3e1e7c2f121&gsid=10146';

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Page loaded. Waiting 10s for widget...');
  await new Promise(r => setTimeout(r, 10000));

  // Check what's in the DOM
  const info = await page.evaluate(() => {
    const byId = document.querySelectorAll('[id^="maconditions_"]').length;
    const byClass = document.querySelectorAll('[class*="status-"]').length;
    const bodyText = document.body.innerText.substring(0, 500);
    const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter(id => id).slice(0, 50);
    const allClasses = [...new Set(Array.from(document.querySelectorAll('*')).flatMap(el => Array.from(el.classList)))].filter(c => c.includes('status') || c.includes('condition') || c.includes('ma-') || c.includes('doc')).slice(0, 30);
    const maObj = typeof MortgageAutomator !== 'undefined';
    const maKeys = maObj ? Object.keys(MortgageAutomator) : [];
    return { byId, byClass, bodyText, allIds, allClasses, maObj, maKeys };
  });

  console.log('byId count:', info.byId);
  console.log('byClass count:', info.byClass);
  console.log('Body text:', info.bodyText);
  console.log('All IDs:', JSON.stringify(info.allIds));
  console.log('Status/condition classes:', JSON.stringify(info.allClasses));
  console.log('MA object present:', info.maObj);
  console.log('MA keys:', JSON.stringify(info.maKeys));

  // Try calling loadLoanForm and wait more
  if (info.maObj) {
    console.log('\nCalling MortgageAutomator.loadLoanForm()...');
    await page.evaluate(() => {
      try { MortgageAutomator.loadLoanForm(); } catch(e) { console.log('loadLoanForm error:', e.message); }
    });
    await new Promise(r => setTimeout(r, 15000));

    const info2 = await page.evaluate(() => {
      const byId = document.querySelectorAll('[id^="maconditions_"]').length;
      const bodyText = document.body.innerText.substring(0, 1000);
      return { byId, bodyText };
    });
    console.log('\nAfter loadLoanForm:');
    console.log('byId count:', info2.byId);
    console.log('Body text:', info2.bodyText);
  }

  await browser.close();
})();
