import { Card, CardContent, Stack, Typography } from '@mui/material';
import type { WorkListItem } from '../../../api/types';
import { formatPublicationDate } from '../../../utils/dates';
import { pluralize } from '../../../utils/text';
import { WorkRowActions } from './WorkRowActions';

interface WorkCardsProps {
  works: WorkListItem[];
  onShowHistory: (work: WorkListItem) => void;
}

/** Versión mobile del listado: una card por obra. */
export function WorkCards({ works, onShowHistory }: WorkCardsProps) {
  return (
    <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }} aria-label="Listado de obras">
      {works.map((work) => (
        <Card component="li" key={work.id}>
          <CardContent sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', '&:last-child': { pb: 2 } }}>
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="h3" sx={{ fontWeight: 600 }}>
                {work.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatPublicationDate(work.publicationDate)} ·{' '}
                {pluralize(work.authorCount, 'autor', 'autores')}
              </Typography>
            </Stack>
            <WorkRowActions work={work} onShowHistory={onShowHistory} />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
