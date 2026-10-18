# Arquitectura

## Componentes

```mermaid
flowchart TB
    subgraph Browser["Navegador"]
        Pages["pages/<br/>WorksListPage · WorkCreatePage · WorkEditPage"]
        Features["features/works · features/authors<br/>filtros, tabla, cards, formulario, AuthorPicker, historial"]
        Query["TanStack Query<br/>caché y estados de carga"]
        Client["api/apiClient.ts<br/>fetch + ProblemDetails → ApiError"]
        Pages --> Features --> Query --> Client
    end

    subgraph Nginx["web: Nginx"]
        Static["SPA (dist/)"]
        Proxy["/api/ → api:8080"]
    end

    subgraph Api["api: ASP.NET Core"]
        Controllers["Controllers<br/>WorksController · AuthorsController · HealthController"]
        Validators["FluentValidation<br/>validación explícita en el controller"]
        Services["WorkService · AuthorService"]
        Errors["GlobalExceptionHandler<br/>excepción → ProblemDetails"]
        Controllers --> Validators
        Controllers --> Services
    end

    subgraph Domain["Library.Domain"]
        Entities["Work · WorkVersion · WorkVersionAuthor · Author"]
        Normalizer["TextNormalizer"]
    end

    subgraph Infra["Library.Infrastructure"]
        DbContext["LibraryDbContext + configuraciones"]
        Migrations["Migraciones EF Core"]
        Seed["DataSeeder"]
    end

    DB[("SQL Server 2022")]

    Client -->|JSON| Proxy --> Controllers
    Services --> Entities
    Services --> DbContext --> DB
    Migrations --> DB
```

### Reglas de dependencia

- `Library.Domain` no conoce EF Core ni ASP.NET. Las entidades protegen sus invariantes (al menos un autor, máximo 20, sin autores repetidos, título 1..300, solo `IsCurrent` puede cambiar en una versión).
- `Library.Infrastructure` traduce el dominio a tablas (Fluent API) y tiene migraciones y seed.
- `Library.Api` contiene el adaptador HTTP (controllers), los contratos (DTOs) y los casos de uso (servicios).

### Decisiones de simplicidad

| Lo que no se hizo | Por qué |
|---|---|
| Capa `Application` separada | Tendría solo dos servicios; se mantienen en `Api/Services` y usan `LibraryDbContext` directo |
| Repositorio genérico / Unit of Work | `DbContext` ya es ambas cosas; envolverlo esconde `Include`, proyecciones y transacciones |
| MediatR / CQRS | Agrega indirección sin beneficio para 6 endpoints |
| AutoMapper | Pocos DTOs; mapeo manual y proyecciones LINQ ([ADR-008](decisions/ADR-008-mapeo-manual-sin-automapper.md)) |
| Minimal APIs | Controllers por legibilidad y Swagger descriptivo ([ADR-007](decisions/ADR-007-controllers-vs-minimal-apis.md)) |
| Interfaces para cada servicio | Una sola implementación; las pruebas de integración usan la API real |

`TimeProvider` se inyecta para no usar `DateTime.Now` y poder controlar el tiempo.

---

## Flujo de creación

```mermaid
sequenceDiagram
    actor M as María
    participant UI as React (WorkForm)
    participant C as WorksController
    participant V as CreateWorkRequestValidator
    participant WS as WorkService
    participant AS as AuthorService
    participant DB as SQL Server

    M->>UI: Título, fecha, autores (existente + nuevo)
    UI->>UI: Zod valida (título, fecha, ≥1 autor)
    UI->>C: POST /api/works  {authors:[{id:2},{name:"Autora"}]}  X-Actor
    C->>V: ValidateAsync
    alt inválido
        C-->>UI: 400 ProblemDetails (errores por campo)
    end
    C->>WS: CreateWorkAsync(request, changedByUserName)
    WS->>DB: BEGIN TRANSACTION
    WS->>AS: GetOrCreateAuthorsAsync
    AS->>AS: deduplicar en memoria (id / nombre normalizado)
    AS->>DB: SELECT autores por ids + SELECT por nombres normalizados (2 consultas)
    opt autor nuevo
        AS->>DB: INSERT Author
        alt otro request lo creó antes (2601/2627)
            AS->>DB: SELECT el existente
        end
    end
    WS->>WS: Work.Create → versión 1 + snapshots
    WS->>DB: INSERT Works, WorkVersions, WorkVersionAuthors
    WS->>DB: COMMIT
    C-->>UI: 201 Created + Location
    UI-->>M: Toast "Obra creada" y vuelve al listado
```

