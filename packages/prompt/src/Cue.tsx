import * as React from "react";

const NS = "lv-prompt";

interface Props {
  active?: boolean;

  children?: React.ReactNode;

  /** Name of marker when this cue should be active */
  on: string;
}

interface State {
  lines: string[];
}

/** Lines to be read at a particular marker */
export class Cue extends React.PureComponent<Props, State> {
  private ref: HTMLDivElement;

  constructor(props: Props) {
    super(props);

    this.state = {
      lines: null
    };
  }

  componentDidMount() {
    if (!this.props.children) return;

    this.ref.normalize();
    const lines = [];

    for (const node of Array.from(this.ref.childNodes)) {
      if (!isText(node)) continue;

      const blocks = node.wholeText.split(" ");

      let line = blocks.shift();
      let text = line;
      node.replaceData(0, node.wholeText.length, text);
      let height = this.ref.getBoundingClientRect().height;

      for (const block of blocks) {
        node.replaceData(0, node.wholeText.length, `${text} ${block}`);
        const newHeight = this.ref.getBoundingClientRect().height;

        if (newHeight !== height) {
          height = newHeight;
          lines.push(line);
          line = block;
        } else {
          line += ` ${block}`;
        }

        text += ` ${block}`;
      }
      lines.push(line);
    }

    this.setState({lines});
  }

  render() {
    if (!this.props.children) {
      return " | ";
    }
    const spanClasses = [`${NS}-cue`];
    const divClasses = [`${NS}-line`];

    if (this.props.active) {
      spanClasses.push("active");
      divClasses.push("active");
    }

    return (
      <React.Fragment>
        <span className={spanClasses.join(" ")}>{this.props.on}</span>

        {this.state.lines ?
          this.state.lines.map((line, n) => (
            <div className={divClasses.join(" ")} key={n}>{line}</div>
          )) :
          (<div className={`${NS}-measure`} ref={ref => this.ref = ref}>{this.props.children}</div>)
        }
      </React.Fragment>
    );
  }
}

function isText(node: Node): node is Text {
  return node.nodeType === node.TEXT_NODE;
}
