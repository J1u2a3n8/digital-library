using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Library.Infrastructure.Persistence;

/// <summary>
/// SQL Server no guarda el tipo de fecha (Kind). Esta conversión marca las fechas leídas como UTC,
/// así la API las devuelve con "Z" al final.
/// </summary>
public class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter()
        : base(
            value => value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime(),
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc))
    {
    }
}
