declare module "*/tensometers/*.yaml" {
  import type { TensometerFile } from "./interfaces";
  const value: TensometerFile;
  export default value;
}

declare module "*/spokes.yaml" {
  import type { SpokeEntry } from "./interfaces";
  const value: SpokeEntry[];
  export default value;
}
