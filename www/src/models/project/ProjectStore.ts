import axios from "axios";
import { CRUDStore } from "gena-app";
import { SERVER } from "../../env";
import { DraftCreateProject, DraftUpdateProject, Project } from "./Project";
import { ParserOpts, UploadingTable } from "./ProjectUpload";

export class ProjectStore extends CRUDStore<
  number,
  DraftCreateProject,
  DraftUpdateProject,
  Project
> {
  constructor() {
    super(`${SERVER}/api/project`, undefined, false);
  }

  /**
   * Upload a table to the project
   */
  public uploadTable = async (
    projectId: number,
    file: File,
    parserOpt?: ParserOpts,
    selectedTables?: number[]
  ): Promise<UploadingTable | number[]> => {
    const form = new FormData();
    form.append("file", file);

    if (parserOpt !== undefined) {
      form.append("parser_opts", JSON.stringify({ file: parserOpt }));
    }

    if (selectedTables !== undefined) {
      form.append("selected_tables", JSON.stringify(selectedTables));
    }

    const resp = await axios.post(
      `${SERVER}/api/project/${projectId}/upload`,
      form,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (resp.data.tables !== undefined) {
      const { parser_opts, tables } = resp.data.tables[0];
      return { parserOpts: parser_opts, tables };
    }
    return resp.data.table_ids;
  };

  public deserialize(record: any): Project {
    return new Project(record.id, record.name, record.description);
  }

  public serializeUpdateDraft(record: DraftUpdateProject): object {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
    };
  }

  public serializeCreateDraft(record: DraftCreateProject): object {
    return { name: record.name, description: record.description };
  }
}
