"use strict";

(() => {

const setDims = () => {
  document.body.style.setProperty("--vh", `${document.documentElement.clientHeight}px`);
  document.body.style.setProperty("--vw", `${document.documentElement.clientWidth}px`);
  document.body.style.setProperty("--scroll-y", `${window.scrollY || 0}px`);
};

document.addEventListener("DOMContentLoaded", () => {
  // add CSS
  {
    const style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.textContent = `
    iframe.fake-fullscreen {
      position: fixed;
      top: 0;/*var(--scroll-y);*/
      left: 0;
      height: var(--vh);
      width: var(--vw);
      z-index: 10000;
    }

    @media (orientation: portrait) {
      iframe.fake-fullscreen {
        transform: rotate(-90deg);
        transform-origin: top left;
        left: 0;
        top: 100%;
        width: var(--vh);
        height: var(--vw);
      }
    }`;
    document.head.appendChild(style);
  }

  // resize listener
  window.addEventListener("resize", setDims);
  setDims();

  const iframes = Array.from(document.querySelectorAll("iframe")).filter(_ => _.allowFullscreen && !document.fullscreenEnabled);

  const listener = (e) => {
    const iframe = iframes.find(_ => _.contentWindow === e.source);
    if (!iframe) return;

    if ("type" in e.data && e.data.type === "fake-fullscreen") {
      // resize event doesn't work reliably in iOS...
      setDims();
      iframe.classList.toggle("fake-fullscreen", e.data.value);
    }
  };

  // communicate with children
  window.addEventListener("message", listener);
});

})();
