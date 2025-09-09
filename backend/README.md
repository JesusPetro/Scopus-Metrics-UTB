# Backend FastAPI - Proyecto Scopus

Este directorio contiene la aplicación **FastAPI** organizada de forma
modular.\
Su propósito es exponer como API la lógica de procesamiento que
originalmente estaba en el notebook, permitiendo cargar tres archivos de
entrada, ejecutar un pipeline y obtener resultados.

## Estructura general

    backend/
    └── app/
        ├── main.py
        ├── core/
        ├── api/
        ├── services/
        ├── schemas/ #Opcional
        ├── data/
        └── tests/

### Descripción breve de carpetas

- **main.py** → Punto de entrada de la aplicación FastAPI.
- **core/** → Configuración global (CORS, variables, ajustes).
- **api/** → Endpoints organizados por versión (v1).
- **services/** → Lógica del negocio (lectura de archivos, pipeline,
  almacenamiento en memoria).
- **schemas/** → Modelos de validación de datos (entrada/salida de la
  API).
- **data/** → Archivos subidos por el usuario (`uploads/`) y
  resultados procesados (`processed/`).
- **tests/** → Pruebas de la aplicación.

## Flujo básico

1.  El usuario sube **tres archivos** (dos Scopus + un Scimago).
2.  El sistema los guarda en `data/uploads/` y genera un identificador
    de carga.
3.  Se ejecuta el **pipeline**, que procesa los archivos y produce
    métricas.
4.  Los resultados se guardan en `data/processed/` y se devuelven a
    través de la API.

---
