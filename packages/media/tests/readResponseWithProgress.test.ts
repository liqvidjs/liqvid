/** @jest-environment node */

import { expect, test } from "@jest/globals";

import { readResponseWithProgress } from "../src/readResponseWithProgress.ts";

test("reports incremental progress while reading a response body", async () => {
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    }),
    { headers: { "content-length": "4" } },
  );
  const progress: number[] = [];

  const buffer = await readResponseWithProgress(response, (value) => {
    progress.push(value);
  });

  expect(progress).toEqual([0.5, 1]);
  expect([...new Uint8Array(buffer)]).toEqual([1, 2, 3, 4]);
});
