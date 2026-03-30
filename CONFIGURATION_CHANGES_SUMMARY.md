# Configuration Changes Summary

All three aspects of the assistant are now **fully configurable** without touching code.

---

## What Changed

### Files Created ✨

1. **`server/config/assistant.config.json`** — Main configuration file
   - Assistant system prompt
   - Jason's information (context)
   - LLM endpoint, model, and auth settings
   - Tool enable/disable toggles

2. **`ASSISTANT_CONFIG_GUIDE.md`** — Comprehensive guide
   - Detailed explanation of each config option
   - Examples for different LLM providers
   - Common customizations

3. **`QUICK_CONFIG_REFERENCE.md`** — Quick reference
   - One-page summary
   - Where to edit each aspect
   - Example workflow

4. **`.env.production.example`** — Example production env vars
   - Shows how to use environment variables for secrets
   - Keeps API keys out of config file

### Files Modified 🔧

1. **`server/src/routes/chat.ts`**
   - Load config from `assistant.config.json` instead of hardcoded values
   - Build system prompt dynamically from config
   - Build tool definitions from config
   - Add API key support for LLM authentication
   - Support environment variable overrides

2. **`.env.example`**
   - Added `LLM_API_KEY` option
   - Noted that LLM config can be in `assistant.config.json`

---

## The Three Customizable Aspects

### 1. Assistant Prompt

**File**: `server/config/assistant.config.json`
**Field**: `assistant.systemPrompt`

The system prompt that defines the assistant's:
- Role and responsibilities
- Behavior guidelines
- Constraints and ethical principles
- Available tools and capabilities

Edit directly in the JSON file. Use `\n` for line breaks.

**Example**: Change personality from professional to casual, add new instructions, modify tone.

---

### 2. Jason's Information

**File**: `server/config/assistant.config.json`
**Fields**: `assistant.context.*`

Information about Jason:
- `name` — Name
- `title` — Job title
- `company` — Company name
- `jobDescription` — What he does
- `travelInfo` — Travel patterns
- `personalInfo` — Personal details
- `calendarType` — Calendar type (public/private)

This is automatically injected into the assistant's understanding. The LLM uses this to provide better context to users.

**Example**: Update when Jason changes jobs, moves companies, or travels differently.

---

### 3. LLM Endpoint & Authentication

**File**: `server/config/assistant.config.json`
**Fields**: `llm.*`

Configuration for the LLM server:
- `endpoint` — URL (e.g., `http://slylinux.local:11434`)
- `model` — Model name (e.g., `neural-chat`)
- `apiKey` — API key for authentication (can be `null`)
- `useApiKey` — Whether to send the API key
- `timeout` — Request timeout in milliseconds

Supports:
- ✅ Local Ollama (no auth)
- ✅ Cloud LLM providers (with API key)
- ✅ Any OpenAI-compatible endpoint

**Example**: Switch from Ollama to Together AI, change model, add authentication.

---

## Configuration Priority

If both are set, environment variables take precedence:

```
Environment Variables (.env)
         ↓ (override)
assistant.config.json
         ↓ (fallback)
Code defaults
```

This allows:
- **Development**: Store everything in `assistant.config.json`
- **Production**: Use `.env.production` for secrets (API keys), config file for everything else

---

## How to Use

### Edit Assistant Prompt
```bash
nano server/config/assistant.config.json
# Edit the "systemPrompt" field
```

### Edit Jason's Info
```bash
nano server/config/assistant.config.json
# Edit the "context" object
```

### Edit LLM Settings
```bash
nano server/config/assistant.config.json
# Edit the "llm" object
# OR use environment variables for secrets
```

### Deploy Changes
```bash
git add server/config/assistant.config.json
git commit -m "update: [what changed]"
git push origin main

# On Raspi5:
cd /opt/whereisjason
git pull
sudo systemctl restart whereisjason
```

---

## Benefits

✅ **No code changes needed** — Edit JSON, restart service
✅ **Easy to version** — Config changes tracked in git
✅ **Safe for secrets** — API keys in environment variables
✅ **Flexible** — Supports any LLM provider
✅ **Documented** — Full guide included

---

## Files to Read

| Document | Purpose |
|----------|---------|
| `QUICK_CONFIG_REFERENCE.md` | Start here — one-page summary |
| `ASSISTANT_CONFIG_GUIDE.md` | Detailed explanations & examples |
| `server/config/assistant.config.json` | The actual config file |

---

## Validation

After editing, verify the changes:

```bash
# Check JSON syntax
python3 -m json.tool server/config/assistant.config.json

# Check logs after restart
sudo journalctl -u whereisjason.service -f
# Should see: [INFO] Assistant config loaded from assistant.config.json

# Test the endpoint manually
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userMessage":"Hi"}'
```

---

## Environment Variables

All LLM settings can be overridden via environment variables:

| Variable | Overrides |
|----------|-----------|
| `LLM_ENDPOINT` | `llm.endpoint` |
| `LLM_MODEL` | `llm.model` |
| `LLM_API_KEY` | `llm.apiKey` |

**On Raspi5**, create `.env.production`:
```bash
LLM_ENDPOINT=http://192.168.1.50:11434
LLM_MODEL=neural-chat
LLM_API_KEY=  # Optional
```

---

## Example Customizations

### Make the Assistant More Casual
Edit `systemPrompt`:
```json
"systemPrompt": "Hey! I'm Jason's scheduling sidekick. Need to know when he's free or why he's bouncing around? I'm your bot!"
```

### Update Job Title
Edit `context.title`:
```json
"title": "Chief Technology Officer"
```

### Switch to a Faster Model
Edit `llm.model`:
```json
"model": "mistral"  // Faster than neural-chat
```

### Use Cloud LLM
Edit `llm` object:
```json
"endpoint": "https://api.together.ai/v1",
"model": "meta-llama/Llama-2-70b-chat-hf",
"apiKey": "sk-xxx",
"useApiKey": true
```

---

## Next Steps

1. **Read** `QUICK_CONFIG_REFERENCE.md` for a one-page summary
2. **Review** `server/config/assistant.config.json` to see the current config
3. **Customize** as needed
4. **Deploy** by pushing to git and pulling on Raspi5
5. **Verify** by checking logs and testing manually

---

**Last Updated**: 2026-03-30
**Status**: Ready for deployment
