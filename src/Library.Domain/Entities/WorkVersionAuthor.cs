namespace Library.Domain.Entities;

/// <summary>
/// Relación entre una versión de obra y un autor. Guarda el nombre del autor tal como era en ese momento.
/// </summary>
public class WorkVersionAuthor
{
    private WorkVersionAuthor()
    {
    }

    public long WorkVersionId { get; private set; }

    public WorkVersion WorkVersion { get; private set; } = null!;

    public int AuthorId { get; private set; }

    public Author Author { get; private set; } = null!;

    /// <summary>
    /// Nombre del autor al momento de crear la versión.
    /// </summary>
    public string AuthorNameSnapshot { get; private set; } = string.Empty;

    internal static WorkVersionAuthor Create(WorkVersion workVersion, Author author)
    {
        return new WorkVersionAuthor
        {
            WorkVersion = workVersion,
            Author = author,
            AuthorId = author.Id,
            AuthorNameSnapshot = author.FullName,
        };
    }
}
