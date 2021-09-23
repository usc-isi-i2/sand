import { Modal } from "antd";
import memoizeOne from "memoize-one";
import { inject, observer } from "mobx-react";
import React from "react";
import { Graph, GraphEdge, SemanticModelStore } from "../../models";
// import AddEdgeForm from "./AddEdgeForm";
// import AddNodeForm from "./AddNodeForm";
// import EditClassNodeForm from "./EditClassNodeForm";
// import EditDataNodeForm from "./EditDataNodeForm";
// import EditEdgeForm from "./EditEdgeForm";
// import { EditLiteralNodeForm } from "./EditLiteralNodeForm";
import { G6Graph } from "./G6Graph";

export interface Props {
  store?: SemanticModelStore;
  graph: Graph;
  disableEdit?: boolean;
}

interface State {
  modal: {
    // for update it manually
    version: number;
    title: string;
    visible: boolean;
    mod: "editClassNode" | "editDataNode" | "editLiteralNode" | "editEdge" | "addNode" | "addEdge";
    nodeId?: string;
    sourceId?: string;
    targetId?: string;
  };
}

class SemanticModel extends React.Component<Props, State> {
  private graphContainer = React.createRef<HTMLDivElement>();
  private modalContainer = React.createRef<HTMLDivElement>();
  private graph?: G6Graph;
  private initGraphHeight: number = 300;
  private nodeOffset: number = 35;
  private modalContent: React.ReactElement | null = null;
  public state: State = {
    modal: {
      version: 0,
      title: "",
      visible: false,
      mod: "editEdge",
    },
  };

  componentDidMount() {
    this.renderGraph();
  }

  componentDidUpdate(prevProps: Props) {
    this.renderGraph();
  }

  getGraphData = memoizeOne((id: string, version: number) => {
    // having the version make this function always up to date
    return G6Graph.transformData(
      this.props.graph!.nodes,
      this.props.graph!.edges,
      this.props.graph!.uriCount
    );
  });

  renderGraph = () => {
    if (this.graphContainer.current === null) {
      return;
    }

    if (this.graph === undefined) {
      this.graph = new G6Graph(this.graphContainer.current, {
        initHeight: this.initGraphHeight,
        leftOffset: this.nodeOffset,
        onNodeClick: this.onNodeClick,
        onEdgeClick: this.onEdgeClick,
      });
    }

    let data = this.getGraphData(this.props.graph!.id, this.props.graph!.version);
    this.graph.setDataAndRender(data, () => {
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
      this.graph!.fitToCanvas(true);
    });
  };

  centerGraph = () => {
    if (this.graph === undefined) {
      return;
    }
    this.graph.fitToCanvas(true);
  };

  onNodeClick = (nodeId: string) => {
    if (this.props.disableEdit === true) return;

    let node = this.props.graph!.node(nodeId)!;
    this.setState({
      modal: {
        title: node.isDataNode ? "Edit data node" : (node.isClassNode ? "Edit class node" : "Edit literal node"),
        visible: true,
        version: this.state.modal.version + 1,
        mod: node.isDataNode ? "editDataNode" : (node.isLiteralNode ? "editLiteralNode" : "editClassNode"),
        nodeId: nodeId,
        sourceId: undefined,
        targetId: undefined,
      },
    });
  };

  onEdgeClick = (edge: GraphEdge) => {
    if (this.props.disableEdit === true) return;

    this.setState({
      modal: {
        title: "Edit edge",
        visible: true,
        version: this.state.modal.version + 1,
        mod: "editEdge",
        nodeId: undefined,
        sourceId: edge.source,
        targetId: edge.target,
      },
    });
  };

  showAddEdgeForm = () => {
    this.setState({
      modal: {
        title: "Add edge",
        visible: true,
        version: this.state.modal.version + 1,
        mod: "addEdge",
        nodeId: undefined,
        sourceId: undefined,
        targetId: undefined,
      },
    });
  };

  showAddNodeForm = () => {
    this.setState({
      modal: {
        title: "Add node",
        visible: true,
        version: this.state.modal.version + 1,
        mod: "addNode",
        nodeId: undefined,
        sourceId: undefined,
        targetId: undefined,
      },
    });
  };

