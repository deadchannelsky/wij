# Assistant Configuration Guide

The chat assistant's behavior, personality, and LLM settings are **fully configurable** without touching code. All settings are stored in `server/config/assistant.config.json`.

---

## Configuration File Location

```
server/config/assistant.config.json
```

This is a **JSON file** that you can edit with any text editor. After editing, restart the service for changes to take effect.

---

## Configuration Structure

```json
{
  "assistant": {
    "name": "Assistant display name",
    "systemPrompt": "The system prompt that defines the assistant's personality",
    "context": {
      "name": "Person's name",
      "title": "Job title",
      "company": "Company name",
      "jobDescription": "Description of work",
      "travelInfo": "Travel information",
      "personalInfo": "Personal details",
      "calendarType": "Type of calendar (public/private)"
    }
  },
  "llm": {
    "endpoint": "LLM server URL",
    "model": "Model name",
    "apiKey": "API key (if needed)",
    "timeout": 60000,
    "useApiKey": false
  },
  "tools": {
    "checkAvailability": { "enabled": true, "description": "..." },
    "scheduleMeeting": { "enabled": true, "description": "..." },
    "explainLocation": { "enabled": true, "description": "..." }
  }
}
```

---

## 1. Editing the Assistant Prompt

The `systemPrompt` field defines how the assistant behaves and what instructions it follows.

### Example:
```json
{
  "assistant": {
    "systemPrompt": "You are Jason's Assistant, a helpful and professional scheduling coordinator.\n\nYour Role:\n- Help users schedule time with Jason\n- Answer questions about Jason's current and upcoming locations\n- Provide context for why Jason is in certain places\n- Assist with meeting logistics\n\n... more instructions ..."
  }
}
```

### Tips:
- Use `\n` for line breaks in JSON
- Be specific about the assistant's role and constraints
- Include instructions about what tools it has access to
- Mention ethical guidelines (e.g., "Never make up information")

### Example Customization:
To make the assistant more casual:
```json
"systemPrompt": "Hey! I'm Jason's Assistant. I'm here to help you figure out when Jason is free, why he's running around the world, and how to get on his calendar. Ask away!"
```

---

## 2. Editing Jason's Information

The `context` section contains personal and professional information about Jason that the assistant uses.

### Fields:

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Person's name | `"Jason"` |
| `title` | Job title | `"Technical Architect & AI Enablement lead"` |
| `company` | Company name | `"Fortune 50 Financial Services company"` |
| `jobDescription` | What they do | `"AI proof-of-concept demonstrations and infrastructure"` |
| `travelInfo` | Travel patterns | `"Travels frequently for client meetings"` |
| `personalInfo` | Personal details | `"Pastor and theological AI researcher"` |
| `calendarType` | Calendar visibility | `"public"` or `"private"` |

### Example:
```json
"context": {
  "name": "Jason",
  "title": "VP of AI Engineering",
  "company": "Acme Corp",
  "jobDescription": "Builds AI products and leads the AI team",
  "travelInfo": "Based in SF, travels to NYC and London monthly",
  "personalInfo": "Coffee enthusiast, published author",
  "calendarType": "public"
}
```

### Why This Matters:
This information is automatically injected into the assistant's system prompt. The system prompt becomes:

```
...
Key Facts About Jason:
- He is a VP of AI Engineering at Acme Corp
- Builds AI products and leads the AI team
- Based in SF, travels to NYC and London monthly
- Coffee enthusiast, published author
- Location information comes from his public calendar
...
```

This makes the assistant aware of who it's assisting and can provide better context to users.

---

## 3. Editing LLM Endpoint & Authentication

The `llm` section configures where the assistant sends requests and how to authenticate.

### Fields:

| Field | Purpose | Example |
|-------|---------|---------|
| `endpoint` | LLM server URL | `"http://slylinux.local:11434"` |
| `model` | Model name | `"neural-chat"` |
| `apiKey` | API key (optional) | `"sk-..."` or `null` |
| `timeout` | Request timeout in ms | `60000` |
| `useApiKey` | Whether to send API key | `true` or `false` |

### Local Ollama (No Authentication)
```json
"llm": {
  "endpoint": "http://slylinux.local:11434",
  "model": "neural-chat",
  "apiKey": null,
  "timeout": 60000,
  "useApiKey": false
}
```

