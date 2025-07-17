"""
Dummy Cloud Run app for CI/CD testing.
"""
from fastapi import FastAPI
import os

app = FastAPI(title="Agent Data Langroid - Dummy Cloud Run")

@app.get("/")
def root():
    return {"service": "agent-data-langroid-dummy", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy", "service": "cloudrun_dummy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
