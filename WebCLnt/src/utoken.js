import React from 'react'

export default class BToken extends React.Component {
  render() {
    return (
      <div className="btoken" style={{ width: 400, height: 300, float: 'left', margin: 4 }}>
        <h5 className="btoken-header">{this.props.id}</h5>
        <div className="btoken-body">
          <p className="btoken-text">
            <strong>orderer:</strong> {this.props.user}
          </p>
          <p className="btoken-text">
            <strong>contents token id:</strong> {this.props.cTokenId}
          </p>
          <p className="btoken-text">
            <strong>state:</strong> {this.props.state}
          </p>
        </div>
      </div>
    )
  }
}
