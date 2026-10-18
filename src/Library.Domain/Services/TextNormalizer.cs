using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Library.Domain.Services;

/// <summary>
/// Genera una versión comparable de un texto: sin espacios extra, sin tildes y en minúsculas.
/// Se usa para detectar autores duplicados y para buscar títulos.
/// </summary>
public static partial class TextNormalizer
{
    public static string Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var decomposedText = CleanSpaces(text).Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposedText.Length);

        foreach (var character in decomposedText)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        return builder.ToString()
            .Normalize(NormalizationForm.FormC)
            .ToLowerInvariant();
    }

    /// <summary>
    /// Quita espacios al inicio y al final y reemplaza grupos de espacios por uno solo.
    /// Mantiene tildes y mayúsculas.
    /// </summary>
    public static string CleanSpaces(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        return MultipleSpaces().Replace(text.Trim(), " ");
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex MultipleSpaces();
}
