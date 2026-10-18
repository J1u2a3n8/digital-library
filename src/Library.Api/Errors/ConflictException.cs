namespace Library.Api.Errors;

/// <summary>
/// El cambio choca con el estado actual de los datos. Se responde con 409.
/// </summary>
public class ConflictException : Exception
{
    public ConflictException(string message)
        : base(message)
    {
    }
}
