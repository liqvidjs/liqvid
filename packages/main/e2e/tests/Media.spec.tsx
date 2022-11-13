import {ElementHandle, expect, JSHandle, test} from "@playwright/test";
import type {Playback, Player} from "../../src/index";

test.describe("Media", () => {
  let playback: JSHandle<Playback>;
  let player: JSHandle<Player>;
  let video: ElementHandle<HTMLVideoElement>;

  test.beforeEach(async ({page}) => {
    await page.goto("/");

    // globals
    player = await page.evaluateHandle(() => {
      return (document.querySelector(".lv-player") as HTMLDivElement)[
        window.Liqvid.Player.symbol
      ] as Player;
    });
    playback = await player.evaluateHandle((player) => player.playback);

    // load video
    const locator = page.locator("video");
    await locator.waitFor();
    await locator.evaluate<void, HTMLVideoElement>((video) =>
      window.Liqvid.Utils.media.awaitMediaCanPlay(video)
    );

    // create handle
    video = (await locator.elementHandle()) as ElementHandle<HTMLVideoElement>;
  });

  test("seeking past video.duration should seek to video end", async () => {
    await playback.evaluate((p) => p.seek(p.duration));
    expect(await video.evaluate((v) => v.currentTime === v.duration)).toBe(
      true
    );
  });

  test("restarting playback should restart video", async () => {
    await playback.evaluate((p) => {
      p.seek(p.duration);
    });
    expect(await video.evaluate((v) => v.currentTime === v.duration)).toBe(
      true
    );
    // don't batch with the previous evaluate or else video won't have time to update
    await playback.evaluate((p) => p.play());
    expect(await video.evaluate((v) => v.currentTime)).toBe(0);
  });
});
