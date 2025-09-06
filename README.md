# Scopus-Metrics-UTB

### _Readme Generado por GPT_

> Generación de tablas resumen y análisis de productividad científica para investigadores de la Universidad, con categorización por **cuartiles (Q1, Q2, Q3, Q4 / Sin Cuartil)** a partir de exportaciones de **Scopus**.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#licencia)
[![Made with: Jupyter](https://img.shields.io/badge/Made%20with-Jupyter-orange.svg)](#uso)

---

## 🎯 Objetivo

Este proyecto automatiza la **limpieza, integración y resumen** de datos bibliométricos exportados desde **Scopus**, para producir:

- Tablas de productividad por **investigador**, **año**, **unidad/área** (si el dato está disponible).
- Conteos y proporciones por **cuartil (Q1–Q4 / Sin cuartil)**.
- Indicadores agregados (p. ej., publicaciones totales, citas totales/promedio, top fuentes, etc.).
- Salidas listas para **informes gerenciales** y **seguimiento institucional**.

> **Estado:** En construcción activa (WIP). Se prioriza el flujo vía notebook y se deja espacio para un _frontend_ exploratorio.

---

## 🗂️ Estructura del repositorio

```
Scopus-Metrics-UTB/
├─ backend/            # (WIP) Scripts/utilidades para el procesamiento
├─ data/               # Archivos de ejemplo / insumo (no rastrear datos sensibles)
├─ frontend/           # (WIP) Interfaz exploratoria / dashboard
├─ Script-Scopus.ipynb # Notebook principal de análisis y generación de tablas
├─ LICENSE             # MIT
└─ README.md
```

---

## ⚙️ Requisitos

- **Python 3.9+** (recomendado 3.10/3.11)
- Paquetes comunes de ciencia de datos:
  - `pandas`, `numpy`, `jupyter`
  - (Opcionales según tu flujo) `matplotlib` / `plotly`, `openpyxl` (si lees Excel)

> Si agregas un `requirements.txt`, podrás instalar todo con:
>
> ```bash
> pip install -r requirements.txt
> ```

---

## 📦 Instalación rápida

```bash
# 1) Crear y activar un entorno virtual (opcional, recomendado)
python -m venv .venv
# Windows
.venv\Scriptsctivate
# macOS / Linux
source .venv/bin/activate

# 2) Instalar dependencias mínimas
pip install pandas numpy jupyter openpyxl matplotlib
```

---

## 📥 Preparación de datos (Scopus)

1. Entra a **Scopus** y realiza la búsqueda/consulta de interés (por autor, unidad, institución, etc.).
2. **Exporta** los resultados a **CSV/Excel** (campos sugeridos):
   - Autores/Autor de correspondencia, Título, Año, Fuente (revista/conferencia), Tipo de documento
   - Total de **citas**
   - **Cuartil** / métricas de la fuente (si están disponibles en la exportación)
   - DOI / EID (útiles para posteriores integraciones)
3. Copia los archivos a `data/` (o define tu propia ruta en el notebook).

> **Nota:** Asegúrate de **no** subir datos sensibles o con restricciones de licencia al repositorio público.

---

## 🧪 Uso

### Opción A: Notebook (recomendada)

1. Abre `Script-Scopus.ipynb` en Jupyter/VS Code.
2. Configura las **rutas de entrada** (p. ej., `data/tu_export_scopus.xlsx`).
3. Ejecuta las celdas para:
   - Cargar y limpiar datos
   - Generar **tablas resumen** por investigador, año y cuartil
   - Exportar resultados a CSV/Excel si lo deseas

> El notebook produce **DataFrames** y (opcionalmente) **archivos .csv/.xlsx** listos para informes.

### Opción B: Backend (WIP)

- La carpeta `backend/` está pensada para evolucionar a scripts reutilizables/CLI.
- Idea: exponer funciones de carga, limpieza y agregación para automatizar el pipeline fuera del notebook.

### Opción C: Frontend (WIP)

- La carpeta `frontend/` está reservada para un dashboard con filtros (autor, año, cuartil, fuente).
- Tecnologías sugeridas: **Streamlit** / **React** + API ligera del backend.

---

## 📊 Salidas esperadas

- **Resumen por investigador:** publicaciones totales, citas totales/promedio, distribución por cuartil.
- **Serie temporal:** producción por año y por cuartil.
- **Top fuentes (revistas/conferencias):** recuento por cuartil.
- **Tablas para informe:** listas para copiar/pegar a Word/Slides o exportar a Excel.

> La disponibilidad de cada indicador depende de los **campos presentes** en la exportación de Scopus.

---

## 📜 Licencia

Este proyecto se distribuye bajo la **licencia MIT**. Revisa el archivo [`LICENSE`](./LICENSE).
