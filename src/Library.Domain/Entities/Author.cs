using Library.Domain.Exceptions;
using Library.Domain.Services;

namespace Library.Domain.Entities;

/// <summary>
/// Persona que escribe obras. Los autores nunca se eliminan.
/// </summary>
public class Author
{
    public const int FullNameMaxLength = 200;
    public const int FullNameMinLength = 2;

    private Author()
    {
    }

    public int Id { get; private set; }

    public string FullName { get; private set; } = string.Empty;

    /// <summary>
    /// Nombre sin tildes, espacios extra ni mayúsculas. Es único.
    /// </summary>
    public string NormalizedName { get; private set; } = string.Empty;

    public DateTime CreatedAtUtc { get; private set; }

    public byte[] RowVersion { get; private set; } = [];

    public static Author Create(string fullName, DateTime createdAtUtc)
    {
        var cleanName = TextNormalizer.CleanSpaces(fullName);

        if (cleanName.Length < FullNameMinLength || cleanName.Length > FullNameMaxLength)
        {
            throw new DomainRuleException(
                $"The author name must have between {FullNameMinLength} and {FullNameMaxLength} characters.");
        }

        return new Author
        {
            FullName = cleanName,
            NormalizedName = TextNormalizer.Normalize(cleanName),
            CreatedAtUtc = createdAtUtc,
        };
    }
}
