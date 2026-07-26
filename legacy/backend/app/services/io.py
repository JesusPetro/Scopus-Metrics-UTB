import os
import shutil
import pandas as pd 
from datetime import datetime
from pathlib import Path
from typing import List, Dict
from app.core.config import settings, UPLOADS_DIR, PROCESSED_DIR


# Customised exceptions
class InvalidFileError(Exception):
    """Se lanza cuando un archivo no cumple con las validaciones requeridas."""
    def __init__(self, role: str, message: str, warning: str | int = None): 
        self.COLORDEFAULT = '\033[0m'
        self.role = role
        self.message = message

        if  isinstance(warning, int):
            if warning == 1: # equivalente a que no es grave
                self.color = '\033[32m - Ok'
            elif warning == 2: # equivalente a tener cuidado
                self.color = '\033[33m - Warning' 
            elif warning == 3: # equivalente a peligroso
                self.color == '\033[31m - Danger'

        elif (isinstance(warning, str)):
            if warning.lower() == 'ok':
                self.color = '\033[32m - Ok'
            if warning.lower() == 'warning':
                self.color = '\033[33m - Warning' 
            if warning.lower() == 'danger':
                self.color = '\033[31m - Danger'
        else: 
            self.color = self.COLORDEFAULT

        super().__init__(f'[{role}] {self.color} - \033[0m {message}')



# Basic configuration
ALLOWED_EXTENSIONS = settings.ALLOWED_EXTENSIONS
MAX_FILE_SIZE_MB = settings.MAX_FILE_SIZE_MB

UPLOADS_DIR = UPLOADS_DIR
PROCESSED_DIR = PROCESSED_DIR


# Validation functions

def validate_extensions(filename: str) -> None:
    ext = filename.split('.')[-1]
    if ext not in ALLOWED_EXTENSIONS: 
        # raise InvalidFileError(f"Extensión inválida: .{ext}. Se permiten: {ALLOWED_EXTENSIONS}")
        raise InvalidFileError('Extensión', f'Extensión inválida: .{ext} no está permitida. Se permiten: {ALLOWED_EXTENSIONS}', 'warning')

def validate_size(file_path: Path) -> None:
    size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB: 
        raise InvalidFileError('Tamaño [MB]', f'El archivo excede el tamaño máximo permitido', 'warning')

def validate_columns(file_path: Path, role: str) -> None:
    df = pd.read_csv(file_path, sep = ';') if file_path.suffix != 'xlsx' else pd.read_excel(file_path)

    required_columns = {
        'dataUTB': [],
        'scopus': [],
        'schimago': []
    }

    columns = df.columns
    required_columns_data = required_columns[role]

    if (len(required_columns_data) > columns):
        raise InvalidFileError('Tamaño Columnas', f'el archivo adjuntado no contiene la misma cantidad de columnas', 'danger')

    missing = [c for c in required_columns_data if c not in columns]
    if missing:
        raise InvalidFileError(f'El arrchivo {role} no contiene las columnas: {missing}', 'warning')    


# save function
def save_file():
    pass


if __name__ == '__main__':
    # validate_extensions('hola.img')
    print(MAX_FILE_SIZE_MB)
    pass