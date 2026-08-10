import { Cue as GenericCue, Prompt } from "#components/liqvid/prompts.tsx";

import type { M } from "./markers.ts";

type P = React.ComponentProps<typeof Prompt>;

const Cue = GenericCue<M>;

export const CodePrompt = (props: P) => (
  <Prompt name="path" {...props}>
    <Cue on="m1">
      Okay, so we've seen how to use HTML to mark up our content, but so far our
      content looks very plain. In this video I'm going to show you how to use
      CSS, or Cascading Style Sheets, to make our webpage look pretty. Here we
      have a sample page with some filler text. In this video I'm just going to
      focus on the basics of colors, backgrounds, fonts, and spacing. Remember
      to pause frequently and try things out in the Playground tab!
    </Cue>
    <Cue on="m2">
      So to get started, I want to put in a style tag and then here I can put in
      CSS. The thing I want to do is make the fonts sans-serif so that my eyes
      don't bleed. On the web we usually use sans-serif. So here this is a
      selector.
    </Cue>
    <Cue on="m3">
      So here this whole thing is called a CSS rule, this is the selector, and
      these are the properties. If you write a tag name for the selector, it
      targets everything with that tag name, e.g. I could do h2 to target all
      the h2 elements. Just for the root HTML element, you will often see people
      write :root instead.
    </Cue>
    <Cue on="m4">
      Next I want to put the page in dark mode, since I am a cave dweller. So to
      do that we do color scheme light dark and then I'm going to do a
      background color. So now instead of putting in a single color I can use
      this light-dark function and put in just white or black.
    </Cue>
    <Cue on="m5">
      Before we go any further, I want to move our CSS into a separate file. So
      CSS is a separate language from HTML. And here I'm putting CSS, like the
      syntax is different. Here I'm putting CSS inside an HTML document, but.
      Just to keep things organized, it's going to be easier to put it in a
      separate document. So I'm going to move all of this into style.css. Now,
      if I refresh the page, the styles disappear because we haven't told the
      browser that style.css exists. So to do that, use a different tag for
      linking an external stylesheet than an inline stylesheet instead of a
      style tag, we're going to use a link tag and I have to put a href and rel
      equals style sheet. Okay, so now I refresh and now our styles are here.
    </Cue>
    <Cue on="m6">
      Next, I want to change these colors a bit. So in CSS, there are a few
      specific colors that have names, but usually we are going to, there's many
      more colors than have names. So another syntax you'll see is this hash and
      then six hexadecimal characters. So this is red, green, and blue
      components and values between 0 and 255 specified in hexadecimal. So black
      would be 00000000. There is also a shortcut syntax. Where you can just put
      three values and then this is going to be the same as repeating each of
      those values twice. So this cannot represent the sorthand syntax, it can
      only represent 1/16 of all possible colors. So here black would be 0 0 0,
      and white would be FFF. but pure black is too dark so let's make this
      maybe 2 2 2. which is the same as 2 2 2 so this is a still pretty dark
      gray but a little bit lighter. And also pure white is maybe too harsh of a
      background so we're going to make this just a very very faint gray.
    </Cue>
    <Cue on="m7"></Cue>
  </Prompt>
);
