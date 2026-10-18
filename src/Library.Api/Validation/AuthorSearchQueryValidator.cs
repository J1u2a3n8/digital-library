using FluentValidation;
using Library.Api.Contracts.Authors;

namespace Library.Api.Validation;

public class AuthorSearchQueryValidator : AbstractValidator<AuthorSearchQuery>
{
    public AuthorSearchQueryValidator()
    {
        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, AuthorSearchQuery.MaxPageSize)
            .WithMessage($"El tamaño de página debe estar entre 1 y {AuthorSearchQuery.MaxPageSize}.");

        RuleFor(query => query.Search)
            .MaximumLength(200)
            .WithMessage("El texto de búsqueda no puede superar los 200 caracteres.");
    }
}
