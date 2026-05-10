@echo off
title Audit Coding Web Dashboard
echo Memulai Backend API (FastAPI)...
echo Menggunakan API Key Gemini yang telah dikonfigurasi.
start /b python main.py
echo Memulai Frontend Dashboard (Vite)...
cd dashboard
npm run dev
pause
