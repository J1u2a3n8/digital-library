using Library.Domain.Entities;
using Library.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Library.Infrastructure.Seed;

/// <summary>
/// Inserta datos de demo solo si la base está vacía, así puede ejecutarse en cada inicio.
/// </summary>
public class DataSeeder
{
    public const string SeedUserName = "seed";

    private static readonly SeedWork[] SeedWorks =
    [
        new("Cien años de soledad", new DateOnly(1967, 5, 30), ["Gabriel García Márquez"]),
        new("Rayuela", new DateOnly(1963, 6, 28), ["Julio Cortázar"]),
        new("El nombre de la rosa", new DateOnly(1980, 1, 1), ["Umberto Eco"]),
        new("Crepúsculo", new DateOnly(2005, 10, 5), ["Stephenie Meyer"]),
        new("La casa de los espíritus", new DateOnly(1982, 1, 1), ["Isabel Allende"]),
        new(
            "Antología de la literatura fantástica",
            new DateOnly(1940, 1, 1),
            ["Jorge Luis Borges", "Adolfo Bioy Casares", "Silvina Ocampo"]),
        new("Pedro Páramo", new DateOnly(1955, 1, 1), ["Juan Rulfo"]),
        new("La ciudad y los perros", new DateOnly(1963, 1, 1), ["Mario Vargas Llosa"]),
        new("Como agua para chocolate", new DateOnly(1989, 1, 1), ["Laura Esquivel"]),
        new(
            "El libro de los seres imaginarios",
            new DateOnly(1967, 1, 1),
            ["Jorge Luis Borges", "Margarita Guerrero"]),
    ];

    private readonly LibraryDbContext dbContext;
    private readonly TimeProvider timeProvider;

    public DataSeeder(LibraryDbContext dbContext, TimeProvider timeProvider)
    {
        this.dbContext = dbContext;
        this.timeProvider = timeProvider;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var hasData = await dbContext.Authors.AnyAsync(cancellationToken)
            || await dbContext.Works.AnyAsync(cancellationToken);

        if (hasData)
        {
            return;
        }

        var nowUtc = timeProvider.GetUtcNow().UtcDateTime;
        var authorsByName = SeedWorks
            .SelectMany(seedWork => seedWork.AuthorNames)
            .Distinct()
            .ToDictionary(name => name, name => Author.Create(name, nowUtc));

        foreach (var seedWork in SeedWorks)
        {
            var authors = seedWork.AuthorNames.Select(name => authorsByName[name]).ToList();
            var work = Work.Create(seedWork.Title, seedWork.PublicationDate, authors, SeedUserName, nowUtc);
            dbContext.Works.Add(work);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private sealed record SeedWork(string Title, DateOnly PublicationDate, string[] AuthorNames);
}
