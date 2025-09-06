from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import os 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("../../downloads/archivos")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile = File(...)):
    file_location = UPLOAD_DIR / file.filename
    with open(file_location, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"filename": file.filename}