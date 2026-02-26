# Model Price Compare

[model-price-compare.vercel.app](https://model-price-compare.vercel.app)

A minimal pricing comparison table for major AI models.

## Why?

Sites like OpenRouter list hundreds of models, making it hard to quickly compare the ones that matter. This app focuses on major providers - OpenAI, Anthropic, Google, DeepSeek, Meta, Mistral, xAI, and others - so you can decide at a glance whether to go with a frontier model or a mid-tier reasoning one.

## Features

- Filter by provider, company, and output modality (text, image, audio, video)
- Sort by input/output price, context window, or max output
- Copyable model IDs on hover, Vercel AI Gateway ready
- Auto-excludes utility models (embeddings, reranking, moderation) from text view
- Dark mode

## Stack

Next.js, shadcn/ui, [tokenlens](https://github.com/nichochar/tokenlens) for pricing data.

## Development

```bash
npm run dev
```
