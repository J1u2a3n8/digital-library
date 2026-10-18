namespace Library.Domain.Exceptions;

/// <summary>
/// Se lanza cuando una entidad rompería una de sus reglas de negocio.
/// </summary>
public class DomainRuleException : Exception
{
    public DomainRuleException(string message)
        : base(message)
    {
    }
}
