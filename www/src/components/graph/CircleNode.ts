import G6, { IGroup, IShape, ModelConfig, ShapeStyle } from "@antv/g6";
import { drawText } from "./RectNode";
import { WordWrap } from "./wordwrap";

/**
 * Type of each circle node.
 */
export interface CircleConfig extends ModelConfig {
  style: ShapeStyle & {
    padding?: number;
    paddingWidth?: number;
    paddingHeight?: number;
  };
}

export function registerCircleNode(wordwrap: WordWrap) {
  const defaultWidth = wordwrap.getApproximateWidth(4);

  G6.registerNode(
    "circle-wrap",
    {
      draw: ((cfg: CircleConfig, group: IGroup): IShape => {
        const padding = cfg.style.padding || 8;
        const wp = cfg.style.paddingWidth || 0;
        const hp = cfg.style.paddingHeight || 0;
        const labelPosition: string = "below";
        const labelOffset = cfg.labelCfg?.offset || 0;

        if (labelPosition === "inside") {
          // render text inside circle
          const { units, radius } = wordwrap.wrapTextCircle(
            cfg.label as string,
            256
          );
          const shape = group!.addShape("circle", {
            attrs: {
              x: cfg.x,
              y: cfg.y,
              r: radius + padding,
              ...cfg.style,
            },
            name: "circle-soft-wrap-shape",
          });
          drawText(group, wordwrap, units, {
            xoffset: 0,
            yoffset: 0,
            cfg: cfg?.labelCfg?.style,
          });
          return shape;
        }

        // render text below circle
        const { units, width, height } = wordwrap.wrapText(
          cfg.label as string,
          defaultWidth,
          "center"
        );
        const defaultRadius = 10;
        const shape = group!.addShape("circle", {
          attrs: {
            x: cfg.x,
            y: cfg.y,
            r: defaultRadius,
            ...cfg.style,
          },
          name: "circle-soft-wrap-shape",
        });

        drawText(group, wordwrap, units, {
          xoffset: -width / 2,
          yoffset: defaultRadius + labelOffset,
          cfg: cfg?.labelCfg?.style,
          stroke: { color: "white", width: 4 },
        });
        return shape;
      }) as (cfg?: ModelConfig, group?: IGroup) => IShape,
    },
    "single-node"
  );

  return wordwrap;
}
