import {getJSON, loadAllJSON, loadJSON} from "../src/json";

declare module "../src/json" {
  interface GetJSONMap {
    A: any;
    B: any;
    C: never;
  }
}

/* mock fetch */
// @ts-expect-error fetch is read-only
global.fetch = jest.fn((href: string) =>
  Promise.resolve({
    json: () => Promise.resolve({value: href}),
  })
);

beforeEach(() => {
  // @ts-expect-error mockClear doesn't exist on the actual fetch
  fetch.mockClear();

  document.head.innerHTML = `
    <link rel="preload" type="application/json" data-name="A" href="./A.json"/>
    <link rel="preload" type="application/json" data-name="B" href="./B.json"/>
    <link rel="preload" type="application/json" href="./C.json"/>
  `;
});

describe("json/*", () => {
  /* not found */
  test("async not found", () => {
    expect(loadJSON("C")).rejects.toEqual("JSON record \"C\" not found");
  })
  
  test("sync not found", () => {
    expect(() => getJSON("A")).toThrow("JSON record \"A\" not loaded");
  });

  test("async found", () => {
    expect(loadJSON("A")).resolves.toEqual({value: "http://localhost/A.json"});
  })

  test("async preload", () => {
    const promise = loadAllJSON().then(() => {
      return [getJSON("A"), getJSON("B")];
    })
    expect(promise).resolves.toEqual([{value: "http://localhost/A.json"}, {value: "http://localhost/B.json"}]);
  })
});
