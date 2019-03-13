import React from 'react'

export default class BToken extends React.Component {
  render() {
    return (
      <div className="btoken" style={{ width: 286, height: 300, float: 'left', margin: 4 }}>
        <h5 className="btoken-header">{this.props.title}</h5>
        <div className="btoken-body">
          <p className="btoken-text">
            <strong>token id:</strong> {this.props.id}
          </p>
          <p className="btoken-text">
            <strong>cid:</strong> {this.props.cid}
          </p>
          <p className="btoken-text">
            <strong>hash:</strong> {this.props.hash}
          </p>
          <p className="btoken-text">
            <strong>fee:</strong> {this.props.fee}
          </p>
          <p className="btoken-text">
            <strong>amount:</strong> {this.props.amount}
          </p>
          <p className="btoken-text">
            <strong>state:</strong> {this.props.state}
          </p>
        </div>
      </div>
    )
  }
}
