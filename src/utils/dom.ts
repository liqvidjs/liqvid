export function fragmentFromHTML(str: string): DocumentFragment {
  const t = document.createElement("template");
  t.innerHTML = str;
  return t.content.cloneNode(true) as DocumentFragment;
}
