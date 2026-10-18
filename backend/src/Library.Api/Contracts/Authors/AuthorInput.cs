namespace Library.Api.Contracts.Authors;

/// <summary>
/// Autor de una obra dentro de un request de creación o actualización.
/// Enviar <b>solo uno</b> de los dos campos:
/// <c>id</c> para usar un autor existente, o <c>name</c> para indicar el autor por nombre
/// (si ya existe un autor con el mismo nombre normalizado se reutiliza; si no, se crea).
/// </summary>
public record AuthorInput
{
    /// <summary>Identificador de un autor existente.</summary>
    /// <example>12</example>
    public int? Id { get; init; }

    /// <summary>Nombre completo del autor (2 a 200 caracteres). Para detectar duplicados se ignoran tildes, mayúsculas y espacios extra.</summary>
    /// <example>Julio Cortázar</example>
    public string? Name { get; init; }
}
