import { SimpleCRUDStore, CRUDStore, Record } from "gena-app";
import { SERVER } from "../../env";
import { TransformationResult } from "./TransformationResult";
import axios from "axios";

export interface Transformation extends Record<number> {
  type: string;
  mode: string;
  tableId: number;
  datapath: string[];
  code: string | undefined;
  onError: string;
  outputpath: string[] | undefined;
}

export interface DraftCreateTransformation extends Transformation {
  tolerance: number;
  rows: number;
}

export class TransformationStore extends CRUDStore<
  number,
  Omit<DraftCreateTransformation, "id"> & { draftID: string },
  DraftCreateTransformation & {
    markSaved(): void;
    toModel(): DraftCreateTransformation | undefined;
  },
  DraftCreateTransformation
> {
  constructor() {
    super(`${SERVER}/api/transformation`, undefined, false);
  }

  async testTransformation(
    payload: DraftCreateTransformation
  ): Promise<TransformationResult[] | undefined> {
    let resp: any = await axios
      .post(`${SERVER}/api/transformation/test`, {
        id: payload.id,
        table_id: payload.tableId,
        type: payload.type,
        code: payload.code,
        mode: payload.mode,
        datapath: payload.datapath,
        outputpath: payload.outputpath,
        tolerance: payload.tolerance,
        rows: payload.rows,
      })
      .then((res) => res.data)
      .catch((error) => error.response.data.message);
    return resp;
  }
}
