"use strict";

(() => {

const setDims = () => {
  document.body.style.setProperty("--vh", `${window.innerHeight}px`);
  document.body.style.setProperty("--vw", `${window.innerWidth}px`);
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

  // live collection of iframes
  const iframes = document.getElementsByTagName("iframe");

  const listener = (e) => {
    for (let i = 0; i < iframes.length; ++i) {
      const iframe = iframes.item(i);
      if (iframe.allowFullscreen && !document.fullscreenEnabled && iframe.contentWindow === e.source) {
        // handle the resize event
        if ("type" in e.data && e.data.type === "fake-fullscreen") {
          // resize event doesn't work reliably in iOS...
          setDims();
          iframe.classList.toggle("fake-fullscreen", e.data.value);
        }
        return;
      }
    }
  };

  // communicate with children
  window.addEventListener("message", listener);
});

})();
