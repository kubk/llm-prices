# Model Price Compare

[model-price-compare.vercel.app](https://model-price-compare.vercel.app)

Quickly compare pricing across different AI providers.

## Why?

[OpenRouter](https://openrouter.ai/models) and [models.dev](https://models.dev/) list hundreds of models, making it hard to quickly compare pricing. This app lets you filter and sort so you can decide at a glance whether to go with a frontier model or a mid-tier reasoning one.

## Features

- Filter by provider, company, and output modality (text, image, audio, video)
- Sort by input/output price, context window, or max output
- Copyable model IDs on hover, Vercel AI Gateway ready
- Auto-excludes utility models (embeddings, reranking, moderation) from text view

## Stack

Next.js, shadcn/ui, [tokenlens](https://github.com/nichochar/tokenlens) for pricing data.