export const seekToFrame = (
  videoEl: HTMLVideoElement,
  frame: number,
  fps: number
): void => {
  videoEl.currentTime = (frame + 0.001) / fps
}
