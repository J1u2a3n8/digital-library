namespace Library.Api.Contracts.Works;

/// <summary>
/// Fila del listado de obras (solo la versión vigente).
/// </summary>
public record WorkListItemResponse
{
    /// <summary>Identificador de la obra.</summary>
    /// <example>1</example>
    public required int Id { get; init; }

    /// <summary>Título vigente.</summary>
    /// <example>Cien años de soledad</example>
    public required string Title { get; init; }

    /// <summary>Fecha de publicación vigente (YYYY-MM-DD).</summary>
    /// <example>1967-05-30</example>
    public required DateOnly PublicationDate { get; init; }

    /// <summary>Cantidad de autores de la versión vigente.</summary>
    /// <example>1</example>
    public required int AuthorCount { get; init; }
}
