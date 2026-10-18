using Library.Infrastructure.Persistence;
using Library.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Library.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<LibraryDbContext>(options =>
            options.UseSqlServer(
                connectionString,
                sqlOptions => sqlOptions.MigrationsAssembly(typeof(LibraryDbContext).Assembly.FullName)));

        services.AddSingleton(TimeProvider.System);
        services.AddScoped<DataSeeder>();

        return services;
    }

    /// <summary>
    /// Aplica migraciones pendientes y/o inserta datos de demo, según los flags.
    /// En producción las migraciones deberían correr como un paso separado del despliegue.
    /// </summary>
    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        bool applyMigrations,
        bool seedData,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();

        if (applyMigrations)
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<LibraryDbContext>();
            await dbContext.Database.MigrateAsync(cancellationToken);
        }

        if (seedData)
        {
            var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
            await seeder.SeedAsync(cancellationToken);
        }
    }
}
