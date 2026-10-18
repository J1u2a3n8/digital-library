using Library.Domain.Enums;
using Library.Domain.Exceptions;
using Library.Domain.Services;

namespace Library.Domain.Entities;

/// <summary>
/// Snapshot inmutable de una obra en un momento dado. Solo puede cambiar <see cref="IsCurrent"/>.
/// </summary>
public class WorkVersion
{
    public const int TitleMaxLength = 300;
    public const int ChangedByMaxLength = 100;
    public const int MaxAuthors = 20;

    private readonly List<WorkVersionAuthor> authors = [];

    private WorkVersion()
    {
    }

    public long Id { get; private set; }

    public int WorkId { get; private set; }

    public Work Work { get; private set; } = null!;

    public int VersionNumber { get; private set; }

    public string Title { get; private set; } = string.Empty;

    public string NormalizedTitle { get; private set; } = string.Empty;

    public DateOnly PublicationDate { get; private set; }

    public bool IsCurrent { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>
    /// Nombre de la persona que generó esta versión (auditoría de demo, no autenticación).
    /// </summary>
    public string ChangedBy { get; private set; } = string.Empty;

    public WorkChangeKind ChangeKind { get; private set; }

    public IReadOnlyCollection<WorkVersionAuthor> Authors => authors;

    internal static WorkVersion Create(
        Work work,
        int versionNumber,
        string title,
        DateOnly publicationDate,
        IReadOnlyCollection<Author> versionAuthors,
        string changedBy,
        WorkChangeKind changeKind,
        DateTime nowUtc)
    {
        var cleanTitle = TextNormalizer.CleanSpaces(title);
        var cleanChangedBy = TextNormalizer.CleanSpaces(changedBy);

        if (cleanTitle.Length == 0 || cleanTitle.Length > TitleMaxLength)
        {
            throw new DomainRuleException($"The title must have between 1 and {TitleMaxLength} characters.");
        }

        if (cleanChangedBy.Length == 0 || cleanChangedBy.Length > ChangedByMaxLength)
        {
            throw new DomainRuleException($"ChangedBy must have between 1 and {ChangedByMaxLength} characters.");
        }

        if (versionAuthors.Count == 0)
        {
            throw new DomainRuleException("A work must have at least one author.");
        }

        if (versionAuthors.Count > MaxAuthors)
        {
            throw new DomainRuleException($"A work can have at most {MaxAuthors} authors.");
        }

        var differentAuthors = versionAuthors.Select(author => author.NormalizedName).Distinct().Count();
        if (differentAuthors != versionAuthors.Count)
        {
            throw new DomainRuleException("A work cannot have the same author twice.");
        }

        var version = new WorkVersion
        {
            Work = work,
            VersionNumber = versionNumber,
            Title = cleanTitle,
            NormalizedTitle = TextNormalizer.Normalize(cleanTitle),
            PublicationDate = publicationDate,
            IsCurrent = true,
            CreatedAtUtc = nowUtc,
            ChangedBy = cleanChangedBy,
            ChangeKind = changeKind,
        };

        foreach (var author in versionAuthors)
        {
            version.authors.Add(WorkVersionAuthor.Create(version, author));
        }

        return version;
    }

    /// <summary>
    /// Devuelve true si los datos recibidos son iguales a esta versión.
    /// El título se compara normalizado y los autores como conjunto (el orden no importa).
    /// </summary>
    public bool HasSameContent(string title, DateOnly publicationDate, IEnumerable<int> authorIds)
    {
        var currentAuthorIds = authors.Select(author => author.AuthorId).ToHashSet();

        return NormalizedTitle == TextNormalizer.Normalize(title)
            && PublicationDate == publicationDate
            && currentAuthorIds.SetEquals(authorIds);
    }

    /// <summary>
    /// Convierte esta versión en histórica. Es el único cambio permitido en una versión.
    /// </summary>
    public void MarkAsHistorical()
    {
        if (!IsCurrent)
        {
            throw new DomainRuleException("This version is already historical.");
        }

        IsCurrent = false;
    }
}
