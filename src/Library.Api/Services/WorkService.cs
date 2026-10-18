using Library.Api.Contracts;
using Library.Api.Contracts.Authors;
using Library.Api.Contracts.Works;
using Library.Api.Errors;
using Library.Domain.Entities;
using Library.Domain.Services;
using Library.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Library.Api.Services;

public class WorkService
{
    private readonly LibraryDbContext dbContext;
    private readonly AuthorService authorService;
    private readonly TimeProvider timeProvider;

    public WorkService(LibraryDbContext dbContext, AuthorService authorService, TimeProvider timeProvider)
    {
        this.dbContext = dbContext;
        this.authorService = authorService;
        this.timeProvider = timeProvider;
    }

    /// <summary>
    /// Lista las versiones vigentes aplicando filtros (AND), orden y paginación en SQL Server.
    /// </summary>
    public async Task<PagedResponse<WorkListItemResponse>> GetWorksAsync(
        WorkFilter filter,
        CancellationToken cancellationToken)
    {
        var query = dbContext.WorkVersions
            .AsNoTracking()
            .Where(version => version.IsCurrent);

        // Cada filtro presente agrega una condición; ninguno reemplaza a otro.
        var normalizedTitle = TextNormalizer.Normalize(filter.Title);
        if (normalizedTitle.Length > 0)
        {
            query = query.Where(version => version.NormalizedTitle.Contains(normalizedTitle));
        }

        var normalizedAuthorName = TextNormalizer.Normalize(filter.AuthorName);
        if (normalizedAuthorName.Length > 0)
        {
            query = query.Where(version => version.Authors
                .Any(versionAuthor => versionAuthor.Author.NormalizedName.Contains(normalizedAuthorName)));
        }

        if (filter.PublicationDate is DateOnly publicationDate)
        {
            query = query.Where(version => version.PublicationDate == publicationDate);
        }

        if (filter.MinimumAuthorCount is int minimumAuthorCount)
        {
            query = query.Where(version => version.Authors.Count() >= minimumAuthorCount);
        }

        var totalItems = await query.CountAsync(cancellationToken);

        var items = await ApplySort(query, filter.SortBy, filter.SortDirection)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(version => new WorkListItemResponse
            {
                Id = version.WorkId,
                Title = version.Title,
                PublicationDate = version.PublicationDate,
                AuthorCount = version.Authors.Count(),
            })
            .ToListAsync(cancellationToken);

        return new PagedResponse<WorkListItemResponse>
        {
            Items = items,
            PageNumber = filter.PageNumber,
            PageSize = filter.PageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling(totalItems / (double)filter.PageSize),
        };
    }

    public async Task<WorkDetailsResponse> GetWorkByIdAsync(int id, CancellationToken cancellationToken)
    {
        var work = await dbContext.WorkVersions
            .AsNoTracking()
            .Where(version => version.WorkId == id && version.IsCurrent)
            .Select(version => new
            {
                version.WorkId,
                version.Title,
                version.PublicationDate,
                version.VersionNumber,
                version.Work.RowVersion,
                Authors = version.Authors
                    .OrderBy(versionAuthor => versionAuthor.Author.FullName)
                    .Select(versionAuthor => new AuthorResponse
                    {
                        Id = versionAuthor.AuthorId,
                        FullName = versionAuthor.Author.FullName,
                    })
                    .ToList(),
            })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw WorkNotFound(id);

        return new WorkDetailsResponse
        {
            Id = work.WorkId,
            Title = work.Title,
            PublicationDate = work.PublicationDate,
            Authors = work.Authors,
            AuthorCount = work.Authors.Count,
            VersionNumber = work.VersionNumber,
            RowVersion = Convert.ToBase64String(work.RowVersion),
        };
    }

    /// <summary>
    /// Crea la obra, sus autores nuevos y la versión 1 en una sola transacción.
    /// </summary>
    public async Task<WorkDetailsResponse> CreateWorkAsync(
        CreateWorkRequest request,
        string changedByUserName,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var authors = await authorService.GetOrCreateAuthorsAsync(request.Authors!.ToList(), cancellationToken);
        var nowUtc = GetUtcNow();

        var work = Work.Create(request.Title!, request.PublicationDate!.Value, authors, changedByUserName, nowUtc);
        dbContext.Works.Add(work);

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return work.ToDetailsResponse(work.Versions.Single());
    }

