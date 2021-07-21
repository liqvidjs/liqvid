// We prefer to use self because globalThis is weird in Firefox
let globals: any = typeof self == "undefined" ? globalThis : self;
globals.sleep = function (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
globals.fuzzTime = 50;
