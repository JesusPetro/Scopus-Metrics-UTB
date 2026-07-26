# test — README

Este directorio contiene **pruebas unitarias y exploratorias** para tres clases API que se evaluarán **de manera individual** antes de integrarlas al backend.

## Mapa de la carpeta

```
test/
│
├─ ElsClient - API.ipynb     # Pruebas de la clase ElsClient (basada en Elsapy)
├─ ElsJson - API.ipynb       # Pruebas de la clase ElsJson (autoría propia)
├─ ElsSearch - API.ipynb     # Pruebas de la clase ElsSearch (basada en Elsapy)
├─ README.md                 # Este archivo (guía de las pruebas)
└─ scopus_results_fieldv2.json  # JSON de ejemplo para probar ElsJson
```

## Alcance de las pruebas

- **ElsClient** (`ElsClient - API.ipynb`)  
  Clase de cliente para autenticación/conexión y llamadas base a la API de Elsevier.  
  Se probará:

  - Inicialización y credenciales.
  - Llamadas básicas y manejo de respuestas.
  - Gestión de errores comunes (códigos HTTP, timeouts).

- **ElsSearch** (`ElsSearch - API.ipynb`)  
  Clase responsable de construir y ejecutar consultas de búsqueda (query params, paginación, etc.).  
  Se probará:

  - Construcción de queries.
  - Paginación/iteración de resultados.
  - Extracción de campos clave de la respuesta.

- **ElsJson** (`ElsJson - API.ipynb`)  
  **Autoría propia.** Parser/normalizador del JSON de resultados (Search Results) para transformarlo en estructuras de trabajo (p. ej., `pandas.DataFrame`).  
  Se probará:
  - Lectura desde archivo local.
  - Validación mínima de contrato (`search-results.entry`).
  - Derivación de columnas (autores, ids, etc.) y mapeo de campos.

## Archivo de ejemplo

- **`scopus_results_fieldv2.json`**  
  Muestra de respuesta 👉 se utiliza para probar **ElsJson** sin necesidad de llamar a la API.  
  En teoría, replica la **estructura JSON** que devuelven **ElsClient** y **ElsSearch** al ejecutar consultas reales.

## Flujo previsto

1. **Probar individualmente** cada clase en su notebook correspondiente.
2. Ajustar contratos (campos esperados, normalización, manejo de errores) con base en los resultados.
3. **Integrar** las tres piezas en el **backend** (ElsClient/ElsSearch para IO con la API; ElsJson para parse/normalización y entrega de datos limpios al resto del sistema).

## Notas

- **ElsClient** y **ElsSearch**: basadas en **Elsapy**.
  `Elsapy (GitHub):` [Elsapy](https://github.com/ElsevierDev/elsapy/tree/master)
- **ElsJson**: implementación propia enfocada en limpieza/estandarización de la respuesta JSON.
- Las notebooks están orientadas a pruebas exploratorias, validación de contrato y documentación viva del comportamiento.

---

> Sugerencia: cuando se complete la integración al backend, mover estas pruebas a un conjunto de tests automatizados (p. ej., `pytest`) y mantener este `README.md` como guía rápida del propósito/alcance.
