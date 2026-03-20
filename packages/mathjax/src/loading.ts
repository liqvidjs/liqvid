import { waitFor } from "@liqvid/utils";

/**
 * Ready Promise
 */
export const MathJaxReady = waitFor(
  () =>
    typeof window !== "undefined" &&
    "MathJax" in window &&
    typeof window.MathJax === "object" &&
    window.MathJax !== null &&
    "_" in window.MathJax,
).then(async () => {
  const packages = MathJax._.components.package.Package.packages;
  const packageNames = Array.from(packages.keys()).filter((name) => {
    const pkg = packages.get(name)!;
    return pkg.isLoading || pkg.isLoaded;
  });

  await Promise.all([
    MathJax.loader.ready(...packageNames),
    MathJax.startup.promise,
  ]);
});
