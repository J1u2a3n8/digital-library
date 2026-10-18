using Library.Api.Contracts.Authors;

namespace Library.Api.Contracts.Works;

/// <summary>
/// Una versión inmutable de una obra.
/// </summary>
public record WorkHistoryItemResponse
{
    /// <summary>Número de versión (1, 2, 3...).</summary>
    /// <example>2</example>
    public required int VersionNumber { get; init; }

    /// <summary>Título en esta versión.</summary>
    /// <example>Rayuela (edición revisada)</example>
    public required string Title { get; init; }

    /// <summary>Fecha de publicación en esta versión (YYYY-MM-DD).</summary>
    /// <example>1963-06-28</example>
    public required DateOnly PublicationDate { get; init; }

    /// <summary>Autores de esta versión. El nombre es el snapshot guardado al crear la versión.</summary>
    public required IReadOnlyList<AuthorResponse> Authors { get; init; }

    /// <summary>Fecha y hora (UTC) en que se creó la versión.</summary>
    /// <example>2026-10-18T14:30:00Z</example>
    public required DateTime CreatedAtUtc { get; init; }

    /// <summary>Persona que generó esta versión (header X-Actor, o "anonymous").</summary>
    /// <example>María</example>
    public required string ChangedBy { get; init; }

    /// <summary>Tipo de cambio: Created o Updated.</summary>
    /// <example>Updated</example>
    public required string ChangeKind { get; init; }

    /// <summary>Verdadero solo para la versión vigente.</summary>
    /// <example>true</example>
    public required bool IsCurrent { get; init; }
}
