import { withStyles, WithStyles } from "@material-ui/styles";
import { Button } from "antd";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Graph, SemanticModel } from "../../models";
import { G6Graph, G6GraphProps } from "./G6Graph";

const styles = {
  hide: {
    display: "none",
  },
  graphContainer: {
    border: "1px solid #bbb",
    borderRadius: 4,
    marginTop: 8,
  },
};

const GraphComponent = ({
  sm,
  classes,
}: { sm: SemanticModel } & WithStyles<typeof styles>) => {
  const [graph, graphLoading, container] = useG6Graph(sm.graph, {
    initHeight: 300,
    leftOffset: 35,
  });

  const centering = () => {
    graph !== undefined && graph!.fitToCanvas(true);
  };
  useHotkeys("c", centering, [graph !== undefined]);

  return (
    <div>
      <Button size="small" onClick={centering}>
        Center graph (C)
      </Button>
      <Button size="small" className="ml-2">
        Add node
      </Button>
      <Button size="small" className="ml-2">
        Add edge
      </Button>
      <div className={classes.hide}>{sm.graph.version}</div>
      <div ref={container} className={classes.graphContainer}></div>
    </div>
  );
};

function useG6Graph(
  data: Graph,
  props: G6GraphProps
): [G6Graph | undefined, boolean, MutableRefObject<any>] {
  const [loading, setLoading] = useState(true);
  const container = useRef(null);
  const graph = useRef<G6Graph | undefined>(undefined);

  useEffect(() => {
    if (container.current === null) return;
    if (graph.current === undefined) {
      graph.current = new G6Graph(container.current, props);
    }

    const g = graph.current;
    g.setDataAndRender(
      G6Graph.transformData(data.nodes, data.edges, data.uriCount),
      () => {
        // let maxHeight = Math.max.apply(
        //   null,
        //   data.subNodes.map((n: any) => n.y!)
        // );
        // for (let n of data.nodes) {
        //   if (n.isDataNode) {
        //     n.x = this.props.graph!.dataNodePositions![n.columnIndex!].left + this.nodeOffset;
        //     n.y = maxHeight + 70;
        //   }
        // }
        // this.graph!.refreshPositions();
        // this.graph!.fitToCanvas(false);
        (window as any).g = g;
        // maximum wait is 1 second
        g.untilLayoutStable(20, 50, g.fitToCanvas, [true], () => {
          setLoading(false);
        });
      }
    );
  }, [data.id, data.version]);

  return [graph.current, loading, container];
}

export default withStyles(styles)(GraphComponent);
