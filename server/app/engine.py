from datetime import datetime, timedelta
import holidays

def get_payment_date(termination_date: datetime) -> dict:
    # Rule: termination date + 10 days
    payment_date = termination_date + timedelta(days=10)
    original_date = payment_date
    
    # Brazilian holidays (National only as per doc)
    br_holidays = holidays.BR()
    
    # Adjustment logic: 
    # Saturday -> Friday (antecipar)
    # Sunday -> Friday (antecipar)
    # Holiday -> previous workday
    
    while True:
        # Check if it's weekend
        if payment_date.weekday() == 5: # Saturday
            payment_date -= timedelta(days=1)
            continue
        if payment_date.weekday() == 6: # Sunday
            payment_date -= timedelta(days=2) # Previous Friday
            continue
        # Check if it's holiday
        if payment_date in br_holidays:
            payment_date -= timedelta(days=1)
            continue
            
        # If none of the above, it's a valid workday
        break
        
    return {
        "original": original_date.strftime("%Y-%m-%d"),
        "adjusted": payment_date.strftime("%Y-%m-%d")
    }

def get_termination_rules(modality: str):
    rules = {
        "dispensa_aviso_indenizado": {
            "fgts": True,
            "multa_fgts": 40,
            "seguro_desemprego": True,
            "guia_fgts": True,
            "documents_company": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Extrato FGTS", "Guia FGTS", "Detalhamento FGTS", "Comprovante pagamento"],
            "documents_employee": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Carta referência", "Extrato FGTS", "Seguro desemprego", "Comprovante pagamento"]
        },
        "dispensa_aviso_trabalhado": {
            "fgts": True,
            "multa_fgts": 40,
            "seguro_desemprego": True,
            "guia_fgts": True,
            "documents_company": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Extrato FGTS", "Guia FGTS", "Detalhamento FGTS", "Comprovante pagamento"],
            "documents_employee": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Carta referência", "Extrato FGTS", "Seguro desemprego", "Comprovante pagamento"]
        },
        "pedido_demissao_desconto_aviso": {
            "fgts": False,
            "multa_fgts": 0,
            "seguro_desemprego": False,
            "guia_fgts": False,
            "documents_company": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Extrato FGTS", "Comprovante pagamento"],
            "documents_employee": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Carta referência", "Extrato FGTS", "Comprovante pagamento"]
        },
        "pedido_demissao_aviso_trabalhado": {
            "fgts": False,
            "multa_fgts": 0,
            "seguro_desemprego": False,
            "guia_fgts": False,
            "documents_company": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Extrato FGTS", "Comprovante pagamento"],
            "documents_employee": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Carta referência", "Extrato FGTS", "Comprovante pagamento"]
        },
        "termino_experiencia": {
            "fgts": True,
            "multa_fgts": 40,
            "seguro_desemprego": False,
            "guia_fgts": True,
            "documents_company": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Extrato FGTS", "Guia FGTS", "Detalhamento FGTS", "Comprovante pagamento"],
            "documents_employee": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Carta referência", "Extrato FGTS", "Comprovante pagamento"]
        },
        "experiencia_antecipada_empregado": {
            "fgts": False,
            "multa_fgts": 0,
            "seguro_desemprego": False,
            "guia_fgts": False,
            "documents_company": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Extrato FGTS", "Comprovante pagamento"],
            "documents_employee": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Carta referência", "Extrato FGTS", "Comprovante pagamento"]
        },
        "experiencia_antecipada_empregador": {
            "fgts": True,
            "multa_fgts": 40,
            "seguro_desemprego": True,
            "guia_fgts": True,
            "documents_company": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Extrato FGTS", "Guia FGTS", "Detalhamento FGTS", "Comprovante pagamento"],
            "documents_employee": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Carta referência", "Extrato FGTS", "Seguro desemprego", "Comprovante pagamento"]
        },
        "acordo_partes": {
            "fgts": True,
            "multa_fgts": 20,
            "seguro_desemprego": False,
            "guia_fgts": True,
            "documents_company": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Extrato FGTS", "Guia FGTS", "Detalhamento FGTS", "Comprovante pagamento"],
            "documents_employee": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Carta referência", "Extrato FGTS", "Comprovante pagamento"]
        },
        "justa_causa": {
            "fgts": False,
            "multa_fgts": 0,
            "seguro_desemprego": False,
            "guia_fgts": False,
            "documents_company": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Extrato FGTS", "Comprovante pagamento"],
            "documents_employee": ["Analítico da rescisão", "Termo de rescisão", "Termo de quitação", "Carta referência", "Extrato FGTS", "Comprovante pagamento"]
        }
    }
    return rules.get(modality, {})
