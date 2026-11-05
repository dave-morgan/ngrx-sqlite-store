/** Shared acceptance workload: count-changing toggles with the original 20 ms pacing. */
export async function toggleLatency(page, toggles = 30) {
  return page.evaluate(async (n) => {
    const summary = () => document.querySelector('[data-testid=todo-summary]')?.textContent ?? '';
    const samples = [];
    for (let i = 0; i < n; i++) {
      const before = summary();
      const t = performance.now();
      const changed = new Promise((resolve) => {
        const obs = new MutationObserver(() => {
          if (summary() !== before) {
            obs.disconnect();
            resolve();
          }
        });
        obs.observe(document.body, { subtree: true, characterData: true, childList: true });
      });
      window.__harness.dispatch({ type: '[Todos] Todo Toggled', id: 't1' });
      await changed;
      samples.push(performance.now() - t);
      await new Promise((r) => setTimeout(r, 20));
    }
    return samples;
  }, toggles);
}

