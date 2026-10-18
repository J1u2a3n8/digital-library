using Library.Api.Contracts.Authors;
using Library.Domain.Services;

namespace Library.Api.Services;

/// <summary>
/// Quita autores repetidos dentro de un mismo request, antes de ir a la base.
/// </summary>
public static class AuthorInputDeduplicator
{
    /// <summary>
    /// Mantiene la primera aparición de cada autor. Dos entradas son el mismo autor
    /// si tienen el mismo id o si sus nombres normalizados son iguales.
    /// </summary>
    public static IReadOnlyList<AuthorInput> Deduplicate(IEnumerable<AuthorInput> inputs)
    {
        var seenIds = new HashSet<int>();
        var seenNames = new HashSet<string>();
        var result = new List<AuthorInput>();

        foreach (var input in inputs)
        {
            if (input.Id is int id)
            {
                if (seenIds.Add(id))
                {
                    result.Add(input);
                }

                continue;
            }

            var normalizedName = TextNormalizer.Normalize(input.Name);
            if (normalizedName.Length > 0 && seenNames.Add(normalizedName))
            {
                result.Add(input with { Name = TextNormalizer.CleanSpaces(input.Name) });
            }
        }

        return result;
    }
}
