import exp from "constants";
import {tag, transform, scripts, styles} from "..";

jest.spyOn(console, "warn").mockImplementation(() => {});

// describe("default assets", () => {
  
// });

test("@json", () => {
  const content = `<!-- @json "test" "./test.json" -->`;
  const str = transform(content, {mode: "development", scripts: {}, styles: {}});

  expect(str).toBe(`<link as="fetch" data-name="test" href="./test.json" rel="preload" type="application/json"/>`);
});

describe("@script", () => {
  const config = {
    scripts: {
      "basic": {
        "development": "https://dev.com",
        "production": "https://prod.com"
      },
      "devOnly": {
        "development": "https://dev.only"
      },
      "prodOnly": {
        "production": "https://prod.only"
      },
      "single": "https://same-url.com",
      "withIntegrity": {
        "crossorigin": "anonymous",
        "defer": true,
        "integrity": "sha384",
        "development": "https://dev.com", 
        "production": "https://prod.com"
      }
    },
    styles: {}
  };

  test("single script", () => {
    const content = `<!-- @script "single" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe(`<script src="https://same-url.com"></script>`);
    expect(transform(content, {mode: "production", ...config})).toBe(`<script src="https://same-url.com"></script>`);
  })

  test("mode selection", () => {
    const content = `<!-- @script "basic" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe(`<script src="https://dev.com"></script>`);
    expect(transform(content, {mode: "production", ...config})).toBe(`<script src="https://prod.com"></script>`);
  });

  test("integrity attribute", () => {
    const content = `<!-- @script "withIntegrity" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe(`<script crossorigin="anonymous" src="https://dev.com"></script>`);
    expect(transform(content, {mode: "production", ...config})).toBe(`<script crossorigin="anonymous" integrity="sha384" src="https://prod.com"></script>`);
  });

  test("complain about missing script", () => {
    const content = `<!-- @script "missing" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe(content);
    expect(console.warn).toHaveBeenCalledWith("Missing script missing");
    expect(transform(content, {mode: "production", ...config})).toBe(content);
    expect(console.warn).toHaveBeenCalledWith("Missing script missing");
  });

  test("dev only", () => {
    const content = `<!-- @script "devOnly" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe(`<script src="https://dev.only"></script>`);
    expect(transform(content, {mode: "production", ...config})).toBe("");
  });

  test("prod only", () => {
    const content = `<!-- @script "prodOnly" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe("");
    expect(transform(content, {mode: "production", ...config})).toBe(`<script src="https://prod.only"></script>`);
  });
});

describe("@styles", () => {
  const config = {
    scripts: {},
    styles: {
      "basic": {
        "development": "https://dev.com",
        "production": "https://prod.com"
      },
      "devOnly": {
        "development": "https://dev.only"
      },
      "prodOnly": {
        "production": "https://prod.only"
      },
      "single": "https://same-url.com",
      "withIntegrity": {
        "crossorigin": "anonymous",
        "defer": true,
        "integrity": "sha384",
        "development": "https://dev.com", 
        "production": "https://prod.com"
      }
    }
  };

  test("single style", () => {
    const content = `<!-- @style "single" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe(`<link href="https://same-url.com" rel="stylesheet" type="text/css"/>`);
    expect(transform(content, {mode: "production", ...config})).toBe(`<link href="https://same-url.com" rel="stylesheet" type="text/css"/>`);
  })

  test("mode selection", () => {
    const content = `<!-- @style "basic" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe(`<link href="https://dev.com" rel="stylesheet" type="text/css"/>`);
    expect(transform(content, {mode: "production", ...config})).toBe(`<link href="https://prod.com" rel="stylesheet" type="text/css"/>`);
  })

  test("complain about missing style", () => {
    const content = `<!-- @style "missing" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe(content);
    expect(console.warn).toHaveBeenCalledWith("Missing style missing");
    expect(transform(content, {mode: "production", ...config})).toBe(content);
    expect(console.warn).toHaveBeenCalledWith("Missing style missing");
  });

  test("dev only", () => {
    const content = `<!-- @style "devOnly" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe(`<link href="https://dev.only" rel="stylesheet" type="text/css"/>`);
    expect(transform(content, {mode: "production", ...config})).toBe("");
  });

  test("prod only", () => {
    const content = `<!-- @style "prodOnly" -->`;
    expect(transform(content, {mode: "development", ...config})).toBe("");
    expect(transform(content, {mode: "production", ...config})).toBe(`<link href="https://prod.only" rel="stylesheet" type="text/css"/>`);
  });
});

describe("tag", () => {
  test("no args", () => {
    expect(tag("p")).toBe(`<p></p>`);
  });

  test("attrs", () => {
    expect(tag("script", {src: "test.js", type: "text/javascript"})).toBe(`<script src="test.js" type="text/javascript"></script>`);
  });

  test("boolean attribute", () => {
    expect(tag("script", {crossorigin: true, src: "test.js"})).toBe(`<script crossorigin src="test.js"></script>`);
  });

  test("function content", () => {
    expect(tag("a", {href: "test.html"}, () => "Click Here")).toBe(`<a href="test.html">Click Here</a>`);
  });

  test("escape quotes", () => {
    expect(tag("span", {title: `"this is a test"`}, "Hello")).toBe(`<span title="&quot;this is a test&quot;">Hello</span>`);
  });

  test("self-closing tag", () => {
    expect(tag("link", {href: "test.css"}, true)).toBe(`<link href="test.css"/>`);
  });
});
