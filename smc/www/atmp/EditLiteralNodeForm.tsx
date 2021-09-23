import { Button, Switch } from "antd";
import { toJS } from "mobx";
import React from "react";
import { Graph, AppStore } from "../../models";
import { ExternalLink } from "../primitives/ExternalLink";
import { RecordSearch } from "../primitives/RecordSearch";

interface Props {
  store: AppStore;
  graph: Graph;
  nodeId: string;
  closeForm: () => void;
}

interface State {
}

export class EditLiteralNodeForm extends React.Component<Props, State> {

  findByName = (query: string) => {
    return this.props.store.findClassByName(query)
      .then((resp) => {
        return resp.map((r) => {
          return { ...r, id: r.uri, url: r.uri };
        });
      });
  }

  render() {
    let graph = this.props.graph;
    let node = graph.node(this.props.nodeId);

    if (node.isInContext) {
      return <div>
        <ExternalLink url={node.uri}>{node.label}</ExternalLink>
      </div>
    }
    let node_info = node.uri.length > 0 ?
      <ExternalLink url={node.uri}>{node.label}</ExternalLink> :
      node.label;

    return <div>
      {node_info}&nbsp;
      {node.isInContext ? null : <Button
        danger={true}
        disabled={node.isInContext}
        onClick={() => {
          graph.removeNode(node.id);
          this.props.closeForm();
        }}
        type="primary"
        size="small"
      >
        Remove
      </Button>}
    </div>
  }
}