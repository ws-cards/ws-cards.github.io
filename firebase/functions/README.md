# Deck Teaching Guide — Cloud Function

Callable name: `generateDeckTeachingGuide`  
Region: `asia-east1`  
Client helper: [`assets/js/deck-ai-guide.js`](../../assets/js/deck-ai-guide.js)

## Architecture

```
WS Card Database
       │
       ↓
 Deck Analyzer (deckAnalysis.html)
       │
 ┌─────┴─────┐
 ↓           ↓
Structured   RAG (future)
 Data
 └─────┬─────┘
       ↓
 Firebase Callable (this folder)
       ↓
 Cloud LLM (OpenAI)
       ↓
 Deck Teaching Guide UI
  新手 / 標準 / 進階
```

## Deploy (once)

```bash
# from repo root — requires Firebase CLI + project access
cd firebase/functions && npm install
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions:generateDeckTeachingGuide
```

Also enable **Cloud Functions** and **Blaze** billing on the Firebase project, and allow the GitHub Pages origins for callable CORS (SDK handles Auth token; unauthenticated call is allowed for now).

## Local without deploy

`deckAnalysis.html` already falls back to the client mock generator when the callable is missing or fails — so UI work does not block on deploy.
