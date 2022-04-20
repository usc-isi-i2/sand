import { WordWrap } from "./wordwrap";
import G6, {
  ModelConfig,
  ShapeStyle,
  IGroup,
  IShape,
  LabelStyle,
} from "@antv/g6";
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
    cfg?: LabelStyle;
    // whether to draw a small border around the text for better visibility
    stroke?: { width: number; color: string };
  }
): IShape[] {
  xoffset = xoffset === undefined ? 0 : xoffset;
  yoffset = yoffset === undefined ? 0 : yoffset;

  if (stroke !== undefined) {
    units.map(({ text, x, y }) => {
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
        name: "bg-text",
        draggable: true,
      });
    });
  }

  return units.map(({ text, x, y }) => {
    return group!.addShape("text", {
      attrs: {
        text,
        fill: "black",
        x: x + xoffset!,
        y: y + yoffset!,
        fontFamily: wordwrap.fontFamily,
        ...cfg,
      },
      name: "text",
      draggable: true,
    });
  });
}

/**
 * Type of each rect node.
 */
export interface RectConfig extends ModelConfig {
  label: string;
  // width of the rectangle
  size: number;
  style: ShapeStyle & {
    // padding
    paddingHeight?: number;
    paddingWidth?: number;
  };
  labelCfg?: { style: LabelStyle };
}

export function registerRectNode(wordwrap: WordWrap) {
  const defaultWidth = wordwrap.getApproximateWidth(4);
  // TODO: fix x and y as well as position of the text
  const draw = (cfg: RectConfig, group: IGroup): IShape => {
    const wp = cfg.style.paddingWidth || 0;
    const hp = cfg.style.paddingHeight || 0;
    const { units, width, height } = wordwrap.wrapText(
      cfg.label,
      cfg.size || defaultWidth,
      "center"
    );

    // draw shape
    const shape = group!.addShape("rect", {
      attrs: {
        // x,
        // y,
        width: width + wp * 2,
        height: height + hp * 2,
        ...cfg.style,
      },
      name: "rect",
    });

    // draw text
    drawText(group, wordwrap, units, {
      xoffset: wp,
      yoffset: hp,
      cfg: cfg.labelCfg?.style,
    });
    return shape;
  };

  G6.registerNode(
    "rect-wrap",
    {
      draw: (cfg?: ModelConfig, group?: IGroup) => {
        return draw(cfg! as RectConfig, group!);
      },

      // call everything state is changed so we can update the shape
      // currently clear and re-draw it, but we could do better
      setState(name, value, node) {
        const cfg = node!._cfg!;
        const model = cfg.model!;
        const states = cfg.states!;
        let styles: any = {};
        let labelStyles = { ...model.labelCfg?.style };

        for (const [name, prop] of Object.entries(model.style!)) {
          if (typeof prop === "object") {
            continue;
          }
          styles[name] = prop;
        }
        for (const state of states) {
          for (const [name, prop] of Object.entries(
            cfg.styles![state] as object
          )) {
            if (name === "label") {
              Object.assign(labelStyles, prop);
            } else {
              styles[name] = prop;
            }
          }
        }

        const group = cfg.group!;
        group.clear();
        draw(
          {
            label: model.label as string,
            size: model.size as number,
            style: styles,
            labelCfg: { style: labelStyles },
          },
          group
        );
      },
    },
    "single-node"
  );

  return wordwrap;
}
