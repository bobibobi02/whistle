# Whistle Project

## Overview
Whistle is a Reddit-style discussion platform built with Next.js, Prisma, and Tailwind CSS.

## Features
- User authentication (NextAuth)
- Posts, comments, nested replies, voting
- Subforums
- Moderator tools (action logs, report queues, strikes, etc.)
- Real-time alerts (SSE)
- AI-powered helpers (summaries)
- Private messaging

## Getting Started
1. `git clone <repo>`
2. `npm install`
3. Create `.env` with database and service credentials.
4. `npx prisma migrate dev`
5. `npm run dev`

## Scripts
- `npm run dev` - Local development
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run E2E tests (Cypress)
