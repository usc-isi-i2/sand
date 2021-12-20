import { makeObservable, observable } from "mobx";
import { SERVER } from "../env";
import {
  Record,
  DraftUpdateRecord,
  DraftCreateRecord,
  CRUDStore,
} from "rma-baseapp";

export class Project implements Record<number> {
  id: number;
  // name of the project
  name: string;
  // project's description
  description: string;

  public constructor(id: number, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;

    makeObservable(this, {
      id: observable,
      name: observable,
      description: observable,
    });
  }
}

export class DraftUpdateProject
  extends Project
  implements DraftUpdateRecord<number, Project>
{
  static fromProject(project: Project) {
    return new DraftUpdateProject(
      project.id,
      project.name,
      project.description
    );
  }

  markSaved() {}

  toModel(): Project | undefined {
    return new Project(this.id, this.name, this.description);
  }
}

export class DraftCreateProject extends Project implements DraftCreateRecord {
  public draftID: string;

  constructor(draftID: string) {
    super(0, "", "");
    this.draftID = draftID;
  }
}

export class ProjectStore extends CRUDStore<
  number,
  DraftCreateProject,
  DraftUpdateProject,
  Project
> {
  constructor() {
    super(`${SERVER}/api/project`, undefined, false);
  }

  public deserialize(record: any): Project {
    return new Project(record.id, record.name, record.description);
  }

  public serializeUpdateDraft(record: DraftUpdateProject): object {
    return {
      id: record.name,
      name: record.name,
      description: record.description,
    };
  }

  public serializeCreateDraft(record: DraftCreateProject): object {
    return { name: record.name, description: record.description };
  }
}
