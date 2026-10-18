using Library.Domain.Entities;

namespace Library.UnitTests;

internal static class TestData
{
    public static readonly DateTime NowUtc = new(2026, 10, 18, 14, 0, 0, DateTimeKind.Utc);

    /// <summary>
    /// Crea un autor con un id fijo, como si ya estuviera guardado en la base.
    /// </summary>
    public static Author AuthorWithId(int id, string fullName)
    {
        var author = Author.Create(fullName, NowUtc);
        typeof(Author).GetProperty(nameof(Author.Id))!.SetValue(author, id);
        return author;
    }
}
