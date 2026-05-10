# SYAMAUDIT Intelligence Dashboard 🏥🤖

An intelligent, AI-integrated Audit Coding and Pending Claim Resolution dashboard powered by **Google Gemini 2.5 Flash**.

## Features
- **AI Claim Resolution**: Context-aware recommendations for pending clinical claims.
- **Tosca Premium UI**: High-performance dashboard with Light/Dark mode.
- **Audit Engine**: Automated business logic to identify coding discrepancies and revenue opportunities.
- **Multi-File Management**: Seamlessly process TXT, Syamval, and Pending Excel files.
- **Privacy First**: Designed for local data processing with strict file isolation.

## Tech Stack
- **Backend**: FastAPI (Python), Pandas, Google Generative AI (Gemini 2.5 Flash).
- **Frontend**: Vite + React, Tailwind CSS, Framer Motion, Lucide Icons.

## Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key

## Setup & Installation

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/your-username/syamaudit-dashboard.git
cd syamaudit-dashboard

# Install dependencies
pip install -r requirements.txt

# Set your API Key
# Create a .env file or set environment variable
set GEMINI_API_KEY=your_api_key_here
```

### 2. Frontend Setup
```bash
cd dashboard
npm install
```

## Running the Application
Use the provided batch script for easy startup:
```bash
run_dashboard.bat
```
Alternatively, run manually:
- **Backend**: `python main.py`
- **Frontend**: `cd dashboard && npm run dev`

## Deployment
This application is designed to be deployed as a local internal tool for hospitals. If deploying to a server, ensure the `TARGET_DIR` in `main.py` is configured correctly for your environment.

---
**Developed with ❤️ for RSUD Syamsudin**
