namespace Library.Api.Contracts.Authors;

/// <summary>
/// Autor devuelto por la API.
/// </summary>
public record AuthorResponse
{
    /// <summary>Identificador del autor.</summary>
    /// <example>1</example>
    public required int Id { get; init; }

    /// <summary>Nombre completo, tal como se escribió al crear el autor.</summary>
    /// <example>Gabriel García Márquez</example>
    public required string FullName { get; init; }
}
