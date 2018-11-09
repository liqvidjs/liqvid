import * as React from 'react';

import {requestFullScreen, exitFullScreen, isFullScreen, onFullScreenChange} from '../polyfills';

export default class FullScreen extends React.PureComponent<{}, {}> {
  componentDidMount() {
    onFullScreenChange(() => this.forceUpdate());
  }

  render() {
    return (isFullScreen() ?
      <svg className="rp-controls-fullscreen" onClick={exitFullScreen} viewBox="0 0 36 36">
        <path fill="white" d="M 14 14 h -4 v 2 h 6 v -6 h -2 v 4 z"/>
        <path fill="white" d="M 22 14 v -4 h -2 v 6 h 6 v -2 h -4 z"/>
        <path fill="white" d="M 20 26 h 2 v -4 h 4 v -2 h -6 v 6 z"/>
        <path fill="white" d="M 10 22 h 4 v 4 h 2 v -6 h -6 v 2 z"/>
      </svg>
      :
      <svg className="rp-controls-fullscreen" onClick={requestFullScreen} viewBox="0 0 36 36">
        <path fill="white" d="M 10 16 h 2 v -4 h 4 v -2 h -6 v 6 z"/>
        <path fill="white" d="M 20 10 v 2 h 4 v 4 h 2 v -6 h -6 z"/>
        <path fill="white" d="M 24 24 h -4 v 2 h 6 v -6 h -2 v 4 z"/>
        <path fill="white" d="M 12 20 h -2 v 6 h 6 v -2 h -4 v -4 z"/>
      </svg>
    );
  }
}
