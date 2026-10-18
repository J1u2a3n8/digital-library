import { Avatar, Box, Chip } from '@mui/material';
import { getInitials } from '../../utils/text';

interface AuthorChipProps {
  name: string;
  isNew?: boolean;
  size?: 'small' | 'medium';
  onDelete?: () => void;
}

/** Autor como chip: iniciales en círculo, nombre y, si es nuevo, la marca "Nuevo". */
export function AuthorChip({ name, isNew = false, size = 'medium', onDelete }: AuthorChipProps) {
  return (
    <Chip
      size={size}
      avatar={
        <Avatar sx={{ bgcolor: 'secondary.main', color: '#fff !important', fontSize: 11, fontWeight: 600 }}>
          {getInitials(name)}
        </Avatar>
      }
      label={
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          {name}
          {isNew && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                borderRadius: 1,
                fontSize: 11,
                lineHeight: '18px',
                fontWeight: 600,
                color: 'warning.main',
                border: 1,
                borderColor: 'warning.main',
              }}
            >
              Nuevo
            </Box>
          )}
        </Box>
      }
      onDelete={onDelete}
      onClick={onDelete}
      aria-label={onDelete ? `Quitar ${name}` : undefined}
      sx={{ bgcolor: 'rgba(47, 107, 99, 0.10)', color: 'text.primary' }}
    />
  );
}
