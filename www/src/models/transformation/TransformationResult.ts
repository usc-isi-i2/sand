import { Record } from "gena-app";

export interface TransformationResult extends Record<number> {
  path: number;
  value: string;
  ok: string;
  error: string;
}
