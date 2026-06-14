const emptyString = (_path?: string): string => "";
const joinSegments = (...args: string[]): string => args.join("/");

const extname = emptyString;
const basename = emptyString;
const dirname = emptyString;
const normalize = (s: string): string => s;
const relative = (_from: string, _to: string): string => "";
const join = joinSegments;
const resolve = joinSegments;
const isAbsolute = (_path?: string): boolean => false;
const parse = (_path?: string): { root: string; dir: string; base: string; ext: string; name: string } => ({
    root: "",
    dir: "",
    base: "",
    ext: "",
    name: "",
});

const sep = "/";
const delimiter = ":";
const posix = { extname, basename, dirname, join, resolve, normalize, relative, isAbsolute, parse, sep, delimiter };
const win32 = {
    extname,
    basename,
    dirname,
    join,
    resolve,
    normalize,
    relative,
    isAbsolute,
    parse,
    sep: "\\",
    delimiter: ";",
};

export {
    extname,
    basename,
    dirname,
    join,
    resolve,
    normalize,
    relative,
    isAbsolute,
    parse,
    sep,
    delimiter,
    posix,
    win32,
};
export default {
    extname,
    basename,
    dirname,
    join,
    resolve,
    normalize,
    relative,
    isAbsolute,
    parse,
    sep,
    delimiter,
    posix,
    win32,
};
