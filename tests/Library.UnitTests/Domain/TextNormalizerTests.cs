using Library.Domain.Services;

namespace Library.UnitTests.Domain;

public class TextNormalizerTests
{
    [Theory]
    [InlineData("Gabriel García Márquez", "gabriel garcia marquez")]
    [InlineData("JULIO CORTÁZAR", "julio cortazar")]
    [InlineData("  Isabel    Allende  ", "isabel allende")]
    [InlineData("Ñandú Pingüino", "nandu pinguino")]
    [InlineData("Crepúsculo", "crepusculo")]
    [InlineData("tab\tand\nnew line", "tab and new line")]
    public void Normalize_RemovesAccentsCasingAndExtraSpaces(string input, string expected)
    {
        Assert.Equal(expected, TextNormalizer.Normalize(input));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Normalize_ReturnsEmpty_WhenTextIsEmpty(string? input)
    {
        Assert.Equal(string.Empty, TextNormalizer.Normalize(input));
    }

    [Fact]
    public void Normalize_GivesSameValue_ForEquivalentNames()
    {
        Assert.Equal(TextNormalizer.Normalize("José  Pérez"), TextNormalizer.Normalize("jose perez"));
    }

    [Fact]
    public void CleanSpaces_KeepsAccentsAndCasing()
    {
        Assert.Equal("Gabriel García Márquez", TextNormalizer.CleanSpaces("  Gabriel   García  Márquez "));
    }

    [Fact]
    public void CleanSpaces_ReturnsEmpty_WhenTextIsNull()
    {
        Assert.Equal(string.Empty, TextNormalizer.CleanSpaces(null));
    }
}
