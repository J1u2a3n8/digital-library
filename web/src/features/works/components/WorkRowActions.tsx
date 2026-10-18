import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/History';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { Link } from 'react-router';
import type { WorkListItem } from '../../../api/types';

interface WorkRowActionsProps {
  work: WorkListItem;
  onShowHistory: (work: WorkListItem) => void;
}

export function WorkRowActions({ work, onShowHistory }: WorkRowActionsProps) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
      <Tooltip title="Editar">
        <IconButton
          component={Link}
          to={`/works/${work.id}/edit`}
          aria-label={`Editar ${work.title}`}
          color="primary"
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Historial">
        <IconButton
          onClick={() => onShowHistory(work)}
          aria-label={`Ver historial de ${work.title}`}
          color="secondary"
        >
          <HistoryIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
