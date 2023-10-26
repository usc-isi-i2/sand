import { Record } from "gena-app";

export interface TransformationTable extends Record<number> {
    path: number;
    value: string;
    ok: string;
    error: string;
  }