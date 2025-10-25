# API Documentation

## Authentication
- `GET /api/auth/session` - Get current session

## Posts
- `GET /api/search?q=...` - Full-text search
- `POST /api/post` - Create new post
- `GET /api/post/[id]` - Get post details

## Moderation
- `GET /api/mod/log` - Get mod action log
- `GET /api/mod/reports` - Get report queue
- `POST /api/mod/deletePost` - Delete a post
- `POST /api/mod/deleteComment` - Delete a comment
- `POST /api/mod/banUser` - Ban a user
- `POST /api/mod/addStrike` - Add user strike
- `GET /api/mod/getStrikes?userId=` - Get user strikes
- `GET /api/mod/dashboard` - Get mod dashboard data
- `GET /api/mod/stream` - SSE stream for real-time alerts
- `GET /api/mod/exportLogs` - Download mod actions CSV

## Private Messaging
- `GET /api/messages` - Get inbox
- `POST /api/messages` - Send message

## Analytics
- `GET /api/analytics` - Community analytics

## AI
- `POST /api/ai/summary` - Summarize text

## Revalidation & Caching
- `POST /api/revalidate` - ISR revalidation
