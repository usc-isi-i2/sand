import { Button, Switch, Input } from "antd";
import React from "react";
import { Graph, LiteralDataType, AppStore } from "../../models";
import { RecordSearch } from "../primitives/RecordSearch";
import { RecordSelection, defaultRankByName } from "../primitives/RecordSelection";

interface Props {
  store: AppStore;
  graph: Graph;
  closeForm: () => void;
}

interface State {
  classNode?: { id: string, label: string };
  entityNode: { id: string, label: string };
  literalNode: { value: string, isInContext: boolean, datatype: LiteralDataType },
  approximation: boolean,
}

export default class AddNodeForm extends React.Component<Props, State> {
  public state: State = {
    approximation: false,
    entityNode: { id: "", label: "" },
    literalNode: { value: "", isInContext: false, datatype: "string" }
  }
  private datatypes = [
    { id: "string", label: "string" },
    { id: "entity-id", label: "entity-id" }
  ]

  findByName = (query: string) => {
    return this.props.store.findClassByName(query)
      .then((resp) => {
        return resp.map((r) => {
          return { ...r, id: r.uri };
        });
      });
  }

  addClassNode = () => {
    if (this.state.classNode === undefined) {
      return;
    }

    this.props.graph.addClassNode({
      id: this.props.graph.nextNodeId(),
      uri: this.state.classNode.id,
      approximation: this.state.approximation,
      label: this.state.classNode.label,
    });
    this.props.closeForm();
  }

  updateEntityNodeId = (e: any) => {
    this.setState({
      entityNode: { ...this.state.entityNode, id: e.target.value.trim() }
    });
  }

  updateEntityNodeLabel = (e: any) => {
    this.setState({
      entityNode: { ...this.state.entityNode, label: e.target.value }
    });
  }

  addEntityNode = () => {
    if (this.state.entityNode.id.length === 0 || !this.state.entityNode.id.startsWith("Q")) {
      return;
    }

    this.props.graph.addLiteralNode({
      id: this.props.graph.nextNodeId(),
      uri: "http://www.wikidata.org/entity/" + this.state.entityNode.id,
      label: `${this.state.entityNode.label.trim()} (${this.state.entityNode.id})`,
      datatype: "entity-id",
      // should modify it to pass this value from an input form
      isInContext: false,
    });
    this.props.closeForm();
  }

  addLiteralNode = () => {
    if (this.state.literalNode.value === "") {
      return;
    }

    this.props.graph.addLiteralNode({
      id: this.props.graph.nextNodeId(),
      uri: "",
      label: this.state.literalNode.value,
      datatype: this.state.literalNode.datatype,
      isInContext: this.state.literalNode.isInContext
    });
    this.props.closeForm();
  }

  render() {
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
                checked={this.state.approximation}
                onChange={(val) =>
                  this.setState({ approximation: val })
                }
              />
            </td>
            <td>
              <RecordSearch
                record={this.state.classNode}
                findByName={this.findByName}
                onSelectRecord={(record) => {
                  this.setState({ classNode: { id: record.id, label: record.label } });
                }}
              />
            </td>
            <td>
              <Button
                disabled={this.state.classNode === undefined}
                onClick={this.addClassNode}
                type="primary"
                size="small"
              >
                Save
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
      <table className="lightweight-table full-width">
        <thead>
          <tr>
            <th>QNode</th>
            <th>Label (optional - the qnode will be added to the end)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Input value={this.state.entityNode.id} onChange={this.updateEntityNodeId} />
            </td>
            <td>
              <Input value={this.state.entityNode.label} onChange={this.updateEntityNodeLabel} />
            </td>
            <td>
              <Button
                disabled={this.state.entityNode.id.length === 0}
                onClick={this.addEntityNode}
                type="primary"
                size="small"
              >
                Save
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
      <table className="lightweight-table full-width">
        <thead>
          <tr>
            <th>Literal value</th>
            <th>Is in context</th>
            <th>Datatype</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Input value={this.state.literalNode.value} onChange={(e) => {
                this.setState({
                  literalNode: { ...this.state.literalNode, value: e.target.value.trim() }
                });
              }} />
            </td>
            <td>
              <Switch
                size="small"
                checked={this.state.literalNode.isInContext}
                onChange={(val) => {
                  this.setState({
                    literalNode: { ...this.state.literalNode, isInContext: val }
                  });
                }}
              />
            </td>
            <td>
              <RecordSelection
                selectRecord={{ id: this.state.literalNode.datatype, label: this.state.literalNode.datatype }}
                onSelectRecord={(record) => {
                  this.setState({
                    literalNode: { ...this.state.literalNode, datatype: record.id as LiteralDataType }
                  });
                }}
                records={this.datatypes}
                rankByName={defaultRankByName(this.datatypes)}
              />
            </td>
            <td>
              <Button
                disabled={this.state.literalNode.value.length === 0}
                onClick={this.addLiteralNode}
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