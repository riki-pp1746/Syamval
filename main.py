from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from audit_coding_processor import process_audit_coding
import os
import json
import shutil
import glob
import google.generativeai as genai
from typing import List

app = FastAPI(title="Audit Coding Dashboard API")

# Use current directory as default if not specified
TARGET_DIR = os.environ.get("AUDIT_TARGET_DIR", os.getcwd())

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RES_FILE = "pending_resolutions.json"

class Resolution(BaseModel):
    SEP: str
    JAWABAN: str
    TINDAK_LANJUT: str

class RecommendRequest(BaseModel):
    sep: str
    reason: str
    diagnosis: str = ""
    procedure: str = ""

@app.get("/api/data")
async def get_data():
    # Passive endpoint: Only returns previously processed data from cache
    cache_file = os.path.join(TARGET_DIR, "audit_results_cache.json")
    try:
        if os.path.exists(cache_file):
            with open(cache_file, 'r') as f:
                return json.load(f)
        
        return {
            "summary": {"total_cases": 0, "audit_findings": 0, "topup_findings": 0, "discrepancies": 0, "pending_cases": 0, "total_topup_value": 0},
            "perf": [], "audit": [], "topup": [], "discrepancy": [], "pending": [], "all": []
        }
    except Exception as e:
        return {
            "summary": {"total_cases": 0, "audit_findings": 0, "topup_findings": 0, "discrepancies": 0, "pending_cases": 0, "total_topup_value": 0},
            "perf": [], "audit": [], "topup": [], "discrepancy": [], "pending": [], "all": []
        }

@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    try:
        uploaded_files = []
        for file in files:
            file_path = os.path.join(TARGET_DIR, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            uploaded_files.append(file.filename)
        return {"status": "success", "uploaded": uploaded_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process")
async def trigger_process():
    try:
        # This is where the audit actually runs
        data = process_audit_coding(return_data=True)
        
        # Save to cache for passive retrieval later
        cache_file = os.path.join(TARGET_DIR, "audit_results_cache.json")
        with open(cache_file, 'w') as f:
            json.dump(data, f)
            
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pending")
async def save_resolution(res: Resolution):
    try:
        resolutions = []
        if os.path.exists(RES_FILE):
            with open(RES_FILE, 'r') as f:
                resolutions = json.load(f)
        
        # Update or Add
        updated = False
        for r in resolutions:
            if r['SEP'] == res.SEP:
                r['JAWABAN'] = res.JAWABAN
                r['TINDAK_LANJUT'] = res.TINDAK_LANJUT
                updated = True
                break
        
        if not updated:
            resolutions.append(res.dict())
            
        with open(RES_FILE, 'w') as f:
            json.dump(resolutions, f, indent=4)
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/pending/{sep}")
async def delete_resolution(sep: str):
    try:
        if not os.path.exists(RES_FILE):
            return {"status": "not found"}
            
        with open(RES_FILE, 'r') as f:
            resolutions = json.load(f)
            
        resolutions = [r for r in resolutions if r['SEP'] != sep]
        
        with open(RES_FILE, 'w') as f:
            json.dump(resolutions, f, indent=4)
            
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    # Use provided default key if environment variable is not set
    api_key = os.environ.get("GEMINI_API_KEY", "AIzaSyAoHmx5wNaczA1F7pQHkY4bre9Zyhzfjio")
    
    try:
        genai.configure(api_key=api_key)
        # Updated to Gemini 2.5 Flash
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""
        Anda adalah asisten ahli koding medis dan verifikator klaim JKN di RSUD Syamsudin.
        Tugas Anda adalah memberikan rekomendasi jawaban untuk menyelesaikan pending klaim.
        
        DETAIL KASUS:
        SEP: {req.sep}
        Keterangan Pending dari BPJS: {req.reason}
        Diagnosis: {req.diagnosis}
        Prosedur: {req.procedure}
        
        Berikan jawaban yang profesional, berbasis regulasi (PMK No. 26/2021, ICD-10, ICD-9-CM), 
        dan taktis agar klaim dapat segera disetujui (Layak).
        Jawaban harus singkat (maksimal 3-4 kalimat).
        """
        response = model.generate_content(prompt)
        return {"recommendation": response.text}
    except Exception as e:
        return {"recommendation": f"AI Error: {str(e)}"}

@app.get("/api/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
