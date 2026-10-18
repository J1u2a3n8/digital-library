using System.Net;
using Library.Api.Contracts.Authors;
using Library.Api.Contracts.Works;
using Library.IntegrationTests.Infrastructure;

namespace Library.IntegrationTests;

public class CreateWorkTests : IntegrationTestBase
{
    private static readonly DateOnly PublicationDate = new(1963, 6, 28);

    public CreateWorkTests(LibraryApiFactory factory)
        : base(factory)
    {
    }

    [Fact]
    public async Task Create_WithExistingAuthor_Returns201AndLocation()
    {
        var cortazar = await InsertAuthorAsync("Julio Cortázar");

        var response = await PostWorkAsync(new CreateWorkRequest
        {
            Title = "Rayuela",
            PublicationDate = PublicationDate,
            Authors = [new AuthorInput { Id = cortazar.Id }],
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var work = await ReadAsync<WorkDetailsResponse>(response);
        Assert.Equal($"/api/works/{work.Id}", response.Headers.Location?.AbsolutePath);
        Assert.Equal("Rayuela", work.Title);
        Assert.Equal(PublicationDate, work.PublicationDate);
        Assert.Equal(1, work.VersionNumber);
        Assert.Equal(cortazar.Id, Assert.Single(work.Authors).Id);
        Assert.False(string.IsNullOrEmpty(work.RowVersion));
    }

    [Fact]
    public async Task Create_WithNewAuthor_CreatesTheAuthor()
    {
        var work = await CreateWorkAsync("Pedro Páramo", PublicationDate, new AuthorInput { Name = "Juan Rulfo" });

        var author = Assert.Single(work.Authors);
        Assert.Equal("Juan Rulfo", author.FullName);
        Assert.Equal(1, await CountAuthorsAsync());
    }

    [Fact]
    public async Task Create_WithExistingAndNewAuthors_AssociatesBoth()
    {
        var borges = await InsertAuthorAsync("Jorge Luis Borges");

        var work = await CreateWorkAsync(
            "El libro de los seres imaginarios",
            PublicationDate,
            new AuthorInput { Id = borges.Id },
            new AuthorInput { Name = "Margarita Guerrero" });

        Assert.Equal(2, work.AuthorCount);
        Assert.Equal(["Jorge Luis Borges", "Margarita Guerrero"], work.Authors.Select(author => author.FullName));
        Assert.Equal(2, await CountAuthorsAsync());
    }

    [Fact]
    public async Task Create_ReusesAuthorWithSameNormalizedName()
    {
        var existing = await InsertAuthorAsync("Gabriel García Márquez");

        var work = await CreateWorkAsync(
            "Cien años de soledad",
            PublicationDate,
            new AuthorInput { Name = "  GABRIEL garcia   marquez " });

        Assert.Equal(existing.Id, Assert.Single(work.Authors).Id);
        Assert.Equal("Gabriel García Márquez", work.Authors[0].FullName);
        Assert.Equal(1, await CountAuthorsAsync());
    }

    [Fact]
    public async Task Create_DeduplicatesRepeatedAuthorsInRequest()
    {
        var eco = await InsertAuthorAsync("Umberto Eco");

        var work = await CreateWorkAsync(
            "El nombre de la rosa",
            PublicationDate,
            new AuthorInput { Id = eco.Id },
            new AuthorInput { Id = eco.Id },
            new AuthorInput { Name = "umberto eco" },
            new AuthorInput { Name = "Nuevo Autor" },
            new AuthorInput { Name = "NUEVO AUTOR" });

        Assert.Equal(2, work.AuthorCount);
        Assert.Equal(2, await CountAuthorsAsync());
    }

    [Fact]
    public async Task Create_Returns400_WhenThereAreNoAuthors()
    {
        var response = await PostWorkAsync(new CreateWorkRequest
        {
            Title = "Sin autores",
            PublicationDate = PublicationDate,
            Authors = [],
        });

        var problem = await ReadValidationProblemAsync(response);
        Assert.Contains("authors", problem.Errors.Keys);
    }

    [Fact]
    public async Task Create_Returns400_WhenAuthorHasIdAndName()
    {
        var response = await PostWorkAsync(new CreateWorkRequest
        {
            Title = "Rayuela",
            PublicationDate = PublicationDate,
            Authors = [new AuthorInput { Id = 1, Name = "Julio Cortázar" }],
        });

        var problem = await ReadValidationProblemAsync(response);
        Assert.Contains(problem.Errors.Keys, key => key.StartsWith("authors[0]"));
    }

    [Fact]
    public async Task Create_Returns400_WhenAuthorIdDoesNotExist()
    {
        var response = await PostWorkAsync(new CreateWorkRequest
        {
            Title = "Rayuela",
            PublicationDate = PublicationDate,
            Authors = [new AuthorInput { Id = 999 }],
        });

        var problem = await ReadValidationProblemAsync(response);
        Assert.Equal(["No existe un autor con id 999."], problem.Errors["authors"]);
        Assert.Equal(0, await Factory.UseDbContextAsync(dbContext => Task.FromResult(dbContext.Works.Count())));
    }

    [Fact]
    public async Task Create_DoesNotLeaveNewAuthors_WhenTheRequestFails()
    {
        var response = await PostWorkAsync(new CreateWorkRequest
        {
            Title = "Obra fallida",
            PublicationDate = PublicationDate,
            Authors = [new AuthorInput { Name = "Autor Huérfano" }, new AuthorInput { Id = 999 }],
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, await CountAuthorsAsync());
    }

    [Fact]
    public async Task Create_Returns400WithSpanishMessages_WhenBodyIsInvalid()
    {
        var response = await PostWorkAsync(new CreateWorkRequest { Title = " " });

        var problem = await ReadValidationProblemAsync(response);
        Assert.Equal("Validation failed", problem.Title);
        Assert.Equal(["El título es obligatorio."], problem.Errors["title"]);
        Assert.Contains("publicationDate", problem.Errors.Keys);
    }

    [Fact]
    public async Task Create_Returns400_WhenDateHasInvalidFormat()
    {
        var content = new StringContent(
            """{"title":"Rayuela","publicationDate":"1963-13-45","authors":[{"name":"Julio Cortázar"}]}""",
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await Client.PostAsync("/api/works", content);

        var problem = await ReadValidationProblemAsync(response);
        Assert.Equal(["El valor enviado no tiene un formato válido."], problem.Errors["publicationDate"]);
        Assert.DoesNotContain("request", problem.Errors.Keys);
    }

    [Fact]
    public async Task Create_SavesActorAsChangedBy()
    {
        var response = await PostWorkAsync(
            new CreateWorkRequest
            {
                Title = "Rayuela",
                PublicationDate = PublicationDate,
                Authors = [new AuthorInput { Name = "Julio Cortázar" }],
            },
            actor: "María");
        var work = await ReadAsync<WorkDetailsResponse>(response);

        var history = await GetHistoryAsync(work.Id);

        Assert.Equal("María", Assert.Single(history).ChangedBy);
    }

    [Fact]
    public async Task Create_UsesAnonymous_WhenActorIsMissing()
    {
        var work = await CreateWorkAsync("Rayuela", PublicationDate, new AuthorInput { Name = "Julio Cortázar" });

        var history = await GetHistoryAsync(work.Id);

        Assert.Equal("anonymous", Assert.Single(history).ChangedBy);
    }
}
