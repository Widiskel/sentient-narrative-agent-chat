# Sentient Agent Chat

A lightweight web UI for interacting with the Sentient Narrative Agent : https://github.com/Widiskel/sentient-narrative-agent

## Live Demo

- https://sentient-agent-chat.vercel.app/

## Project Overview
- Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion

## Prerequisites
- Node.js >= 18.17
- npm (or pnpm/yarn)
- A running [Sentient Narrative Agent](https://github.com/Widiskel/sentient-narrative-agent) (default: `http://localhost:8000/assist`)

## Setup Guide
1. Clone this repository
2. Install dependencies: `npm install`
3. Optional environment variables in `.env`:
   - `ASSIST_API_URL` — agent endpoint (default `http://localhost:8000/assist`)

## Run Guide
- Development: `npm run dev` (open http://localhost:3000)
  - Ensure the backend agent is running or set `ASSIST_API_URL`
- Production:
  - `npm run build`
  - `npm start`

## Deploy Guide (Vercel)

This project is ready for Vercel. A `vercel.json` is included to increase the serverless function duration for `/api/assist` and to disable caching for SSE.

### 1) Connect repository (CI/CD)
- Push this repo to GitHub/GitLab/Bitbucket.
- In Vercel Dashboard → New Project → Import your repository.
- Framework preset: Next.js (auto-detected).
- Set Environment Variables (Preview and Production):
  - `ASSIST_API_URL` = `https://YOUR-PUBLIC-BACKEND/assist`
- Click Deploy.

After linking, CI/CD is automatic:
- Every push/PR creates a Preview Deployment (unique URL).
- Merging to the Production branch (default `main`) creates/updates the Production Deployment.

You can change these under Project → Settings → Git:
- Production Branch: `main` (or your choice)
- Automatically Deploy: Enabled
- Ignore Build Step: optional pattern to skip specific builds

### 2) Verify SSE streaming
- Open the deployment URL, send a message, and ensure responses stream smoothly.
- Check Project → Deployments → Logs for `/api/assist` stream events.

### 3) Optional (CLI)
- Install CLI: `npm i -g vercel`
- Link project: `vercel link`
- Set env: `vercel env add ASSIST_API_URL production` (repeat for preview)
- Manual deploy: `vercel` (preview) or `vercel --prod` (production)

### 4) Rollback / Promote
- In Vercel UI, open a previous deployment and click Promote to Production, or
- Use CLI: `vercel rollback`.
