import G6, { Graph, GraphData, NodeConfig, LayoutConfig } from "@antv/g6";
import { registerRectNode } from "./RectNode";
import { registerCircleNode } from "./CircleNode";
import { WordWrap } from "./wordwrap";

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface GraphNode {
  id: string;
  label: string;
  style?: object;
  labelStyle?: object;
  shape?:
    | "rect"
    | "circle"
    | "ellipse"
    | "diamond"
    | "triangle"
    | "star"
    | "image";
}

export interface G6GraphProps {
  // init height of the canvas
  initHeight: number;
  // shift the node in the graph by `leftOffset` units
  leftOffset: number;
  /**
   * Layout of the graph. Default it's force layout with distance 50
   */
  layout?: LayoutConfig;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

export class G6Graph {
  private version: number;
  private container: HTMLDivElement;
  public graph: Graph;
  private data: GraphData;
  private props: G6GraphProps;
  private wordwrap: WordWrap;

  constructor(container: HTMLDivElement, props: G6GraphProps) {
    this.version = 0;
    this.props = props;
    this.container = container;
    this.data = {
      nodes: [],
      edges: [],
    };

    const cfg = {
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
      fontSize: 12,
    };
    this.wordwrap = new WordWrap(cfg);
    registerRectNode(this.wordwrap);
    registerCircleNode(this.wordwrap);

    this.graph = new G6.Graph({
      container: container,
      width: container.scrollWidth,
      height: props.initHeight,
      layout: props.layout || {
        type: "force",
        preventOverlap: true,
        linkDistance: 50,
        nodeSpacing: 50,
      },
      defaultEdge: {
        type: "quadratic",
        style: {
          stroke: "black",
          endArrow: {
            fill: "black",
            path: G6.Arrow.triangle(6, 8),
          },
        },
        labelCfg: {
          style: {
            fill: "black",
            background: {
              fill: "#ffffff",
              stroke: "#9EC9FF",
              padding: [2, 2, 2, 2],
              radius: 2,
            },
          },
        },
      },
      modes: {
        default: ["drag-canvas", "drag-node"],
        edit: ["click-select"],
      },
      nodeStateStyles: {
        hover: {
          fill: "lightsteelblue",
        },
      },
    });

    if (props.onNodeClick !== undefined) {
      this.graph.on("node:click", (event: any) => {
        props.onNodeClick!(event.item._cfg.model.id);
      });
    }

    if (props.onEdgeClick !== undefined) {
      this.graph.on("edge:click", (event: any) => {
        props.onEdgeClick!(event.item._cfg.model);
      });
    }
  }

  /** Transform the data from our format to G6 format */
  static transformData(nodes: GraphNode[], edges: GraphEdge[]): GraphData {
    // get new nodes
    let newNodes = nodes.map((u, i) => {
      let type;
      if (u.label.trim().length > 0) {
        if (u.shape === "rect" || u.shape === "circle") {
          type = u.shape + "-wrap";
        } else {
          type = u.shape;
        }
      } else {
        type = u.shape;
      }

      const node: NodeConfig = {
        id: u.id,
        label: u.label,
        type: type,
        style: { ...u.style, radius: 4, paddingHeight: 2, paddingWidth: 4 },
        labelCfg: {
          style: u.labelStyle,
        },
      };
      if (u.shape === "rect") {
        node.style!.radius = 4;
      }
      return node;
    });

    // get new edges
    let newEdges = edges.map((e) => ({
      id: `${e.source}-${e.target}-${e.id}`,
      source: e.source,
      target: e.target,
      label: e.label,
    }));

    // process parallel edges if needed
    const uv = new Set();
    let hasParallelEdges = false;
    for (const edge of edges) {
      const pair = `${edge.source}-${edge.target}`;
      if (uv.has(pair)) {
        hasParallelEdges = true;
        break;
      }
      uv.add(pair);
    }
    if (hasParallelEdges) {
      G6.Util.processParallelEdges(newEdges);
    }

    return { nodes: newNodes, edges: newEdges };
  }

  /**
   * Adjust the viewport to fit the view without zooming,
   * just align the center of the image bbox to the center of the canvas
   */
  fitCenter = () => {
    this.graph.fitCenter();
  };

