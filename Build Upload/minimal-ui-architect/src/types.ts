export type ElementType = 'tile' | 'group' | 'color';

export interface BaseElement {
  id: string;
  name: string;
  visible: boolean;
  parentId?: string;
  type: ElementType;
  depth: number;
  tileX: number;
  tileY: number;
}

export interface TileData extends BaseElement {
  type: 'tile';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  highlightColor: string;
  colorTileId?: string;
  cableClips?: { id: string; x: number; y: number }[];
}

export interface GroupData extends BaseElement {
  type: 'group';
  expanded: boolean;
  tileWidth: number;
  tileHeight: number;
  color: string;
  opacity?: number;
}

export interface ColorTileData extends BaseElement {
  type: 'color';
  colorMode: 'HSB' | 'HSL' | 'RGB';
  channel1: number;
  channel2: number;
  channel3: number;
  highlightColor: string;
}

export type CanvasElement = TileData | GroupData | ColorTileData;

export type Tool = 'select' | 'tile' | 'group' | 'hand' | 'zoom';
