import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { visuallyHidden } from '../../../theme/visuallyHidden';
import type { SortBy, WorkListItem, WorkQuery } from '../../../api/types';
import { formatPublicationDate } from '../../../utils/dates';
import { WorkRowActions } from './WorkRowActions';

interface WorksTableProps {
  works: WorkListItem[];
  query: WorkQuery;
  onSort: (sortBy: SortBy) => void;
  onShowHistory: (work: WorkListItem) => void;
}

const sortableColumns: { sortBy: SortBy; label: string; align: 'left' | 'right'; width?: string }[] = [
  { sortBy: 'title', label: 'Título', align: 'left' },
  { sortBy: 'publicationDate', label: 'Fecha de publicación', align: 'left', width: '22%' },
  { sortBy: 'authorCount', label: 'Autores', align: 'right', width: '12%' },
];

export function WorksTable({ works, query, onSort, onShowHistory }: WorksTableProps) {
  return (
    <Table aria-label="Listado de obras">
      <TableHead>
        <TableRow>
          {sortableColumns.map((column) => {
            const isActive = query.sortBy === column.sortBy;
            return (
              <TableCell
                key={column.sortBy}
                align={column.align}
                sx={{ width: column.width }}
                // MUI agrega aria-sort a partir de sortDirection.
                sortDirection={isActive ? query.sortDirection : false}
              >
                <TableSortLabel
                  active={isActive}
                  direction={isActive ? query.sortDirection : 'asc'}
                  onClick={() => onSort(column.sortBy)}
                >
                  {column.label}
                  {isActive && (
                    <Box component="span" sx={visuallyHidden}>
                      {query.sortDirection === 'asc' ? ', orden ascendente' : ', orden descendente'}
                    </Box>
                  )}
                </TableSortLabel>
              </TableCell>
            );
          })}
          <TableCell align="right" sx={{ width: '14%' }}>
            Acciones
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {works.map((work) => (
          <TableRow key={work.id} hover>
            <TableCell>
              <Typography sx={{ fontWeight: 600 }}>{work.title}</Typography>
            </TableCell>
            <TableCell>{formatPublicationDate(work.publicationDate)}</TableCell>
            <TableCell align="right">{work.authorCount}</TableCell>
            <TableCell align="right">
              <WorkRowActions work={work} onShowHistory={onShowHistory} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
