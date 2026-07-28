# Vines & Views API 🌿 Backend Service

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v6.0-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-v5.0-000000.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%20v9-green.svg)](https://www.mongodb.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%203.6%20Flash-orange.svg)](https://ai.google.dev/)
[![Deployment](https://img.shields.io/badge/Vercel-Serverless%20Ready-black.svg)](https://vercel.com/)

**Vines & Views API** is a high-performance, production-ready RESTful backend platform built to power the **Vines & Views** organic gardening, botanical care, and plant enthusiasts' blogging platform.

It combines robust database indexing, atomic transactional cleanup, session-based authentication, and intelligent **Google Gemini 3.6 Flash AI** capabilities for content generation, post summarization, and community growth insights.

---

## ✨ Key Features

### 🤖 1. AI Powerhouse (Google Gemini 3.6 Flash)
* **AI Post Generator (`POST /posts/generate-ai`)**:
  * Topic guardrails: Validates if titles are strictly relevant to gardening, plants, or botany before generating content.
  * Custom word count control (200–500 words).
  * Auto-generates structured content, tags, and matching Unsplash thumbnail image URLs.
  * Retry counter for progressive stylistic variation.
* **Automated Post Summaries**: Automatically generates concise 1–2 sentence summaries using Gemini AI upon post submission.
* **AI Account Overview & Topic Recommendations (`GET /account-overview`)**:
  * Analyzes author stats, posting frequency, tag usage, and audience engagement.
  * Generates an actionable profile growth strategy.
  * Suggests **10 unique, non-duplicate gardening post ideas** tailored specifically to the user's past publishing record.

### 📝 2. Post & Content Engine
* **Pagination & Search**: High-performance MongoDB query execution with regex title/tag filtering and lean object returning for maximum throughput.
* **Deep Relational Population**: Fetches post details with populated author info, likers, and nested comment author metadata.
* **Atomic Cascade Deletion**: Uses Mongoose Transactions (`startSession`) to atomically delete posts along with all linked comments in a single database operation.

### 💬 3. Social & Interaction System
* **Set-Based Unique Likes**: Uses `$addToSet` and `$pull` operators for duplicate-safe liking/unliking functionality.
* **Comment System**: Nested commenting engine linking comments directly to post structures.

### 📊 4. Analytics & Dashboard
* **User Analytics Dashboard (`GET /dashboard`)**: Real-time aggregated statistics including total posts, total likes received, total comments received, recent post history, and user activity.

---

## 🛠️ Tech Stack

* **Runtime Environment**: Node.js
* **Language**: TypeScript 6
* **Web Framework**: Express.js (v5)
* **Database & ORM**: MongoDB & Mongoose (v9)
* **AI Engine**: Google GenAI SDK (`@google/genai`) with Gemini 3.6 Flash
* **Validation & Security**: Helmet, CORS, Morgan, Cookie Parser, Zod, Dotenv
* **Dev Tools**: Nodemon, `ts-node`, `tsx`

---

## 📂 Project Structure

```text
vine-and-views-backend/
├── api/                  # Vercel Serverless Function entry point
│   └── index.ts
├── src/
│   ├── config/           # Database connection & environment configuration
│   │   ├── db.ts
│   │   └── index.ts
│   ├── modules/          # Mongoose Schemas & TypeScript Interfaces (User, Session, Post, Comment)
│   │   └── index.ts
│   ├── service/          # Business logic & controller handlers
│   │   ├── comment.service.ts
│   │   └── post.service.ts
│   ├── app.ts            # Express application setup & middleware definitions
│   └── server.ts         # Server entry point for standalone node execution
├── .env                  # Local environment configuration
├── nodemon.json          # Development hot-reloading configuration
├── tsconfig.json         # TypeScript compiler options
├── vercel.json           # Vercel deployment routing configuration
└── package.json
```

---

## 📦 Getting Started

### Prerequisites

* **Node.js**: v18.x or higher
* **MongoDB**: A running MongoDB instance or MongoDB Atlas connection URI
* **Google Gemini API Key**: An active API key from [Google AI Studio](https://aistudio.google.com/)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/masumb30/vine-and-views-backend.git
cd vine-and-views-backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/vinesandviews
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 3. Running the Server

* **Development Mode** (with hot reload):
  ```bash
  npm run dev
  ```

* **Production Build**:
  ```bash
  npm run build
  npm start
  ```

---

## 📡 API Reference

### Health Check

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Verify API health status | No |

---

### 📝 Posts

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/posts` | Fetch paginated posts (Query params: `page`, `limit`, `search`) | No |
| `GET` | `/posts/:id` | Fetch post by ID with author, likes & nested comments | No |
| `POST` | `/posts` | Create new post (triggers automatic AI summary) | Yes (`Bearer <token>`) |
| `POST` | `/posts/generate-ai` | Generate draft post using Gemini AI (`title`, `length`, `retryCount`) | No |
| `PATCH` | `/posts/like/:postId/:type` | Like or unlike post (`type`: `like` \| `unlike`) | Yes (`Bearer <token>`) |
| `DELETE` | `/posts/:id` | Atomically delete post and all associated comments | Yes (`Bearer <token>`) |

---

### 💬 Comments

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/comments/:postId` | Add a comment to a specific post | Yes (`Bearer <token>`) |
| `DELETE` | `/comments/:id` | Delete a comment by ID | Yes (`Bearer <token>`) |

---

### 📊 Dashboard & AI Analytics

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard` | Retrieve user post/comment metrics and activity | Yes (`Bearer <token>`) |
| `GET` | `/account-overview` | Get AI profile analysis & 10 tailored blog recommendations | Yes (`Bearer <token>`) |

---

## 🚀 Deployment

### Deploying on Vercel

This repository includes built-in Vercel serverless configuration (`vercel.json` and `api/index.ts`).

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` and follow prompts.
3. Set environment variables (`MONGODB_URI`, `GEMINI_API_KEY`) in your Vercel project settings.

---

## 📄 License

This project is licensed under the **ISC License**.
