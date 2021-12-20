import { WordWrap } from "./wordwrap";
import G6, { ModelConfig, ShapeStyle, IGroup, IShape } from "@antv/g6";
import { ParagraphRenderedUnit } from "./wordwrap/model";

/** Draw paragraph */
export function drawText(
  group: IGroup,
  wordwrap: WordWrap,
  units: ParagraphRenderedUnit[],
  {
    xoffset,
    yoffset,
    cfg,
    stroke,
  }: {
    xoffset?: number;
    yoffset?: number;
    cfg?: { [key: string]: any };
    // whether to draw a small border around the text for better visibility
    stroke?: { width: number; color: string };
  }
) {
  xoffset = xoffset === undefined ? 0 : xoffset;
  yoffset = yoffset === undefined ? 0 : yoffset;

  if (stroke !== undefined) {
    units.forEach(({ text, x, y }) => {
      group!.addShape("text", {
        attrs: {
          text,
          x: x + xoffset!,
          y: y + yoffset!,
          fontFamily: wordwrap.fontFamily,
          ...cfg,
          // override the three important styles to draw a border around the text
          fill: stroke.color,
          stroke: stroke.color,
          lineWidth: stroke.width,
        },
        name: "wrapped-text",
        draggable: true,
      });
    });
  }

  units.forEach(({ text, x, y }) => {
    group!.addShape("text", {
      attrs: {
        text,
        fill: "black",
        x: x + xoffset!,
        y: y + yoffset!,
        fontFamily: wordwrap.fontFamily,
        ...cfg,
      },
      name: "wrapped-text",
      draggable: true,
    });
  });
}

/**
 * Type of each rect node.
 */
export interface RectConfig extends ModelConfig {
  // width of the rectangle
  size: number;
  style: ShapeStyle & {
    // padding
    paddingHeight?: number;
    paddingWidth?: number;
  };
}

export function registerRectNode(wordwrap: WordWrap) {
  const defaultWidth = wordwrap.getApproximateWidth(4);

  G6.registerNode(
    "rect-wrap",
    {
      draw: ((cfg: RectConfig, group: IGroup): IShape => {
        const wp = cfg.style.paddingWidth || 0;
        const hp = cfg.style.paddingHeight || 0;
        const { units, width, height } = wordwrap.wrapText(
          cfg.label as string,
          cfg.size || defaultWidth,
          "center"
        );

        const shape = group!.addShape("rect", {
          attrs: {
            x: cfg.x,
            y: cfg.y,
            width: width + wp * 2,
            height: height + hp * 2,
            ...cfg.style,
          },
          name: "rect-soft-wrap-shape",
        });

        drawText(group, wordwrap, units, {
          xoffset: wp,
          yoffset: hp,
          cfg: cfg?.labelCfg?.style,
        });
        return shape;
      }) as (cfg?: ModelConfig, group?: IGroup) => IShape,
    },
    "single-node"
  );

  return wordwrap;
}
