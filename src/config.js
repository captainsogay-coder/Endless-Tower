// Global constants. World is a fixed logical grid that the renderer scales to fit.
export const TILE = 32;
export const COLS = 40;
export const ROWS = 22;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

export const GAME_CONFIG = Object.freeze({
  startingCoins: 100,
  sellRefund: 0.7,
  tokensPerWave: 100,
  towerMaxHp: 100,
  autoStartDelay: 5,
  fixedStep: 1 / 60,
  waveClearBase: 40,
  waveClearPerWave: 6,
  bossIntroDuration: 3.2,
  spatialCellSize: 64,
});