Si cualquier paso falla (por ejemplo, un `id` de autor que no existe), la transacción se revierte: no queda ni la obra ni los autores nuevos.

---

## Flujo de actualización

```mermaid
sequenceDiagram
    participant UI as React (WorkEditPage)
    participant C as WorksController
    participant WS as WorkService
    participant DB as SQL Server

    UI->>C: PUT /api/works/5 {title, date, authors, rowVersion}
    C->>C: validar (incluye rowVersion Base64 de 8 bytes)
    C->>WS: UpdateWorkAsync
    WS->>DB: SELECT Work + versión vigente con autores
    WS->>DB: BEGIN TRANSACTION
    WS->>WS: resolver autores (reutilizar / crear)
    alt sin cambios (título normalizado, fecha y autores iguales)
        WS-->>C: versión actual (no se crea otra)
    else hay cambios
        WS->>DB: UPDATE WorkVersions SET IsCurrent=0 (versión N)
        WS->>DB: UPDATE Works SET UpdatedAtUtc WHERE Id AND RowVersion = @clienteRowVersion
        alt 0 filas (otro usuario guardó antes)
            DB-->>WS: DbUpdateConcurrencyException
            WS-->>C: 409 Conflict (rollback)
        end
        Note over WS,DB: Primer SaveChanges: libera el índice único filtrado de versión vigente
        WS->>DB: INSERT WorkVersions (N+1, IsCurrent=1) + WorkVersionAuthors con snapshot
        WS->>DB: COMMIT
        WS-->>C: 200 con versión N+1 y rowVersion nuevo
    end
```

Por qué dos `SaveChanges`: el índice `UX_WorkVersions_Current` admite una sola fila `IsCurrent = 1` por obra. Si se inserta la versión nueva en el mismo comando que apaga la anterior, SQL Server puede evaluar el índice con dos vigentes. Guardar primero el apagado y después el alta, dentro de la misma transacción, mantiene la regla sin estados intermedios visibles.

---

## Flujo de consulta

```mermaid
sequenceDiagram
    participant UI as WorksListPage
    participant URL as URL (?title=&minimumAuthorCount=...)
    participant C as WorksController
    participant WS as WorkService
    participant DB as SQL Server

    UI->>URL: filtro / orden / página (debounce 300 ms en textos)
    URL->>UI: parseWorkQuery
    UI->>C: GET /api/works?title=libro&minimumAuthorCount=2&sortBy=authorCount&pageNumber=1
    C->>C: WorkFilterValidator (pageSize 1..100, etc.)
    C->>WS: GetWorksAsync(filter)
    WS->>WS: IQueryable sobre versiones vigentes + Where por cada filtro presente (AND)
    WS->>DB: SELECT COUNT(*) ...
    WS->>DB: SELECT ... ORDER BY criterio, WorkId OFFSET/FETCH
    C-->>UI: 200 PagedResponse
```

- Solo se leen versiones vigentes (`IsCurrent = 1`), con `AsNoTracking` y proyección directa al DTO.
- La cantidad de autores es una subconsulta `COUNT` en el mismo `SELECT`: no hay N+1.
- El frontend mantiene la página anterior visible mientras llega la nueva (`keepPreviousData`).
