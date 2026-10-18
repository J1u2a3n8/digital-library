using FluentValidation;
using Library.Api.Contracts.Works;

namespace Library.Api.Validation;

public class WorkFilterValidator : AbstractValidator<WorkFilter>
{
    public WorkFilterValidator()
    {
        RuleFor(filter => filter.PageNumber)
            .GreaterThanOrEqualTo(1)
            .WithMessage("El número de página debe ser 1 o mayor.");

        RuleFor(filter => filter.PageSize)
            .InclusiveBetween(1, WorkFilter.MaxPageSize)
            .WithMessage($"El tamaño de página debe estar entre 1 y {WorkFilter.MaxPageSize}.");

        RuleFor(filter => filter.MinimumAuthorCount)
            .GreaterThanOrEqualTo(1)
            .When(filter => filter.MinimumAuthorCount is not null)
            .WithMessage("La cantidad mínima de autores debe ser 1 o mayor.");

        RuleFor(filter => filter.Title)
            .MaximumLength(300)
            .WithMessage("El texto del título no puede superar los 300 caracteres.");

        RuleFor(filter => filter.AuthorName)
            .MaximumLength(200)
            .WithMessage("El texto del autor no puede superar los 200 caracteres.");
    }
}
