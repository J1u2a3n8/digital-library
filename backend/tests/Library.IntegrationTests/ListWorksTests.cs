using System.Net;
using Library.Api.Contracts.Authors;
using Library.IntegrationTests.Infrastructure;

namespace Library.IntegrationTests;

public class ListWorksTests : IntegrationTestBase
{
    public ListWorksTests(LibraryApiFactory factory)
        : base(factory)
    {
    }

    /// <summary>
    /// Catálogo chico con casos pensados para cada filtro y orden.
    /// </summary>
    private async Task SeedCatalogAsync()
    {
        await CreateWorkAsync("Cien años de soledad", new DateOnly(1967, 5, 30), Author("Gabriel García Márquez"));
        await CreateWorkAsync("Rayuela", new DateOnly(1963, 6, 28), Author("Julio Cortázar"));
        await CreateWorkAsync(
            "El libro de los seres imaginarios",
            new DateOnly(1967, 1, 1),
            Author("Jorge Luis Borges"),
            Author("Margarita Guerrero"));
        await CreateWorkAsync(
            "Antología de la literatura fantástica",
            new DateOnly(1940, 1, 1),
            Author("Jorge Luis Borges"),
            Author("Adolfo Bioy Casares"),
            Author("Silvina Ocampo"));
        await CreateWorkAsync(
            "El libro de arena",
            new DateOnly(1967, 1, 1),
            Author("Jorge Luis Borges"));
    }

    private static AuthorInput Author(string name) => new() { Name = name };

    [Fact]
    public async Task List_DefaultsToTitleAscending()
    {
        await SeedCatalogAsync();

        var page = await GetWorksAsync();

        Assert.Equal(5, page.TotalItems);
        Assert.Equal(1, page.TotalPages);
        Assert.Equal(
            [
                "Antología de la literatura fantástica",
                "Cien años de soledad",
                "El libro de arena",
                "El libro de los seres imaginarios",
                "Rayuela",
            ],
            page.Items.Select(item => item.Title));
    }

    [Fact]
    public async Task List_FiltersByTitle_IgnoringAccentsAndCase()
    {
        await SeedCatalogAsync();

        var page = await GetWorksAsync("?title=ANTOLOGIA");

        Assert.Equal("Antología de la literatura fantástica", Assert.Single(page.Items).Title);
    }

    [Fact]
    public async Task List_FiltersByAuthorName()
    {
        await SeedCatalogAsync();

        var page = await GetWorksAsync("?authorName=cortazar");

        Assert.Equal("Rayuela", Assert.Single(page.Items).Title);
    }

    [Fact]
    public async Task List_FiltersByExactPublicationDate()
    {
        await SeedCatalogAsync();

        var page = await GetWorksAsync("?publicationDate=1967-01-01");

        Assert.Equal(2, page.TotalItems);
        Assert.All(page.Items, item => Assert.Equal(new DateOnly(1967, 1, 1), item.PublicationDate));
    }

    [Fact]
    public async Task List_FiltersByMinimumAuthorCount()
    {
        await SeedCatalogAsync();

        var page = await GetWorksAsync("?minimumAuthorCount=2");

        Assert.Equal(2, page.TotalItems);
        Assert.All(page.Items, item => Assert.True(item.AuthorCount >= 2));
    }

    [Fact]
    public async Task List_CombinesAllFiltersWithAnd()
    {
        await SeedCatalogAsync();

        // "libro" + Borges + 1967-01-01 deja dos obras; el mínimo de 2 autores deja solo una.
        var page = await GetWorksAsync(
            "?title=libro&authorName=borges&publicationDate=1967-01-01&minimumAuthorCount=2");

        var item = Assert.Single(page.Items);
        Assert.Equal("El libro de los seres imaginarios", item.Title);
        Assert.Equal(2, item.AuthorCount);
    }

    [Fact]
    public async Task List_ReturnsEmptyPage_WhenNothingMatches()
    {
        await SeedCatalogAsync();

        var page = await GetWorksAsync("?title=rayuela&minimumAuthorCount=2");

        Assert.Empty(page.Items);
        Assert.Equal(0, page.TotalItems);
        Assert.Equal(0, page.TotalPages);
    }

    [Theory]
    [InlineData("asc", "Antología de la literatura fantástica")]
    [InlineData("desc", "Rayuela")]
    public async Task List_SortsByTitle(string direction, string expectedFirst)
    {
        await SeedCatalogAsync();

        var page = await GetWorksAsync($"?sortBy=title&sortDirection={direction}");

        Assert.Equal(expectedFirst, page.Items[0].Title);
    }

