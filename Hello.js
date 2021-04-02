import React, { Component } from "react";

export default class Hello extends Component {
  componentDidMount() {
    console.log(" Hello JS componentDidMount ===>");
  }

  componentWillUnmount() {
    console.log(" Hello JS componentWillUnmount ===>");
  }

  render() {
    console.log(" Hello JS Render ===>");
    return (
      <div>
        <h1>Hello from Hello.JS</h1>
        <p>{this.props.name}</p>
      </div>
    );
  }
}
