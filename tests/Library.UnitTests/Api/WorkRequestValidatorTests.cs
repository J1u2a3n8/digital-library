using Library.Api.Contracts.Authors;
using Library.Api.Contracts.Works;
using Library.Api.Validation;

namespace Library.UnitTests.Api;

public class WorkRequestValidatorTests
{
    private const string ValidRowVersion = "AAAAAAAAB9E=";

    private readonly CreateWorkRequestValidator createValidator = new();
    private readonly UpdateWorkRequestValidator updateValidator = new();

    private static CreateWorkRequest ValidCreateRequest() => new()
    {
        Title = "Rayuela",
        PublicationDate = new DateOnly(1963, 6, 28),
        Authors = [new AuthorInput { Id = 1 }, new AuthorInput { Name = "Julio Cortázar" }],
    };

    private static UpdateWorkRequest ValidUpdateRequest() => new()
    {
        Title = "Rayuela",
        PublicationDate = new DateOnly(1963, 6, 28),
        Authors = [new AuthorInput { Id = 1 }],
        RowVersion = ValidRowVersion,
    };

    [Fact]
    public void Create_IsValid_WithExistingAndNewAuthors()
    {
        Assert.True(createValidator.Validate(ValidCreateRequest()).IsValid);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_RequiresTitle(string? title)
    {
        var result = createValidator.Validate(ValidCreateRequest() with { Title = title });

        var error = Assert.Single(result.Errors);
        Assert.Equal("Title", error.PropertyName);
        Assert.Equal("El título es obligatorio.", error.ErrorMessage);
    }

    [Fact]
    public void Create_RejectsTitleLongerThan300()
    {
        var result = createValidator.Validate(ValidCreateRequest() with { Title = new string('a', 301) });

        Assert.Contains(result.Errors, error => error.PropertyName == "Title");
    }

    [Fact]
    public void Create_AcceptsTitleOf300AfterTrim()
    {
        var title = $"  {new string('a', 300)}  ";

        Assert.True(createValidator.Validate(ValidCreateRequest() with { Title = title }).IsValid);
    }

    [Fact]
    public void Create_RequiresPublicationDate()
    {
        var result = createValidator.Validate(ValidCreateRequest() with { PublicationDate = null });

        Assert.Contains(result.Errors, error => error.PropertyName == "PublicationDate");
    }

    [Fact]
    public void Create_RequiresAuthorList()
    {
        var result = createValidator.Validate(ValidCreateRequest() with { Authors = null });

        Assert.Contains(result.Errors, error => error.ErrorMessage == "Debe indicar al menos un autor.");
    }

    [Fact]
    public void Create_RequiresAtLeastOneAuthor()
    {
        var result = createValidator.Validate(ValidCreateRequest() with { Authors = [] });

        Assert.Contains(result.Errors, error => error.ErrorMessage == "Debe indicar al menos un autor.");
    }

    [Fact]
    public void Create_RejectsMoreThanTwentyAuthors()
    {
        var authors = Enumerable.Range(1, 21).Select(id => new AuthorInput { Id = id }).ToList();

        var result = createValidator.Validate(ValidCreateRequest() with { Authors = authors });

        Assert.Contains(result.Errors, error => error.PropertyName == "Authors");
    }

    [Fact]
    public void Create_RejectsAuthorWithIdAndName()
    {
        var request = ValidCreateRequest() with { Authors = [new AuthorInput { Id = 1, Name = "Julio" }] };

        var result = createValidator.Validate(request);

        Assert.Contains(result.Errors, error => error.PropertyName.StartsWith("Authors[0]"));
    }

    [Fact]
    public void Create_RejectsAuthorWithoutIdAndName()
    {
        var request = ValidCreateRequest() with { Authors = [new AuthorInput()] };

        Assert.False(createValidator.Validate(request).IsValid);
    }

    [Theory]
    [InlineData("A")]
    [InlineData(" B ")]
    public void Create_RejectsShortAuthorName(string name)
    {
        var request = ValidCreateRequest() with { Authors = [new AuthorInput { Name = name }] };

        var result = createValidator.Validate(request);

        Assert.Contains(result.Errors, error => error.PropertyName == "Authors[0].Name");
    }

    [Fact]
    public void Create_RejectsAuthorIdLowerThanOne()
    {
        var request = ValidCreateRequest() with { Authors = [new AuthorInput { Id = 0 }] };

        var result = createValidator.Validate(request);

        Assert.Contains(result.Errors, error => error.PropertyName == "Authors[0].Id");
    }

    [Fact]
    public void Update_IsValid_WithRowVersion()
    {
        Assert.True(updateValidator.Validate(ValidUpdateRequest()).IsValid);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Update_RequiresRowVersion(string? rowVersion)
    {
        var result = updateValidator.Validate(ValidUpdateRequest() with { RowVersion = rowVersion });

        var error = Assert.Single(result.Errors);
        Assert.Equal("El rowVersion es obligatorio.", error.ErrorMessage);
    }

    [Theory]
    [InlineData("not-base64!")]
    [InlineData("AAAA")]
    public void Update_RejectsInvalidRowVersion(string rowVersion)
    {
        var result = updateValidator.Validate(ValidUpdateRequest() with { RowVersion = rowVersion });

        var error = Assert.Single(result.Errors);
        Assert.Equal("El rowVersion no es un valor Base64 válido.", error.ErrorMessage);
    }

    [Fact]
    public void Update_UsesSameContentRulesAsCreate()
    {
        var result = updateValidator.Validate(ValidUpdateRequest() with { Title = "", Authors = [] });

        Assert.Equal(2, result.Errors.Count);
    }

    [Fact]
    public void BeValidRowVersion_IsFalse_ForWhitespace()
    {
        Assert.False(UpdateWorkRequestValidator.BeValidRowVersion("  "));
    }
}