  /** Entry point of graph. Render the graph with given data */
  setDataAndRender = (data: GraphData, onFinish?: () => void) => {
    if (this.version > 0) {
      this.graph.clear();
    }
    this.data = data;
    this.graph.data({ nodes: data.nodes, edges: data.edges });
    this.graph.render();
    this.version += 1;

    if (onFinish !== undefined) {
      onFinish();
    }
  };

  /** Update layout of the graph **/
  updateLayout = (layoutCfg: LayoutConfig) => {
    this.graph.updateLayout(layoutCfg);
    this.graph.layout();
  };

  /** Adjust the canvas size to fit with the graph */
  updateContainerSize = ({
    center,
    height,
  }: {
    center: boolean;
    height: "fit-graph" | "fit-remaining-window";
  }): DOMRect => {
    // follow the code in fitView & fitCenter
    let group = this.graph.get("group");
    group.resetMatrix();
    let bbox = group.getCanvasBBox();
    if (!(bbox.width === 0 || bbox.height === 0)) {
      // let graphWidth = this.graph.getWidth();
      let graphWidth = this.container.clientWidth;

      if (center === true) {
        this.graph.moveTo(graphWidth / 2 - bbox.width / 2, 10);
      } else {
        this.graph.moveTo(this.props.leftOffset, 10);
      }

      let graphHeight;
      switch (height) {
        case "fit-graph":
          graphHeight = bbox.height + 20;
          break;
        case "fit-remaining-window":
          let viewportOffset = this.container.getBoundingClientRect().top;
          let documentScrollY = window.scrollY;
          let viewportHeight = document.documentElement.clientHeight;
          graphHeight =
            viewportHeight - (viewportOffset + documentScrollY) - 10;
          break;
      }
      this.graph.changeSize(graphWidth, graphHeight);
    }
    return bbox;
  };

  /**
   * During rendering, the bounding box of the graph is changing and may
   * lead to incorrect canvas size. This function will check until the layout
   * process is finished (the bounding box is not changing a lot) to
   * call the function.
   *
   * If you doesn't provide prevBBox, the function will wait for 3 * delay ms
   * (first delay to compute bbox, second delay is in the last wait), because of
   * the last wait, you can set the delay smaller (e.g., 50ms)
   *
   * @param maxTries
   * @param delay milliseconds
   * @param fn
   * @param args
   * @param onFinish
   * @param significantChange
   * @param prevBBox
   */
  untilLayoutStable = <F extends (...args: any[]) => any>(
    maxTries: number,
    delay: number,
    fn: F,
    args: Parameters<F>,
    onFinish?: () => void,
    significantChange?: number,
    prevBBox?: DOMRect
  ) => {
    if (maxTries <= 0) {
      // timeout, call the function anyway
      fn(...args);
      if (onFinish !== undefined) {
        onFinish();
      }
      return;
    }

    const group = this.graph.get("group");
    const bbox = group.getCanvasBBox();

    significantChange = significantChange || 10;

    if (prevBBox !== undefined) {
      if (
        Math.abs(prevBBox.width - bbox.width) < significantChange &&
        Math.abs(prevBBox.height - bbox.height) < significantChange
      ) {
        // seem like no significant change we may call the function now
        // but what if the layout is running quite slow and we call too fast?
        // wait for sometime and check again to make sure it's really stable
        setTimeout(() => {
          const group = this.graph.get("group");
          const nextBBox = group.getCanvasBBox();

          if (
            Math.abs(bbox.width - nextBBox.width) >= significantChange! ||
            Math.abs(bbox.height - nextBBox.height) >= significantChange!
          ) {
            // the layout is still changing, keep on waiting
            this.untilLayoutStable(
              maxTries - 1,
              delay,
              fn,
              args,
              onFinish,
              significantChange,
              nextBBox
            );
          } else {
            fn(...args);
            if (onFinish !== undefined) {
              onFinish();
            }
          }
        }, delay);
        return;
      } else {
        setTimeout(() => {
          this.untilLayoutStable(
            maxTries - 1,
            delay,
            fn,
            args,
            onFinish,
            significantChange,
            bbox
          );
        }, delay);
      }
    } else {
      setTimeout(() => {
        this.untilLayoutStable(
          maxTries,
          delay,
          fn,
          args,
          onFinish,
          significantChange,
          bbox
        );
      }, delay);
    }
  };
}
