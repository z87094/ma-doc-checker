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
  await new Promise(r => setTimeout(r, 5000));

  const info = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[id^="maconditions_"]')).map(div => {
      const docnameAttr = div.getAttribute('data-docname');
      const titleSpan   = div.querySelector('.MA_doctitle span');
      const titleSpanText = titleSpan ? titleSpan.textContent.trim() : null;
      return {
        id:           div.id,
        data_docname: docnameAttr,
        title_span:   titleSpanText
      };
    });
  });

  info.forEach(c => console.log(JSON.stringify(c)));
  await browser.close();
})();
