using FluentValidation;
using Library.Api.Contracts.Works;

namespace Library.Api.Validation;

public class UpdateWorkRequestValidator : AbstractValidator<UpdateWorkRequest>
{
    // Un rowversion de SQL Server siempre ocupa 8 bytes.
    private const int RowVersionLength = 8;

    public UpdateWorkRequestValidator()
    {
        Include(new WorkContentValidator());

        RuleFor(request => request.RowVersion)
            .NotEmpty()
            .WithMessage("El rowVersion es obligatorio.")
            .Must(BeValidRowVersion)
            .When(request => !string.IsNullOrEmpty(request.RowVersion))
            .WithMessage("El rowVersion no es un valor Base64 válido.");
    }

    public static bool BeValidRowVersion(string? rowVersion)
    {
        if (string.IsNullOrWhiteSpace(rowVersion))
        {
            return false;
        }

        var buffer = new byte[rowVersion.Length];

        return Convert.TryFromBase64String(rowVersion, buffer, out var bytesWritten)
            && bytesWritten == RowVersionLength;
    }
}
