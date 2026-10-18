using FluentValidation.Results;
using Library.Api.Validation;

namespace Library.UnitTests.Api;

public class ValidationErrorKeysTests
{
    [Theory]
    [InlineData("Title", "title")]
    [InlineData("Authors[0].Name", "authors[0].name")]
    [InlineData("", "")]
    public void ToCamelCasePath_ConvertsEachSegment(string input, string expected)
    {
        Assert.Equal(expected, ValidationErrorKeys.ToCamelCasePath(input));
    }

    [Fact]
    public void ToErrorDictionary_GroupsMessagesByField()
    {
        var failures = new[]
        {
            new ValidationFailure("Title", "Uno"),
            new ValidationFailure("Title", "Dos"),
            new ValidationFailure("Title", "Uno"),
            new ValidationFailure("PublicationDate", "Tres"),
        };

        var errors = failures.ToErrorDictionary();

        Assert.Equal(["Uno", "Dos"], errors["title"]);
        Assert.Equal(["Tres"], errors["publicationDate"]);
    }
}