    /// <summary>
    /// Crea la versión N+1 si algo cambió. Las versiones anteriores no se modifican.
    /// </summary>
    public async Task<WorkDetailsResponse> UpdateWorkAsync(
        int id,
        UpdateWorkRequest request,
        string changedByUserName,
        CancellationToken cancellationToken)
    {
        var expectedRowVersion = Convert.FromBase64String(request.RowVersion!);

        var work = await dbContext.Works.SingleOrDefaultAsync(work => work.Id == id, cancellationToken)
            ?? throw WorkNotFound(id);

        var currentVersion = await dbContext.WorkVersions
            .Include(version => version.Authors)
            .ThenInclude(versionAuthor => versionAuthor.Author)
            .SingleAsync(version => version.WorkId == id && version.IsCurrent, cancellationToken);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var authors = await authorService.GetOrCreateAuthorsAsync(request.Authors!.ToList(), cancellationToken);
        var authorIds = authors.Select(author => author.Id);

        if (currentVersion.HasSameContent(request.Title!, request.PublicationDate!.Value, authorIds))
        {
            // Sin cambios: no se crea una versión nueva.
            return work.ToDetailsResponse(currentVersion);
        }

        var nowUtc = GetUtcNow();

        // Paso 1: la versión vigente pasa a histórica y se valida el rowVersion del cliente.
        // Este primer guardado libera el índice único filtrado de versión vigente.
        currentVersion.MarkAsHistorical();
        work.MarkAsUpdated(nowUtc);
        dbContext.Entry(work).Property(entity => entity.RowVersion).OriginalValue = expectedRowVersion;
        await dbContext.SaveChangesAsync(cancellationToken);

        // Paso 2: se inserta la versión N+1 con sus autores y el snapshot de sus nombres.
        var newVersion = work.CreateNextVersion(
            currentVersion,
            request.Title!,
            request.PublicationDate.Value,
            authors,
            changedByUserName,
            nowUtc);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (SqlServerErrors.IsUniqueViolation(exception))
        {
            throw new ConflictException("La obra fue modificada por otro usuario. Recargá los datos e intentá de nuevo.");
        }

        await transaction.CommitAsync(cancellationToken);

        return work.ToDetailsResponse(newVersion);
    }

    /// <summary>
    /// Todas las versiones de la obra, de la más nueva a la más antigua.
    /// </summary>
    public async Task<IReadOnlyList<WorkHistoryItemResponse>> GetHistoryAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var workExists = await dbContext.Works.AnyAsync(work => work.Id == id, cancellationToken);
        if (!workExists)
        {
            throw WorkNotFound(id);
        }

        return await dbContext.WorkVersions
            .AsNoTracking()
            .Where(version => version.WorkId == id)
            .OrderByDescending(version => version.VersionNumber)
            .Select(version => new WorkHistoryItemResponse
            {
                VersionNumber = version.VersionNumber,
                Title = version.Title,
                PublicationDate = version.PublicationDate,
                Authors = version.Authors
                    .OrderBy(versionAuthor => versionAuthor.AuthorNameSnapshot)
                    .Select(versionAuthor => new AuthorResponse
                    {
                        Id = versionAuthor.AuthorId,
                        FullName = versionAuthor.AuthorNameSnapshot,
                    })
                    .ToList(),
                CreatedAtUtc = version.CreatedAtUtc,
                ChangedBy = version.ChangedBy,
                ChangeKind = version.ChangeKind.ToString(),
                IsCurrent = version.IsCurrent,
            })
            .ToListAsync(cancellationToken);
    }

    private static IQueryable<WorkVersion> ApplySort(
        IQueryable<WorkVersion> query,
        WorkSortBy sortBy,
        SortDirection sortDirection)
    {
        var isAscending = sortDirection == SortDirection.Asc;

        var sortedQuery = sortBy switch
        {
            WorkSortBy.PublicationDate => isAscending
                ? query.OrderBy(version => version.PublicationDate)
                : query.OrderByDescending(version => version.PublicationDate),
            WorkSortBy.AuthorCount => isAscending
                ? query.OrderBy(version => version.Authors.Count())
                : query.OrderByDescending(version => version.Authors.Count()),
            _ => isAscending
                ? query.OrderBy(version => version.NormalizedTitle)
                : query.OrderByDescending(version => version.NormalizedTitle),
        };

        // Desempate estable: sin esto, dos páginas podrían repetir u omitir filas.
        return sortedQuery.ThenBy(version => version.WorkId);
    }

    private DateTime GetUtcNow() => timeProvider.GetUtcNow().UtcDateTime;

    private static NotFoundException WorkNotFound(int id) => new($"No existe una obra con id {id}.");
}
