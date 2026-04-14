/**
 * MA Doc Checker Service — v7
 * Express + Puppeteer API that loads the MA borrower upload portal,
 * waits for the widget to render, and returns document status detail.
 *
 * Uses puppeteer-core + @sparticuz/chromium for Render.com compatibility.
 *
 * POST /check-docs
 * Body: { "upload_url": "https://reicapitalguys.com/upload/?loanid=...&token=...&gsid=..." }
 *
 * Response:
 * {
 *   "all_docs_approved": false,
 *   "total_conditions": 7,
 *   "approved_count": 2,
 *   "under_review_count": 3,
 *   "action_needed_count": 2,
 *   "missing_docs": ["Property Photos", "Hazard Insurance Binder"],
 *   "rejected_docs": [],
 *   "changes_needed_docs": [],
 *   "under_review_docs": ["LLC Operating Agreement", "Entity Articles", "EIN Letter"],
 *   "approved_docs": ["Guarantor IDs", "Comps or Appraisal"]
 * }
 *
 * all_docs_approved = true only when every visible condition is approved/accepted.
 *
 * Changelog v6 to v7:
 * - Added status-approved as a recognized approved state (used by MA for "In Profile" docs).
 *   Previously, status-approved fell through to the catch-all and was counted as missing.
 * - Updated version string to v7.
 *
 * Condition-level CSS classes on #maconditions_* divs:
 *   status-unsubmitted    - no files uploaded (missing)
 *   status-under-review   - files uploaded, waiting for review
 *   status-accepted       - all files approved (standard)
 *   status-approved       - approved / reused from profile ("In Profile")
 *   status-rejected       - file(s) rejected
 *   status-change-required - file(s) need changes
 *
 * Note: MA sometimes uses status-unsubmitted even when files exist but are
 * rejected/need changes. We check file-level data-filestatus to distinguish:
 *   4 = Changes Needed, 5 = Rejected
 *
 * GET /health  ->  { "status": "ok" }
 */

const express    = require('express');
const puppeteer  = require('puppeteer-core');
const chromium   = require('@sparticuz/chromium');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'v7', timestamp: new Date().toISOString() });
});

app.post('/check-docs', async (req, res) => {
  const { upload_url } = req.body;

  if (!upload_url) {
    return res.status(400).json({ error: 'Missing required field: upload_url' });
  }

  let browser;
  try {
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(upload_url, { waitUntil: 'networkidle2', timeout: 30000 });

    let conditionsFound = false;
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const count = await page.evaluate(() =>
        document.querySelectorAll('[id^="maconditions_"]').length
      );
      if (count > 0) { conditionsFound = true; break; }
    }

    if (!conditionsFound) {
      await browser.close();
      return res.json({
        all_docs_approved:   false,
        total_conditions:    0,
        approved_count:      0,
        under_review_count:  0,
        action_needed_count: 0,
        missing_docs:        [],
        rejected_docs:       [],
        changes_needed_docs: [],
        under_review_docs:   [],
        approved_docs:       [],
        warning:             'No conditions rendered on portal after 20s'
      });
    }

    await new Promise(r => setTimeout(r, 2000));

    const result = await page.evaluate(() => {
      const condDivs = document.querySelectorAll('[id^="maconditions_"]');
      const missing        = [];
      const rejected       = [];
      const changesNeeded  = [];
      const underReview    = [];
      const approved       = [];

      condDivs.forEach(div => {
        const condClass   = div.className || '';
        const name        = (div.getAttribute('data-docname') || '').trim() ||
                            (div.querySelector('.MA_doctitle span') || {}).textContent || 'Unknown';
        const fileCount   = parseInt(div.getAttribute('data-filecount') || '0', 10);

        if (condClass.includes('status-accepted') || condClass.includes('status-approved')) {
          approved.push(name);
          return;
        }

        if (condClass.includes('status-under-review')) {
          underReview.push(name);
          return;
        }

        if (condClass.includes('status-change-required')) {
          changesNeeded.push(name);
          return;
        }

        if (condClass.includes('status-rejected')) {
          rejected.push(name);
          return;
        }

        if (condClass.includes('status-unsubmitted')) {
          if (fileCount === 0) {
            missing.push(name);
          } else {
            const fileItems = div.querySelectorAll('.MA_fileitem');
            let hasRejected = false;
            let hasChanges  = false;
            fileItems.forEach(item => {
              const fs = parseInt(item.getAttribute('data-filestatus') || '0', 10);
              if (fs === 5) hasRejected = true;
              if (fs === 4) hasChanges  = true;
            });
            if (hasRejected)     rejected.push(name);
            else if (hasChanges) changesNeeded.push(name);
            else                 missing.push(name);
          }
          return;
        }

        missing.push(name);
      });

      return { missing, rejected, changesNeeded, underReview, approved, total: condDivs.length };
    });

    await browser.close();

    const actionNeededCount = result.missing.length + result.rejected.length + result.changesNeeded.length;
    const allApproved       = actionNeededCount === 0 &&
                              result.underReview.length === 0 &&
                              result.total > 0;

    return res.json({
      all_docs_approved:   allApproved,
      total_conditions:    result.total,
      approved_count:      result.approved.length,
      under_review_count:  result.underReview.length,
      action_needed_count: actionNeededCount,
      missing_docs:        result.missing,
      rejected_docs:       result.rejected,
      changes_needed_docs: result.changesNeeded,
      under_review_docs:   result.underReview,
      approved_docs:       result.approved
    });

  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    console.error('Error checking docs:', err.message);
    return res.json({
      all_docs_approved:   false,
      total_conditions:    0,
      approved_count:      0,
      under_review_count:  0,
      action_needed_count: 0,
      missing_docs:        [],
      rejected_docs:       [],
      changes_needed_docs: [],
      under_review_docs:   [],
      approved_docs:       [],
      error:               err.message
    });
  }
});

app.listen(PORT, () => {
  console.log('MA Doc Checker v7 running on port ' + PORT);
});
