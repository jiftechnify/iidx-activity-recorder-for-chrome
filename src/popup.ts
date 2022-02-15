import Heatmap from './components/Heatmap.svelte';
import type { DailyActivity } from './models/DailyActivity';

const loadActivityRecord = async (): Promise<DailyActivity[]> => {
  const res = await chrome.storage.sync.get(null);
  return Object.entries(res)
    .filter((kv) => kv[0].startsWith('29'))
    .reduce((acc, kv) => acc.concat(kv[1]), [] as DailyActivity[]);
};

loadActivityRecord()
  .then((record) => {
    const app = new Heatmap({
      target: document.body,
      props: { activityRecord: record },
    });
  })
  .catch(console.error);
