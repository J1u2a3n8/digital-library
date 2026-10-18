using FluentValidation.Results;

namespace Library.Api.Validation;

public static class ValidationErrorKeys
{
    /// <summary>
    /// Agrupa los errores por propiedad, con nombres en camelCase como en el JSON
    /// (por ejemplo "Authors[0].Name" pasa a "authors[0].name").
    /// </summary>
    public static Dictionary<string, string[]> ToErrorDictionary(this IEnumerable<ValidationFailure> failures)
    {
        return failures
            .GroupBy(failure => ToCamelCasePath(failure.PropertyName))
            .ToDictionary(
                group => group.Key,
                group => group.Select(failure => failure.ErrorMessage).Distinct().ToArray());
    }

    public static string ToCamelCasePath(string propertyPath)
    {
        if (string.IsNullOrEmpty(propertyPath))
        {
            return string.Empty;
        }

        var parts = propertyPath
            .Split('.')
            .Select(part => part.Length == 0 ? part : char.ToLowerInvariant(part[0]) + part[1..]);

        return string.Join('.', parts);
    }
}
