using Library.Api.Controllers;

namespace Library.UnitTests.Api;

public class ActorHeaderTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("%20")]
    public void GetChangedByUserName_ReturnsAnonymous_WhenHeaderIsMissing(string? headerValue)
    {
        Assert.Equal("anonymous", ActorHeader.GetChangedByUserName(headerValue));
    }

    [Fact]
    public void GetChangedByUserName_TrimsValue()
    {
        Assert.Equal("Juan", ActorHeader.GetChangedByUserName("  Juan "));
    }

    [Fact]
    public void GetChangedByUserName_DecodesUrlEncodedNames()
    {
        Assert.Equal("María", ActorHeader.GetChangedByUserName("Mar%C3%ADa"));
    }

    [Fact]
    public void GetChangedByUserName_CutsTo100Characters()
    {
        var result = ActorHeader.GetChangedByUserName(new string('a', 150));

        Assert.Equal(100, result.Length);
    }
}
