using FluentValidation.Results;
using Library.Api.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Library.Api.Controllers;

public abstract class LibraryControllerBase : ControllerBase
{
    /// <summary>
    /// Devuelve 400 con ProblemDetails y la lista de errores por campo.
    /// </summary>
    protected ActionResult ValidationFailed(ValidationResult validationResult)
    {
        // Diccionario nuevo: ModelState ya tiene claves del binding ("PageSize") y no respetaría el camelCase.
        var errors = new ModelStateDictionary();

        foreach (var (field, messages) in validationResult.Errors.ToErrorDictionary())
        {
            foreach (var message in messages)
            {
                errors.AddModelError(field, message);
            }
        }

        return ValidationProblem(
            detail: "One or more validation errors occurred.",
            title: "Validation failed",
            modelStateDictionary: errors);
    }
}
