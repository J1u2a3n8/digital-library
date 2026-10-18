# Etapa 1: compilar y publicar con el SDK
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source

# Primero solo los proyectos, para aprovechar la caché de Docker en el restore
COPY backend/global.json backend/Directory.Build.props ./
COPY backend/src/Library.Domain/Library.Domain.csproj src/Library.Domain/
COPY backend/src/Library.Infrastructure/Library.Infrastructure.csproj src/Library.Infrastructure/
COPY backend/src/Library.Api/Library.Api.csproj src/Library.Api/
RUN dotnet restore src/Library.Api/Library.Api.csproj

COPY backend/src/ src/
RUN dotnet publish src/Library.Api/Library.Api.csproj -c Release -o /app/publish --no-restore

# Etapa 2: imagen liviana solo con el runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# curl solo para el healthcheck de Docker
RUN apt-get update     && apt-get install -y --no-install-recommends curl     && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID

ENTRYPOINT ["dotnet", "Library.Api.dll"]
