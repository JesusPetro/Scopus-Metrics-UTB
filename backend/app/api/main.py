from fastapi import APIRouter, FastAPI
from app.core.config import loggin
from app.scopus.ElsClient import elsClient
from app.api.v1.error import init_error_handlers

loggin.log_to_directory('logs')

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}



# Primeras pruebas, solo para ver el llamado (lo que retorna siempre marca error)
@app.get("/intento")
def intento(url: str):
    return {elsClient.exec_request(url)}

init_error_handlers(app)