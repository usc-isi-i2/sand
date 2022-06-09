import { DraftCreateRecord, DraftUpdateRecord, Record } from "gena-app";
import { makeObservable, observable } from "mobx";

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
