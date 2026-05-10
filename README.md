# SYAMAUDIT Intelligence Dashboard 🏥🤖

An intelligent, AI-integrated Audit Coding and Pending Claim Resolution dashboard powered by **Client-Side Processing**.

## Features
- **Client-Side Processing**: Upload and analyze data directly in your browser - no backend required!
- **AI Claim Resolution**: Context-aware recommendations for pending clinical claims.
- **Tosca Premium UI**: High-performance dashboard with Light/Dark mode.
- **Audit Engine**: Automated ICD-10 coding discrepancy detection and revenue opportunity identification.
- **Multi-File Management**: Process TXT, Excel, and HTML files seamlessly.
- **Privacy First**: All processing happens locally in your browser - your data never leaves your device.

## Tech Stack
- **Frontend**: Vite + React, Tailwind CSS, Framer Motion, Lucide Icons.
- **Processing**: Pure JavaScript implementation of audit rules and data analysis.

## Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server or backend installation required!

## Quick Start
1. **Open the dashboard**: Visit the GitHub Pages URL or run locally
2. **Upload your data files**:
   - Primary Data (.TXT files) - Main clinical data
   - Syamval Report (.XLS/.XLSX) - Coding comparison data
   - Pending Claims (.XLSX) - Claims requiring resolution
3. **Click "Generate Audit Analytics"** - Processing happens instantly in your browser
4. **View results** in the interactive dashboard

## File Formats Supported
- **.TXT files**: Tab-separated clinical data files
- **.XLSX files**: Excel files for pending claims and Syamval reports
- **Automatic parsing** of ICD-10 diagnosis and procedure codes

## Local Development
```bash
cd dashboard
npm install
npm run dev
```

## Building for Production
```bash
cd dashboard
npm run build
```

## Publishing to GitHub Pages
The application is configured for automatic deployment:
1. Push your code to GitHub
2. Enable GitHub Pages in repository settings (source: GitHub Actions)
3. The standalone dashboard will be available at `https://your-username.github.io/repository-name/`

## How It Works
1. **Upload Files**: Drag & drop or click to upload your clinical data files
2. **Client-Side Processing**: JavaScript parses files and applies ICD-10 audit rules
3. **Instant Results**: View audit findings, top-up opportunities, and discrepancies immediately
4. **Interactive Dashboard**: Filter, search, and resolve findings with AI-powered recommendations

## Security & Privacy
- All data processing occurs in your browser
- Files are parsed locally and never uploaded to any server
- No external API calls or data transmission
- Your clinical data remains completely private

## Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Note
This is a fully standalone web application. Unlike traditional web apps that require servers, all audit processing happens in your browser using JavaScript implementations of the ICD-10 rules and algorithms.

## Deployment
This application is designed to be deployed as a local internal tool for hospitals. If deploying to a server, ensure the `TARGET_DIR` in `main.py` is configured correctly for your environment.

---
**Developed with ❤️ for RSUD Syamsudin**
