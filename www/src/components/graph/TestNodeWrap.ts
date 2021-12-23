import { GraphEdge, GraphNode } from "./G6Graph";

export const testNodeWrap = (
  type: "circle" | "rect"
): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const nodes = [
    {
      id: "1",
      label: "association football club (Q476028)",
      shape: type,
      style: {
        fill: "#b7eb8f",
        stroke: "#135200",
      },
    },
    {
      id: "2",
      label: "wikidata:Statement",
      shape: type,
      style: {
        fill: "#b7eb8f",
        stroke: "#135200",
      },
    },
    {
      id: "3",
      label: "urban municipality of Germany (Q42744322)",
      shape: type,
      style: {
        fill: "#b7eb8f",
        stroke: "#135200",
      },
    },
  ];

  const edges = [] as GraphEdge[];

  return { nodes, edges };
};
