import * as React from "react";
import {render} from "@testing-library/react";

import "./matchMedia.mock";
import "./DocumentTimeline.mock";

import {IdMap} from "..";

function Component() {
  return (
    <div>
      <IdMap>
        <h1 id="a">Hello World</h1>
      </IdMap>
    </div>
  );
}

describe("IdMap", () => {
  const objects = {
    a: {
      className: "demo-a",
      style: {
        color: "red",
      },
    },
  };

  test("root works", () => {
    render(
      <IdMap map={objects}>
        <h1 id="a">Hello World</h1>
      </IdMap>,
    );
    const h1 = document.querySelector("h1");
    expect(h1.className).toBe("demo-a");
    expect(h1.style.color).toBe("red");
  });

  test("nested works", () => {
    render(
      <IdMap map={objects}>
        <Component />
      </IdMap>,
    );
    const h1 = document.querySelector("h1");
    expect(h1.className).toBe("demo-a");
    expect(h1.style.color).toBe("red");
  });
});
