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
      .post(
        `${SERVER}/api/transform/${payload.tableId}/transformations`,
        payload
      )
      .then((res) => res.data)
      .catch((error) => error.response.data.message);
    return resp;
  }
}
