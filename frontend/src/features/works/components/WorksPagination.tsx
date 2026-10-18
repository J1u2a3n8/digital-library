import { MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material';
import { pageSizeOptions } from '../workListState';

interface WorksPaginationProps {
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function WorksPagination({
  pageNumber,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: WorksPaginationProps) {
  const firstItem = totalItems === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const lastItem = Math.min(pageNumber * pageSize, totalItems);

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
    >
      <Typography variant="body2" color="text.secondary">
        Mostrando {firstItem}–{lastItem} de {totalItems}
      </Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <TextField
          id="page-size"
          select
          size="small"
          label="Por página"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          sx={{ minWidth: 104 }}
        >
          {pageSizeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>

        <Pagination
          page={Math.min(pageNumber, Math.max(totalPages, 1))}
          count={Math.max(totalPages, 1)}
          onChange={(_, page) => onPageChange(page)}
          color="primary"
          shape="rounded"
          siblingCount={1}
          getItemAriaLabel={(type, page, selected) => {
            if (type === 'previous') return 'Página anterior';
            if (type === 'next') return 'Página siguiente';
            if (type === 'page') return selected ? `Página ${page}, actual` : `Ir a la página ${page}`;
            return '';
          }}
        />
      </Stack>
    </Stack>
  );
}
