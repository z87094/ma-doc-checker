const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://reicapitalguys.com/upload/?loanid=1201037&token=v3.MjAyNi00.a9a4c378bffe836a130bf0417fd9a3e1e7c2f121&gsid=10146';

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for conditions to render
  await new Promise(r => setTimeout(r, 10000));

  const info = await page.evaluate(() => {
    const condDivs = document.querySelectorAll('[id^="maconditions_"]');
    const results = [];

    condDivs.forEach(div => {
      // Get the outer HTML of just the first 500 chars to see the structure
      const outerHtml = div.outerHTML.substring(0, 800);
      // Get all classes on this div and all its children
      const allClasses = new Set();
      allClasses.add(div.className);
      div.querySelectorAll('*').forEach(el => {
        if (el.className && typeof el.className === 'string') {
          el.className.split(' ').forEach(c => c && allClasses.add(c));
        }
      });
      results.push({
        id: div.id,
        ownClass: div.className,
        allChildClasses: [...allClasses].filter(c => c.includes('status') || c.includes('MA_') || c.includes('condition')),
        outerHtml
      });
    });

    return results;
  });

  info.forEach((c, i) => {
    console.log(`\n=== Condition ${i+1}: ${c.id} ===`);
    console.log('Own class:', c.ownClass);
    console.log('Status/MA classes found:', JSON.stringify(c.allChildClasses));
    console.log('HTML:', c.outerHtml);
  });

  await browser.close();
})();
