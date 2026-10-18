using Library.Api.Contracts.Authors;
using Library.Api.Services;

namespace Library.UnitTests.Api;

public class AuthorInputDeduplicatorTests
{
    [Fact]
    public void Deduplicate_RemovesRepeatedIds()
    {
        var result = AuthorInputDeduplicator.Deduplicate(
        [
            new AuthorInput { Id = 1 },
            new AuthorInput { Id = 2 },
            new AuthorInput { Id = 1 },
        ]);

        Assert.Equal([1, 2], result.Select(input => input.Id!.Value));
    }

    [Fact]
    public void Deduplicate_RemovesNamesThatNormalizeTheSame()
    {
        var result = AuthorInputDeduplicator.Deduplicate(
        [
            new AuthorInput { Name = "Julio Cortázar" },
            new AuthorInput { Name = "  JULIO   cortazar " },
        ]);

        var input = Assert.Single(result);
        Assert.Equal("Julio Cortázar", input.Name);
    }

    [Fact]
    public void Deduplicate_CleansSpacesInNames()
    {
        var result = AuthorInputDeduplicator.Deduplicate([new AuthorInput { Name = "  Isabel   Allende " }]);

        Assert.Equal("Isabel Allende", Assert.Single(result).Name);
    }

    [Fact]
    public void Deduplicate_KeepsOrderOfFirstAppearance()
    {
        var result = AuthorInputDeduplicator.Deduplicate(
        [
            new AuthorInput { Name = "Borges" },
            new AuthorInput { Id = 5 },
            new AuthorInput { Name = "borges" },
            new AuthorInput { Name = "Ocampo" },
        ]);

        Assert.Equal(3, result.Count);
        Assert.Equal("Borges", result[0].Name);
        Assert.Equal(5, result[1].Id);
        Assert.Equal("Ocampo", result[2].Name);
    }

    [Fact]
    public void Deduplicate_SkipsEmptyNames()
    {
        var result = AuthorInputDeduplicator.Deduplicate([new AuthorInput { Name = "   " }]);

        Assert.Empty(result);
    }
}
