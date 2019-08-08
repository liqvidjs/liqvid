// convert screen to SVG coords
export function screenToSVG(elt: SVGElement, x: number, y: number): [number, number] {
  let graphicsElt = elt;

  while (!(graphicsElt instanceof SVGGraphicsElement))
    graphicsElt = graphicsElt.parentNode as SVGElement;

  const svgElt = (elt instanceof SVGSVGElement ? elt : elt.ownerSVGElement);

  const transform = graphicsElt.getScreenCTM().inverse();
  let pt = svgElt.createSVGPoint();
  pt.x = x, pt.y = y;

  pt = pt.matrixTransform(transform);
  return [pt.x, pt.y];
  // const rect = svg.getBoundingClientRect(),
  //       viewBox = svg.viewBox.baseVal,
  //       aspectX = rect.width / viewBox.width,
  //       aspectY = rect.height / viewBox.height,
  //       svgX = (x - rect.left) / aspectX + viewBox.x,
  //       svgY = (y - rect.top) / aspectY + viewBox.y;

  // return [svgX, svgY];
}

export function screenToSVGVector(svg: SVGSVGElement, dx: number, dy: number): [number, number] {
  const rect = svg.getBoundingClientRect(),
        viewBox = svg.viewBox.baseVal,
        aspectX = rect.width / viewBox.width,
        aspectY = rect.height / viewBox.height,
        svgDx = dx / aspectX,
        svgDy = dy / aspectY;

  return [svgDx, svgDy];
}
