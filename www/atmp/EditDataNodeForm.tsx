import { Button, Switch } from "antd";
import React from "react";
import { Graph, GraphEdge, AppStore } from "../../models";
import { RecordSearch, Record } from "../primitives/RecordSearch";
import { GraphNodeColors } from "./Graph";

interface Props {
  store: AppStore;
  graph: Graph;
  nodeId: string;
  closeForm: () => void;
}

interface State {
  nodeApproximation: boolean;
  edgeApproximation: boolean;
  sourceId?: string;
  sourceURI?: string;
  sourceLabel?: string;
  predicateURI?: string;
  predicateLabel?: string;
}

export default class EditDataNodeForm extends React.Component<Props, State> {
  public state: State = {
    nodeApproximation: false,
    edgeApproximation: false
  }

  findNodeByName = (query: string) => {
    return this.props.store.findClassByName(query)
      .then((resp) => {
        return resp.flatMap((r) => {
          let nodes = this.props.graph.nodesByURI(r.uri);
          let lst: Record[] = nodes.map(node => ({
            id: node.id,
            label: this.props.graph.uriCount.label(node),
            description: r.description,
            style: {
              backgroundColor: GraphNodeColors.ClassNode.fill,
            }
          }));
          lst.push({
            id: `null:${r.uri}`,
            label: this.props.graph.uriCount.nextLabel(r.uri, r.label),
            description: r.description,
          });
          return lst;
        });
      });
  }

  findEdgeByName = (query: string) => {
    return this.props.store.findPredicateByName(query)
      .then((resp) => {
        return resp.map(r => ({ ...r, id: r.uri }));
      });
  }

  updateClassNode = (edge: GraphEdge, record: { id: string, label: string }) => {
    let source;
    if (record.id.startsWith("null:")) {
      // add new node
      source = this.props.graph.nextNodeId();
      this.props.graph.addClassNode({
        id: source,
        approximation: false,
        uri: record.id.substring("null:".length),
        label: this.props.graph.uriCount.unlabel(record.label),
      });
    } else {
      source = record.id;
    }

    // update edge
    this.props.graph.addEdge({
      source,
      target: this.props.nodeId,
      label: edge.label, approximation: edge.approximation, uri: edge.uri
    })
    this.props.graph.removeEdge(edge.source, edge.target);
  }

  updateEdge = (edge: GraphEdge, record: { id: string, label: string }) => {
    this.props.graph.updateEdge(edge.source, edge.target, { uri: record.id, label: record.label });
  }

  addSemType = () => {
    let source;
    if (this.state.sourceId === undefined) {
      // add new node
      source = this.props.graph.nextNodeId();
      this.props.graph.addClassNode({
        id: source,
        approximation: this.state.nodeApproximation,
        uri: this.state.sourceURI!,
        // we need to un-label as we don't want to have the number at the end (see defintion of the `label` property)
        label: this.props.graph.uriCount.unlabel(this.state.sourceLabel!),
      });
    } else {
      source = this.state.sourceId;
    }

    this.props.graph.addEdge({
      source,
      target: this.props.nodeId,
      label: this.state.predicateLabel!,
      approximation: this.state.edgeApproximation,
      uri: this.state.predicateURI!
    });
    this.setState({
      sourceId: undefined,
      sourceLabel: undefined,
      sourceURI: undefined,
      predicateLabel: undefined,
      predicateURI: undefined,
      nodeApproximation: false,
      edgeApproximation: false
    });
  }

  render() {
    let graph = this.props.graph;
    let node = graph.node(this.props.nodeId);
    let incomingEdges = this.props.graph.incomingEdges(node.id);

    return <div>
      <table className="lightweight-table full-width">
        <thead>
          <tr>
            <th>Class Approx.</th>
            <th>Class</th>
            <th>Predicate Approx.</th>
            <th>Predicate</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incomingEdges.map((edge) => {
            let node = this.props.graph.node(edge.source);
            return <tr key={edge.source}>
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
                  key={node.id}
                  record={{ id: node.id, url: node.uri, label: graph.uriCount.label(node) }}
                  findByName={this.findNodeByName}
                  onSelectRecord={(record) => {
                    this.updateClassNode(edge, record);
                  }}
                />
              </td>
              <td>
                <Switch
                  size="small"
                  checked={edge.approximation}
                  onChange={(val) =>
                    graph.updateEdge(edge.source, edge.target, { approximation: val })
                  }
                />
              </td>
              <td>
                <RecordSearch
                  key={edge.label}
                  record={{ id: edge.uri, label: edge.label }}
                  findByName={this.findEdgeByName}
                  onSelectRecord={(record) => {
                    this.updateEdge(edge, record);
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
          })}
          <tr>
            <td>
              <Switch
                size="small"
                checked={this.state.nodeApproximation}
                onChange={(val) =>
                  this.setState({ nodeApproximation: val })
                }
              />
            </td>
            <td>
              <RecordSearch
                key={this.state.sourceId || this.state.sourceURI}
                record={
                  this.state.sourceId || this.state.sourceURI ? {
                    id: this.state.sourceId || `null:${this.state.sourceURI}`,
                    label: this.state.sourceId !== undefined ?
                      graph.uriCount.label(graph.node(this.state.sourceId)) :
                      this.state.sourceLabel!
                  } : undefined
                }
                findByName={this.findNodeByName}
                onSelectRecord={(record) => {
                  if (record.id.startsWith("null:")) {
                    // new node
                    this.setState({
                      sourceId: undefined,
                      sourceURI: record.id.substring("null:".length),
                      sourceLabel: record.label,
                    });
                  } else {
                    this.setState({
                      sourceId: record.id,
                      sourceURI: undefined,
                      sourceLabel: undefined,
                    });
                  }
                }}
              />
            </td>
            <td>
              <Switch
                size="small"
                checked={this.state.edgeApproximation}
                onChange={(val) =>
                  this.setState({ edgeApproximation: val })
                }
              />
            </td>
            <td>
              <RecordSearch
                key={this.state.predicateURI || ""}
                record={this.state.predicateURI ? {
                  id: this.state.predicateURI,
                  label: this.state.predicateLabel!
                } : undefined}
                findByName={this.findEdgeByName}
                onSelectRecord={(record) => {
                  this.setState({
                    predicateURI: record.id,
                    predicateLabel: record.label,
                  })
                }}
              />
            </td>
            <td>
              <Button
                onClick={this.addSemType}
                disabled={!((this.state.sourceId || this.state.sourceURI) && (this.state.predicateURI))}
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