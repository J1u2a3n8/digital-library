using Library.Api.Contracts.Authors;

namespace Library.Api.Contracts.Works;

/// <summary>
/// Campos comunes a los requests de creación y actualización.
/// </summary>
public interface IWorkContentRequest
{
    string? Title { get; }

    DateOnly? PublicationDate { get; }

    IReadOnlyList<AuthorInput>? Authors { get; }
}

/// <summary>
/// Datos para crear una obra. Los autores pueden ser existentes (<c>id</c>) o nuevos (<c>name</c>).
/// </summary>
public record CreateWorkRequest : IWorkContentRequest
{
    /// <summary>Título de la obra (1 a 300 caracteres).</summary>
    /// <example>Rayuela</example>
    public string? Title { get; init; }

    /// <summary>Fecha de publicación en formato YYYY-MM-DD.</summary>
    /// <example>1963-06-28</example>
    public DateOnly? PublicationDate { get; init; }

    /// <summary>Autores de la obra (1 a 20). Los autores repetidos se unifican.</summary>
    public IReadOnlyList<AuthorInput>? Authors { get; init; }
}

/// <summary>
/// Datos nuevos de una obra. Solo se crea una versión nueva si algo cambia.
/// </summary>
public record UpdateWorkRequest : IWorkContentRequest
{
    /// <summary>Título de la obra (1 a 300 caracteres).</summary>
    /// <example>Rayuela (edición revisada)</example>
    public string? Title { get; init; }

    /// <summary>Fecha de publicación en formato YYYY-MM-DD.</summary>
    /// <example>1963-06-28</example>
    public DateOnly? PublicationDate { get; init; }

    /// <summary>Lista completa de autores después del cambio (1 a 20).</summary>
    public IReadOnlyList<AuthorInput>? Authors { get; init; }

    /// <summary>Token de concurrencia (Base64) recibido en el último GET de la obra.</summary>
    /// <example>AAAAAAAAB9E=</example>
    public string? RowVersion { get; init; }
}
