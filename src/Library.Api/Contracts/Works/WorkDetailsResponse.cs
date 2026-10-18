using Library.Api.Contracts.Authors;

namespace Library.Api.Contracts.Works;

/// <summary>
/// Versión vigente de una obra, con sus autores y el token de concurrencia.
/// </summary>
public record WorkDetailsResponse
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

    /// <summary>Autores de la versión vigente, en orden alfabético.</summary>
    public required IReadOnlyList<AuthorResponse> Authors { get; init; }

    /// <summary>Cantidad de autores de la versión vigente.</summary>
    /// <example>1</example>
    public required int AuthorCount { get; init; }

    /// <summary>Número de la versión vigente (1 para una obra nueva).</summary>
    /// <example>1</example>
    public required int VersionNumber { get; init; }

    /// <summary>Token de concurrencia en Base64. Se debe reenviar en la actualización.</summary>
    /// <example>AAAAAAAAB9E=</example>
    public required string RowVersion { get; init; }
}
