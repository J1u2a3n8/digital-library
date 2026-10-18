using FluentValidation;
using Library.Api.Contracts.Authors;
using Library.Domain.Entities;
using Library.Domain.Services;

namespace Library.Api.Validation;

public class AuthorInputValidator : AbstractValidator<AuthorInput>
{
    public AuthorInputValidator()
    {
        RuleFor(author => author)
            .Must(HaveExactlyIdOrName)
            .WithName("author")
            .WithMessage("Cada autor debe tener un id o un nombre, pero no ambos.");

        When(author => author.Id is not null, () =>
        {
            RuleFor(author => author.Id)
                .GreaterThan(0)
                .WithMessage("El id del autor debe ser mayor que 0.");
        });

        When(author => author.Id is null && author.Name is not null, () =>
        {
            RuleFor(author => author.Name)
                .Must(HaveValidLength)
                .WithMessage(
                    $"El nombre del autor debe tener entre {Author.FullNameMinLength} y {Author.FullNameMaxLength} caracteres.");
        });
    }

    private static bool HaveExactlyIdOrName(AuthorInput author)
    {
        var hasId = author.Id is not null;
        var hasName = !string.IsNullOrWhiteSpace(author.Name);

        return hasId != hasName;
    }

    private static bool HaveValidLength(string? name)
    {
        var length = TextNormalizer.CleanSpaces(name).Length;

        return length >= Author.FullNameMinLength && length <= Author.FullNameMaxLength;
    }
}
