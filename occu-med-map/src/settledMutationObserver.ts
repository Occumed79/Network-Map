export type MutationObserverLike = Pick<MutationObserver, "disconnect" | "observe">;

export function runWithoutObserverFeedback(
  observer: MutationObserverLike,
  target: Node,
  options: MutationObserverInit,
  work: () => void,
): void {
  observer.disconnect();
  try {
    work();
  } finally {
    observer.observe(target, options);
  }
}

