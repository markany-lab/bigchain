import React from 'react'

export default class BOrder extends React.Component {
  render() {
    return (
      <div className="btoken" style={{ width: 450, height: 300, float: 'left', margin: 4 }}>
        <h5 className="btoken-header">order {this.props.id}</h5>
        <div className="btoken-body">
          <p className="btoken-text">
            <strong>orderer:</strong> {this.props.orderer}
          </p>
          <p className="btoken-text">
            <strong>bid:</strong> {this.props.bid}
          </p>
          <p className="btoken-text">
            <strong>deposit:</strong> {this.props.deposit}
          </p>
          <p className="btoken-text">
            <strong>state:</strong> {this.props.state}
          </p>
        </div>
        <div className="btoken-footer">
          <button
            disabled={this.props.disabled}
            type="button"
            className="btn btn-primary"
            onClick={() => this.props.handleOnClick()}>
            {this.props.action}
          </button>
        </div>
      </div>
    )
  }
}
