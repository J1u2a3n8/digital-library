using System.Net;
using Library.Api.Contracts.Authors;
using Library.Api.Contracts.Works;
using Library.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Library.IntegrationTests;

public class UpdateWorkTests : IntegrationTestBase
{
    private static readonly DateOnly PublicationDate = new(1963, 6, 28);

    public UpdateWorkTests(LibraryApiFactory factory)
        : base(factory)
    {
    }

    [Fact]
    public async Task Update_ChangesTitleDateAndAuthors_AndCreatesVersionTwo()
    {
        var work = await CreateWorkAsync("Rayuela", PublicationDate, new AuthorInput { Name = "Julio Cortázar" });
        var newDate = new DateOnly(1964, 1, 15);

        var response = await PutWorkAsync(work.Id, new UpdateWorkRequest
        {
            Title = "Rayuela (edición revisada)",
            PublicationDate = newDate,
            Authors = [new AuthorInput { Id = work.Authors[0].Id }, new AuthorInput { Name = "Editor Invitado" }],
            RowVersion = work.RowVersion,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await ReadAsync<WorkDetailsResponse>(response);
        Assert.Equal("Rayuela (edición revisada)", updated.Title);
        Assert.Equal(newDate, updated.PublicationDate);
        Assert.Equal(2, updated.AuthorCount);
        Assert.Equal(2, updated.VersionNumber);
        Assert.NotEqual(work.RowVersion, updated.RowVersion);
    }

    [Fact]
    public async Task Update_KeepsPreviousVersionIntact()
    {
        var work = await CreateWorkAsync("Rayuela", PublicationDate, new AuthorInput { Name = "Julio Cortázar" });

        await PutWorkAsync(
            work.Id,
            new UpdateWorkRequest
            {
                Title = "Rayuela 2",
                PublicationDate = PublicationDate.AddYears(1),
                Authors = [new AuthorInput { Name = "Otro Autor" }],
                RowVersion = work.RowVersion,
            },
            actor: "María");

        var history = await GetHistoryAsync(work.Id);

        Assert.Equal(2, history.Count);
        Assert.Equal([2, 1], history.Select(version => version.VersionNumber));

        var current = history[0];
        Assert.True(current.IsCurrent);
        Assert.Equal("Updated", current.ChangeKind);
        Assert.Equal("María", current.ChangedBy);
        Assert.Equal("Otro Autor", Assert.Single(current.Authors).FullName);

        var previous = history[1];
        Assert.False(previous.IsCurrent);
        Assert.Equal("Created", previous.ChangeKind);
        Assert.Equal("Rayuela", previous.Title);
        Assert.Equal(PublicationDate, previous.PublicationDate);
        Assert.Equal("Julio Cortázar", Assert.Single(previous.Authors).FullName);
        Assert.Equal(DateTimeKind.Utc, previous.CreatedAtUtc.Kind);
    }

    [Fact]
    public async Task Update_WithSameData_DoesNotCreateVersion()
    {
        var work = await CreateWorkAsync("Rayuela", PublicationDate, new AuthorInput { Name = "Julio Cortázar" });

        var response = await PutWorkAsync(work.Id, new UpdateWorkRequest
        {
            Title = "  RAYUELA ",
            PublicationDate = PublicationDate,
            Authors = [new AuthorInput { Name = "julio cortazar" }],
            RowVersion = work.RowVersion,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await ReadAsync<WorkDetailsResponse>(response);
        Assert.Equal(1, result.VersionNumber);
        Assert.Equal(work.RowVersion, result.RowVersion);
        Assert.Single(await GetHistoryAsync(work.Id));
    }

    [Fact]
    public async Task Update_WithStaleRowVersion_Returns409()
    {
        var work = await CreateWorkAsync("Rayuela", PublicationDate, new AuthorInput { Name = "Julio Cortázar" });
        var firstChange = new UpdateWorkRequest
        {
            Title = "Cambio de Juan",
            PublicationDate = PublicationDate,
            Authors = [new AuthorInput { Id = work.Authors[0].Id }],
            RowVersion = work.RowVersion,
        };

        var firstResponse = await PutWorkAsync(work.Id, firstChange);
        var secondResponse = await PutWorkAsync(work.Id, firstChange with { Title = "Cambio de María" });

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);
        var problem = await ReadAsync<ProblemDetails>(secondResponse);
        Assert.Equal(409, problem.Status);

        var history = await GetHistoryAsync(work.Id);
        Assert.Equal(2, history.Count);
        Assert.Equal("Cambio de Juan", history[0].Title);
    }

    [Fact]
    public async Task Update_TwoUsersAtTheSameTime_OnlyOneWins()
    {
        var work = await CreateWorkAsync("Rayuela", PublicationDate, new AuthorInput { Name = "Julio Cortázar" });
        var baseRequest = new UpdateWorkRequest
        {
            PublicationDate = PublicationDate,
            Authors = [new AuthorInput { Id = work.Authors[0].Id }],
            RowVersion = work.RowVersion,
        };

        var responses = await Task.WhenAll(
            PutWorkAsync(work.Id, baseRequest with { Title = "Versión A" }),
            PutWorkAsync(work.Id, baseRequest with { Title = "Versión B" }));

        var statusCodes = responses.Select(response => response.StatusCode).OrderBy(code => code).ToList();
        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.Conflict], statusCodes);
        Assert.Equal(2, (await GetHistoryAsync(work.Id)).Count);
    }

    [Fact]
    public async Task Update_Returns404_WhenWorkDoesNotExist()
    {
        var response = await PutWorkAsync(999, new UpdateWorkRequest
        {
            Title = "No existe",
            PublicationDate = PublicationDate,
            Authors = [new AuthorInput { Name = "Nadie" }],
            RowVersion = "AAAAAAAAB9E=",
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_Returns400_WhenRowVersionIsInvalid()
    {
        var work = await CreateWorkAsync("Rayuela", PublicationDate, new AuthorInput { Name = "Julio Cortázar" });

        var response = await PutWorkAsync(work.Id, new UpdateWorkRequest
        {
            Title = "Rayuela",
            PublicationDate = PublicationDate,
            Authors = [new AuthorInput { Name = "Julio Cortázar" }],
            RowVersion = "no-es-base64",
        });

        var problem = await ReadValidationProblemAsync(response);
        Assert.Contains("rowVersion", problem.Errors.Keys);
    }

    [Fact]
    public async Task History_KeepsAuthorSnapshot()
    {
        var work = await CreateWorkAsync("Ficciones", PublicationDate, new AuthorInput { Name = "Jorge Luis Borges" });
        var authorId = work.Authors[0].Id;

        // El catálogo no permite editar autores; se simula un cambio directo para probar el snapshot.
        await Factory.UseDbContextAsync(dbContext => dbContext.Database.ExecuteSqlAsync(
            $"UPDATE Authors SET FullName = N'J. L. Borges' WHERE Id = {authorId}"));

        var history = await GetHistoryAsync(work.Id);
        var details = await ReadAsync<WorkDetailsResponse>(await Client.GetAsync($"/api/works/{work.Id}"));

        Assert.Equal("Jorge Luis Borges", Assert.Single(history[0].Authors).FullName);
        Assert.Equal("J. L. Borges", Assert.Single(details.Authors).FullName);
    }

    [Fact]
    public async Task GetById_Returns404_WhenWorkDoesNotExist()
    {
        var response = await Client.GetAsync("/api/works/12345");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await ReadAsync<ProblemDetails>(response);
        Assert.Equal("No existe una obra con id 12345.", problem.Detail);
    }

    [Fact]
    public async Task History_Returns404_WhenWorkDoesNotExist()
    {
        var response = await Client.GetAsync("/api/works/12345/history");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
