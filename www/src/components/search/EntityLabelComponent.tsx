import { EntityTextSearchResult } from "../../models/entity/EntityStore";

export default function EntityLabelComponent(searchResult: EntityTextSearchResult) {
    return (
        <div>
        <p style={{ color: "blue" }}>
          {searchResult.label} ({searchResult.id})
        </p>
        <p style={{ fontSize: 12, marginTop: -5 }}>
          {searchResult.description}
        </p>
      </div>
    );
  }