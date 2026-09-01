# AssessX - Smart Online Assessment System

## Project Structure
```
├── backend/            # Spring Boot (Java 17) REST API with JWT Auth & H2 Database
│   ├── Dockerfile      # Multi-stage Docker build for cloud deployment
│   ├── pom.xml         # Maven dependencies and configuration
│   └── src/            # Application source code
├── frontend/           # HTML5 / CSS3 / Vanilla JavaScript client
│   ├── css/style.css   # Styling & responsive design
│   ├── js/api.js       # API client service
│   ├── js/auth.js      # Login and registration authentication logic
│   ├── index.html      # Login page
│   └── register.html   # Registration page
└── render.yaml         # Render Blueprint configuration
```

## Deployment Guide

### Option 1: Deploy on Render (Recommended)
This repository includes a [`render.yaml`](./render.yaml) blueprint:
1. Push this project to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint**.
3. Connect your repository. Render will automatically detect and deploy:
   - **Backend Web Service** (Docker container running on dynamic `$PORT`)
   - **Frontend Static Site** (Publishing the `frontend/` directory)
4. Once deployed, configure the frontend `API_BASE_URL` in `frontend/js/api.js` or via `localStorage.setItem('API_BASE_URL', 'https://your-backend-url.onrender.com/api/v1')`.

### Option 2: Deploying Backend Individually
If creating a manual Web Service on Render / Railway:
- **Environment**: Docker
- **Root Directory**: `backend`
- **Dockerfile Path**: `Dockerfile` (or `backend/Dockerfile` if root is `.`)
- **Docker Context**: `backend` (or `.` if relative to backend)

### Option 3: Deploying Frontend Individually
If deploying to Netlify, Vercel, or GitHub Pages:
- **Publish Directory / Root Directory**: `frontend`
