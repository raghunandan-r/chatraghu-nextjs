# Raghu.fyi

Preact based front end for my personal portfolio. 
Moved away from Vercel's template towards a lower size client-side website, with TUI style. 

## Quick answers
- Preact swap: Low risk after removing heavy GUI libs (framer-motion, tsparticles, some Radix patterns).
- Frontend↔API: Frontend calls `/api/chat`; Next rewrites to FastAPI in dev and `/api/` in prod.

## Goals
- Smooth, low-jitter streaming TUI.
- Minimal client JS and dependencies.
- Keep server streaming unchanged.
- DRY terminal: reuse icons, keep CSS local to the component, extract large constants if helpful.

## Learn More

To learn more about the AI SDK or Next.js by Vercel, take a look at the following resources:

- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)
