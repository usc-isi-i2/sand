import { HTMLProps } from "react";

export interface ContentHierarchy {
  level: number; // level of the heading
  heading: string; // title of the level (header)
  contentBefore: (Text | LineBreak)[];
  contentAfter: (Text | LineBreak)[];
}

export interface Text {
  value: string;
  tags: string[];
  id2attrs: { [id: string]: HTMLProps<HTMLAnchorElement> };
}

export interface LineBreak {
  nLines: number;
}

export function isLineBreak(item: Text | LineBreak): item is LineBreak {
  return (item as LineBreak).nLines !== undefined;
}
