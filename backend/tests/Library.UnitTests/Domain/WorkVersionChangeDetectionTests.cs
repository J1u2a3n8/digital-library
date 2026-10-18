using Library.Domain.Entities;

namespace Library.UnitTests.Domain;

/// <summary>
/// Una actualización sin cambios no debe crear versión: estas pruebas cubren esa comparación.
/// </summary>
public class WorkVersionChangeDetectionTests
{
    private static readonly DateOnly PublicationDate = new(1963, 6, 28);

    private readonly WorkVersion version = Work.Create(
            "Rayuela",
            PublicationDate,
            [TestData.AuthorWithId(1, "Julio Cortázar"), TestData.AuthorWithId(2, "Jorge Luis Borges")],
            "seed",
            TestData.NowUtc)
        .Versions.Single();

    [Fact]
    public void HasSameContent_IsTrue_WhenNothingChanges()
    {
        Assert.True(version.HasSameContent("Rayuela", PublicationDate, [1, 2]));
    }

    [Fact]
    public void HasSameContent_IgnoresAuthorOrder()
    {
        Assert.True(version.HasSameContent("Rayuela", PublicationDate, [2, 1]));
    }

    [Fact]
    public void HasSameContent_ComparesNormalizedTitle()
    {
        Assert.True(version.HasSameContent("  RAYUELA ", PublicationDate, [1, 2]));
    }

    [Fact]
    public void HasSameContent_IsFalse_WhenTitleChanges()
    {
        Assert.False(version.HasSameContent("Rayuela 2", PublicationDate, [1, 2]));
    }

    [Fact]
    public void HasSameContent_IsFalse_WhenDateChanges()
    {
        Assert.False(version.HasSameContent("Rayuela", PublicationDate.AddDays(1), [1, 2]));
    }

    [Fact]
    public void HasSameContent_IsFalse_WhenAuthorIsRemoved()
    {
        Assert.False(version.HasSameContent("Rayuela", PublicationDate, [1]));
    }

    [Fact]
    public void HasSameContent_IsFalse_WhenAuthorIsAdded()
    {
        Assert.False(version.HasSameContent("Rayuela", PublicationDate, [1, 2, 3]));
    }
}
