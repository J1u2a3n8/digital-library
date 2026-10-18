using FluentValidation;
using Library.Api.Contracts.Works;
using Library.Domain.Entities;

namespace Library.Api.Validation;

/// <summary>
/// Reglas comunes a crear y actualizar una obra.
/// </summary>
public class WorkContentValidator : AbstractValidator<IWorkContentRequest>
{
    public WorkContentValidator()
    {
        RuleFor(request => request.Title)
            .Must(title => !string.IsNullOrWhiteSpace(title))
            .WithMessage("El título es obligatorio.")
            .Must(title => title is null || title.Trim().Length <= WorkVersion.TitleMaxLength)
            .WithMessage($"El título no puede superar los {WorkVersion.TitleMaxLength} caracteres.");

        RuleFor(request => request.PublicationDate)
            .NotNull()
            .WithMessage("La fecha de publicación es obligatoria.");

        RuleFor(request => request.Authors)
            .NotNull()
            .WithMessage("Debe indicar al menos un autor.")
            .Must(authors => authors is null || authors.Count >= 1)
            .WithMessage("Debe indicar al menos un autor.")
            .Must(authors => authors is null || authors.Count <= WorkVersion.MaxAuthors)
            .WithMessage($"Una obra puede tener como máximo {WorkVersion.MaxAuthors} autores.");

        RuleForEach(request => request.Authors)
            .SetValidator(new AuthorInputValidator());
    }
}
