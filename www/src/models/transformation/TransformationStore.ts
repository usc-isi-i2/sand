import { SimpleCRUDStore } from "gena-app";
import { SERVER } from "../../env";
import { TransformationResult } from "./TransformationResult";
import axios from "axios";

export interface Transformation {
  id: number;
}

export class TransformationStore extends SimpleCRUDStore<
  number,
  Transformation
> {
  constructor() {
    super(`${SERVER}/api/transformation`, undefined, false);
  }

  async testTransformation(
    id: number,
    payload: TestTransformationRequest
  ): Promise<TransformationResult[] | undefined> {
    let resp: any = await axios
      .post(`${SERVER}/api/transform/${id}/transformations`, payload)
      .then((res) => res.data)
      .catch((error) => error.response.data.message);
    return resp;
  }
}

export class TestTransformationRequest {
  public type?: string;
  public mode?: string;
  public datapath?: string[];
  public code?: string | undefined;
  public outputpath?: string[] | undefined;
  public tolerance?: number;
  public rows?: number;
}
