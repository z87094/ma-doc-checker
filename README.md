# MA Doc Checker

A lightweight API service that checks the Mortgage Automator borrower upload portal for document status and returns a summary for use in GHL workflows.

## Endpoint

### `POST /check-docs`

**Request body:**
```json
{
  "upload_url": "https://reicapitalguys.com/upload/?loanid=1201037&token=v3.xxx&gsid=10146"
}
```

**Response:**
```json
{
  "has_action_needed": true,
  "action_needed_count": 4,
  "missing_docs": ["Property Photos", "Hazard Insurance Binder"],
  "changes_needed_docs": ["LLC Operating Agreement (rejected)"],
  "accepted_count": 0,
  "under_review_count": 8,
  "total_visible_conditions": 7
}
```

### `GET /health`

Returns `{ "status": "ok" }` — use for uptime monitoring.

## GHL Custom Code Usage

```js
const response = await customRequest.post(
  'https://your-service.onrender.com/check-docs',
  { data: { upload_url: inputData.ma_document_upload_url } }
);

const result = response.data;
output = {
  has_action_needed:    String(result.has_action_needed),
  action_needed_count:  String(result.action_needed_count),
  missing_docs:         result.missing_docs.join(', '),
  changes_needed_docs:  result.changes_needed_docs.join(', ')
};
```

## Deployment (Render)

1. Push this repo to GitHub
2. Create a new Web Service on Render pointing to the repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Environment: Node 18+
