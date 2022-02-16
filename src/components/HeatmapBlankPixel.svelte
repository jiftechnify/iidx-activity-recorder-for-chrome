<script lang="ts" context="module">
  const outlineStyle = 'outline: solid 1px rgba(255, 255, 255, 0.1); outline-offset: -1px;';
</script>

<script lang="ts">
  export let size: number;
  export let borderRadius: number;
  export let position: { x: number; y: number };

  export let fillColor: string;

  $: fillStyle = `fill: ${fillColor};`;
  $: rectStyle = `${fillStyle} ${outlineStyle}`;
</script>

<rect width={size} height={size} {...position} rx={borderRadius} ry={borderRadius} style={rectStyle} />
