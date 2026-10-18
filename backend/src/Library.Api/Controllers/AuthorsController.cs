using FluentValidation;
using Library.Api.Contracts.Authors;
using Library.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Library.Api.Controllers;

/// <summary>
/// Búsqueda de autores. Los autores se crean al guardar una obra, no desde aquí.
/// </summary>
[ApiController]
[Route("api/authors")]
[Produces("application/json")]
[SwaggerTag("Catálogo de autores (solo lectura). Los autores nuevos se crean al guardar una obra.")]
public class AuthorsController : LibraryControllerBase
{
    private readonly AuthorService authorService;
    private readonly IValidator<AuthorSearchQuery> searchValidator;

    public AuthorsController(AuthorService authorService, IValidator<AuthorSearchQuery> searchValidator)
    {
        this.authorService = authorService;
        this.searchValidator = searchValidator;
    }

    /// <summary>
    /// Busca autores por nombre.
    /// </summary>
    /// <param name="query">Texto a buscar y cantidad máxima de resultados.</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="200">Autores encontrados, en orden alfabético (la coincidencia exacta primero).</response>
    /// <response code="400">pageSize fuera de 1..20.</response>
    [HttpGet]
    [SwaggerOperation(
        Summary = "Buscar autores",
        Description = "Busca por 'contiene' sobre el nombre normalizado (sin tildes ni mayúsculas). "
            + "Lo usa el selector de autores del formulario. No crea autores.")]
    [ProducesResponseType(typeof(IReadOnlyList<AuthorResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<AuthorResponse>>> SearchAuthors(
        [FromQuery] AuthorSearchQuery query,
        CancellationToken cancellationToken)
    {
        var validationResult = await searchValidator.ValidateAsync(query, cancellationToken);
        if (!validationResult.IsValid)
        {
            return ValidationFailed(validationResult);
        }

        return Ok(await authorService.SearchAuthorsAsync(query.Search, query.PageSize, cancellationToken));
    }
}
