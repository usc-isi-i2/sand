import { SimpleCRUDStore } from "gena-app";
import { SERVER } from "../../env";
import { TransformationResult } from "./TransformationResult";
import axios from "axios";


export interface Transformation {
  id: number;
};

export class TransformationStore extends SimpleCRUDStore<number, Transformation> {
  constructor() {
    super(`${SERVER}/api/transformation`, undefined, false);
  }

  public filterErrorMessage(errorMessage: string): string {
    return errorMessage.split(':').splice(1).join(':').trim();
  }

  async testTransformation(id: number, payload: Transformation): Promise<TransformationResult[] | undefined> {
    let resp: any = await axios
      .post(`${SERVER}/api/transform/1/transformations`, payload)
      .then((res) => res.data)
      .catch((error) => this.filterErrorMessage(error.response.data.message));
    return resp;
  };
}

export class Transformation {
  public type?: string;
  public mode?: string;
  public datapath?: string[];
  public code?: string | undefined;
  public outputpath?: string[] | undefined;
  public tolerance?: number;
  public rows?: number;
}

