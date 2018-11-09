import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Playback from '../playback';
import Player from '../Player';

import {PlayerPureReceiver} from '../shared';

import {bind} from '../utils/misc';

interface Props {
  list: React.Component;
}

interface State {
  activity: React.Component;
  paneOpen: boolean;
}

export default class Activities extends PlayerPureReceiver<Props, State> {
  constructor(props: Props & {player: Player}) {
    super(props);

    bind(this, ['close', 'open', 'togglePane']);

    this.state = {
      activity: null,
      paneOpen: false
    };
  }

  close() {
    this.setState({activity: null});
  }

  open(Activity: React.Component) {
    this.setState({activity: Activity, paneOpen: false});
  }

  togglePane() {
    this.setState({
      paneOpen: !this.state.paneOpen
    });
  }

  render() {
    const {paneOpen} = this.state;

    const dialogStyle = {
      display: paneOpen ? 'block' : 'none'
    };

    const barMargin = 31,
          barSep = 10,
          barHeight = 6,
          barWidth = 50;

    const ActivityList = this.props.list;

    return (
      <div id="rp-controls-activities">
        {this.state.activity && <ActivityOverlay activity={this.state.activity} close={this.close}/>}
        <div id="rp-activities-dialog" style={dialogStyle}>
          <ActivityList open={this.open}/>
        </div>
        <svg onClick={this.togglePane} height="36" width="36" viewBox="0 0 100 100">
          <rect x={(100 - barWidth) / 2} y={barMargin} height={barHeight} width={barWidth} fill="#FFF"/>
          <rect x={(100 - barWidth) / 2} y={barMargin + barHeight + barSep} height={barHeight} width={barWidth} fill="#FFF"/>
          <rect x={(100 - barWidth) / 2} y={barMargin + 2 * (barHeight + barSep)} height={barHeight} width={barWidth} fill="#FFF"/>
        </svg>
      </div>
    );
  }
}

class ActivityOverlay extends React.PureComponent<{activity: React.PureComponent, close: Function}> {
  render() {
    const Activity = this.props.activity;

    return ReactDOM.createPortal(
      <div id="rp-activity-overlay">
        <Activity close={this.props.close}/>
      </div>,
      document.body
    );
  }
}
