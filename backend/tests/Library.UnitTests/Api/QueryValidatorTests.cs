using Library.Api.Contracts.Authors;
using Library.Api.Contracts.Works;
using Library.Api.Validation;

namespace Library.UnitTests.Api;

public class QueryValidatorTests
{
    private readonly WorkFilterValidator filterValidator = new();
    private readonly AuthorSearchQueryValidator authorSearchValidator = new();

    [Fact]
    public void WorkFilter_DefaultValuesAreValid()
    {
        Assert.True(filterValidator.Validate(new WorkFilter()).IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void WorkFilter_RejectsPageSizeOutOfRange(int pageSize)
    {
        var result = filterValidator.Validate(new WorkFilter { PageSize = pageSize });

        Assert.Contains(result.Errors, error => error.PropertyName == "PageSize");
    }

    [Fact]
    public void WorkFilter_RejectsPageNumberZero()
    {
        var result = filterValidator.Validate(new WorkFilter { PageNumber = 0 });

        Assert.Contains(result.Errors, error => error.PropertyName == "PageNumber");
    }

    [Fact]
    public void WorkFilter_RejectsMinimumAuthorCountZero()
    {
        var result = filterValidator.Validate(new WorkFilter { MinimumAuthorCount = 0 });

        Assert.Contains(result.Errors, error => error.PropertyName == "MinimumAuthorCount");
    }

    [Fact]
    public void WorkFilter_RejectsVeryLongTexts()
    {
        var result = filterValidator.Validate(new WorkFilter
        {
            Title = new string('a', 301),
            AuthorName = new string('a', 201),
        });

        Assert.Equal(2, result.Errors.Count);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(21)]
    public void AuthorSearch_RejectsPageSizeOutOfRange(int pageSize)
    {
        var result = authorSearchValidator.Validate(new AuthorSearchQuery { PageSize = pageSize });

        Assert.False(result.IsValid);
    }

    [Fact]
    public void AuthorSearch_DefaultValuesAreValid()
    {
        Assert.True(authorSearchValidator.Validate(new AuthorSearchQuery { Search = "borges" }).IsValid);
    }
}
