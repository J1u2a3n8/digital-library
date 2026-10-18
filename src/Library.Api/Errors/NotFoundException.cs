namespace Library.Api.Errors;

/// <summary>
/// El recurso pedido no existe. Se responde con 404.
/// </summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message)
        : base(message)
    {
    }
}
