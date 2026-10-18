using System.Net;
using System.Net.Http.Json;
using Library.Api.Controllers;
using Library.IntegrationTests.Infrastructure;

namespace Library.IntegrationTests;

public class HealthAndSwaggerTests : IntegrationTestBase
{
    public HealthAndSwaggerTests(LibraryApiFactory factory)
        : base(factory)
    {
    }

    [Fact]
    public async Task Health_ReturnsHealthy_WhenDatabaseIsUp()
    {
        var response = await Client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var health = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.Equal("Healthy", health?.Status);
    }

    [Fact]
    public async Task Swagger_ReturnsDocumentWithAllEndpoints()
    {
        var response = await Client.GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var document = await response.Content.ReadAsStringAsync();
        Assert.Contains("Biblioteca Digital API", document);
        Assert.Contains("/api/works/{id}/history", document);
        Assert.Contains("/api/authors", document);
        Assert.Contains("X-Actor", document);
    }

    [Fact]
    public async Task SwaggerUi_IsAvailable()
    {
        var response = await Client.GetAsync("/swagger/index.html");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
