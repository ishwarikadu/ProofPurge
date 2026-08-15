from fastapi import FastAPI

from database import engine, Base
import models


Base.metadata.create_all(bind=engine)


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