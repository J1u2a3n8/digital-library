using Library.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Library.Infrastructure.Persistence.Configurations;

public class WorkVersionConfiguration : IEntityTypeConfiguration<WorkVersion>
{
    public void Configure(EntityTypeBuilder<WorkVersion> builder)
    {
        builder.ToTable("WorkVersions");

        builder.HasKey(version => version.Id);

        builder.Property(version => version.Title)
            .HasMaxLength(WorkVersion.TitleMaxLength)
            .IsRequired();

        builder.Property(version => version.NormalizedTitle)
            .HasMaxLength(WorkVersion.TitleMaxLength)
            .IsRequired();

        builder.Property(version => version.PublicationDate)
            .HasColumnType("date")
            .IsRequired();

        builder.Property(version => version.CreatedAtUtc)
            .HasColumnType("datetime2")
            .IsRequired();

        builder.Property(version => version.ChangedBy)
            .HasMaxLength(WorkVersion.ChangedByMaxLength)
            .IsRequired();

        builder.Property(version => version.ChangeKind)
            .HasColumnType("tinyint")
            .IsRequired();

        builder.HasIndex(version => new { version.WorkId, version.VersionNumber })
            .IsUnique()
            .HasDatabaseName("UX_WorkVersions_WorkId_VersionNumber");

        // Una sola versión vigente por obra. Por esto la actualización guarda dos veces.
        builder.HasIndex(version => version.WorkId)
            .IsUnique()
            .HasFilter("[IsCurrent] = 1")
            .HasDatabaseName("UX_WorkVersions_Current");

        builder.HasIndex(version => version.NormalizedTitle)
            .HasFilter("[IsCurrent] = 1")
            .HasDatabaseName("IX_WorkVersions_Current_Title");

        builder.HasIndex(version => version.PublicationDate)
            .HasFilter("[IsCurrent] = 1")
            .HasDatabaseName("IX_WorkVersions_Current_PublicationDate");

        builder.HasMany(version => version.Authors)
            .WithOne(versionAuthor => versionAuthor.WorkVersion)
            .HasForeignKey(versionAuthor => versionAuthor.WorkVersionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(version => version.Authors)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
