using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentValidation;
using Library.Api.Middleware;
using Library.Api.Services;
using Library.Api.Validation;
using Library.Infrastructure;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

var connectionString = configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Falta la connection string 'DefaultConnection'. Definila con la variable ConnectionStrings__DefaultConnection.");
}

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)))
    .ConfigureApiBehaviorOptions(options =>
        options.InvalidModelStateResponseFactory = InvalidModelStateResponse.Create);

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddValidatorsFromAssemblyContaining<CreateWorkRequestValidator>();

builder.Services.AddInfrastructure(connectionString);
builder.Services.AddScoped<AuthorService>();
builder.Services.AddScoped<WorkService>();

var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Biblioteca Digital API",
        Version = "v1",
        Description =
            "API para gestionar obras literarias de una biblioteca digital.\n\n"
            + "- **Obras**: alta con autores existentes o nuevos, edición con versionado inmutable e historial.\n"
            + "- **Listado**: filtros acumulativos (AND), orden por título, fecha o cantidad de autores, paginación en el servidor.\n"
            + "- **Concurrencia**: el `rowVersion` del GET se reenvía en el PUT; si otra persona editó antes, responde 409.\n"
            + "- **Fechas**: `YYYY-MM-DD`, sin horas ni zonas horarias.\n"
            + "- **Errores**: formato ProblemDetails (RFC 9457).\n\n"
            + "El header `X-Actor` es solo para auditoría de demo (quién generó cada versión). **No es autenticación.**",
    });

    options.EnableAnnotations();

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));
});

var app = builder.Build();

app.UseExceptionHandler();

var swaggerEnabled = app.Environment.IsDevelopment() || configuration.GetValue<bool>("Swagger:Enabled");
if (swaggerEnabled)
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Biblioteca Digital API v1");
        options.RoutePrefix = "swagger";
        options.DocumentTitle = "Biblioteca Digital API";
    });
}

app.UseCors();
app.MapControllers();

var applyMigrations = configuration.GetValue<bool>("ApplyMigrations");
var seedData = configuration.GetValue<bool>("SeedData:Enabled");
await app.Services.InitializeDatabaseAsync(applyMigrations, seedData);

await app.RunAsync();

/// <summary>
/// Punto de entrada. Es public para que las pruebas de integración usen WebApplicationFactory.
/// </summary>
public partial class Program
{
}
