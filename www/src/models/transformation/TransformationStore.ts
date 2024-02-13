import { CRUDStore, Record } from "gena-app";
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

export interface DraftCreateTransformation extends Omit<Transformation, "id"> {
  draftID: string;
}

export interface DraftUpdateTransformation extends Transformation {
  markSaved(): void;
  toModel(): Transformation | undefined;
}

export class TransformationStore extends CRUDStore<
  number,
  DraftCreateTransformation,
  DraftUpdateTransformation,
  Transformation
> {
  constructor() {
    super(`${SERVER}/api/transformation`, undefined, false);
  }

  async testTransformation(
    payload: DraftCreateTransformation | Transformation,
    tolerance: number,
    rows: number
  ): Promise<TransformationResult[] | undefined> {
    let resp: any = await axios
      .post(`${SERVER}/api/transformation/test`, {
        table_id: payload.tableId,
        type: payload.type,
        code: payload.code,
        mode: payload.mode,
        datapath: payload.datapath,
        outputpath: payload.outputpath,
        tolerance: tolerance,
        rows: rows,
      })
      .then((res) => res.data)
      .catch((error) => {
        if (
          axios.isAxiosError(error) &&
          error.response &&
          error.response.status === 400
        ) {
          return error.response.data.message;
        } else {
          return Promise.reject(error);
        }
      });
    return resp;
  }
}
