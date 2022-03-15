# @liqvid/gsap

This module provides [GSAP](https://greensock.com/gsap/) integration for Liqvid.

## Installation

    $ npm install @liqvid/gsap

## Usage

See the [GSAP docs](https://greensock.com/docs/) and especially the [React section](https://greensock.com/react).

```tsx
import {useTimeline} from "@liqvid/gsap";
import {useEffect} from "react";

export function Demo() {
  const tl = useTimeline();
  
  useEffect(() => {
    tl.to(".box", {duration: 3, x: 800});
    tl.to(".box", {duration: 3, rotation: 360, y: 500});
    tl.to(".box", {duration: 3, x: 0});
  }, []);
  
  return (
    <section>
      <div className="box orange"></div>
      <div className="box grey"></div>
      <div className="box green"></div>
    </section>
  );
}
```
