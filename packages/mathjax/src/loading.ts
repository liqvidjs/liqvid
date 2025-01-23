/**
 * Ready Promise
 */
const packages = MathJax._.components.package.Package.packages;
// output/svg doesn't load reliably for some reason...
const packageNames = Array.from(packages.keys()).filter(
  (name) => name !== "output/svg",
);

export const MathJaxReady = Promise.all([
  MathJax.loader.ready(...packageNames),
  MathJax.startup.promise,
]);
