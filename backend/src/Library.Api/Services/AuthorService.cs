using FluentValidation;
using FluentValidation.Results;
using Library.Api.Contracts.Authors;
using Library.Domain.Entities;
using Library.Domain.Services;
using Library.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Library.Api.Services;

public class AuthorService
{
    private readonly LibraryDbContext dbContext;
    private readonly TimeProvider timeProvider;

    public AuthorService(LibraryDbContext dbContext, TimeProvider timeProvider)
    {
        this.dbContext = dbContext;
        this.timeProvider = timeProvider;
    }

    /// <summary>
    /// Busca autores cuyo nombre contenga el texto. La coincidencia exacta aparece primero.
    /// </summary>
    public async Task<IReadOnlyList<AuthorResponse>> SearchAuthorsAsync(
        string? search,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var normalizedSearch = TextNormalizer.Normalize(search);
        var query = dbContext.Authors.AsNoTracking();

        if (normalizedSearch.Length > 0)
        {
            query = query.Where(author => author.NormalizedName.Contains(normalizedSearch));
        }

        return await query
            .OrderBy(author => author.NormalizedName == normalizedSearch ? 0 : 1)
            .ThenBy(author => author.NormalizedName)
            .ThenBy(author => author.Id)
            .Take(pageSize)
            .Select(author => new AuthorResponse { Id = author.Id, FullName = author.FullName })
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Convierte los autores del request en entidades: reutiliza los existentes y crea los nuevos.
    /// Devuelve cada autor una sola vez. Debe llamarse dentro de la transacción de la obra.
    /// </summary>
    public async Task<IReadOnlyList<Author>> GetOrCreateAuthorsAsync(
        IReadOnlyCollection<AuthorInput> inputs,
        CancellationToken cancellationToken)
    {
        var uniqueInputs = AuthorInputDeduplicator.Deduplicate(inputs);

        var requestedIds = uniqueInputs
            .Where(input => input.Id is not null)
            .Select(input => input.Id!.Value)
            .ToList();

        var requestedNames = uniqueInputs
            .Where(input => input.Id is null)
            .Select(input => TextNormalizer.Normalize(input.Name))
            .ToList();

        // Dos consultas en total, sin importar cuántos autores vengan (sin N+1).
        var authorsById = await dbContext.Authors
            .Where(author => requestedIds.Contains(author.Id))
            .ToDictionaryAsync(author => author.Id, cancellationToken);

        var authorsByName = await dbContext.Authors
            .Where(author => requestedNames.Contains(author.NormalizedName))
            .ToDictionaryAsync(author => author.NormalizedName, cancellationToken);

        ThrowIfAnyIdIsMissing(requestedIds, authorsById);

        var result = new List<Author>();

        foreach (var input in uniqueInputs)
        {
            Author author;

            if (input.Id is int id)
            {
                author = authorsById[id];
            }
            else
            {
                var normalizedName = TextNormalizer.Normalize(input.Name);
                if (!authorsByName.TryGetValue(normalizedName, out author!))
                {
                    author = await InsertOrGetExistingAsync(input.Name!, cancellationToken);
                    authorsByName[normalizedName] = author;
                }
            }

            // Un mismo autor puede llegar por id y por nombre: se agrega una sola vez.
            if (!result.Contains(author))
            {
                result.Add(author);
            }
        }

        return result;
    }

    /// <summary>
    /// Devuelve un autor por id, o por nombre normalizado creándolo si no existe.
    /// </summary>
    public async Task<Author> GetOrCreateAuthorAsync(AuthorInput input, CancellationToken cancellationToken)
    {
        var authors = await GetOrCreateAuthorsAsync([input], cancellationToken);
        return authors[0];
    }

    /// <summary>
    /// Inserta el autor. Si otro request lo insertó antes (violación del índice único),
    /// descarta el intento y devuelve el autor que ya existe.
    /// </summary>
    internal async Task<Author> InsertOrGetExistingAsync(string fullName, CancellationToken cancellationToken)
    {
        var newAuthor = Author.Create(fullName, timeProvider.GetUtcNow().UtcDateTime);
        dbContext.Authors.Add(newAuthor);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return newAuthor;
        }
        catch (DbUpdateException exception) when (SqlServerErrors.IsUniqueViolation(exception))
        {
            dbContext.Entry(newAuthor).State = EntityState.Detached;

            return await dbContext.Authors
                .SingleAsync(author => author.NormalizedName == newAuthor.NormalizedName, cancellationToken);
        }
    }

    private static void ThrowIfAnyIdIsMissing(List<int> requestedIds, Dictionary<int, Author> authorsById)
    {
        var missingIds = requestedIds.Where(id => !authorsById.ContainsKey(id)).ToList();

        if (missingIds.Count == 0)
        {
            return;
        }

        var failures = missingIds
            .Select(id => new ValidationFailure("Authors", $"No existe un autor con id {id}."));

        throw new ValidationException(failures);
    }
}
