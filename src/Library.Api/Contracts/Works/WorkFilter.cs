namespace Library.Api.Contracts.Works;

/// <summary>
/// Campo para ordenar el listado de obras.
/// </summary>
public enum WorkSortBy
{
    Title,
    PublicationDate,
    AuthorCount,
}

/// <summary>
/// Dirección del orden.
/// </summary>
public enum SortDirection
{
    Asc,
    Desc,
}

/// <summary>
/// Filtros, orden y página del listado. Todos los filtros son opcionales y se combinan con AND.
/// </summary>
public record WorkFilter
{
    public const int DefaultPageSize = 10;
    public const int MaxPageSize = 100;

    /// <summary>Texto contenido en el título. Ignora tildes y mayúsculas.</summary>
    /// <example>soledad</example>
    public string? Title { get; init; }

    /// <summary>Texto contenido en el nombre de al menos un autor. Ignora tildes y mayúsculas.</summary>
    /// <example>garcia</example>
    public string? AuthorName { get; init; }

    /// <summary>Fecha de publicación exacta (YYYY-MM-DD).</summary>
    /// <example>1967-05-30</example>
    public DateOnly? PublicationDate { get; init; }

    /// <summary>Cantidad mínima de autores (1 o más).</summary>
    /// <example>2</example>
    public int? MinimumAuthorCount { get; init; }

    /// <summary>Campo de orden: title, publicationDate o authorCount. Por defecto: title.</summary>
    /// <example>title</example>
    public WorkSortBy SortBy { get; init; } = WorkSortBy.Title;

    /// <summary>Dirección: asc o desc. Por defecto: asc.</summary>
    /// <example>asc</example>
    public SortDirection SortDirection { get; init; } = SortDirection.Asc;

    /// <summary>Número de página, empieza en 1. Por defecto: 1.</summary>
    /// <example>1</example>
    public int PageNumber { get; init; } = 1;

    /// <summary>Tamaño de página (1 a 100). Por defecto: 10.</summary>
    /// <example>10</example>
    public int PageSize { get; init; } = DefaultPageSize;
}
