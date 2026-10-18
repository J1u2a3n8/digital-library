using FluentValidation;
using FluentValidation.Results;
using Library.Api.Errors;
using Library.Api.Middleware;
using Library.Domain.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Library.UnitTests.Api;

public class GlobalExceptionHandlerTests
{
    [Fact]
    public void ValidationException_Returns400WithCamelCaseErrors()
    {
        var exception = new ValidationException([new ValidationFailure("Authors", "No existe un autor con id 9.")]);

        var problem = Assert.IsType<HttpValidationProblemDetails>(GlobalExceptionHandler.CreateProblemDetails(exception));

        Assert.Equal(400, problem.Status);
        Assert.Equal(["No existe un autor con id 9."], problem.Errors["authors"]);
    }

    [Fact]
    public void DomainRuleException_Returns400()
    {
        var problem = GlobalExceptionHandler.CreateProblemDetails(new DomainRuleException("regla"));

        Assert.Equal(400, problem.Status);
        Assert.Equal("regla", problem.Detail);
    }

    [Fact]
    public void NotFoundException_Returns404()
    {
        var problem = GlobalExceptionHandler.CreateProblemDetails(new NotFoundException("No existe"));

        Assert.Equal(404, problem.Status);
    }

    [Fact]
    public void ConflictException_Returns409()
    {
        var problem = GlobalExceptionHandler.CreateProblemDetails(new ConflictException("Conflicto"));

        Assert.Equal(409, problem.Status);
    }

    [Fact]
    public void DbUpdateConcurrencyException_Returns409WithClearMessage()
    {
        var problem = GlobalExceptionHandler.CreateProblemDetails(new DbUpdateConcurrencyException());

        Assert.Equal(409, problem.Status);
        Assert.Equal(GlobalExceptionHandler.ConcurrencyMessage, problem.Detail);
    }

    [Fact]
    public void UnexpectedException_Returns500WithoutInternalDetails()
    {
        var problem = GlobalExceptionHandler.CreateProblemDetails(new InvalidOperationException("connection string secret"));

        Assert.Equal(500, problem.Status);
        Assert.DoesNotContain("secret", problem.Detail);
    }

    [Fact]
    public async Task TryHandleAsync_WritesStatusCodeAndProblemDetails()
    {
        var problemDetailsService = new FakeProblemDetailsService();
        var handler = new GlobalExceptionHandler(problemDetailsService, NullLogger<GlobalExceptionHandler>.Instance);
        var httpContext = new DefaultHttpContext();

        var handled = await handler.TryHandleAsync(httpContext, new Exception("boom"), CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(500, httpContext.Response.StatusCode);
        Assert.Equal(500, problemDetailsService.WrittenProblem?.Status);
    }

    private sealed class FakeProblemDetailsService : IProblemDetailsService
    {
        public ProblemDetails? WrittenProblem { get; private set; }

        public ValueTask WriteAsync(ProblemDetailsContext context)
        {
            WrittenProblem = context.ProblemDetails;
            return ValueTask.CompletedTask;
        }

        public ValueTask<bool> TryWriteAsync(ProblemDetailsContext context)
        {
            WrittenProblem = context.ProblemDetails;
            return ValueTask.FromResult(true);
        }
    }
}
