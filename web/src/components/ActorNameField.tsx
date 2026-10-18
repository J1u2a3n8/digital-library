import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { InputAdornment, TextField, Tooltip } from '@mui/material';
import { useState } from 'react';
import { getActorName, saveActorName } from '../utils/actorName';

/**
 * Nombre que se guarda en el historial como autor del cambio (header X-Actor).
 * No es un login: no hay contraseña ni permisos.
 */
export function ActorNameField() {
  const [name, setName] = useState(getActorName);

  return (
    <Tooltip title="Se guarda en el historial de cambios. No es un inicio de sesión." placement="bottom-end">
      <TextField
        id="actor-name"
        size="small"
        placeholder="Tu nombre"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => saveActorName(name)}
        slotProps={{
          htmlInput: { 'aria-label': 'Tu nombre para el historial de cambios', maxLength: 100 },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutlineIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ width: { xs: '100%', sm: 220 } }}
      />
    </Tooltip>
  );
}
