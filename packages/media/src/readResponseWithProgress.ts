export async function readResponseWithProgress(
  response: Response,
  onProgress?: (progress: number) => void,
): Promise<ArrayBuffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    onProgress?.(1);
    return buffer;
  }

  const contentLength = Number(response.headers.get("content-length"));
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loadedBytes += value.byteLength;

    if (Number.isFinite(contentLength) && contentLength > 0) {
      onProgress?.(Math.min(loadedBytes / contentLength, 1));
    }
  }

  const bytes = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (contentLength <= 0) onProgress?.(1);

  return bytes.buffer;
}
