import { DateTime } from 'luxon';

type DailyActivity = {
  d: string; // date
  k: number; // keyboard
  s: number; // scratch
};

type VersionMonthKey = `${number}_${number}`;

const verMonthKey = (iidxVersion: string, date: string): VersionMonthKey => {
  return `${Number(iidxVersion)}_${Number(date.slice(0, 6))}`;
};

type ActivitiesPerMonth = Record<VersionMonthKey, DailyActivity[]>;

type ActivityRecordMetadata = {
  iidxId: string | undefined;
  lastDailyActivity: DailyActivity;
  updatedAt: number;
};

type ActivityRecord = ActivitiesPerMonth & ActivityRecordMetadata;

const reformatDate = (dateOnPage: string): string => {
  return dateOnPage.replace(/\//g, '');
};
const parseActivityTimes = (timesOnPage: string): number => {
  const t = Number(timesOnPage.replace('回', ''));
  return isNaN(t) ? 0 : t;
};

const getActivities = (): DailyActivity[] => {
  const table = document.querySelector('table.activity');
  if (table == null) {
    throw Error('activity not found');
  }
  const rows = table.getElementsByTagName('tr');
  if (rows.length <= 1) {
    throw Error('activity not found');
  }
  return Array.from(rows)
    .slice(1) // 最初の行はヘッダなのでスキップ
    .map((r) =>
      Array.from(r.getElementsByTagName('td'))
        .map((col) => col.textContent)
        .filter((col): col is string => col !== null)
    )
    .filter((cols) => cols.length === 3)
    .map((cols): DailyActivity => {
      return {
        d: reformatDate(cols[0]),
        k: parseActivityTimes(cols[1]),
        s: parseActivityTimes(cols[2]),
      };
    });
};

const getIIDXId = async (iidxVersion: string): Promise<string> => {
  const profilePage = document.createElement('iframe');
  profilePage.setAttribute('src', `https://p.eagate.573.jp/game/2dx/${iidxVersion}/djdata/status.html`);
  document.body.appendChild(profilePage);
  const cleanup = () => {
    document.body.removeChild(profilePage);
  };

  return new Promise((resolve, reject) => {
    profilePage.addEventListener('load', () => {
      console.log('loaded profile page');
      const iidxId =
        profilePage.contentDocument?.querySelector('div.dj-profile tr:nth-child(3) td:nth-child(2)')?.textContent ??
        undefined;

      cleanup();
      if (iidxId === undefined) {
        reject(Error('failed to get IIDX ID'));
      } else {
        resolve(iidxId);
      }
    });
  });
};

const iidxVersionMatcher = new RegExp('^/game/2dx/(.+?)/');

const getIIDXVersion = (): string => {
  const matchResult = location.pathname.match(iidxVersionMatcher);
  if (matchResult === null || matchResult.length <= 1) {
    throw Error('failed to get IIDX Version');
  }
  return matchResult[1];
};

const summarizeUpdates = (
  activities: DailyActivity[],
  iidxVersion: string,
  last: DailyActivity
): readonly [ActivitiesPerMonth, DailyActivity] | undefined => {
  // 以前に取得したアクティビティの中で最新のものと比べ「日付が後 または 日付が同じで回数が更新された」ものを抽出
  const updates = activities.filter(
    (act) => act.d > last.d || (act.d === last.d && (act.k > last.k || act.s > last.s))
  );
  if (updates.length === 0) {
    return undefined;
  }
  // アクティビティデータを月ごとに集計
  const summary = {} as ActivitiesPerMonth;
  let newLast = last;
  for (const upd of updates) {
    const vmKey = verMonthKey(iidxVersion, upd.d);
    summary[vmKey] = [...(summary[vmKey] ?? []), upd];
    if (upd.d > newLast.d) {
      newLast = upd;
    }
  }
  return [summary, newLast] as const;
};

const mergeMonthlyActivities = (oldActs: DailyActivity[], newActs: DailyActivity[]): DailyActivity[] => {
  const res = activitiesToMap(oldActs);
  for (const newAct of newActs) {
    res.set(newAct.d, newAct);
  }
  return [...res.values()];
};

const mergeActivitiesPerMonth = (oldRec: ActivitiesPerMonth, newRec: ActivitiesPerMonth): ActivitiesPerMonth => {
  const res = {} as ActivitiesPerMonth;
  for (const verMonth of Object.keys(newRec)) {
    const verMonthKey = verMonth as VersionMonthKey;
    res[verMonthKey] = mergeMonthlyActivities(oldRec[verMonthKey] ?? [], newRec[verMonthKey]);
  }
  return res;
};

const getMetadataFromChromeStorage = async (): Promise<ActivityRecordMetadata> => {
  // 取得できなかった場合のデフォルト値
  const defaultMeta: ActivityRecordMetadata = {
    lastDailyActivity: {
      d: '00000000',
      k: 0,
      s: 0,
    },
    updatedAt: 0,
    iidxId: undefined,
  };
  const m = (await chrome.storage.sync.get(defaultMeta)) as ActivityRecordMetadata;
  return m;
};

const onload = async () => {
  try {
    const iidxVersion = getIIDXVersion();
    const acts = getActivities();
    const iidxId = await getIIDXId(iidxVersion);

    const meta = await getMetadataFromChromeStorage();
    if (meta.iidxId && iidxId !== meta.iidxId) {
      throw Error('IIDX ID mismatch');
    }
    const summary = summarizeUpdates(acts, iidxVersion, meta.lastDailyActivity);
    if (summary === undefined) {
      console.log('no update found');
      return;
    }

    const [updates, newLast] = summary;
    const newMeta: ActivityRecordMetadata = {
      lastDailyActivity: newLast,
      updatedAt: DateTime.now().toSeconds(),
      iidxId,
    };
    const oldMonActs = (await chrome.storage.sync.get(Object.keys(updates))) as ActivitiesPerMonth;
    const updMonActs = mergeActivitiesPerMonth(oldMonActs, updates);

    const newRecord = { ...newMeta, ...updMonActs } as ActivityRecord;
    await chrome.storage.sync.set(newRecord);
  } catch (e) {
    console.error(e);
  }
};

onload()
  .then(() => console.log('activity record updated'))
  .catch((e) => console.error(e));

// Aux functions
const activitiesToMap = (acts: DailyActivity[]): Map<string, DailyActivity> => {
  const res = new Map<string, DailyActivity>();
  for (const act of acts) {
    res.set(act.d, act);
  }
  return res;
};
