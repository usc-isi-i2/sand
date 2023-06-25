import { TextSearchResult } from "../../models/ontology/ClassStore";

export default function LabelComponent(searchResult: TextSearchResult) {
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