from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    profile = Column(String) # Admin, Operator DP
    created_at = Column(DateTime, default=datetime.utcnow)

class Termination(Base):
    __tablename__ = "terminations"
    id = Column(Integer, primary_key=True, index=True)
    employee_name = Column(String)
    modality_id = Column(String) # For simplicity, storing the key from engine.py
    notice_type = Column(String) # Aviso trabalhado, Aviso indenizado, Sem aviso
    notice_date = Column(Date, nullable=True)
    termination_date = Column(Date)
    original_payment_date = Column(Date)
    adjusted_payment_date = Column(Date)
    termination_value = Column(Float)
    fgts_value = Column(Float, nullable=True)
    observations = Column(String, nullable=True)
    status = Column(String) # Em andamento, Aguardando pagamento, Finalizada, Pendente, Atrasada, Cancelada
    responsible_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    responsible = relationship("User")
