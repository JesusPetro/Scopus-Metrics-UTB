import os 
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.logging import LOGGERS, add_file_handle_to_logger

# ======== Paths base =========
BASE_DIR = Path(__file__).resolve().parent.parent
print(BASE_DIR)
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "upload"
PROCESSED_DIR = DATA_DIR / "processed"


# ======== Fields =========

FIELDS = {
    'authors_info': 'Authors',
    'authors_info_with_id': 'Author full names',
    'authors_id': 'Author(s) ID',
    'dc:title': 'Title',
    'prism:coverDate': 'Date',
    'prism:volume': 'Volume',
    'prism:issueIdentifier': 'Issue',
    'citedby-count': 'Cited by',
    'prism:doi': 'DOI',
    'subtypeDescription': 'Document Type'
}


for d in [UPLOADS_DIR, PROCESSED_DIR]:
    os.makedirs(d, exist_ok=True)

# ==============================

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Use top level .env file (one level above ./backend/)
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # Metadatos generales de la API
    APP_NAME: str = "Scopus Processing API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = (
        "API para subir tres archivos (Scopus + Scimago), procesarlos y obtener métricas."
    )
    API_PREFIX: str = "/api/v1"

    # Seguridad y CORS
    ALLOWED_ORIGINS: list[str] = ["*"] 
    ALLOWED_METHODS: list[str] = ["*"]
    ALLOWED_HEADERS: list[str] = ["*"]


    # Parámetros de archivos
    MAX_FILE_SIZE_MB: int = 20  # Tamaño máximo por archivo
    ALLOWED_EXTENSIONS: list[str] = ["csv", "xlsx", "txt"]

    #Api key & Insttoken
    ELSEVIER_APIKEY: str = ''
    ELSEVIER_INSTTOKEN: str = ''

class Loggin():
    @staticmethod
    def log_to_directory(dirpath, logger_names = None):
        if logger_names is None:
            logger_names = LOGGERS.keys()
        
        assert all(ln in LOGGERS for ln in logger_names), \
            f"Unknow loggers! {logger_names}"
        
        for ln in logger_names:
            add_file_handle_to_logger(LOGGERS[ln], dirpath) 

settings = Settings()
loggin = Loggin()

# print(settings.APP_NAME)