from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from . import models, schemas, engine, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Gestão de Rescisões API")

# Configure CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change to the actual URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Gestão de Rescisões API is running"}

@app.post("/calculate-dates")
def calculate_dates(termination_date: str):
    try:
        dt = datetime.strptime(termination_date, "%Y-%m-%d")
        return engine.get_payment_date(dt)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

@app.get("/rules/{modality}")
def get_rules(modality: str):
    rules = engine.get_termination_rules(modality)
    if not rules:
        raise HTTPException(status_code=404, detail="Modality not found")
    return rules

@app.post("/terminations/", response_model=schemas.TerminationResponse)
def create_termination(termination: schemas.TerminationCreate, db: Session = Depends(database.get_db)):
    # Simple logic to save
    db_termination = models.Termination(**termination.dict())
    db.add(db_termination)
    db.commit()
    db.refresh(db_termination)
    return db_termination

@app.get("/terminations/", response_model=List[schemas.TerminationResponse])
def list_terminations(db: Session = Depends(database.get_db)):
    return db.query(models.Termination).all()

@app.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(database.get_db)):
    terminations = db.query(models.Termination).all()
    # Basic logic for stats
    return {
        "total": len(terminations),
        "pending": len([t for t in terminations if t.status == "Pendente"]),
        "finalized": len([t for t in terminations if t.status == "Finalizada"]),
        "delayed": len([t for t in terminations if t.status == "Atrasada"]),
        "upcoming": len([t for t in terminations if t.status == "Aguardando pagamento"]),
    }
