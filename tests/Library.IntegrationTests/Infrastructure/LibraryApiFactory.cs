using Library.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Respawn;
using Testcontainers.MsSql;

namespace Library.IntegrationTests.Infrastructure;

/// <summary>
/// Levanta la API en memoria (WebApplicationFactory) contra un SQL Server real en Docker (Testcontainers).
/// Se comparte entre todas las pruebas; Respawn limpia los datos entre una prueba y otra.
/// </summary>
public class LibraryApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MsSqlContainer sqlContainer = new MsSqlBuilder("mcr.microsoft.com/mssql/server:2022-latest")
        .Build();

    private Respawner? respawner;

    public string ConnectionString { get; private set; } = string.Empty;

    public async Task InitializeAsync()
    {
        await sqlContainer.StartAsync();

        var builder = new SqlConnectionStringBuilder(sqlContainer.GetConnectionString())
        {
            InitialCatalog = "LibraryTestDb",
        };
        ConnectionString = builder.ConnectionString;

        // Crear el cliente arranca la API, que aplica las migraciones.
        _ = CreateClient();

        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync();

        respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.SqlServer,
            TablesToIgnore = ["__EFMigrationsHistory"],
        });
    }

    public async Task ResetDatabaseAsync()
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync();
        await respawner!.ResetAsync(connection);
    }

    public async Task<T> UseDbContextAsync<T>(Func<LibraryDbContext, Task<T>> action)
    {
        await using var scope = Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<LibraryDbContext>();
        return await action(dbContext);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", ConnectionString);
        builder.UseSetting("ApplyMigrations", "true");
        builder.UseSetting("SeedData:Enabled", "false");
        builder.UseSetting("Swagger:Enabled", "true");
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await sqlContainer.DisposeAsync();
    }
}

[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<LibraryApiFactory>
{
    public const string Name = "api";
}
