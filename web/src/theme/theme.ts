import { alpha, createTheme } from '@mui/material/styles';

/**
 * Sistema de diseño "biblioteca editorial contemporánea":
 * papel cálido, tinta, vino y verde sobrio. Solo tema claro.
 */
export const colors = {
  paper: '#F7F3EA',
  surface: '#FFFCF6',
  ink: '#1E2A2B',
  inkSoft: '#66706E',
  divider: '#DDD4C6',
  wine: '#7B2D35',
  wineDark: '#641F27',
  green: '#2F6B63',
  success: '#2E6B4F',
  warning: '#A15C1E',
  error: '#B3261E',
  focusRing: 'rgba(47, 107, 99, 0.35)',
  rowHover: 'rgba(123, 45, 53, 0.04)',
} as const;

const headingFont = '"Fraunces", Georgia, serif';
const bodyFont = '"Source Sans 3", "Segoe UI", sans-serif';

const focusOutline = {
  outline: `3px solid ${colors.focusRing}`,
  outlineOffset: 2,
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: colors.wine, dark: colors.wineDark, contrastText: '#FFFFFF' },
    secondary: { main: colors.green, contrastText: '#FFFFFF' },
    success: { main: colors.success },
    warning: { main: colors.warning },
    error: { main: colors.error },
    background: { default: colors.paper, paper: colors.surface },
    text: { primary: colors.ink, secondary: colors.inkSoft },
    divider: colors.divider,
  },
  shape: { borderRadius: 8 },
  spacing: 8,
  typography: {
    fontFamily: bodyFont,
    fontSize: 15,
    h1: { fontFamily: headingFont, fontSize: 32, lineHeight: '40px', fontWeight: 600 },
    h2: { fontFamily: headingFont, fontSize: 24, lineHeight: '32px', fontWeight: 600 },
    h3: { fontFamily: headingFont, fontSize: 20, lineHeight: '28px', fontWeight: 600 },
    body1: { fontSize: 15, lineHeight: '24px' },
    body2: { fontSize: 13, lineHeight: '20px' },
    caption: { fontSize: 13, lineHeight: '20px' },
    button: { fontSize: 15, fontWeight: 600, textTransform: 'none' },
    subtitle2: { fontSize: 13, lineHeight: '20px', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: colors.paper },
        '*:focus-visible': focusOutline,
      },
    },
    MuiButtonBase: {
      defaultProps: { disableRipple: false },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme: currentTheme }) => ({
          minHeight: 40,
          paddingInline: 16,
          borderRadius: 8,
          [currentTheme.breakpoints.down('sm')]: { minHeight: 44 },
          '&.Mui-focusVisible': focusOutline,
        }),
        outlined: { borderColor: colors.divider },
      },
      variants: [
        {
          // Botón secundario: contorno sobrio con texto en tinta.
          props: { variant: 'outlined', color: 'inherit' },
          style: { color: colors.ink, borderColor: colors.divider, backgroundColor: colors.surface },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme: currentTheme }) => ({
          borderRadius: 8,
          [currentTheme.breakpoints.down('sm')]: { width: 44, height: 44 },
          '&.Mui-focusVisible': focusOutline,
        }),
      },
    },
    MuiInputLabel: {
      // Label siempre arriba del campo, nunca flotando dentro.
      defaultProps: { shrink: true },
      styleOverrides: {
        root: {
          position: 'relative',
          transform: 'none',
          marginBottom: 6,
          fontSize: 13,
          lineHeight: '20px',
          fontWeight: 600,
          color: colors.ink,
          '&.Mui-focused': { color: colors.ink },
          '&.Mui-error': { color: colors.error },
        },
        asterisk: { color: colors.wine },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: colors.surface,
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.inkSoft },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.green, borderWidth: 1 },
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${colors.focusRing}` },
        },
        input: { paddingTop: 9.5, paddingBottom: 9.5 },
        notchedOutline: {
          top: 0,
          borderColor: colors.divider,
          '& legend': { display: 'none' },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 0, fontSize: 13, lineHeight: '20px' } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12, border: `1px solid ${colors.divider}` } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: 13,
          fontWeight: 600,
          color: colors.inkSoft,
          backgroundColor: 'transparent',
          borderBottom: `1px solid ${colors.divider}`,
        },
        body: { borderBottom: `1px solid ${colors.divider}` },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&.MuiTableRow-hover:hover': { backgroundColor: colors.rowHover } },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: { '&.Mui-active': { color: colors.ink } },
        icon: { opacity: 0.35 },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
          boxShadow: `-8px 0 24px ${alpha(colors.ink, 0.12)}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 12, boxShadow: `0 12px 32px ${alpha(colors.ink, 0.18)}` } },
    },
    MuiPopover: {
      styleOverrides: { paper: { boxShadow: `0 8px 24px ${alpha(colors.ink, 0.14)}` } },
    },
    MuiMenu: {
      styleOverrides: { paper: { border: `1px solid ${colors.divider}` } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: colors.ink, fontSize: 13 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: ({ theme: currentTheme }) => ({
          [currentTheme.breakpoints.down('sm')]: { minWidth: 44, height: 44 },
        }),
      },
    },
  },
});
