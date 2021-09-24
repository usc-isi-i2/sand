import { Button } from "antd";
import React from "react";
import { Graph, AppStore } from "../../models";
import { RecordSearch } from "../primitives/RecordSearch";

interface Props {
  store: AppStore;
  graph: Graph;
  source: string;
  target: string;
  closeForm: () => void;
}

interface State {
}

export default class EditEdgeForm extends React.Component<Props, State> {
  findEdgeByName = (query: string) => {
    return this.props.store.findPredicateByName(query)
      .then((resp) => {
        return resp.map((r) => {
          return { ...r, id: r.uri, url: r.uri };
        });
      });
  }

  render() {
    let graph = this.props.graph;
    let edge = graph.edge(this.props.source, this.props.target);
    let source = graph.node(edge.source);
    let target = graph.node(edge.target);

    return <div>
      <table className="lightweight-table full-width">
        <thead>
          <tr>
            <th>Source</th>
            <th>Target</th>
            <th>Predicate</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{source.label}</td>
            <td>{target.label}</td>
            <td>
              <RecordSearch
                key={edge.label}
                record={{ id: edge.uri, label: edge.label, url: edge.uri }}
                findByName={this.findEdgeByName}
                onSelectRecord={(record) => {
                  graph.updateEdge(edge.source, edge.target, { uri: record.id, label: record.label });
                }}
              />
            </td>
            <td>
              <Button
                danger={true}
                onClick={() => {
                  graph.removeEdge(edge.source, edge.target);
                  this.props.closeForm();
                }}
                type="primary"
                size="small"
              >
                Remove
                </Button>
            </td>
          </tr>
        </tbody>
      </table>
      {/* <table className="lightweight-table full-width mt-2">
        <thead>
          <tr>
            <th>Suggestion</th>
            <th>Freq</th>
            <th>Include</th>
            <th>Exclude</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{source.label}</td>
            <td>{target.label}</td>
            <td>
              <Switch size="small" checked={false} />
            </td>
            <td>
              <Switch size="small" checked={false} />
            </td>
            <td>
              <Button onClick={() => graph.removeEdge(edge.source, edge.target)} size="small">
                Select
                </Button>
            </td>
          </tr>
        </tbody>
      </table> */}
    </div>
  }
}