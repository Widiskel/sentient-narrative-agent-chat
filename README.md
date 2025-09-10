# Sentient Agent Chat

A lightweight web UI for interacting with the Sentient Narrative Agent : https://github.com/Widiskel/sentient-narrative-agent

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

