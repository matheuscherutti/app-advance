from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

class TerminationBase(BaseModel):
    employee_name: str
    modality_id: str
    notice_type: str
    notice_date: Optional[date] = None
    termination_date: date
    original_payment_date: date
    adjusted_payment_date: date
    termination_value: float
    fgts_value: Optional[float] = None
    observations: Optional[str] = None
    status: str
    responsible_id: int

class TerminationCreate(TerminationBase):
    pass

class TerminationResponse(TerminationBase):
    id: int
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class UserBase(BaseModel):
    name: str
    email: str
    profile: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
