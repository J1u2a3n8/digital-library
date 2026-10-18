namespace Library.Api.Controllers;

/// <summary>
/// Lee el header X-Actor, que indica quién genera una versión (solo auditoría de demo).
/// No es autenticación: en producción el nombre saldría del usuario autenticado
/// (User.Identity.Name o un claim del token).
/// </summary>
public static class ActorHeader
{
    public const string HeaderName = "X-Actor";
    public const string AnonymousUserName = "anonymous";
    public const int MaxLength = 100;

    public static string GetChangedByUserName(string? headerValue)
    {
        if (string.IsNullOrWhiteSpace(headerValue))
        {
            return AnonymousUserName;
        }

        // Los headers HTTP solo admiten ASCII: un nombre con tildes ("María") llega URL-encoded ("Mar%C3%ADa").
        var changedByUserName = Uri.UnescapeDataString(headerValue).Trim();

        if (changedByUserName.Length == 0)
        {
            return AnonymousUserName;
        }

        if (changedByUserName.Length > MaxLength)
        {
            changedByUserName = changedByUserName[..MaxLength];
        }

        return changedByUserName;
    }
}
