declare module "upng-js" {
    interface UPNG {
        encode(imgs: ArrayBuffer[], width: number, height: number, cnum: number, dels?: number[]): ArrayBuffer;
    }
    const UPNG: UPNG;
    export default UPNG;
}
