import { Button, Switch } from "antd";
import React from "react";
import { Graph, AppStore } from "../../models";
import { RecordSearch } from "../primitives/RecordSearch";

interface Props {
  store: AppStore;
  graph: Graph;
  nodeId: string;
  closeForm: () => void;
}

interface State {
}

export default class EditClassNodeForm extends React.Component<Props, State> {

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

    return <div>
      <table className="lightweight-table full-width">
        <thead>
          <tr>
            <th>Is approximation</th>
            <th>Class Node</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Switch
                size="small"
                checked={node.approximation}
                onChange={(val) =>
                  graph.updateNode(node.id, { approximation: val })
                }
              />
            </td>
            <td>
              <RecordSearch
                key={node.uri}
                record={{ id: node.id, url: node.uri, label: this.props.graph!.uriCount.label(node) }}
                findByName={this.findByName}
                onSelectRecord={(record) => {
                  graph.updateNode(node.id, { uri: record.id, label: record.label });
                }}
              />
            </td>
            <td>
              <Button
                danger={true}
                disabled={node.isInContext}
                onClick={() => graph.removeNode(node.id)}
                type="primary"
                size="small"
              >
                Remove
                </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  }
}