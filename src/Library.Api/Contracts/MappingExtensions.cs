using Library.Api.Contracts.Authors;
using Library.Api.Contracts.Works;
using Library.Domain.Entities;

namespace Library.Api.Contracts;

/// <summary>
/// Mapeo manual de entidades a respuestas. Las consultas de lectura proyectan directo con LINQ.
/// </summary>
public static class MappingExtensions
{
    public static AuthorResponse ToResponse(this Author author)
    {
        return new AuthorResponse { Id = author.Id, FullName = author.FullName };
    }

    public static WorkDetailsResponse ToDetailsResponse(this Work work, WorkVersion version)
    {
        var authors = version.Authors
            .Select(versionAuthor => new AuthorResponse
            {
                Id = versionAuthor.AuthorId,
                FullName = versionAuthor.Author.FullName,
            })
            .OrderBy(author => author.FullName)
            .ToList();

        return new WorkDetailsResponse
        {
            Id = work.Id,
            Title = version.Title,
            PublicationDate = version.PublicationDate,
            Authors = authors,
            AuthorCount = authors.Count,
            VersionNumber = version.VersionNumber,
            RowVersion = Convert.ToBase64String(work.RowVersion),
        };
    }
}
