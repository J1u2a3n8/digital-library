using Library.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Library.Infrastructure.Persistence.Configurations;

public class AuthorConfiguration : IEntityTypeConfiguration<Author>
{
    public void Configure(EntityTypeBuilder<Author> builder)
    {
        builder.ToTable("Authors");

        builder.HasKey(author => author.Id);

        builder.Property(author => author.FullName)
            .HasMaxLength(Author.FullNameMaxLength)
            .IsRequired();

        builder.Property(author => author.NormalizedName)
            .HasMaxLength(Author.FullNameMaxLength)
            .IsRequired();

        builder.Property(author => author.CreatedAtUtc)
            .HasColumnType("datetime2")
            .IsRequired();

        builder.Property(author => author.RowVersion)
            .IsRowVersion();

        // Un autor por nombre normalizado: evita duplicados, incluso con requests concurrentes.
        builder.HasIndex(author => author.NormalizedName)
            .IsUnique()
            .HasDatabaseName("UX_Authors_NormalizedName");
    }
}
