import type { Playable } from "../src/playable.mts";

function test(_x: Playable) {}

test(document.createElement("audio"));
test(document.createElement("video"));
