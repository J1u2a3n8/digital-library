using System.Net;
using Library.Api.Contracts.Authors;
using Library.Api.Services;
using Library.Domain.Entities;
using Library.IntegrationTests.Infrastructure;
using Library.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;

namespace Library.IntegrationTests;

public class AuthorsTests : IntegrationTestBase
{
    public AuthorsTests(LibraryApiFactory factory)
        : base(factory)
    {
    }

    [Fact]
    public async Task Search_FindsAuthorsIgnoringAccentsAndCase()
    {
        await InsertAuthorAsync("Julio Cortázar");
        await InsertAuthorAsync("Isabel Allende");

        var response = await Client.GetAsync("/api/authors?search=CORTAZAR");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var authors = await ReadAsync<List<AuthorResponse>>(response);
        Assert.Equal("Julio Cortázar", Assert.Single(authors).FullName);
    }

    [Fact]
    public async Task Search_PutsExactMatchFirst_AndRespectsPageSize()
    {
        await InsertAuthorAsync("Ana Borges");
        await InsertAuthorAsync("Borges");
        await InsertAuthorAsync("Jorge Luis Borges");

        var authors = await ReadAsync<List<AuthorResponse>>(await Client.GetAsync("/api/authors?search=borges&pageSize=2"));

        Assert.Equal(2, authors.Count);
        Assert.Equal("Borges", authors[0].FullName);
    }

    [Fact]
    public async Task Search_WithoutText_ReturnsAuthorsInAlphabeticalOrder()
    {
        await InsertAuthorAsync("Umberto Eco");
        await InsertAuthorAsync("Adolfo Bioy Casares");

        var authors = await ReadAsync<List<AuthorResponse>>(await Client.GetAsync("/api/authors"));

        Assert.Equal(["Adolfo Bioy Casares", "Umberto Eco"], authors.Select(author => author.FullName));
    }

    [Fact]
    public async Task Search_Returns400_WhenPageSizeIsOutOfRange()
    {
        var response = await Client.GetAsync("/api/authors?pageSize=50");

        await ReadValidationProblemAsync(response);
    }

    [Fact]
    public async Task InsertOrGetExisting_ReturnsExistingAuthor_WhenAnotherRequestCreatedItFirst()
    {
        // Simula la carrera: el autor se crea después de la búsqueda previa, justo antes del insert.
        var existing = await InsertAuthorAsync("Silvina Ocampo");

        var author = await Factory.UseDbContextAsync(dbContext =>
        {
            var service = new AuthorService(dbContext, TimeProvider.System);
            return service.InsertOrGetExistingAsync("SILVINA OCAMPO", CancellationToken.None);
        });

        Assert.Equal(existing.Id, author.Id);
        Assert.Equal(1, await CountAuthorsAsync());
    }

    [Fact]
    public async Task GetOrCreateAuthor_CreatesOnlyOnce()
    {
        var first = await Factory.UseDbContextAsync(dbContext =>
            new AuthorService(dbContext, TimeProvider.System)
                .GetOrCreateAuthorAsync(new AuthorInput { Name = "Laura Esquivel" }, CancellationToken.None));

        var second = await Factory.UseDbContextAsync(dbContext =>
            new AuthorService(dbContext, TimeProvider.System)
                .GetOrCreateAuthorAsync(new AuthorInput { Name = "laura   esquivel" }, CancellationToken.None));

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, await CountAuthorsAsync());
    }

    [Fact]
    public async Task UniqueIndex_RejectsDuplicatedNormalizedName()
    {
        await InsertAuthorAsync("Mario Vargas Llosa");

        await Assert.ThrowsAsync<DbUpdateException>(() => InsertAuthorAsync("mario vargas llosa"));
    }

    [Fact]
    public async Task Seeder_InsertsDemoData_OnlyOnce()
    {
        await Factory.UseDbContextAsync(async dbContext =>
        {
            var seeder = new DataSeeder(dbContext, TimeProvider.System);
            await seeder.SeedAsync();
            await seeder.SeedAsync();
            return true;
        });

        var counts = await Factory.UseDbContextAsync(async dbContext => new
        {
            Authors = await dbContext.Authors.CountAsync(),
            Works = await dbContext.Works.CountAsync(),
            MaxAuthors = await dbContext.WorkVersions.MaxAsync(version => version.Authors.Count()),
        });

        Assert.Equal(12, counts.Authors);
        Assert.Equal(10, counts.Works);
        Assert.Equal(3, counts.MaxAuthors);
    }
}
