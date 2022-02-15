<script lang="ts">
  import { DateTime } from 'luxon';
  import type { DailyActivity } from '../models/DailyActivity';
  import { range } from '../utils/Range';
  import HeatmapPixel from './HeatmapPixel.svelte';

  export let activityRecord: DailyActivity[];

  const dateLaunched = DateTime.fromFormat('20211013', 'yyyyMMdd');
  const daysAfterLaunch = (dStr: string) =>
    DateTime.fromFormat(dStr, 'yyyyMMdd').diff(dateLaunched, 'days').toObject().days ?? 0;
  type HeatmapPixelProps = {
    date: string;
    offset: number;
    keyboard: number;
    scratch: number;
    heat: number;
    scratchRatio: number;
  };
  const mapActivityHeatmapProps = new Map<string, HeatmapPixelProps>();
  let maxVals = {
    heat: 0,
    keyboard: 0,
    scratch: 0,
  };
  for (const act of activityRecord) {
    const heat = act.k / 7 + act.s;
    mapActivityHeatmapProps.set(act.d, {
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

  const heatmapPropsAt = (offset: number) => {
    const dateOfOffset = dateLaunched.plus({ days: offset }).toFormat('yyyyMMdd');
    return (
      mapActivityHeatmapProps.get(dateOfOffset) ?? {
        date: dateOfOffset,
        offset,
        keyboard: 0,
        scratch: 0,
        heat: 0.0,
        scratchRatio: 0.0,
      }
    );
  };

  type HeatmapType = 'heat' | 'keyboard' | 'scratch';
  type HeatmapPixelColorProps = {
    maxH: number;
    minH: number;
    sat: number;
    minL?: number;
    maxL: number;
  };
  type HeatmapPixelColorParam = {
    hueParam: number;
    lightnessParam: number;
    isZero: boolean;
  };
  type HeatmapPixelParamFunc = (p: HeatmapPixelProps) => HeatmapPixelColorParam;
  const heatmapPixelParamPropsOfType: Record<
    HeatmapType,
    { props: HeatmapPixelColorProps; getParam: HeatmapPixelParamFunc }
  > = {
    heat: {
      props: {
        minH: 252,
        maxH: 348,
        sat: 55,
        minL: 35,
        maxL: 65,
      },
      getParam: (p) => {
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
      getParam: (p) => {
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
      getParam: (p) => {
        return {
          hueParam: 0,
          lightnessParam: 1.0 - (maxVals.scratch - p.scratch) / maxVals.scratch,
          isZero: p.scratch === 0,
        };
      },
    },
  };

  const heatmapTypeList: HeatmapType[] = ['heat', 'keyboard', 'scratch'];
  let selectedHeatmapType: HeatmapType = 'heat';
  $: pixelParamProps = heatmapPixelParamPropsOfType[selectedHeatmapType];

  const size = 12;
  const margin = 2;
  const borderRadius = 3;

  const dateOffsetRange = range(365);

  type Coord2D = {
    x: number;
    y: number;
  };
  const pixelCoordOfDateOffset = (offset: number): Coord2D => {
    const normOffset = offset + (dateLaunched.weekday % 7);
    return { x: Math.trunc(normOffset / 7), y: normOffset % 7 };
  };
  const pixelPos = ({ x, y }: Coord2D) => {
    return { x: x * (size + margin), y: y * (size + margin) };
  };
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
    <svg viewBox="0 0 726 96" width="726" height="96">
      <g>
        {#each dateOffsetRange as offset}
          <HeatmapPixel
            {size}
            {borderRadius}
            {...pixelPos(pixelCoordOfDateOffset(offset))}
            {...pixelParamProps.props}
            {...pixelParamProps.getParam(heatmapPropsAt(offset))}
          />
        {/each}
      </g>
    </svg>
  </div>
</div>

<style>
  .container {
    width: 726px;
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
