using Library.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Library.Infrastructure.Persistence.Configurations;

public class WorkConfiguration : IEntityTypeConfiguration<Work>
{
    public void Configure(EntityTypeBuilder<Work> builder)
    {
        builder.ToTable("Works");

        builder.HasKey(work => work.Id);

        builder.Property(work => work.CreatedAtUtc)
            .HasColumnType("datetime2")
            .IsRequired();

        builder.Property(work => work.UpdatedAtUtc)
            .HasColumnType("datetime2")
            .IsRequired();

        // Concurrencia optimista: SQL Server cambia este valor en cada update de la fila.
        builder.Property(work => work.RowVersion)
            .IsRowVersion();

        builder.HasMany(work => work.Versions)
            .WithOne(version => version.Work)
            .HasForeignKey(version => version.WorkId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Navigation(work => work.Versions)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
