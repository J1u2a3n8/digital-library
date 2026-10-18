using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Library.Infrastructure.Persistence;

public static class SqlServerErrors
{
    private const int UniqueIndexViolation = 2601;
    private const int UniqueConstraintViolation = 2627;

    /// <summary>
    /// True si el guardado falló porque un índice o constraint único ya tiene ese valor.
    /// </summary>
    public static bool IsUniqueViolation(DbUpdateException exception)
    {
        return exception.InnerException is SqlException sqlException
            && sqlException.Number is UniqueIndexViolation or UniqueConstraintViolation;
    }
}
