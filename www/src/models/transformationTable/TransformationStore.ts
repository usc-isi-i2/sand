import { RStore } from "gena-app";
import { SERVER } from "../../env";
import {TransformationTable} from "./TransformationTable";
import axios from "axios";


export class TPayload {
    public type?: string;
    public mode?: string;
    public datapath?: string[];
    public code?: string | undefined;
    public outputpath?: string[] | undefined;
    public tolerance?: number;
    public rows?: number;
  }

const filterErrorMessage = (errorMessage: string) => {
  return errorMessage.split(':').splice(1).join(':').trim();
}

export async function postData(id : number, payload: TPayload) : Promise<TransformationTable[]|undefined> {
  let resp: any = await axios
    .post(`${SERVER}/api/transform/1/transformations`, payload)
    .then((res) => res.data)
    .catch((error) => filterErrorMessage(error.response.data.message));
  return resp;
};