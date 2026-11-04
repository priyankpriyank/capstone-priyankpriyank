# NexTo – Production Deployment Guide (Week 6 / Milestone 2)

This document provides the step-by-step deployment instructions for **NexTo**, matching the architecture approved in the **Capstone Project Proposal (Section: Preliminary Deployment Research)**.

---

## 🏗️ 1. Architecture Overview

| Component | Platform | Configuration |
| :--- | :--- | :--- |
| **Frontend Client** | **Render Static Site** (or **Vercel**) | React 19 + Vite SPA, automatic rewrite to `/index.html` |
| **Backend API** | **Render Web Service** | Node.js 20+ / Express 5 API on port 10000 |
| **Database** | **Supabase PostgreSQL** | Managed cloud PostgreSQL instance in `aws-0-ca-central-1` |
| **Media / Photos** | **Express Static (`/uploads`) / Supabase** | Multipart photo upload handler with static fallback |

---

## 🔑 2. Environment Variables

### Backend Web Service (Render / Railway)
| Variable | Value / Format | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `10000` | Render default web service port |
| `DATABASE_URL` | `postgresql://postgres.[ref]:[pwd]@[host]:5432/postgres` | Supabase pooler connection string |
| `JWT_SECRET` | `[64-character-random-secret]` | Secret key used for signing JWT auth tokens |
| `CLIENT_URL` | `https://nexto-frontend-app.onrender.com` | Frontend origin for CORS credentials |

### Frontend Static Site (Render / Vercel)
| Variable | Value / Format | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://nexto-backend-api.onrender.com` | Live backend API URL (without `/api` suffix) |

---

## 🚀 3. Step-by-Step Deployment Instructions

### Step 3.1: Verify Supabase Database is Active
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project: **`egmmctduiommuciwnifi`**.
3. If the project shows **"Paused"** (due to free tier 7-day inactivity):
   - Click **Restore project** / **Unpause**.
   - Wait 1-2 minutes until status turns green **"Active"**.

---

### Step 3.2: Deploy Backend to Render (Web Service)
1. Log in to [Render](https://render.com) using your GitHub account (`priyankpriyank`).
2. Click **New +** → **Web Service**.
3. Select your repository: `capstone-priyankpriyank`.
4. Configure service settings:
   - **Name**: `nexto-backend-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   - `DATABASE_URL` = *(Your Supabase connection string)*
   - `JWT_SECRET` = `683636eb-6f2c-4d58-bf37-67706b838442`
   - `CLIENT_URL` = *(Your frontend URL, or `*` temporarily until frontend is deployed)*
6. Click **Deploy Web Service**.
7. Once deployed, note down your backend URL (e.g., `https://nexto-backend-api.onrender.com`).
8. Test the live health endpoint in your browser:
   - `https://nexto-backend-api.onrender.com/api/health` → `{"success": true, "message": "NexTo API is running"}`
   - `https://nexto-backend-api.onrender.com/api/health/db` → `{"success": true, "message": "Database connection is working"}`

---

### Step 3.3: Deploy Frontend to Render (Static Site)
1. On Render, click **New +** → **Static Site**.
2. Select your repository: `capstone-priyankpriyank`.
3. Configure settings:
   - **Name**: `nexto-frontend-app`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://nexto-backend-api.onrender.com`
5. Under **Redirects / Rewrites**, add single-page application routing rule:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
6. Click **Create Static Site**.
7. Render will build and publish your frontend to:
   `https://nexto-frontend-app.onrender.com`

---

### Step 3.4: Alternative Quick Frontend Deployment via Vercel
If you prefer Vercel for zero-configuration React deployment:
1. Go to [Vercel](https://vercel.com) → **Add New Project**.
2. Import `capstone-priyankpriyank`.
3. Set **Root Directory** to `client`.
4. Add Environment Variable:
   - `VITE_API_URL` = `https://nexto-backend-api.onrender.com`
5. Click **Deploy**. Vercel will automatically use `client/vercel.json` for SPA routing.

---

## ✅ 4. Verification Checklist for Milestone 2
- [ ] Backend API Health check returns 200 OK (`/api/health`)
- [ ] Database Connection check returns 200 OK (`/api/health/db`)
- [ ] User can register and log in on live URL
- [ ] User can create, edit, mark sold, and delete a listing on live URL
- [ ] Refreshing on sub-routes (`/listings`, `/profile`, `/create-listing`) renders properly without 404
