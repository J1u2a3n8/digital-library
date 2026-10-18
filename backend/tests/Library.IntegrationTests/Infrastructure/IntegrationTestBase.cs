using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Library.Api.Contracts;
using Library.Api.Contracts.Authors;
using Library.Api.Contracts.Works;
using Library.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Library.IntegrationTests.Infrastructure;

[Collection(ApiCollection.Name)]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    protected IntegrationTestBase(LibraryApiFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
    }

    protected LibraryApiFactory Factory { get; }

    protected HttpClient Client { get; }

    public Task InitializeAsync() => Factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>
    /// Inserta un autor directo en la base, como si ya existiera en el catálogo.
    /// </summary>
    protected Task<Author> InsertAuthorAsync(string fullName)
    {
        return Factory.UseDbContextAsync(async dbContext =>
        {
            var author = Author.Create(fullName, DateTime.UtcNow);
            dbContext.Authors.Add(author);
            await dbContext.SaveChangesAsync();
            return author;
        });
    }

    protected Task<int> CountAuthorsAsync()
    {
        return Factory.UseDbContextAsync(dbContext => Task.FromResult(dbContext.Authors.Count()));
    }

    protected async Task<WorkDetailsResponse> CreateWorkAsync(
        string title,
        DateOnly publicationDate,
        params AuthorInput[] authors)
    {
        var response = await PostWorkAsync(new CreateWorkRequest
        {
            Title = title,
            PublicationDate = publicationDate,
            Authors = authors,
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await ReadAsync<WorkDetailsResponse>(response);
    }

    protected Task<HttpResponseMessage> PostWorkAsync(CreateWorkRequest request, string? actor = null)
    {
        var message = new HttpRequestMessage(HttpMethod.Post, "/api/works")
        {
            Content = JsonContent.Create(request, options: JsonOptions),
        };
        AddActor(message, actor);
        return Client.SendAsync(message);
    }

    protected Task<HttpResponseMessage> PutWorkAsync(int id, UpdateWorkRequest request, string? actor = null)
    {
        var message = new HttpRequestMessage(HttpMethod.Put, $"/api/works/{id}")
        {
            Content = JsonContent.Create(request, options: JsonOptions),
        };
        AddActor(message, actor);
        return Client.SendAsync(message);
    }

    protected async Task<PagedResponse<WorkListItemResponse>> GetWorksAsync(string queryString = "")
    {
        var response = await Client.GetAsync($"/api/works{queryString}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await ReadAsync<PagedResponse<WorkListItemResponse>>(response);
    }

    protected async Task<List<WorkHistoryItemResponse>> GetHistoryAsync(int id)
    {
        var response = await Client.GetAsync($"/api/works/{id}/history");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await ReadAsync<List<WorkHistoryItemResponse>>(response);
    }

    protected static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        var value = await response.Content.ReadFromJsonAsync<T>(JsonOptions);
        Assert.NotNull(value);
        return value;
    }

    protected static async Task<ValidationProblemDetails> ReadValidationProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadAsync<ValidationProblemDetails>(response);
        Assert.Equal(400, problem.Status);
        Assert.Equal("Validation failed", problem.Title);
        return problem;
    }

    private static void AddActor(HttpRequestMessage message, string? actor)
    {
        if (actor is not null)
        {
            message.Headers.Add("X-Actor", Uri.EscapeDataString(actor));
        }
    }
}
