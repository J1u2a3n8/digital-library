using Library.Domain.Enums;

namespace Library.Domain.Entities;

/// <summary>
/// Identidad de una obra literaria. Su contenido (título, fecha, autores) vive en <see cref="WorkVersion"/>.
/// </summary>
public class Work
{
    private readonly List<WorkVersion> versions = [];

    private Work()
    {
    }

    public int Id { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime UpdatedAtUtc { get; private set; }

    public byte[] RowVersion { get; private set; } = [];

    public IReadOnlyCollection<WorkVersion> Versions => versions;

    /// <summary>
    /// Crea una obra nueva con su primera versión.
    /// </summary>
    public static Work Create(
        string title,
        DateOnly publicationDate,
        IReadOnlyCollection<Author> authors,
        string changedBy,
        DateTime nowUtc)
    {
        var work = new Work
        {
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc,
        };

        var firstVersion = WorkVersion.Create(
            work,
            versionNumber: 1,
            title,
            publicationDate,
            authors,
            changedBy,
            WorkChangeKind.Created,
            nowUtc);

        work.versions.Add(firstVersion);
        return work;
    }

    /// <summary>
    /// Crea la versión N+1 a partir de la vigente.
    /// Quien llama debe guardar la versión anterior como histórica antes de guardar esta.
    /// </summary>
    public WorkVersion CreateNextVersion(
        WorkVersion currentVersion,
        string title,
        DateOnly publicationDate,
        IReadOnlyCollection<Author> authors,
        string changedBy,
        DateTime nowUtc)
    {
        var nextVersion = WorkVersion.Create(
            this,
            currentVersion.VersionNumber + 1,
            title,
            publicationDate,
            authors,
            changedBy,
            WorkChangeKind.Updated,
            nowUtc);

        versions.Add(nextVersion);
        return nextVersion;
    }

    /// <summary>
    /// Cambia la fecha de actualización. Cualquier cambio en la fila también cambia su RowVersion.
    /// </summary>
    public void MarkAsUpdated(DateTime nowUtc)
    {
        UpdatedAtUtc = nowUtc;
    }
}
