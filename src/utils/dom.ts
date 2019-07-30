export function fragmentFromHTML(str: string) {
  const t = document.createElement("template");
  t.innerHTML = str;
  return t.content.cloneNode(true) as DocumentFragment;
}
