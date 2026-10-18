namespace Library.Api.Contracts.Authors;

/// <summary>
/// Parámetros para buscar autores.
/// </summary>
public record AuthorSearchQuery
{
    public const int DefaultPageSize = 10;
    public const int MaxPageSize = 20;

    /// <summary>Texto contenido en el nombre del autor. Ignora tildes y mayúsculas. Vacío devuelve los primeros autores en orden alfabético.</summary>
    /// <example>cortazar</example>
    public string? Search { get; init; }

    /// <summary>Cantidad máxima de autores a devolver (1 a 20). Por defecto: 10.</summary>
    /// <example>10</example>
    public int PageSize { get; init; } = DefaultPageSize;
}
