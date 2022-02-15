<script lang="ts">
  import { DateTime } from 'luxon';
  import type { DailyActivity } from '../models/DailyActivity';
  import { range } from '../utils/Range';
  import HeatmapPixel from './HeatmapPixel.svelte';

  /* props */
  export let activityRecord: DailyActivity[];

  // the date that current version of IIDX was lauched
  const dateLaunched = DateTime.fromFormat('20211013', 'yyyyMMdd');

  // calculates number of days after current version of IIDX was launched for a given date (in `yyyyMMdd` format)
  // "number of days after launch" is also called as "offset" in this script
  const daysAfterLaunch = (dateStr: string) =>
    DateTime.fromFormat(dateStr, 'yyyyMMdd').diff(dateLaunched, 'days').toObject().days ?? 0;

  // daily activity statistics to be visualized
  type DailyActivityStats = {
    date: string;
    offset: number;
    keyboard: number;
    scratch: number;
    heat: number;
    scratchRatio: number;
  };

  // summarize statistics from array of `DailyActivity` data
  const dateToStats = new Map<string, DailyActivityStats>();
  let maxVals = {
    heat: 0,
    keyboard: 0,
    scratch: 0,
  };
  for (const act of activityRecord) {
    const heat = act.k / 7 + act.s;
    dateToStats.set(act.d, {
      date: act.d,
      offset: daysAfterLaunch(act.d),
      keyboard: act.k,
      scratch: act.s,
      heat,
      scratchRatio: act.s / heat,
    });
    maxVals = {
      heat: heat > maxVals.heat ? heat : maxVals.heat,
      keyboard: act.k > maxVals.keyboard ? act.k : maxVals.keyboard,
      scratch: act.s > maxVals.scratch ? act.s : maxVals.scratch,
    };
  }

  // get `DailyActivityStats` data by number of days after launch, a.k.a. "offset"
  const activityStatsAt = (daysAfterLaunch: number): DailyActivityStats => {
    const date = dateLaunched.plus({ days: daysAfterLaunch }).toFormat('yyyyMMdd');
    return (
      dateToStats.get(date) ?? {
        date,
        offset: daysAfterLaunch,
        keyboard: 0,
        scratch: 0,
        heat: 0.0,
        scratchRatio: 0.0,
      }
    );
  };

  // list of types of heatmap
  const heatmapTypeList = ['heat', 'keyboard', 'scratch'] as const;
  type HeatmapType = typeof heatmapTypeList[number];

  // static properties that determine heatmap pixel's color
  type PixelColorProps = {
    maxH: number;
    minH: number;
    sat: number;
    minL?: number;
    maxL: number;
  };
  // variable parameters that determine heat map pixel's color
  type PixelColorParams = {
    hueParam: number;
    lightnessParam: number;
    isZero: boolean;
  };
  // type of function that derives `PixelColorParams` from `DailyActivityStats`
  type PixelColorParamsFunc = (p: DailyActivityStats) => PixelColorParams;

  type PixelColorSpec = {
    props: PixelColorProps;
    deriveParams: PixelColorParamsFunc;
  };

  const pixelColorSpecOfType: Record<HeatmapType, PixelColorSpec> = {
    heat: {
      props: {
        minH: 252,
        maxH: 348,
        sat: 55,
        minL: 35,
        maxL: 65,
      },
      deriveParams: (p) => {
        return {
          hueParam: p.scratchRatio,
          lightnessParam: 1.0 - (maxVals.heat - p.heat) / maxVals.heat,
          isZero: p.heat === 0,
        };
      },
    },
    keyboard: {
      props: {
        minH: 252,
        maxH: 252,
        sat: 55,
        minL: 35,
        maxL: 65,
      },
      deriveParams: (p) => {
        return {
          hueParam: 0,
          lightnessParam: 1.0 - (maxVals.keyboard - p.keyboard) / maxVals.keyboard,
          isZero: p.keyboard === 0,
        };
      },
    },
    scratch: {
      props: {
        minH: 348,
        maxH: 348,
        sat: 55,
        minL: 35,
        maxL: 65,
      },
      deriveParams: (p) => {
        return {
          hueParam: 0,
          lightnessParam: 1.0 - (maxVals.scratch - p.scratch) / maxVals.scratch,
          isZero: p.scratch === 0,
        };
      },
    },
  };

  let selectedHeatmapType: HeatmapType = 'heat';
  $: pixelColorSpec = pixelColorSpecOfType[selectedHeatmapType];

  // constants about pixel geometries / styles
  const pxSize = 12;
  const pxMargin = 2;
  const pxBorderRadius = 3;

  const numDaysToRender = 365;
  const offsetRange = range(numDaysToRender);

  type Coord2D = {
    x: number;
    y: number;
  };
  const pixelCoordOfDateOffset = (offset: number): Coord2D => {
    const normOffset = offset + (dateLaunched.weekday % 7);
    return { x: Math.trunc(normOffset / 7), y: normOffset % 7 };
  };

  const pixelPos = ({ x, y }: Coord2D) => {
    return { x: x * (pxSize + pxMargin), y: y * (pxSize + pxMargin) };
  };

  const heatmapWidth = (() => {
    const maxX = pixelCoordOfDateOffset(numDaysToRender - 1).x;
    return (maxX + 1) * pxSize + maxX * pxMargin;
  })();
</script>

<div class="container">
  <div class="header">
    <div class="title">IIDX Activity Heatmap</div>
    <select class="typeSelector" bind:value={selectedHeatmapType}>
      {#each heatmapTypeList as typ}
        <option value={typ}>{typ}</option>
      {/each}
    </select>
  </div>
  <div class="heatmap">
    <svg viewBox={`0 0 ${heatmapWidth} 96`} width={`${heatmapWidth}`} height="96">
      <g>
        {#each offsetRange as offset}
          <HeatmapPixel
            size={pxSize}
            borderRadius={pxBorderRadius}
            {...pixelPos(pixelCoordOfDateOffset(offset))}
            {...pixelColorSpec.props}
            {...pixelColorSpec.deriveParams(activityStatsAt(offset))}
          />
        {/each}
      </g>
    </svg>
  </div>
</div>

<style>
  .container {
    width: max-content;
    background-color: #223;
    padding: 8px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }
  .title {
    color: #fff;
    font-size: 24px;
  }
  .typeSelector {
    justify-self: end;
  }
  .heatmap {
    margin-top: 8px;
  }
</style>
