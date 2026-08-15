from fastapi import FastAPI

app = FastAPI(
    title="ProofPurge API",
    description="Verified Data Sanitization & Device Lifecycle Prototype",
    version="0.1.0"
)


@app.get("/")
def root():
    return {
        "project": "ProofPurge",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }