import { AmbientLight, DirectionalLight, type Light } from "three";
import {
    AMBIENT_LIGHT_INTENSITY,
    FILL_LIGHT_COLOR,
    FILL_LIGHT_INTENSITY,
    FILL_LIGHT_POSITION,
    KEY_LIGHT_INTENSITY,
    KEY_LIGHT_POSITION,
} from "../../shared/constants/voxlab/viewport-constants.js";

export function buildSceneLighting(): Light[] {
    const ambient = new AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
    const key = new DirectionalLight(0xffffff, KEY_LIGHT_INTENSITY);
    key.position.set(...KEY_LIGHT_POSITION);
    key.castShadow = true;
    const fill = new DirectionalLight(FILL_LIGHT_COLOR, FILL_LIGHT_INTENSITY);
    fill.position.set(...FILL_LIGHT_POSITION);
    return [ambient, key, fill];
}
