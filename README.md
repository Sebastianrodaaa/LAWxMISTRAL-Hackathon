# Atrium

A desk for class-action funding. NGOs point an agent at a folder and get a pitch. Hedge funds and litigation funders diligence that pitch with a recovery model, a Rule 23 worksheet, and research.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Drafts and recorded interest stay in the browser. The three matters already on the book are built from sample dockets in `src/lib/dockets.ts`.

## Optional keys

Copy `.env.example` to `.env.local`.

- `MISTRAL_API_KEY` rewrites the deck narrative and the research note. Figures still come from the folder, not from the model.
- `TAVILY_API_KEY` adds live web results to research. They are labeled separately from the source library.

Without keys, the desk still composes the deck and still answers research from its own library.
