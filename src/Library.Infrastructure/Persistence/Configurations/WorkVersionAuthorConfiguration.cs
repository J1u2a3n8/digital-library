using Library.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Library.Infrastructure.Persistence.Configurations;

public class WorkVersionAuthorConfiguration : IEntityTypeConfiguration<WorkVersionAuthor>
{
    public void Configure(EntityTypeBuilder<WorkVersionAuthor> builder)
    {
        builder.ToTable("WorkVersionAuthors");

        builder.HasKey(versionAuthor => new { versionAuthor.WorkVersionId, versionAuthor.AuthorId });

        builder.Property(versionAuthor => versionAuthor.AuthorNameSnapshot)
            .HasMaxLength(Author.FullNameMaxLength)
            .IsRequired();

        // Lo usa el filtro por autor: del autor a las versiones donde aparece.
        builder.HasIndex(versionAuthor => new { versionAuthor.AuthorId, versionAuthor.WorkVersionId })
            .HasDatabaseName("IX_WorkVersionAuthors_AuthorId_WorkVersionId");

        builder.HasOne(versionAuthor => versionAuthor.Author)
            .WithMany()
            .HasForeignKey(versionAuthor => versionAuthor.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
