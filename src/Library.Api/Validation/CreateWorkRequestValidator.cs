using FluentValidation;
using Library.Api.Contracts.Works;

namespace Library.Api.Validation;

public class CreateWorkRequestValidator : AbstractValidator<CreateWorkRequest>
{
    public CreateWorkRequestValidator()
    {
        Include(new WorkContentValidator());
    }
}
