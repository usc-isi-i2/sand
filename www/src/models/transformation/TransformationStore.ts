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
  outputpath: string[] | undefined;
  tolerance: number;
  rows: number;
}

export class TransformationStore extends SimpleCRUDStore<
  number,
  Transformation
> {
  constructor() {
    super(`${SERVER}/api/transformation`, undefined, false);
  }

  async testTransformation(
    payload: Transformation
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
