const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function navigateWithRetry(page, url, navigationOptions, {
  attempts = 4,
  delay = pause,
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await page.goto(url, navigationOptions);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(Math.min(15_000, 1_500 * attempt));
    }
  }
  throw lastError;
}
