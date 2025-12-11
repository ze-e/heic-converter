heic-converter – Deployment Guide

This document explains how to build, configure, and deploy the heic-converter application in a production environment. The repository contains both the backend and frontend in a single project.

The stack includes:

Frontend: React (Vite)
Backend: Node.js (Express)

Image/Video Conversion:

HEIC → JPG using heic-convert
MOV → MP4 using ffmpeg via fluent-ffmpeg

File Uploads: Multer
Static Hosting: Backend serves built frontend + converted results

1. Prerequisites

The production server must have:

System Requirements

Node.js 18+

npm 8+

ffmpeg installed and accessible from PATH
Test with:

ffmpeg -version

Directory Structure (final deployed layout)
heic-converter/
  backend/
    server.js
    package.json
    uploads/       ← temp upload storage
    converted/     ← converted output files
    public/        ← built frontend goes here
  frontend/
    (Vite project)
  DEPLOYMENT.md
  README.md

2. One-Time Setup
Step 1 — Clone the repository
git clone <YOUR_REPO_URL> heic-converter
cd heic-converter

Step 2 — Install backend dependencies
cd backend
npm install

Step 3 — Install frontend dependencies
cd ../frontend
npm install

3. Building for Production

In production, the backend serves the compiled frontend.

Step 1 — Build the frontend
cd frontend
npm run build


This creates the dist/ directory.

Step 2 — Move the built frontend into the backend folder
rm -rf ../backend/public
cp -r dist ../backend/public


Now your backend directory should include:

backend/public/index.html
backend/public/assets/*

Step 3 — Verify backend server.js setup

The backend should contain these lines:

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});


This ensures all unknown routes resolve to the frontend SPA.

4. Running in Production

From the backend directory:

cd backend
NODE_ENV=production PORT=8080 npm start


Then visit:

http://<YOUR_SERVER>:8080/ → App loads

http://<YOUR_SERVER>:8080/api/health → Should return {"status":"ok"}

5. Deploying on Common Hosts
Option A — Deploy to a VPS (DigitalOcean, Linode, AWS EC2)

Install Node.js and ffmpeg on the VPS.

Clone your repo.

Run:

cd frontend && npm install && npm run build
cd ../backend && npm install


Copy frontend build:

rm -rf public
cp -r ../frontend/dist public


Start server with PM2 (recommended):

npm install -g pm2
pm2 start server.js --name heic-converter
pm2 save


Configure Nginx reverse proxy (optional but recommended):

server {
  listen 80;
  server_name heic.<yourdomain>.com;

  location / {
    proxy_pass http://localhost:8080;
  }
}

Option B — Deploy on Render, Railway, or Fly.io

These platforms support Node apps natively.

Build Command:

cd frontend && npm install && npm run build
cd ../backend && npm install


Start Command:

cd backend && npm start


Environment Variables:

PORT

NODE_ENV=production

Important:
The platform must provide ffmpeg.
If not:

Choose a plan that includes "Docker deployment"

Or install ffmpeg during build via apt commands.

6. Testing Your Deployment

After deployment, validate:

Upload HEIC → Returns JPG

Upload MOV → Returns MP4

Converted files are accessible at:

/converted/<filename>.jpg
/converted/<filename>.mp4


No 500 errors in the browser Network tab

Logs show successful conversions:

Converting file xxx.HEIC → xxx.jpg
Converting file yyy.MOV → yyy.mp4

7. Production File Storage Notes

The backend writes files to:

backend/uploads/ (temp files)

backend/converted/ (final outputs)

If using ephemeral file systems (e.g., serverless environments), you must switch to persistent storage such as:

AWS S3

Backblaze B2

Cloudflare R2

Support can be added later; the app is already structured to swap storage backends easily.

8. Common Errors & Fixes
Error: Support for this compression format has not been built in

Cause: Attempting to use sharp for HEIC
Fix: This project uses heic-convert, so this should be resolved.

Error: ffmpeg was not found

Cause: ffmpeg not installed or not on PATH
Fix: Install via apt, brew, choco, or download binaries.

Error: 500 Internal Server Error on convert

Check backend logs for details.

9. Summary

To deploy:

git clone <repo>
cd frontend && npm install && npm run build
cd ../backend && npm install
rm -rf public && cp -r ../frontend/dist public
NODE_ENV=production PORT=8080 npm start


Your full app is now live.