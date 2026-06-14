export type TileRoot = "tiles" | "tiles-merged";

let currentRoot: TileRoot = "tiles";

export function setTileRoot(root: TileRoot): void {
    currentRoot = root;
}

export function getTileRoot(): TileRoot {
    return currentRoot;
}

export function tileUrl(plane: number, zoom: number, tx: number, ty: number): string {
    return `/resources/osrs/image_world_map/${currentRoot}/${plane}/z${zoom}/${tx}/${ty}.webp`;
}
