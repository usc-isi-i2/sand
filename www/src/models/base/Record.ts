export interface JunctionRecord<
  JID extends string | number,
  AID extends string | number,
  BID extends string | number
  > {
  id: JID;
  aid: AID;
  bid: BID;
}

export interface Record<ID extends string | number> {
  id: ID;
}

export interface DraftCreateRecord {
  draftID: string;
}

export interface DraftUpdateRecord<
  ID extends string | number,
  M extends Record<ID>
  > {
  id: ID;

  /**
   * Inform this model that all changes had been saved into the database
   */
  markSaved(): void;

  /**
   * Convert the draft to the model.
   *
   * Return undefined if you want the object to be returned from the server
   */
  toModel(): M | undefined;
}

export interface DraftUpdateJunctionRecord<
  JID extends string | number,
  AID extends string | number,
  BID extends string | number,
  M extends JunctionRecord<JID, AID, BID>
  > {
  id: JID;

  /**
   * Inform this model that all changes had been saved into the database
   */
  markSaved(): void;

  /**
   * Convert the draft to the model.
   *
   * Return undefined if you want the object to be returned from the server
   */
  toModel(): M | undefined;
}