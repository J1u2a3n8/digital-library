using Library.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Library.Api.Controllers;

/// <summary>
/// Estado del servicio y de la conexión a la base de datos.
/// </summary>
[ApiController]
[Route("health")]
[Produces("application/json")]
[SwaggerTag("Estado del servicio. Lo usa el healthcheck de Docker.")]
public class HealthController : ControllerBase
{
    public const string Healthy = "Healthy";
    public const string Unhealthy = "Unhealthy";

    private readonly LibraryDbContext dbContext;

    public HealthController(LibraryDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    /// <summary>
    /// Verifica que la API pueda conectarse a SQL Server.
    /// </summary>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="200">La API y la base responden.</response>
    /// <response code="503">La base de datos no responde.</response>
    [HttpGet]
    [SwaggerOperation(Summary = "Health check", Description = "Devuelve `Healthy` si la API puede conectarse a la base de datos.")]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<HealthResponse>> GetHealth(CancellationToken cancellationToken)
    {
        bool canConnect;

        try
        {
            canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
        }
        catch (Exception)
        {
            canConnect = false;
        }

        if (!canConnect)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new HealthResponse { Status = Unhealthy });
        }

        return Ok(new HealthResponse { Status = Healthy });
    }
}

/// <summary>
/// Estado del servicio.
/// </summary>
public record HealthResponse
{
    /// <summary>Healthy o Unhealthy.</summary>
    /// <example>Healthy</example>
    public required string Status { get; init; }
}
