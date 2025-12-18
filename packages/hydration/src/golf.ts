export const golf = {
  comma: (...vals: (string | false)[]) => vals.filter(Boolean).join(","),
  cookies: "c",
  document: "d",
  getElementById: "$",

  join: (...vals: (string | false)[]) => vals.filter(Boolean).join(""),
  localStorage: "l",
  node: "n",
  sessionStorage: "s",
  url: "u",
  value: "v",
};
