import { Button, Switch } from "antd";
import Fuse from "fuse.js";
import memoizeOne from "memoize-one";
import React from "react";
import { Graph, AppStore } from "../../models";
import { RecordSearch } from "../primitives/RecordSearch";
import { RecordSelection } from "../primitives/RecordSelection";
import { GraphNodeColors } from "./Graph";

interface Props {
  store: AppStore;
  graph: Graph;
  closeForm: () => void;
}

interface State {
  source?: { id: string, label: string };
  target?: { id: string, label: string };
  predicate?: { id: string, label: string };
  approximation: boolean;
}

export default class AddEdgeForm extends React.Component<Props, State> {
  private popupContainer = React.createRef<HTMLDivElement>();
  public state: State = {
    approximation: false
  }

  findEdgeByName = (query: string) => {
    return this.props.store.findPredicateByName(query)
      .then((resp) => {
        return resp.map((r) => ({ ...r, id: r.uri }));
      });
  }

  getClassNodes = memoizeOne((id: string, version: number) => {
    return this.props.graph.nodes
      .filter(n => !n.isDataNode)
      .sort((n1, n2) => {
        if (n1.isClassNode) {
          return n2.isClassNode ? 0 : -1;
        } else if (n1.isLiteralNode) {
          return n2.isClassNode ? 1 : n2.isLiteralNode ? 0 : -1;
        } else {
          return n2.isDataNode ? 0 : 1;
        }
      })
      .map(n => {
        if (n.isClassNode) {
          return { id: n.id, label: this.props.graph.uriCount.label(n), style: { backgroundColor: GraphNodeColors.ClassNode.fill } };
        } else {
          return {
            id: n.id, label: n.label,
            style: {
              backgroundColor: (n.isDataNode ? GraphNodeColors.DataNode : n.isInContext ? GraphNodeColors.LiteralContextNode : GraphNodeColors.LiteralNonContextNode).fill
            }
          };
        }
      });
  });

  getNodes = memoizeOne((id: string, version: number) => {
    return this.props.graph.nodes
      .sort((n1, n2) => {
        if (n1.isClassNode) {
          return n2.isClassNode ? 0 : -1;
        } else if (n1.isLiteralNode) {
          return n2.isClassNode ? 1 : n2.isLiteralNode ? 0 : -1;
        } else {
          return n2.isDataNode ? 0 : 1;
        }
      })
      .map(n => {
        if (n.isClassNode) {
          return { id: n.id, label: this.props.graph.uriCount.label(n), style: { backgroundColor: GraphNodeColors.ClassNode.fill } };
        } else {
          return {
            id: n.id, label: n.label,
            style: {
              backgroundColor: (n.isDataNode ? GraphNodeColors.DataNode : n.isInContext ? GraphNodeColors.LiteralContextNode : GraphNodeColors.LiteralNonContextNode).fill
            }
          };
        }
      });
  });

  getSourceFuse = memoizeOne((id: string, version: number) => {
    return new Fuse(this.getClassNodes(id, version), {
      includeScore: true,
      keys: ['label']
    });
  });

  getTargetFuse = memoizeOne((id: string, version: number) => {
    return new Fuse(this.getNodes(id, version), {
      includeScore: true,
      keys: ['label']
    });
  });

  rankSourceByName = (query: string) => {
    return this.getSourceFuse(this.props.graph.id, this.props.graph.version).search(query).map(x => x.refIndex);
  }

  rankTargetByName = (query: string) => {
    return this.getTargetFuse(this.props.graph.id, this.props.graph.version).search(query).map(x => x.refIndex);
  }

  addEdge = () => {
    if (this.state.source === undefined || this.state.target === undefined || this.state.predicate === undefined) {
      return;
    }

    this.props.graph.addEdge({
      source: this.state.source.id,
      target: this.state.target.id,
      uri: this.state.predicate.id,
      approximation: this.state.approximation,
      label: this.state.predicate.label
    });
    this.props.closeForm();
  }

  render() {
    let graph = this.props.graph;
    return <div>
      <table className="lightweight-table full-width">
        <thead>
          <tr>
            <th>Approximation</th>
            <th>Source</th>
            <th>Target</th>
            <th>Predicate</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Switch
                size="small"
                checked={this.state.approximation}
                onChange={(val) =>
                  this.setState({ approximation: val })
                }
              />
            </td>
            <td>
              <RecordSelection
                selectRecord={this.state.source}
                records={this.getClassNodes(graph.id, graph.version)}
                onSelectRecord={(record) => {
                  this.setState({ source: record });
                }}
                rankByName={this.rankSourceByName} />
            </td>
            <td>
              <RecordSelection
                selectRecord={this.state.target}
                records={this.getNodes(graph.id, graph.version)}
                onSelectRecord={(record) => {
                  this.setState({ target: record });
                }}
                rankByName={this.rankTargetByName} />
            </td>
            <td>
              <RecordSearch
                key={(this.state.predicate || {}).id}
                record={this.state.predicate}
                findByName={this.findEdgeByName}
                onSelectRecord={(record) =>
                  this.setState({ predicate: record })
                }
              />
            </td>
            <td>
              <Button
                disabled={this.state.source === undefined || this.state.target === undefined || this.state.predicate === undefined}
                onClick={this.addEdge}
                type="primary"
                size="small"
              >
                Save
              </Button>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  }
}
