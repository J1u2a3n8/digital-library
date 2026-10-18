using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace Library.Api.Validation;

/// <summary>
/// Respuesta 400 cuando el request no se puede leer (JSON mal formado, fecha inválida, enum desconocido).
/// Usa el mismo formato que los errores de FluentValidation.
/// </summary>
public static class InvalidModelStateResponse
{
    public const string InvalidValueMessage = "El valor enviado no tiene un formato válido.";

    // Nombres de los parámetros de las acciones: ASP.NET los agrega como error genérico cuando falla el JSON.
    private static readonly HashSet<string> ParameterNames = ["request", "filter", "query"];

    public static IActionResult Create(ActionContext context)
    {
        var errors = new Dictionary<string, string[]>();

        foreach (var (key, entry) in context.ModelState)
        {
            if (entry.Errors.Count == 0)
            {
                continue;
            }

            var field = ValidationErrorKeys.ToCamelCasePath(key.TrimStart('$', '.'));
            if (ParameterNames.Contains(field) && context.ModelState.ErrorCount > 1)
            {
                continue;
            }

            errors[field] = [InvalidValueMessage];
        }

        var factory = context.HttpContext.RequestServices.GetRequiredService<ProblemDetailsFactory>();
        var problemDetails = factory.CreateValidationProblemDetails(
            context.HttpContext,
            new Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary(),
            StatusCodes.Status400BadRequest,
            title: "Validation failed",
            detail: "One or more validation errors occurred.");

        problemDetails.Errors = errors;

        return new BadRequestObjectResult(problemDetails);
    }
}
