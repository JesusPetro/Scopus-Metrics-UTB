# scopus-metrics-worker

Backend en Hono + Cloudflare Workers + D1. Reemplaza al backend Python (`../backend/`) — ver
`C:\Users\Gsus\.claude\plans\elegant-honking-quill.md` para las decisiones de arquitectura.

## Setup inicial (correr en orden)

```
cd worker
bun install
```

Crear la base de datos D1 (solo la primera vez):
```
bunx wrangler d1 create scopus-metrics-db
```
Copiar el `database_id` que devuelve y pegarlo en `wrangler.toml` (reemplaza `REPLACE_ME_AFTER_RUNNING_wrangler_d1_create`).

Aplicar la migración inicial:
```
bun run db:migrate:local    # para desarrollo local (Miniflare)
bun run db:migrate:remote   # para la base D1 real en Cloudflare
```

Credenciales de Elsevier para desarrollo local — copiar `.dev.vars.example` a `.dev.vars` y completar `ELSEVIER_APIKEY` (mismo valor que ya usás en `backend/.env`). `.dev.vars` está en `.gitignore`, no se commitea.

Para producción, las credenciales se suben como secrets (no van en `wrangler.toml`):
```
bunx wrangler secret put ELSEVIER_APIKEY
bunx wrangler secret put ELSEVIER_INSTTOKEN   # opcional
```

## Desarrollo

```
bun run dev
```

Levanta el Worker en local con Miniflare (D1 local incluida).

## Endpoints

| Método | Ruta | Query params | Descripción |
|---|---|---|---|
| GET | `/health` | — | Chequeo de vida del worker. |
| GET | `/api/stats/growth` | — | Cantidad de publicaciones por año. |
| GET | `/api/stats/document-types` | — | Cantidad de publicaciones por tipo de documento. |
| GET | `/api/stats/top-authors` | `limit` (default `20`) | Ranking de autores internos por cantidad de publicaciones. |
| GET | `/api/stats/coauthorship` | — | Grafo de coautoría entre docentes: `nodes` (autor, nombre, cantidad de publicaciones) y `edges` (par de autores + cantidad de publicaciones conjuntas). Solo autores internos, calculado al vuelo (self-join), sin tabla de aristas precomputada. |
| GET | `/api/stats/top-journals` | `limit` (default `10`) | Ranking de revistas/actas (`source_title`) por cantidad de publicaciones. |
| GET | `/api/stats/subject-areas` | `limit` (default `12`) | Breakdown por área/disciplina (`publication_subject_areas`). Confirmado vacío en este plan de Scopus — ver nota abajo. |
| GET | `/api/authors` | `limit` (default `100`), `offset` (default `0`) | Lista paginada de autores. |
| GET | `/api/authors/:id` | — | Resumen de un autor: publicaciones, citas totales, h-index. 404 si no existe. |
| GET | `/api/authors/:id/publications` | `limit` (default `50`), `offset` (default `0`) | Publicaciones de un autor. |
| GET | `/api/publications` | `year`, `document_type`, `subject_area`, `sort` (`date`\|`citations`\|`year`\|`title`, default `date`), `sort_dir` (`asc`\|`desc`, default `desc`), `limit` (default `50`), `offset` (default `0`) | Lista/filtra/ordena publicaciones. |
| POST | `/api/admin/sync` | — | Dispara la ingesta manualmente (útil para probar sin esperar al Cron Trigger semanal). Sin autenticación — ver nota de seguridad más abajo. |
| POST | `/api/admin/verify-authors` | `limit` (default `40`) | Verifica contra el Author Retrieval API a los autores "candidatos a interno" (flag por `afid` de alguna publicación) que no están en la whitelist manual (`src/data/knownAuthorIds.ts`). Hay que llamarlo varias veces (tope de 50 subrequests por invocación) hasta que `remaining` en la respuesta sea `0`. |

### Área/disciplina de una publicación

Scopus expone clasificación por área (`subject-area`) en su Search API, pero **se confirmó por pruebas reales contra la cuenta actual que no viene en la respuesta**, ni con `view=STANDARD` ni con `view=COMPLETE` (este último además limita `count` a 25 resultados por página). El parsing y la tabla (`publication_subject_areas`, migración `0003_subject_areas.sql`) ya están listos por si el plan de Scopus cambia — basta con volver a correr `POST /api/admin/sync` para poblarla — pero hoy `/api/stats/subject-areas` devuelve `[]`. La revista (`source_title`) sí está disponible y es lo que alimenta `/api/stats/top-journals`.

## Deploy

```
bun run deploy
```
