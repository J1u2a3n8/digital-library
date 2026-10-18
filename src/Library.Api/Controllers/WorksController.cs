using FluentValidation;
using Library.Api.Contracts;
using Library.Api.Contracts.Works;
using Library.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Library.Api.Controllers;

/// <summary>
/// Obras literarias: listado, alta, edición con versionado e historial.
/// </summary>
[ApiController]
[Route("api/works")]
[Produces("application/json")]
[SwaggerTag("Obras literarias. Cada cambio crea una versión nueva; las versiones anteriores no se modifican.")]
public class WorksController : LibraryControllerBase
{
    private readonly WorkService workService;
    private readonly IValidator<WorkFilter> filterValidator;
    private readonly IValidator<CreateWorkRequest> createValidator;
    private readonly IValidator<UpdateWorkRequest> updateValidator;

    public WorksController(
        WorkService workService,
        IValidator<WorkFilter> filterValidator,
        IValidator<CreateWorkRequest> createValidator,
        IValidator<UpdateWorkRequest> updateValidator)
    {
        this.workService = workService;
        this.filterValidator = filterValidator;
        this.createValidator = createValidator;
        this.updateValidator = updateValidator;
    }

    /// <summary>
    /// Lista obras con filtros acumulativos, orden y paginación.
    /// </summary>
    /// <param name="filter">Filtros (se combinan con AND), orden y página. Todos son opcionales.</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="200">Página de obras (solo la versión vigente de cada una).</response>
    /// <response code="400">Algún parámetro es inválido (por ejemplo, pageSize fuera de 1..100).</response>
    [HttpGet]
    [SwaggerOperation(
        Summary = "Listar obras",
        Description = "Devuelve las obras vigentes paginadas. Los filtros `title`, `authorName`, `publicationDate` y "
            + "`minimumAuthorCount` son opcionales y se combinan con AND; los vacíos se ignoran. "
            + "Búsqueda de texto por 'contiene', sin distinguir tildes ni mayúsculas. "
            + "Orden por `title` (defecto), `publicationDate` o `authorCount`, con desempate por id para que la paginación sea estable.")]
    [ProducesResponseType(typeof(PagedResponse<WorkListItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<PagedResponse<WorkListItemResponse>>> GetWorks(
        [FromQuery] WorkFilter filter,
        CancellationToken cancellationToken)
    {
        var validationResult = await filterValidator.ValidateAsync(filter, cancellationToken);
        if (!validationResult.IsValid)
        {
            return ValidationFailed(validationResult);
        }

        return Ok(await workService.GetWorksAsync(filter, cancellationToken));
    }

    /// <summary>
    /// Obtiene la versión vigente de una obra.
    /// </summary>
    /// <param name="id">Identificador de la obra.</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="200">La obra con sus autores y el rowVersion para editarla.</response>
    /// <response code="404">La obra no existe.</response>
    [HttpGet("{id:int}")]
    [SwaggerOperation(
        Summary = "Obtener una obra",
        Description = "Devuelve título, fecha, autores, número de versión y `rowVersion` (Base64). "
            + "El `rowVersion` se debe reenviar en el PUT para detectar ediciones simultáneas.")]
    [ProducesResponseType(typeof(WorkDetailsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<WorkDetailsResponse>> GetWorkById(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        return Ok(await workService.GetWorkByIdAsync(id, cancellationToken));
    }

    /// <summary>
    /// Crea una obra con autores existentes y/o nuevos.
    /// </summary>
    /// <param name="request">Título, fecha y autores. Cada autor lleva `id` (existente) o `name` (se reutiliza o se crea).</param>
    /// <param name="actor">Header de demo con el nombre de quien hace el cambio (URL-encoded si tiene tildes, ej. Mar%C3%ADa). No es autenticación. Si falta, se guarda "anonymous".</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="201">Obra creada (versión 1).</response>
    /// <response code="400">Datos inválidos.</response>
    [HttpPost]
    [Consumes("application/json")]
    [SwaggerOperation(
        Summary = "Crear una obra",
        Description = "Crea la obra y su versión 1 en una sola transacción. Los autores con `name` se buscan por nombre "
            + "normalizado (sin tildes, mayúsculas ni espacios extra): si existen se reutilizan y si no se crean. "
            + "Los autores repetidos en el request se unifican. Si algo falla, no queda nada guardado.")]
    [ProducesResponseType(typeof(WorkDetailsResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<WorkDetailsResponse>> CreateWork(
        [FromBody] CreateWorkRequest request,
        [FromHeader(Name = ActorHeader.HeaderName)] string? actor,
        CancellationToken cancellationToken)
    {
        var validationResult = await createValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return ValidationFailed(validationResult);
        }

        var changedByUserName = ActorHeader.GetChangedByUserName(actor);
        var work = await workService.CreateWorkAsync(request, changedByUserName, cancellationToken);

        return CreatedAtAction(nameof(GetWorkById), new { id = work.Id }, work);
    }

    /// <summary>
    /// Actualiza una obra creando una versión nueva.
    /// </summary>
    /// <param name="id">Identificador de la obra.</param>
    /// <param name="request">Datos nuevos completos y el `rowVersion` recibido en el GET.</param>
    /// <param name="actor">Header de demo con el nombre de quien hace el cambio (URL-encoded si tiene tildes, ej. Mar%C3%ADa). No es autenticación. Si falta, se guarda "anonymous".</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="200">Obra actualizada (o sin cambios si los datos eran iguales).</response>
    /// <response code="400">Datos inválidos o rowVersion mal formado.</response>
    /// <response code="404">La obra no existe.</response>
    /// <response code="409">Otra persona modificó la obra después de que la leíste.</response>
    [HttpPut("{id:int}")]
    [Consumes("application/json")]
    [SwaggerOperation(
        Summary = "Actualizar una obra",
        Description = "Si título (normalizado), fecha o autores cambian, la versión vigente pasa a histórica y se crea la "
            + "versión N+1. Si no hay cambios, devuelve la versión actual sin crear otra. "
            + "Si el `rowVersion` no coincide con el actual, responde 409 y no guarda nada.")]
    [ProducesResponseType(typeof(WorkDetailsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<WorkDetailsResponse>> UpdateWork(
        [FromRoute] int id,
        [FromBody] UpdateWorkRequest request,
        [FromHeader(Name = ActorHeader.HeaderName)] string? actor,
        CancellationToken cancellationToken)
    {
        var validationResult = await updateValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return ValidationFailed(validationResult);
        }

        var changedByUserName = ActorHeader.GetChangedByUserName(actor);

        return Ok(await workService.UpdateWorkAsync(id, request, changedByUserName, cancellationToken));
    }

    /// <summary>
    /// Historial de versiones de una obra.
    /// </summary>
    /// <param name="id">Identificador de la obra.</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="200">Versiones de la más nueva a la más antigua.</response>
    /// <response code="404">La obra no existe.</response>
    [HttpGet("{id:int}/history")]
    [SwaggerOperation(
        Summary = "Historial de una obra",
        Description = "Devuelve todas las versiones, ordenadas por número de versión descendente. Cada versión muestra "
            + "los autores con el nombre que tenían en ese momento (snapshot), quién la generó y si es la vigente.")]
    [ProducesResponseType(typeof(IReadOnlyList<WorkHistoryItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<WorkHistoryItemResponse>>> GetHistory(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        return Ok(await workService.GetHistoryAsync(id, cancellationToken));
    }
}
