/** Ancho de pantalla simulado para useMediaQuery. Las pruebas de mobile lo cambian. */
let screenWidth = 1280;

export function setScreenWidth(width: number) {
  screenWidth = width;
}

export function getScreenWidth() {
  return screenWidth;
}