  getModalContainer = () => {
    return this.modalContainer.current!;
  };

  hideModal = () =>
    this.setState({
      modal: {
        ...this.state.modal,
        version: this.state.modal.version + 1,
        visible: false,
      },
    });

  isModalVisible = memoizeOne((graphId: string, graphVersion: number, modalVersion: number) => {
    if (!this.state.modal.visible) {
      return false;
    }

    if (
      this.state.modal.mod === "editClassNode" ||
      this.state.modal.mod === "editDataNode" ||
      this.state.modal.mod === "editLiteralNode"
    ) {
      return this.props.graph!.hasNode(this.state.modal.nodeId!);
    }

    if (this.state.modal.mod === "editEdge") {
      return this.props.graph!.hasEdge(
        this.state.modal.sourceId!,
        this.state.modal.targetId!
      );
    }

    if (this.state.modal.mod === "addEdge") {
      return true;
    }

    if (this.state.modal.mod === "addNode") {
      return true;
    }

    return false;
  });

  getModalContent = memoizeOne((graphId: string, graphVersion: number, modalVersion: number) => {
    if (!this.isModalVisible(graphId, graphVersion, modalVersion)) {
      return null;
    }

    return <h1>Uncomment, fix the code to show the modal</h1>;

    // if (this.state.modal.mod === "editClassNode" ||
    //   this.state.modal.mod === "editLiteralNode" ||
    //   this.state.modal.mod === "editDataNode") {
    //   let FormClass = {
    //     editClassNode: EditClassNodeForm,
    //     editDataNode: EditDataNodeForm,
    //     editLiteralNode: EditLiteralNodeForm
    //   }[this.state.modal.mod];
    //   return (
    //     <FormClass
    //       store={this.props.store!}
    //       graph={this.props.graph!}
    //       nodeId={this.state.modal.nodeId!}
    //       closeForm={this.hideModal}
    //     />
    //   );
    // }

    // if (this.state.modal.mod === "editEdge") {
    //   return (
    //     <EditEdgeForm
    //       store={this.props.store!}
    //       graph={this.props.graph!}
    //       source={this.state.modal.sourceId!}
    //       target={this.state.modal.targetId!}
    //       closeForm={this.hideModal}
    //     />
    //   );
    // }

    // if (this.state.modal.mod === "addEdge") {
    //   return <AddEdgeForm store={this.props.store!} graph={this.props.graph!} closeForm={this.hideModal} />;
    // }

    // if (this.state.modal.mod === "addNode") {
    //   return <AddNodeForm store={this.props.store!} graph={this.props.graph!} closeForm={this.hideModal} />;
    // }

    throw new Error(`Unreachable! Invalid modal mode: ${this.state.modal.mod}`);
  });

  render() {
    let modal = null;
    let visible = this.isModalVisible(
      this.props.graph!.id,
      this.props.graph!.version,
      this.state.modal.version
    );

    if (visible) {
      // do this because maskClosable not working correctly after delete the modal
      modal = (
        <Modal
          title={this.state.modal.title}
          getContainer={this.getModalContainer}
          visible={visible}
          cancelButtonProps={{ style: { display: "none " } }}
          onOk={this.hideModal}
          onCancel={this.hideModal}
          width="90%"
          style={{ top: 8 }}
          maskClosable={true}
        >
          {this.getModalContent(
            this.props.graph!.id,
            this.props.graph!.version,
            this.state.modal.version
          )}
        </Modal>
      );
    }

    return (
      <div>
        <div style={{ display: "none" }}>{this.props.graph!.version}</div>
        <div
          ref={this.graphContainer}
          style={{ border: "1px solid #ccc", borderRadius: 4, marginBottom: 4 }}
        ></div>
        {modal}
        <div ref={this.modalContainer}></div>
        <div id="tmp"></div>
      </div>
    );
  }
}


export default inject((provider: { store: SemanticModelStore }) => ({
  store: provider.store,
}))(observer(SemanticModel))