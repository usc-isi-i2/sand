import {
  DownOutlined,
  FullscreenOutlined,
  LayoutOutlined,
} from "@ant-design/icons";
import { withStyles, WithStyles } from "@material-ui/styles";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { Button, Dropdown, Menu, Space, Tooltip } from "antd";
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { G6Graph, G6GraphProps, GraphEdge, GraphNode } from "./G6Graph";

const styles = {
  hide: {
    display: "none",
  },
  graph: {
    position: "relative",
    width: "100%",
    // marginLeft: -36,
    // marginRight: -36,
  },
  toolbar: {
    position: "absolute",
    top: 8,
    left: 8,
    "& button.text": {
      borderRadius: 4,
      paddingLeft: 8,
      paddingRight: 8,
    },
    "& button.icon": {
      borderRadius: 4,
      padding: 4,
      "& svg": {
        fontSize: 22,
      },
    },
  },
  container: {
    border: "1px solid #bbb",
    borderRadius: 4,
    // width: "calc(100% + 72px)",
    width: "100%",
    "& canvas": {
      display: "block",
    },
  },
} as const;

const GraphLayout = {
  Force: {
    type: "force",
    preventOverlap: true,
    linkDistance: 50,
    nodeSpacing: 50,
  },
  Dagre: {
    type: "dagre",
    rankdir: "TB",
    nodesep: 70,
    ranksep: 30,
  },
};

export interface GraphComponentFunc {
  graph: () => G6Graph | undefined;
}

export const GraphComponent = withStyles(styles)(
  forwardRef(
    (
      {
        id,
        version,
        nodes,
        edges,
        classes,
        props,
        className,
        renderingAdjustedHeight = "fit-graph",
        toolbar = false,
      }: {
        nodes: GraphNode[];
        edges: GraphEdge[];
        id?: string | number;
        version?: number;
        toolbar?: boolean | "auto-hide";
        props?: G6GraphProps;
        renderingAdjustedHeight?: "fit-graph" | "fit-remaining-window";
        className?: string;
      } & WithStyles<typeof styles>,
      ref
    ) => {
      const container = useRef(null);
      const graph = useRef<G6Graph | undefined>(undefined);

      useImperativeHandle(
        ref,
        (): GraphComponentFunc => ({
          graph: () => graph.current,
        })
      );

      useEffect(() => {
        if (container.current === null) return;
        if (graph.current === undefined) {
          graph.current = new G6Graph(
            container.current,
            props || {
              initHeight: 500,
              leftOffset: 0,
            }
          );
        }

        const g = graph.current;
        g.setDataAndRender(G6Graph.transformData(nodes, edges), () => {
          (window as any).g = g;
          // maximum wait is 1 second
          g.untilLayoutStable(
            20,
            50,
            g.updateContainerSize,
            [{ center: true, height: renderingAdjustedHeight }],
            () => {}
          );
        });
      }, [id, version]);

      const toolbarElement =
        toolbar === false ? null : (
          <GraphToolbar autoHide={toolbar === "auto-hide"} graph={graph} />
        );

      return (
        <div className={className}>
          <div className={classes.hide}>{version}</div>
          <div className={classes.graph}>
            {toolbarElement}
            <div ref={container} className={classes.container}></div>
          </div>
        </div>
      );
    }
  )
);

export const GraphToolbar = withStyles(styles)(
  ({
    autoHide = false,
    graph,
    classes,
  }: {
    autoHide?: boolean;
    graph: React.MutableRefObject<G6Graph | undefined>;
  } & WithStyles<typeof styles>) => {
    const [isHover, setIsHover] = useState(false);
    const [layout, setLayout] = useState("Force" as keyof typeof GraphLayout);

    const onMouseEnter = () => {
      if (autoHide) setIsHover(true);
    };
    const onMouseLeave = () => {
      if (autoHide) setIsHover(false);
    };

    if (autoHide && !isHover) {
      return (
        <div
          className={classes.toolbar}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <Button className="icon">
            <MoreHorizIcon />
          </Button>
        </div>
      );
    }

    const centerGraph = () => {
      graph.current?.graph.fitCenter();
    };

    const changeLayout = (layout: keyof typeof GraphLayout) => {
      setLayout(layout);
      graph.current?.updateLayout(GraphLayout[layout]);
    };

    const cycleLayout = () => {
      if (layout === "Force") changeLayout("Dagre");
      if (layout === "Dagre") changeLayout("Force");
    };

    const onMenuSelectLayout = (e: any) => {
      changeLayout(e.key);
    };

    return (
      <div
        className={classes.toolbar}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Space size={4}>
          <Tooltip title="Center the graph">
            <Button className="icon" onClick={centerGraph}>
              <MyLocationIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Make the graph full screen">
            <Button className="icon">
              <FullscreenOutlined />
            </Button>
          </Tooltip>
          <Tooltip title="Change graph layout">
            <Dropdown
              overlay={
                <Menu onClick={onMenuSelectLayout}>
                  {Object.keys(GraphLayout).map((layout) => (
                    <Menu.Item key={layout}>{layout}</Menu.Item>
                  ))}
                </Menu>
              }
            >
              <Button
                className="text"
                icon={<LayoutOutlined />}
                onClick={cycleLayout}
              >
                {layout} <DownOutlined />
              </Button>
            </Dropdown>
          </Tooltip>
        </Space>
      </div>
    );
  }
);
