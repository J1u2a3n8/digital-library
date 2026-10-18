# Ejemplos de la API

Base: `http://localhost:8080`. Swagger interactivo en `http://localhost:8080/swagger`.

Los ids corresponden a los datos de ejemplo del seed (por ejemplo `2 = Julio Cortázar`). En PowerShell usar `curl.exe` y comillas dobles escapadas, o probar desde Swagger.

## Health

```bash
curl http://localhost:8080/health
```

```json
{ "status": "Healthy" }
```

Si la base no responde: `503 { "status": "Unhealthy" }`.

## Buscar autores

```bash
curl "http://localhost:8080/api/authors?search=cortazar&pageSize=10"
```

```json
[ { "id": 2, "fullName": "Julio Cortázar" } ]
```

`search` ignora tildes y mayúsculas. La coincidencia exacta aparece primero. `pageSize` va de 1 a 20. Este endpoint **no crea** autores.

## Crear una obra con autor existente y nuevo

```bash
curl -i -X POST http://localhost:8080/api/works \
  -H "Content-Type: application/json" \
  -H "X-Actor: Maria" \
  -d '{
        "title": "Historias de cronopios y de famas",
        "publicationDate": "1962-01-01",
        "authors": [ { "id": 2 }, { "name": "Autora Invitada" } ]
      }'
```

```http
HTTP/1.1 201 Created
Location: http://localhost:8080/api/works/11
```

```json
{
  "id": 11,
  "title": "Historias de cronopios y de famas",
  "publicationDate": "1962-01-01",
  "authors": [
    { "id": 13, "fullName": "Autora Invitada" },
    { "id": 2, "fullName": "Julio Cortázar" }
  ],
  "authorCount": 2,
  "versionNumber": 1,
  "rowVersion": "AAAAAAAAB+g="
}
```

- `{ "name": "julio  CORTAZAR" }` reutiliza al autor 2 (nombre normalizado igual).
- Autores repetidos en el request se unifican.
- `X-Actor` es opcional (sin él se guarda `anonymous`). Con tildes, enviarlo URL-encoded: `X-Actor: Mar%C3%ADa`.

Errores:

```bash
# Sin autores → 400
curl -X POST http://localhost:8080/api/works -H "Content-Type: application/json" \
  -d '{"title":"Sin autores","publicationDate":"2000-01-01","authors":[]}'
```

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more validation errors occurred.",
  "errors": { "authors": [ "Debe indicar al menos un autor." ] }
}
```

```bash
# id y name a la vez → 400 en "authors[0].author"
curl -X POST http://localhost:8080/api/works -H "Content-Type: application/json" \
  -d '{"title":"X","publicationDate":"2000-01-01","authors":[{"id":2,"name":"Julio"}]}'
```

## Listar

```bash
curl "http://localhost:8080/api/works?pageNumber=1&pageSize=10"
```

```json
{
  "items": [
    { "id": 6, "title": "Antología de la literatura fantástica", "publicationDate": "1940-01-01", "authorCount": 3 },
    { "id": 1, "title": "Cien años de soledad", "publicationDate": "1967-05-30", "authorCount": 1 }
  ],
  "pageNumber": 1,
  "pageSize": 10,
  "totalItems": 10,
  "totalPages": 1
}
```

## Filtrar y ordenar

```bash
# Título contiene "libro", algún autor contiene "borges", publicada el 1967-01-01 y con al menos 2 autores
curl "http://localhost:8080/api/works?title=libro&authorName=borges&publicationDate=1967-01-01&minimumAuthorCount=2"

# Más autores primero (auditoría), desempate por id
curl "http://localhost:8080/api/works?sortBy=authorCount&sortDirection=desc"

# Por fecha, la más reciente primero, página 2 de a 5
curl "http://localhost:8080/api/works?sortBy=publicationDate&sortDirection=desc&pageNumber=2&pageSize=5"
```

| Parámetro | Valores |
|---|---|
| `title`, `authorName` | texto, "contiene", sin tildes ni mayúsculas |
| `publicationDate` | `YYYY-MM-DD`, fecha exacta |
| `minimumAuthorCount` | entero ≥ 1 |
| `sortBy` | `title` (defecto), `publicationDate`, `authorCount` |
| `sortDirection` | `asc` (defecto), `desc` |
| `pageNumber` | ≥ 1 (defecto 1) |
| `pageSize` | 1..100 (defecto 10) |

`pageSize=500` → 400 con `errors.pageSize`.

## Obtener una obra

```bash
curl http://localhost:8080/api/works/11
```

Devuelve el mismo formato que el POST, con el `rowVersion` vigente. Si no existe: `404` ProblemDetails.

## Actualizar

```bash
curl -X PUT http://localhost:8080/api/works/11 \
  -H "Content-Type: application/json" \
  -H "X-Actor: Juan" \
  -d '{
        "title": "Historias de cronopios y de famas (edición revisada)",
        "publicationDate": "1962-01-01",
        "authors": [ { "id": 2 } ],
        "rowVersion": "AAAAAAAAB+g="
      }'
```

```json
{
  "id": 11,
  "title": "Historias de cronopios y de famas (edición revisada)",
  "publicationDate": "1962-01-01",
  "authors": [ { "id": 2, "fullName": "Julio Cortázar" } ],
  "authorCount": 1,
  "versionNumber": 2,
  "rowVersion": "AAAAAAAAB+k="
}
```

- Mismos datos (aunque cambien mayúsculas o el orden de autores) → 200 con la versión actual, sin crear otra.
- Repetir el PUT con el `rowVersion` viejo → `409`:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10",
  "title": "Conflict",
  "status": 409,
  "detail": "La obra fue modificada por otro usuario. Recargá los datos e intentá de nuevo."
}
```

- `rowVersion` que no es Base64 de 8 bytes → `400` en `errors.rowVersion`.

## Historial

```bash
curl http://localhost:8080/api/works/11/history
```

```json
[
  {
    "versionNumber": 2,
    "title": "Historias de cronopios y de famas (edición revisada)",
    "publicationDate": "1962-01-01",
    "authors": [ { "id": 2, "fullName": "Julio Cortázar" } ],
    "createdAtUtc": "2026-10-18T14:30:00Z",
    "changedBy": "Juan",
    "changeKind": "Updated",
    "isCurrent": true
  },
  {
    "versionNumber": 1,
    "title": "Historias de cronopios y de famas",
    "publicationDate": "1962-01-01",
    "authors": [
      { "id": 13, "fullName": "Autora Invitada" },
      { "id": 2, "fullName": "Julio Cortázar" }
    ],
    "createdAtUtc": "2026-10-18T14:00:00Z",
    "changedBy": "Maria",
    "changeKind": "Created",
    "isCurrent": false
  }
]
```

Orden: versión más nueva primero. Los nombres de autores son el snapshot de cada versión.
