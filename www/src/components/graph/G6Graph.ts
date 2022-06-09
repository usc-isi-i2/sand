import G6, { Graph, GraphData, LayoutConfig, NodeConfig } from "@antv/g6";
import _ from "lodash";
import { registerCircleNode } from "./CircleNode";
import { registerRectNode } from "./RectNode";
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
  // shift the node in the graph by `leftOffset` units -- default 0
  leftOffset?: number;
  // shift the node in the graph by `topOffset` units -- default 0
  topOffset?: number;
  /**
   * Layout of the graph. Default it's force layout with distance 50
   */
  layout?: LayoutConfig;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  // highlight the node and its related nodes and edges when the mouse enter the node;
  // default is false
  enableActivateRelations?: boolean;
}

export class G6Graph {
  private version: number;
  private container: HTMLDivElement;
  public graph: Graph;
  private data: GraphData;
  public props: G6GraphProps;
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

    const modes: any[] = ["drag-canvas", "drag-node"];

    if (props.enableActivateRelations) {
      modes.push({
        type: "activate-relations",
        resetSelected: true,
      });
    }

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
        default: modes,
        edit: ["click-select"],
      },
      // these control styles of nodes & edges at different states
      // currently define active & inactive for the activate-relations mode
      nodeStateStyles: {
        active: {
          opacity: 1,
          // this is a custom attr for label's style
          // checkout `setState` method in the custom nodes such as rect-wrap
          label: {
            opacity: 1,
          },
        },
        inactive: {
          opacity: 0.2,
          // this is a custom attr for label's style
          // checkout `setState` method in the custom nodes such as rect-wrap
          label: {
            opacity: 0.2,
          },
        },
      },
      edgeStateStyles: {
        active: {
          stroke: "black",
          opacity: 1,
        },
        inactive: {
          opacity: 0.2,
          text: {
            opacity: 0.2,
          },
        },
      },
    });

    if (props.onNodeClick !== undefined) {
      this.graph.on("node:click", (event: any) => {
        this.props.onNodeClick!(event.item._cfg.model.id);
      });
    }

    if (props.onEdgeClick !== undefined) {
      this.graph.on("edge:click", (event: any) => {
        this.props.onEdgeClick!(event.item._cfg.model);
      });
    }
  }

  /** Try to hot-swap the properties of this graph and returns whether it's success or not */
  hotswapProps = (props: G6GraphProps) => {
    if (!_.isEqual(this.props.layout, props.layout)) {
      return false;
    }

    if (this.props.enableActivateRelations !== props.enableActivateRelations) {
      return false;
    }

    this.props = props;
    return true;
  };

  destroy = () => {
    this.graph.destroy();
  };

  /** Transform the data from our format to G6 format */
  static transformData(nodes: GraphNode[], edges: GraphEdge[]): GraphData {
    // const { nodes: x, edges: y } = testNodeWrap("rect");
    // nodes = x;
    // edges = y;

    // get new nodes
    let newNodes = nodes.map((u) => {
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
        style: {
          ...u.style,
          radius: 4,
          paddingHeight: 2,
          paddingWidth: 4,
        },
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
    if (_.uniq(edges.map((u) => u.id)).length !== edges.length) {
      console.error(
        "Edges must have unique ids. However, we get:",
        edges.map((u) => u.id)
      );
    }

    let newEdges = edges.map((e) => ({
      id: e.id,
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

  /**
   * Adjust the canvas size to fit with the graph
   *
   * For fit-graph mode, the extraHeight mode is used to add top & bottom padding so that it's not too close (e.g., 20px)
   * For fit-remaining-window, the offsetHeight is used to reserved some pixels at the bottom of the window so that it's not overflow (e.g., minus 1px for the border)
   * For keep-as-is, we use the initial height
   */
  updateContainerSize = ({
    center,
    height,
  }: {
    center: boolean;
    height:
      | { type: "fit-graph"; extraHeight: number }
      | { type: "fit-remaining-window"; offsetHeight: number }
      | { type: "keep-as-is" };
  }): DOMRect => {
    // follow the code in fitView & fitCenter
    let group = this.graph.get("group");
    group.resetMatrix();
    let bbox = group.getCanvasBBox();
    if (!(bbox.width === 0 || bbox.height === 0)) {
      // let graphWidth = this.graph.getWidth();
      let graphWidth = this.container.clientWidth;

      let graphHeight;
      switch (height.type) {
        case "fit-graph":
          graphHeight = bbox.height + height.extraHeight;
          break;
        case "fit-remaining-window":
          let viewportOffset = this.container.getBoundingClientRect().top;
          let documentScrollY = window.scrollY;
          let viewportHeight = document.documentElement.clientHeight;
          graphHeight =
            viewportHeight -
            (viewportOffset + documentScrollY) -
            height.offsetHeight;
          break;
        case "keep-as-is":
          graphHeight = this.props.initHeight;
      }
      this.graph.changeSize(graphWidth, graphHeight);
      if (center === true) {
        this.graph.moveTo(
          graphWidth / 2 - bbox.width / 2,
          graphHeight / 2 - bbox.height / 2
        );
      } else {
        this.graph.moveTo(
          this.props.leftOffset || 0,
          this.props.topOffset || 0
        );
      }
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
