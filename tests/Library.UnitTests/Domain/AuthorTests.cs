using Library.Domain.Entities;
using Library.Domain.Exceptions;

namespace Library.UnitTests.Domain;

public class AuthorTests
{
    [Fact]
    public void Create_KeepsOriginalNameAndStoresNormalizedName()
    {
        var author = Author.Create("  Julio   Cortázar ", TestData.NowUtc);

        Assert.Equal("Julio Cortázar", author.FullName);
        Assert.Equal("julio cortazar", author.NormalizedName);
        Assert.Equal(TestData.NowUtc, author.CreatedAtUtc);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("A")]
    public void Create_Throws_WhenNameIsTooShort(string name)
    {
        Assert.Throws<DomainRuleException>(() => Author.Create(name, TestData.NowUtc));
    }

    [Fact]
    public void Create_Throws_WhenNameIsTooLong()
    {
        var longName = new string('a', Author.FullNameMaxLength + 1);

        Assert.Throws<DomainRuleException>(() => Author.Create(longName, TestData.NowUtc));
    }
}