    [Fact]
    public async Task List_SortsByPublicationDate()
    {
        await SeedCatalogAsync();

        var ascending = await GetWorksAsync("?sortBy=publicationDate&sortDirection=asc");
        var descending = await GetWorksAsync("?sortBy=publicationDate&sortDirection=desc");

        var ascendingDates = ascending.Items.Select(item => item.PublicationDate).ToList();
        Assert.Equal(ascendingDates.Order(), ascendingDates);
        Assert.Equal(new DateOnly(1940, 1, 1), ascendingDates[0]);
        Assert.Equal(new DateOnly(1967, 5, 30), descending.Items[0].PublicationDate);
    }

    [Fact]
    public async Task List_SortsByAuthorCount()
    {
        await SeedCatalogAsync();

        var ascending = await GetWorksAsync("?sortBy=authorCount&sortDirection=asc");
        var descending = await GetWorksAsync("?sortBy=authorCount&sortDirection=desc");

        Assert.Equal([1, 1, 1, 2, 3], ascending.Items.Select(item => item.AuthorCount));
        Assert.Equal([3, 2, 1, 1, 1], descending.Items.Select(item => item.AuthorCount));
    }

    [Fact]
    public async Task List_UsesIdAsTieBreaker_ForEqualValues()
    {
        await SeedCatalogAsync();

        var page = await GetWorksAsync("?sortBy=authorCount&sortDirection=desc");
        var singleAuthorIds = page.Items.Where(item => item.AuthorCount == 1).Select(item => item.Id).ToList();

        Assert.Equal(singleAuthorIds.Order(), singleAuthorIds);
    }

    [Fact]
    public async Task List_PaginationIsStable_AcrossPages()
    {
        // 12 obras con el mismo título y fecha: solo el desempate por id las ordena.
        for (var number = 1; number <= 12; number++)
        {
            await CreateWorkAsync("Misma obra", new DateOnly(2000, 1, 1), Author($"Autor {number:00}"));
        }

        var firstPage = await GetWorksAsync("?pageSize=5&pageNumber=1");
        var secondPage = await GetWorksAsync("?pageSize=5&pageNumber=2");
        var thirdPage = await GetWorksAsync("?pageSize=5&pageNumber=3");

        var allIds = firstPage.Items.Concat(secondPage.Items).Concat(thirdPage.Items).Select(item => item.Id).ToList();
        Assert.Equal(12, allIds.Distinct().Count());
        Assert.Equal(allIds.Order(), allIds);
        Assert.Equal(3, firstPage.TotalPages);
        Assert.Equal(2, thirdPage.Items.Count);
    }

    [Fact]
    public async Task List_ShowsOnlyCurrentVersion()
    {
        var work = await CreateWorkAsync("Título viejo", new DateOnly(2000, 1, 1), Author("Autor Uno"));
        await PutWorkAsync(work.Id, new Library.Api.Contracts.Works.UpdateWorkRequest
        {
            Title = "Título nuevo",
            PublicationDate = new DateOnly(2000, 1, 1),
            Authors = [Author("Autor Uno")],
            RowVersion = work.RowVersion,
        });

        var page = await GetWorksAsync();
        var oldTitleSearch = await GetWorksAsync("?title=viejo");

        Assert.Equal("Título nuevo", Assert.Single(page.Items).Title);
        Assert.Empty(oldTitleSearch.Items);
    }

    [Theory]
    [InlineData("?pageSize=0")]
    [InlineData("?pageSize=101")]
    [InlineData("?pageNumber=0")]
    [InlineData("?minimumAuthorCount=0")]
    public async Task List_Returns400_WhenQueryIsOutOfRange(string queryString)
    {
        var response = await Client.GetAsync($"/api/works{queryString}");

        await ReadValidationProblemAsync(response);
    }

    [Fact]
    public async Task List_Returns400_WhenSortByIsUnknown()
    {
        var response = await Client.GetAsync("/api/works?sortBy=isbn");

        var problem = await ReadValidationProblemAsync(response);
        Assert.Contains("sortBy", problem.Errors.Keys);
    }

    [Fact]
    public async Task List_PageSizeError_UsesCamelCaseKey()
    {
        var response = await Client.GetAsync("/api/works?pageSize=500");

        var problem = await ReadValidationProblemAsync(response);
        Assert.Equal(["El tamaño de página debe estar entre 1 y 100."], problem.Errors["pageSize"]);
    }
}
