namespace Library.Api.Contracts;

/// <summary>
/// Una página de resultados.
/// </summary>
/// <typeparam name="T">Tipo de cada elemento.</typeparam>
public record PagedResponse<T>
{
    /// <summary>Elementos de la página pedida.</summary>
    public required IReadOnlyList<T> Items { get; init; }

    /// <summary>Número de página pedida (empieza en 1).</summary>
    /// <example>1</example>
    public required int PageNumber { get; init; }

    /// <summary>Tamaño de página usado.</summary>
    /// <example>10</example>
    public required int PageSize { get; init; }

    /// <summary>Total de elementos que cumplen los filtros.</summary>
    /// <example>12</example>
    public required int TotalItems { get; init; }

    /// <summary>Total de páginas.</summary>
    /// <example>2</example>
    public required int TotalPages { get; init; }
}
