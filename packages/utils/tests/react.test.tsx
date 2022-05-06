import {render} from "@testing-library/react";
import {useContext} from "react";
import {createUniqueContext} from "../src/react";

describe("react/createUniqueContext", () => {
  test("returns same value for same key", () => {
    const a = createUniqueContext("A");
    const b = createUniqueContext("A");
    expect(a).toBe(b);
  });

  test("returns different values for different keys", () => {
    const a = createUniqueContext("B");
    const b = createUniqueContext("C");
    expect(a).not.toBe(b);
  });

  test("provides correct default value", () => {
    const context = createUniqueContext<number>("D", 4);
    
    function Component(): null {
      expect(useContext(context)).toBe(4);
      return null;
    }
    render(<Component/>);
  });
});
