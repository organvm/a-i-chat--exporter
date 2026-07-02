# AI Chat Exporter Pro API Documentation

Welcome to the AI Chat Exporter Pro API. This API allows you to programmatically export your conversation history from AI chat providers (such as ChatGPT) into various structured formats.

## Authentication

To authenticate with the API, you must provide your Pro License Key via the `Authorization` header in your HTTP requests.

```http
Authorization: Bearer YOUR_PRO_LICENSE_KEY
```

> **Note:** The API is exclusively available to Pro customers. A Pro licence is bought through the in-app **Buy Pro** button, which runs [MONETA](https://github.com/organvm/limen/tree/main/moneta) — the seller's own Bitcoin licence mint (no third-party processor).

## Endpoints

### 1. List Conversations

Retrieve a list of available conversations for a specific provider.

**Endpoint:** `GET /api/v1/conversations`

**Query Parameters:**
- `provider` (string, required): The AI provider. Valid values: `chatgpt`, `claude`, `gemini`.
- `limit` (integer, optional): Maximum number of conversations to return. Default is `20`.
- `offset` (integer, optional): Pagination offset. Default is `0`.
- `project_id` (string, optional): Filter conversations by a specific project or workspace.

**Example Request:**
```bash
curl -X GET "https://api.aichatexporter.com/api/v1/conversations?provider=chatgpt&limit=10" \
     -H "Authorization: Bearer YOUR_PRO_LICENSE_KEY"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "conv_123456",
      "title": "React Architecture Discussion",
      "create_time": 1718814000
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### 2. Export Conversation

Export a specific conversation into your desired format.

**Endpoint:** `GET /api/v1/conversation/{id}/export`

**Path Parameters:**
- `id` (string, required): The unique identifier of the conversation.

**Query Parameters:**
- `format` (string, required): The desired export format. Valid values: `markdown`, `html`, `json`, `pdf`, `png`.
- `include_timestamps` (boolean, optional): Whether to include timestamps in the exported output. Default is `false`.

**Example Request (Markdown):**
```bash
curl -X GET "https://api.aichatexporter.com/api/v1/conversation/conv_123456/export?format=markdown" \
     -H "Authorization: Bearer YOUR_PRO_LICENSE_KEY" \
     -o conversation.md
```

**Example Response:**
Returns the raw file binary or text content based on the requested format.

### 3. Bulk Export

Trigger an asynchronous bulk export of multiple conversations as a compressed archive.

**Endpoint:** `POST /api/v1/export/bulk`

**Request Body (JSON):**
```json
{
  "provider": "chatgpt",
  "format": "json_zip",
  "conversation_ids": ["conv_123456", "conv_789012"],
  "project_id": "proj_abc"
}
```

**Example Request:**
```bash
curl -X POST "https://api.aichatexporter.com/api/v1/export/bulk" \
     -H "Authorization: Bearer YOUR_PRO_LICENSE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"provider": "chatgpt", "format": "markdown", "conversation_ids": ["conv_123456"]}'
```

**Example Response:**
```json
{
  "job_id": "job_98765",
  "status": "processing",
  "status_url": "https://api.aichatexporter.com/api/v1/jobs/job_98765"
}
```

## Rate Limits

The API is rate-limited to ensure stability and performance:
- **General Requests:** 100 requests per minute per license key.
- **Bulk Exports:** 10 concurrent bulk export jobs per license key.

If you exceed these limits, the API will respond with a `429 Too Many Requests` status code. Please implement exponential backoff in your API clients.
