import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Button, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  return (
    <Stack spacing={1} sx={{ mb: { xs: 3, md: 4 } }}>
      {backTo && (
        <Button
          component={Link}
          to={backTo}
          variant="text"
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: 'flex-start', ml: -1 }}
        >
          Volver
        </Button>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-end' } }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h1">{title}</Typography>
          {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
        </Stack>
        {actions}
      </Stack>
    </Stack>
  );
}
