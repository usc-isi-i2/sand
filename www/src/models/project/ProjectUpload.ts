import { Link } from "../table";

export interface CSVParserOpts {
  format: "csv";
  delimiter: string;
  first_row_is_header: boolean;
}

export interface JSONParserOpts {
  format: "json";
}

export type Format = "csv" | "json";
export const formats: Format[] = ["csv", "json"];
export type ParserOpts = CSVParserOpts | JSONParserOpts;

export interface RawTable {
  name: string;
  header: string[];
  rows: (string | number)[][];
  links: { [columnIndex: string | number]: Link[] }[];
}

export interface UploadingTable {
  parserOpts: ParserOpts;
  tables: RawTable[];
}
