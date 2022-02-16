<script lang="ts" context="module">
  // static properties that determine heatmap pixel's color
  export type PixelColorProps = {
    maxH: number;
    minH: number;
    sat: number;
    minL?: number;
    maxL: number;
  };

  const defaultMinL = 0;

  // variable parameters that determine heat map pixel's color
  export type PixelColorParams = {
    hueParam: number;
    lightnessParam: number;
    isZero: boolean;
  };

  const outlineStyle = 'outline: solid 1px rgba(27, 31, 35, 0.06); outline-offset: -1px;';
  const zeroStyle = 'fill: hsl(0, 0%, 35%);';
</script>

<script lang="ts">
  export let size: number;
  export let borderRadius: number;
  export let position: { x: number; y: number };

  export let colorProps: PixelColorProps;
  export let colorParams: PixelColorParams;

  $: fillStyle = (() => {
    const { maxH, minH, sat, minL, maxL } = { minL: defaultMinL, ...colorProps };
    const { hueParam, lightnessParam, isZero } = colorParams;

    if (isZero) {
      return zeroStyle;
    }
    const hRaw = minH + (maxH - minH) * hueParam;
    const h = ((hRaw % 360) + 360) % 360; // modulo
    const l = minL + (maxL - minL) * lightnessParam;
    return `fill: hsl(${h}, ${sat}%, ${l}%);`;
  })();

  $: rectStyle = `${fillStyle} ${outlineStyle}`;
</script>

<rect width={size} height={size} {...position} rx={borderRadius} ry={borderRadius} style={rectStyle} />
