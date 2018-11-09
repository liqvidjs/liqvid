import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Playback from '../playback';

import {bind} from '../utils/misc';

/* individual controls */
interface Props {
  ref: Function;
}

interface State {
  dialogOpen: boolean;
}

export default class Help extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    bind(this, ['openDialog']);

    this.state = {dialogOpen: false};
  }

  closeDialog() {
    this.setState({
      dialogOpen: false
    });    
  }

  openDialog() {
    this.setState({
      dialogOpen: true
    });
  }

  toggleDialog() {
    this.setState({
      dialogOpen: !this.state.dialogOpen
    });
  }

  render() {
    const dialogStyle = {
      display: this.state.dialogOpen ? 'block' : 'none'
    };

    return (
      <>
        <HelpDialog style={dialogStyle} openDialog={this.openDialog}/>
        <svg className="rp-controls-help" onClick={this.openDialog} viewBox="0 0 20 20">
          <path
            d="m 10.896484,3.8652344 c -1.2309996,0 -1.7499996,0.8536094 -1.7499996,1.4746094 -0.026,0.737 0.39525,1.1816406 1.2812496,1.1816406 1.059,0 1.679688,-0.7171875 1.679688,-1.4921875 0,-0.621 -0.274938,-1.1640625 -1.210938,-1.1640625 z"
            fill="#FFF"
            stroke="none"
          />
          <path
            d="m 10.847656,8.0332031 c -0.765,0 -2.5524216,0.7615469 -4.1074216,2.0605469 l 0.3183594,0.523438 c 0.49,-0.33 1.3207187,-0.664063 1.5117187,-0.664063 0.148,0 0.127,0.193734 0,0.677734 L 7.8378906,13.65625 c -0.447,1.705 0.020156,2.09375 0.6601563,2.09375 0.639,0 2.2877811,-0.58175 3.8007811,-2.09375 L 11.9375,13.169922 c -0.618,0.487 -1.247453,0.71875 -1.439453,0.71875 -0.149,0 -0.2115,-0.19386 -0.0625,-0.75586 l 0.839844,-3.179687 c 0.319,-1.164 0.212265,-1.9199219 -0.427735,-1.9199219 z"
            fill="#FFF"
            stroke="none"
          />
        </svg>
      </>
    );
  }
}

class HelpDialog extends React.PureComponent<{openDialog: () => void, style: any}> {
  render() {
    const videoShortcuts = [
      ['j', 'Go back 10 seconds'],
      ['<Left>', 'Go back 5 seconds'],
      [() => (
        <tr key='space'>
          <th scope="row"><kbd>k</kbd> or <kbd>&lt;Space&gt;</kbd></th>
          <td>Play/pause</td>
        </tr>
      )],
      ['<Right>', 'Go forward 5 seconds'],
      ['l', 'Go forward 10 seconds'],
      [() => (
        <tr key='number'>
          <th scope="row"><kbd>&lt;0&gt;</kbd> – <kbd>&lt;9&gt;</kbd></th>
          <td>Skip to 10<var>n</var>% of the way through the video</td>
        </tr>
      )],

      ['f', 'Full screen'],
      
      ['<Up>', 'Increase volume 5%'],
      ['<Down>', 'Decrease volume 5%'],
      ['m', 'Mute/unmute'],
      ["?", "Show help"]
    ];

    const controls3D = [
      ['Left mouse', 'Orbit'],
      ['Scroll wheel', 'Zoom'],
      ['Right mouse', 'Pan']
    ];

    return ReactDOM.createPortal(
      <div className="rp-help-dialog" style={this.props.style}>
        <button onClick={this.props.openDialog}>&times;</button>

        <div className="rp-help-tables">
          <table>
            <caption>Video controls</caption>
            <tbody>
              {videoShortcuts.map(([key, desc]) => (
                typeof key === 'function' ? key() :
                <tr key={key}>
                  <th scope="row"><kbd>{key}</kbd></th>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table>
            <caption>3D controls</caption>
            <tbody>
              {controls3D.map(([key, desc]) => (
                <tr key={key}>
                  <th scope="row"><kbd>{key}</kbd></th>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>,
      document.body
    );
  }
}
