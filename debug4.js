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

  // Polling loop — same as server v2
  let conditionsFound = false;
  for (let i = 0; i < 4; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const count = await page.evaluate(() =>
      document.querySelectorAll('[id^="maconditions_"]').length
    );
    console.log(`Poll ${i+1}: found ${count} conditions`);
    if (count > 0) { conditionsFound = true; break; }
  }

  console.log('conditionsFound:', conditionsFound);

  // Exact same evaluate as server
  const result = await page.evaluate(() => {
    const condDivs = document.querySelectorAll('[id^="maconditions_"]');
    const missing       = [];
    const changesNeeded = [];
    let   acceptedCount = 0;
    let   underReview   = 0;
    let   total         = 0;
    const debugClasses  = [];

    condDivs.forEach(div => {
      const classes = div.className || '';
      const name = div.getAttribute('data-docname') || 'Unknown';
      debugClasses.push({ name, classes });
      total++;

      if (classes.includes('status-unsubmitted')) {
        missing.push(name);
      } else if (classes.includes('status-rejected')) {
        changesNeeded.push(name + ' (rejected)');
      } else if (classes.includes('status-change-required')) {
        changesNeeded.push(name + ' (changes needed)');
      } else if (classes.includes('status-accepted')) {
        acceptedCount++;
      } else if (classes.includes('status-under-review')) {
        underReview++;
      }
    });

    return { missing, changesNeeded, acceptedCount, underReview, total, debugClasses };
  });

  console.log('\nResult:', JSON.stringify({ missing: result.missing, changesNeeded: result.changesNeeded, acceptedCount: result.acceptedCount, underReview: result.underReview, total: result.total }));
  console.log('\nDebug classes:');
  result.debugClasses.forEach(c => console.log(`  "${c.name}" => "${c.classes}"`));

  await browser.close();
})();
