using Library.Domain.Entities;
using Library.Domain.Enums;
using Library.Domain.Exceptions;

namespace Library.UnitTests.Domain;

public class WorkTests
{
    private static readonly DateOnly PublicationDate = new(1963, 6, 28);

    [Fact]
    public void Create_AddsFirstVersionAsCurrent()
    {
        var author = TestData.AuthorWithId(1, "Julio Cortázar");

        var work = Work.Create("  Rayuela ", PublicationDate, [author], "María", TestData.NowUtc);

        var version = Assert.Single(work.Versions);
        Assert.Equal(1, version.VersionNumber);
        Assert.True(version.IsCurrent);
        Assert.Equal(WorkChangeKind.Created, version.ChangeKind);
        Assert.Equal("Rayuela", version.Title);
        Assert.Equal("rayuela", version.NormalizedTitle);
        Assert.Equal(PublicationDate, version.PublicationDate);
        Assert.Equal("María", version.ChangedBy);
        Assert.Equal(TestData.NowUtc, work.CreatedAtUtc);
        Assert.Equal(TestData.NowUtc, work.UpdatedAtUtc);
    }

    [Fact]
    public void Create_StoresAuthorNameSnapshot()
    {
        var author = TestData.AuthorWithId(7, "Jorge Luis Borges");

        var work = Work.Create("Ficciones", PublicationDate, [author], "seed", TestData.NowUtc);

        var versionAuthor = Assert.Single(work.Versions.Single().Authors);
        Assert.Equal(7, versionAuthor.AuthorId);
        Assert.Equal("Jorge Luis Borges", versionAuthor.AuthorNameSnapshot);
    }

    [Fact]
    public void Create_Throws_WhenThereAreNoAuthors()
    {
        Assert.Throws<DomainRuleException>(() =>
            Work.Create("Rayuela", PublicationDate, [], "seed", TestData.NowUtc));
    }

    [Fact]
    public void Create_Throws_WhenThereAreMoreThanTwentyAuthors()
    {
        var authors = Enumerable.Range(1, WorkVersion.MaxAuthors + 1)
            .Select(number => TestData.AuthorWithId(number, $"Autor {number}"))
            .ToList();

        Assert.Throws<DomainRuleException>(() =>
            Work.Create("Rayuela", PublicationDate, authors, "seed", TestData.NowUtc));
    }

    [Fact]
    public void Create_Throws_WhenTheSameAuthorIsRepeated()
    {
        var first = TestData.AuthorWithId(1, "Julio Cortázar");
        var second = TestData.AuthorWithId(2, "julio cortazar");

        Assert.Throws<DomainRuleException>(() =>
            Work.Create("Rayuela", PublicationDate, [first, second], "seed", TestData.NowUtc));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_Throws_WhenTitleIsEmpty(string title)
    {
        var author = TestData.AuthorWithId(1, "Julio Cortázar");

        Assert.Throws<DomainRuleException>(() =>
            Work.Create(title, PublicationDate, [author], "seed", TestData.NowUtc));
    }

    [Fact]
    public void Create_Throws_WhenTitleIsTooLong()
    {
        var author = TestData.AuthorWithId(1, "Julio Cortázar");
        var longTitle = new string('a', WorkVersion.TitleMaxLength + 1);

        Assert.Throws<DomainRuleException>(() =>
            Work.Create(longTitle, PublicationDate, [author], "seed", TestData.NowUtc));
    }

    [Fact]
    public void Create_Throws_WhenChangedByIsEmpty()
    {
        var author = TestData.AuthorWithId(1, "Julio Cortázar");

        Assert.Throws<DomainRuleException>(() =>
            Work.Create("Rayuela", PublicationDate, [author], " ", TestData.NowUtc));
    }

    [Fact]
    public void CreateNextVersion_AddsVersionNPlusOne_AndKeepsPreviousContent()
    {
        var cortazar = TestData.AuthorWithId(1, "Julio Cortázar");
        var borges = TestData.AuthorWithId(2, "Jorge Luis Borges");
        var work = Work.Create("Rayuela", PublicationDate, [cortazar], "Juan", TestData.NowUtc);
        var firstVersion = work.Versions.Single();
        var later = TestData.NowUtc.AddHours(1);

        firstVersion.MarkAsHistorical();
        work.MarkAsUpdated(later);
        var secondVersion = work.CreateNextVersion(
            firstVersion,
            "Rayuela (edición revisada)",
            new DateOnly(1964, 1, 1),
            [cortazar, borges],
            "María",
            later);

        Assert.Equal(2, work.Versions.Count);
        Assert.Equal(2, secondVersion.VersionNumber);
        Assert.Equal(WorkChangeKind.Updated, secondVersion.ChangeKind);
        Assert.True(secondVersion.IsCurrent);
        Assert.False(firstVersion.IsCurrent);
        Assert.Equal("Rayuela", firstVersion.Title);
        Assert.Single(firstVersion.Authors);
        Assert.Equal(2, secondVersion.Authors.Count);
        Assert.Equal(later, work.UpdatedAtUtc);
    }

    [Fact]
    public void MarkAsHistorical_Throws_WhenVersionIsAlreadyHistorical()
    {
        var author = TestData.AuthorWithId(1, "Julio Cortázar");
        var version = Work.Create("Rayuela", PublicationDate, [author], "seed", TestData.NowUtc).Versions.Single();

        version.MarkAsHistorical();

        Assert.Throws<DomainRuleException>(version.MarkAsHistorical);
    }
}
