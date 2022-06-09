import G6, {
  IGroup,
  IShape,
  LabelStyle,
  ModelConfig,
  ShapeStyle,
} from "@antv/g6";
import { drawText } from "./RectNode";
import { WordWrap } from "./wordwrap";

/**
 * Type of each circle node.
 */
export interface CircleConfig {
  label: string;
  style: ShapeStyle & {
    padding?: number;
    paddingWidth?: number;
    paddingHeight?: number;
  };
  labelCfg?: { offset: number; style: LabelStyle };
}

export function registerCircleNode(wordwrap: WordWrap) {
  const defaultWidth = wordwrap.getApproximateWidth(4);

  const draw = (cfg: CircleConfig, group: IGroup): IShape => {
    const padding = cfg.style.padding || 8;
    const labelPosition: string = "below";
    const labelOffset = cfg.labelCfg?.offset || 0;

    if (labelPosition === "inside") {
      // render text inside circle
      const { units, radius } = wordwrap.wrapTextCircle(cfg.label, 256);
      const shape = group!.addShape("circle", {
        attrs: {
          // x: cfg.x,
          // y: cfg.y,
          r: radius + padding,
          ...cfg.style,
        },
        name: "circle",
      });
      drawText(group, wordwrap, units, {
        xoffset: 0,
        yoffset: 0,
        cfg: cfg.labelCfg?.style,
      });
      return shape;
    }

    // render text below circle
    const { units, width } = wordwrap.wrapText(
      cfg.label as string,
      defaultWidth,
      "center"
    );
    const defaultRadius = 10;
    const shape = group!.addShape("circle", {
      attrs: {
        // x: cfg.x,
        // y: cfg.y,
        r: defaultRadius,
        ...cfg.style,
      },
      name: "circle",
    });

    drawText(group, wordwrap, units, {
      xoffset: -width / 2,
      yoffset: defaultRadius + labelOffset,
      cfg: cfg?.labelCfg?.style,
      stroke: { color: "white", width: 4 },
    });
    return shape;
  };

  G6.registerNode(
    "circle-wrap",
    {
      draw: (cfg?: ModelConfig, group?: IGroup): IShape => {
        return draw(cfg! as CircleConfig, group!);
      },
    },
    "single-node"
  );

  return wordwrap;
}
