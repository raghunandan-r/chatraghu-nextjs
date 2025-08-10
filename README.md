# Raghu.fyi

Next.js based front end for my personal portfolio. 
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
- [your website should be under 14kb in size](https://endtimes.dev/why-your-website-should-be-under-14kb-in-size/)