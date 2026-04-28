type Matcher = RegExp | string | ((line: string) => boolean);

function matches(line: string, matcher: Matcher) {
  if (typeof matcher === "string") {
    return line.includes(matcher);
  } else if (matcher instanceof RegExp) {
    return Boolean(line.match(matcher));
  } else {
    return matcher(line);
  }
}

export class Doc {
  lines: string[];

  constructor(html: string) {
    this.lines = html.split("\n");
  }

  line(search: Matcher) {
    const index = this.lines.findIndex((l) => matches(l, search));
    if (index === -1) {
      throw new Error(`no line matching "${search}"`);
    }

    return new Line(index, this);
  }

  range(start: Matcher, end: Matcher) {
    const startIndex = this.lines.findIndex((l) => matches(l, start));
    if (startIndex === -1) {
      throw new Error(`no line matching "${start}"`);
    }

    const endIndex = this.lines.findIndex((l) => matches(l, end));
    if (endIndex === -1) {
      throw new Error(`no line matching "${end}"`);
    }

    return new LineRange(startIndex, endIndex, this);
  }

  parent() {
    return this;
  }

  toString() {
    return this.lines.join("\n");
  }
}

class Line {
  constructor(
    public readonly index: number,
    public parent: Doc,
  ) {}

  before(str: string, indent = 0) {
    const newLines = str.split("\n");
    if (newLines[0].trim().length === 0) newLines.shift();
    if (newLines.at(-1).trim().length === 0) newLines.pop();

    if (newLines.length === 0) return this;

    const whitespaceLength = newLines.reduce(
      (acc, curr) => Math.min(acc, leadingWhitespace(curr)),
      leadingWhitespace(newLines[0]),
    );

    const priorIndent =
      this.index === 0 ? 0 : leadingWhitespace(this.parent.lines[this.index]);

    for (let i = 0; i < newLines.length; ++i) {
      newLines[i] =
        " ".repeat(priorIndent + indent) + newLines[i].slice(whitespaceLength);
    }

    this.parent.lines.splice(this.index, 0, ...newLines);
    return this;
  }

  after(str: string, indent = 0) {
    const newLines = str.split("\n");
    if (newLines[0].trim().length === 0) newLines.shift();
    if (newLines.at(-1).trim().length === 0) newLines.pop();

    if (newLines.length === 0) return this;

    const whitespaceLength = newLines.reduce(
      (acc, curr) => Math.min(acc, leadingWhitespace(curr)),
      leadingWhitespace(newLines[0]),
    );

    const priorIndent =
      this.index === 0 ? 0 : leadingWhitespace(this.parent.lines[this.index]);

    for (let i = 0; i < newLines.length; ++i) {
      newLines[i] =
        " ".repeat(priorIndent + indent) + newLines[i].slice(whitespaceLength);
    }

    this.parent.lines.splice(this.index + 1, 0, ...newLines);
    return this;
  }

  to(selector: Matcher) {
    for (let i = this.index; i < this.parent.lines.length; ++i) {
      const line = this.parent.lines[i];
      if (matches(line, selector)) {
        return new LineRange(this.index, i, this.parent);
      }
    }
    throw new Error(`could not find line matching ${selector}`);
  }

  toString() {
    return this.parent.lines[this.index];
  }
}

class LineRange {
  constructor(
    public readonly startIndex: number,
    public readonly endIndex: number,
    public parent: Doc,
  ) {}

  inner() {
    return new LineRange(this.startIndex + 1, this.endIndex - 1, this.parent);
  }

  wrap(start: string, end: string) {
    const priorIndent =
      this.startIndex === 0
        ? 0
        : leadingWhitespace(this.parent.lines[this.startIndex]);

    const indent = " ".repeat(priorIndent);

    this.parent.lines.splice(this.startIndex, 0, indent + start);
    for (let i = this.startIndex + 1; i < this.endIndex + 2; ++i) {
      this.parent.lines[i] = " ".repeat(2) + this.parent.lines[i];
    }
    this.parent.lines.splice(this.endIndex + 2, 0, indent + end);
    return this;
  }

  toString() {
    return this.parent.lines
      .slice(this.startIndex, this.endIndex + 1)
      .join("\n");
  }
}

function leadingWhitespace(str: string) {
  return str.match(/^\s*/)[0]?.length ?? 0;
}

export function modify(
  html: string,
  callback: (doc: Doc) => Doc | Line | LineRange = (doc) => doc,
) {
  return callback(new Doc(html)).parent.toString();
}
