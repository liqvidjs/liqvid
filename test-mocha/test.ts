import * as assert from "assert";
import Script from "../src/script";

(globalThis.window as any) = {
    AudioContext : class {
        createGain(){
            return { connect(x) {} };
        }
    }
};

(globalThis.requestAnimationFrame as any) = function(cb){};



this.audioContext = new (window.AudioContext || webkitAudioContext)();
this.audioNode = this.audioContext.createGain();
this.audioNode.connect(this.audioContext.destination);


describe("Script", () => {
  describe("markers", () => {
    it("should be false ", () => {
      const script = new Script([
        ["intro/title", "0:05"],
        ["intro/fun", "0:03"],
        ["intro/agenda", "0:07"],
        ["ex/", "0:01"],
      ]);
      assert.strictEqual(script.parseStart("intro/title"), 0);
      assert.strictEqual(script.parseEnd("intro/title"), 5000);
      assert.strictEqual(script.parseStart("intro/fun"), 5000);
      assert.strictEqual(script.parseEnd("intro/fun"), 8000);
      assert.strictEqual(script.parseStart("intro/agenda"), 8000);
      assert.strictEqual(script.parseEnd("intro/agenda"), 15000);
      assert.strictEqual(script.parseStart("ex/"), 15000);
      assert.strictEqual(script.parseEnd("ex/"), 16000);
    });
    it("blah", async () => {
        const script = new Script([
            ["intro/title", "0:05"],
            ["intro/fun", "0:03"],
            ["intro/agenda", "0:07"],
            ["ex/", "0:01"],
        ]);
        script.playback.play();

    })
  });
});
