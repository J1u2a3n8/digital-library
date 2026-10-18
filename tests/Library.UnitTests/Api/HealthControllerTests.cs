using Library.Api.Controllers;
using Library.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Library.UnitTests.Api;

public class HealthControllerTests
{
    [Fact]
    public async Task GetHealth_Returns503_WhenDatabaseIsNotReachable()
    {
        // Puerto 1 en localhost: no hay ningún SQL Server escuchando.
        var options = new DbContextOptionsBuilder<LibraryDbContext>()
            .UseSqlServer("Server=127.0.0.1,1;Database=Nothing;User Id=sa;Password=x;Connect Timeout=1;TrustServerCertificate=True;")
            .Options;
        await using var dbContext = new LibraryDbContext(options);
        var controller = new HealthController(dbContext);

        var response = await controller.GetHealth(CancellationToken.None);

        var result = Assert.IsType<ObjectResult>(response.Result);
        Assert.Equal(503, result.StatusCode);
        Assert.Equal(HealthController.Unhealthy, Assert.IsType<HealthResponse>(result.Value).Status);
    }
}
