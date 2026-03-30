# Quick Configuration Reference

## Where to Edit What

You need to customize three aspects of the assistant. Here's where to edit each one:

---

## 1️⃣ Assistant Prompt (Behavior & Instructions)

**File**: `server/config/assistant.config.json`

**Field**: `assistant.systemPrompt`

**Example**:
```json
{
  "assistant": {
    "systemPrompt": "You are Jason's Assistant. Your role is to..."
  }
}
```

**What it does**: Defines the assistant's personality, role, instructions, and constraints.

**When to edit**: If you want to change how the assistant behaves, what it can/can't do, or add new instructions.

---

## 2️⃣ Jason's Information (Context)

**File**: `server/config/assistant.config.json`

**Fields**:
- `assistant.context.name`
- `assistant.context.title`
- `assistant.context.company`
- `assistant.context.jobDescription`
- `assistant.context.travelInfo`
- `assistant.context.personalInfo`

**Example**:
```json
{
  "assistant": {
    "context": {
      "name": "Jason",
      "title": "VP of AI Engineering",
      "company": "Acme Corp",
      "jobDescription": "Builds AI products",
      "travelInfo": "Travels to NYC monthly",
      "personalInfo": "Coffee enthusiast",
      "calendarType": "public"
    }
  }
}
```

**What it does**: The assistant uses this information to understand who it's assisting and provide better context to users.

**When to edit**: When Jason's job changes, company changes, or you want to update how he's described.

---

## 3️⃣ LLM Endpoint & Authentication

**File**: `server/config/assistant.config.json` (or environment variables for secrets)

**Fields**:
- `llm.endpoint` — URL of the LLM server
- `llm.model` — Model name to use
- `llm.apiKey` — API key (if needed)
- `llm.useApiKey` — Whether to send the API key
- `llm.timeout` — Request timeout in milliseconds

**Example (Local Ollama)**:
```json
{
  "llm": {
    "endpoint": "http://slylinux.local:11434",
    "model": "neural-chat",
    "apiKey": null,
    "timeout": 60000,
    "useApiKey": false
  }
}
```

**Example (Cloud LLM)**:
```json
{
  "llm": {
    "endpoint": "https://api.together.ai/v1",
    "model": "meta-llama/Llama-2-7b-chat",
    "apiKey": "sk-xxx",
    "timeout": 60000,
    "useApiKey": true
  }
}
```

**What it does**: Tells the app where to send chat requests and how to authenticate.

**When to edit**: When switching LLM providers, changing models, or adding API authentication.

---

## Best Practices

### Keep Secrets Out of Config
For production, use **environment variables** for API keys instead of putting them in the config file:

```bash
# In your .env.production file:
LLM_API_KEY=sk-xxxxxxxx
```

Environment variables override config file values and won't be accidentally committed to git.

### Validate JSON
After editing, validate the JSON syntax:
```bash
python3 -m json.tool server/config/assistant.config.json
```

### Restart to Apply Changes
Changes take effect after restarting the service:
```bash
sudo systemctl restart whereisjason
```

### Check Logs
Verify the config was loaded:
```bash
sudo journalctl -u whereisjason.service | grep "Assistant config"
# Should show: [INFO] Assistant config loaded from assistant.config.json
```

---

## Example Workflow

### Scenario: Jason gets promoted to CTO

1. **Edit config**:
   ```bash
   nano server/config/assistant.config.json
   ```
   Change:
   ```json
   "title": "CTO"
   ```

2. **Commit**:
   ```bash
   git add server/config/assistant.config.json
   git commit -m "update: Jason promoted to CTO"
   git push origin main
   ```

3. **Deploy on Raspi5**:
   ```bash
   cd /opt/whereisjason
   git pull origin main
   sudo systemctl restart whereisjason
   ```

4. **Verify**:
   ```bash
   sudo journalctl -u whereisjason.service -f
   # Look for: [INFO] Assistant config loaded from assistant.config.json
   ```

---

## All Three in One File

All three customizable aspects are in one place:

```json
{
  "assistant": {
    "systemPrompt": "...",      // 1️⃣ How the assistant behaves
    "context": {
      "name": "Jason",          // 2️⃣ Who the assistant helps
      "title": "...",
      "company": "...",
      "jobDescription": "...",
      "travelInfo": "...",
      "personalInfo": "...",
      "calendarType": "..."
    }
  },
  "llm": {                       // 3️⃣ Where requests go & how to auth
    "endpoint": "...",
    "model": "...",
    "apiKey": "...",
    "useApiKey": false,
    "timeout": 60000
  },
  "tools": { ... }
}
```

---

## File Reference

| File | Purpose |
|------|---------|
| `server/config/assistant.config.json` | Main config (edit here for prompt, context, LLM) |
| `ASSISTANT_CONFIG_GUIDE.md` | Detailed guide with examples |
| `.env` or `.env.production` | Environment variable overrides (secrets) |

---

**For detailed information**, see `ASSISTANT_CONFIG_GUIDE.md`
