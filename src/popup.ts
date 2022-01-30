import Options from './components/Options.svelte';
import type { IStorage } from './types';

chrome.storage.sync.get({ count: 0 } as IStorage, (res) => {
  const app = new Options({
    target: document.body,
    props: { count: (res as IStorage).count },
  });
});
