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

export interface DraftCreateTransformation extends Omit<Transformation, "id"> {
  draftID: string;
  tolerance: number;
  rows: number;
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
    payload: DraftCreateTransformation
  ): Promise<TransformationResult[] | undefined> {
    let resp: any = await axios
      .post(
        `${SERVER}/api/transformation/test?tolerance=${
          payload.tolerance
        }&rows=${payload!.rows}`,
        {
          table_id: payload.tableId,
          type: payload.type,
          code: payload.code,
          mode: payload.mode,
          datapath: payload.datapath,
          outputpath: payload.outputpath,
        }
      )
      .then((res) => res.data)
      .catch((error) => error.response.data.message);
    return resp;
  }
}
