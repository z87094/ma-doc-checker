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
  await new Promise(r => setTimeout(r, 10000));

  const info = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[id^="maconditions_"]')).map(div => ({
      id:       div.id,
      class:    div.className,
      docname:  div.getAttribute('data-docname'),
      filecount: div.getAttribute('data-filecount')
    }));
  });

  info.forEach((c, i) => {
    console.log(`[${i+1}] id=${c.id} | class="${c.class}" | docname="${c.docname}" | files=${c.filecount}`);
  });

  await browser.close();
})();
