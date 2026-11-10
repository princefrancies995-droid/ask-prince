# Prince AI

Your own AI chat platform. Free to run: hosted on Vercel, answers from the Groq free AI API.

```
prince-ai/
├── index.html      ← the website (chat interface)
├── api/chat.js     ← the backend (keeps your API key secret, talks to the AI)
└── package.json
```

## Put it online (about 10 minutes, all free)

### 1. Get a free Groq API key
1. Go to https://console.groq.com and sign up (no credit card needed).
2. Open **API Keys** → **Create API Key**.
3. Copy the key (it starts with `gsk_`). Keep it private — never put it in index.html.

### 2. Upload the project to GitHub
1. Create a free account at https://github.com.
2. Click **New repository**, name it `prince-ai`, click **Create**.
3. Click **uploading an existing file** and drag in `index.html`, `package.json`, `README.md` and the whole `api` folder. Click **Commit changes**.

### 3. Deploy on Vercel
1. Go to https://vercel.com and sign up with your GitHub account.
2. Click **Add New → Project**, pick your `prince-ai` repository, click **Import**.
3. Open **Environment Variables** and add:
   - Name: `GROQ_API_KEY`
   - Value: your key from step 1
4. Click **Deploy**.

Your site is live at something like **`https://prince-ai.vercel.app`**.
To change the name: Vercel → your project → **Settings → Domains**.

### 4. (Optional) Your own domain
In Vercel → **Settings → Domains**, add a domain you own (e.g. a free `.eu.org` or a paid `.com`) and follow the DNS instructions shown.

## Changing the AI models (optional)
In Vercel → **Settings → Environment Variables** you can set:

| Variable | Mode | Default |
|---|---|---|
| `MODEL_FAST` | Fast | `llama-3.1-8b-instant` |
| `MODEL_BALANCED` | Balanced | `llama-3.3-70b-versatile` |
| `MODEL_DEEP` | Deep | `openai/gpt-oss-120b` |

Use any model ID listed at https://console.groq.com/docs/models, then **Redeploy**.
If a mode shows an error like "model not found", the model was retired — pick a current one from that page.

## Good to know
- **Free limits:** Groq's free tier has per-minute and per-day caps. When reached, users see "Prince AI is busy" — nothing is charged.
- **Chat history** is saved in each visitor's own browser.
- **Your key is safe:** it lives only in Vercel's settings and the backend, never in the website code.
