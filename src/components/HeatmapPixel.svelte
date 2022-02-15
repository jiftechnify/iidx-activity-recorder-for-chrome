<script lang="ts">
  export let size: number;
  export let borderRadius: number;

  export let x: number;
  export let y: number;

  export let maxH: number;
  export let minH: number;

  export let sat: number;

  export let minL: number = 0;
  export let maxL: number;

  export let hueParam: number;
  export let lightnessParam: number;

  export let isZero: boolean;

  const outlineStyle = 'outline: solid 1px rgba(27, 31, 35, 0.06); outline-offset: -1px;';
  const zeroStyle = 'fill: hsl(0, 0%, 35%);';

  $: fillStyle = (() => {
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

<rect width={size} height={size} {x} {y} rx={borderRadius} ry={borderRadius} style={rectStyle} />