### Cloud LLM with API Key (e.g., Together AI, LLaMA API)
```json
"llm": {
  "endpoint": "https://api.together.ai/v1",
  "model": "meta-llama/Llama-2-7b-chat",
  "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
  "timeout": 60000,
  "useApiKey": true
}
```

The API key will be sent as:
```
Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### Azure OpenAI
```json
"llm": {
  "endpoint": "https://your-resource.openai.azure.com",
  "model": "gpt-35-turbo",
  "apiKey": "your-api-key",
  "timeout": 60000,
  "useApiKey": true
}
```

---

## Environment Variable Overrides

You can override config values using environment variables. Useful for production where you don't want to commit secrets.

### Supported Overrides:

| Env Variable | Overrides | Usage |
|---|---|---|
| `LLM_ENDPOINT` | `llm.endpoint` | `LLM_ENDPOINT=http://192.168.1.100:11434` |
| `LLM_MODEL` | `llm.model` | `LLM_MODEL=mistral` |
| `LLM_API_KEY` | `llm.apiKey` | `LLM_API_KEY=sk-...` |

### Priority:
1. **Environment variables** (highest priority)
2. **assistant.config.json** (fallback)

### Example:
```bash
# On Raspi5
export LLM_ENDPOINT=http://192.168.1.50:11434
export LLM_MODEL=neural-chat
# App will use these instead of config.json values
```

---

## Enabling/Disabling Tools

You can enable or disable specific tools in the `tools` section.

### Disable a Tool:
```json
"tools": {
  "checkAvailability": { "enabled": true, "description": "..." },
  "scheduleMeeting": { "enabled": false, "description": "..." },
  "explainLocation": { "enabled": true, "description": "..." }
}
```

If `scheduleMeeting` is disabled, the LLM won't be able to call it, and users can't schedule meetings.

---

## How to Deploy Changes

### Step 1: Edit `server/config/assistant.config.json`
```bash
# On your development machine
nano server/config/assistant.config.json
# OR use your favorite editor
```

### Step 2: Commit and Push
```bash
git add server/config/assistant.config.json
git commit -m "update: adjust assistant prompt and Jason context"
git push origin main
```

### Step 3: Pull and Restart on Raspi5
```bash
cd /opt/whereisjason
git pull origin main
sudo systemctl restart whereisjason
```

### Step 4: Verify
Check the logs:
```bash
sudo journalctl -u whereisjason.service -f
# Should see: [INFO] Assistant config loaded from assistant.config.json
```

---

## Common Customizations

### Make the Assistant More Casual
```json
"systemPrompt": "Hey! I'm Jason's scheduling sidekick. I can tell you where Jason is, help you book time with him, and explain why he's bouncing around the world. Ask away!"
```

### Add New Context Fields
```json
"context": {
  "name": "Jason",
  "title": "CTO",
  "company": "TechCorp",
  "jobDescription": "Leads technical strategy and team",
  "travelInfo": "Every other week in a different city",
  "personalInfo": "Loves hiking, open-source contributor",
  "calendarType": "public"
}
```

### Switch to Faster Model
```json
"llm": {
  "endpoint": "http://slylinux.local:11434",
  "model": "mistral",  // Faster than neural-chat
  "apiKey": null,
  "timeout": 30000,    // Shorter timeout
  "useApiKey": false
}
```

### Add Authentication to Ollama (if using reverse proxy)
```json
"llm": {
  "endpoint": "https://llm.example.com",
  "model": "neural-chat",
  "apiKey": "bearer-token-here",
  "timeout": 60000,
  "useApiKey": true
}
```

---

## Validation

**Invalid JSON?** The app will log a warning and use fallback defaults.

Check for errors:
```bash
# Test JSON syntax
python3 -m json.tool server/config/assistant.config.json
```

---

## Support

**Something not working?**
1. Check logs: `sudo journalctl -u whereisjason.service -n 50`
2. Look for: `[INFO] Assistant config loaded` or `[WARN] Failed to load`
3. Verify JSON is valid: `python3 -m json.tool server/config/assistant.config.json`
4. Restart service: `sudo systemctl restart whereisjason`

---

**Last Updated**: 2026-03-30
