import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Container, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Link, Outlet, useLocation } from 'react-router';
import { ActorNameField } from './ActorNameField';

export function AppLayout() {
  const location = useLocation();
  const theme = useTheme();
  // En pantallas chicas el botón "Nueva obra" se muestra dentro de la página, a todo el ancho.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const showNewWorkButton = location.pathname === '/works' && !isMobile;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        <Container maxWidth={false} sx={{ maxWidth: 1200, py: { xs: 1.5, md: 2 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack
              component={Link}
              to="/works"
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', color: 'inherit', textDecoration: 'none' }}
              aria-label="Biblioteca Digital, ir al listado de obras"
            >
              <Box
                component="img"
                src="/favicon.svg"
                alt=""
                sx={{ width: 36, height: 36, display: 'block' }}
              />
              <Box>
                <Typography
                  component="span"
                  sx={{
                    display: 'block',
                    fontFamily: 'Fraunces, Georgia, serif',
                    fontWeight: 600,
                    fontSize: 20,
                    lineHeight: '24px',
                  }}
                >
                  Biblioteca Digital
                </Typography>
                <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                  Gestión de obras
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <ActorNameField />
              {showNewWorkButton && (
                <Button
                  component={Link}
                  to="/works/new"
                  variant="contained"
                  startIcon={<AddIcon />}
                  sx={{ flexShrink: 0 }}
                >
                  Nueva obra
                </Button>
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container component="main" maxWidth={false} sx={{ maxWidth: 1200, py: { xs: 3, md: 5 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
