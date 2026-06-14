import { build, type BaseProps, type Instance } from "../../../core";
import { TAG_INPUT } from "../shared.js";

const INPUT_TYPE_FILE = "file";

export interface FileUploadProps extends BaseProps {
    acceptMimes?: readonly string[];
}

export function fileUpload(props: FileUploadProps = {}): Instance<HTMLInputElement> {
    const { acceptMimes, ...rest } = props;
    return build<HTMLInputElement>({
        tag: TAG_INPUT,
        ...rest,
        type: INPUT_TYPE_FILE,
        accept: acceptMimes && acceptMimes.length > 0 ? acceptMimes.join(",") : rest.accept,
    });
}
