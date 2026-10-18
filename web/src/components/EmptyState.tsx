import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 6, px: 2 }}>
      <Stack
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'rgba(123, 45, 53, 0.08)',
          color: 'primary.main',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden
      >
        {icon ?? <AutoStoriesOutlinedIcon />}
      </Stack>
      <Typography variant="h3" component="p">
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
      {action}
    </Stack>
  );
}
