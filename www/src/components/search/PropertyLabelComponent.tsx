import { PropertyTextSearchResult } from "../../models/ontology/PropertyStore";

export default function PropertyLabelComponent(searchResult: PropertyTextSearchResult) {
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