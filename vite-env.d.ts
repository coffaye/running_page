/// <reference types="vite/client" />

declare module '*.svg' {
  export const ReactComponent: import('react').FC<
    import('react').SVGProps<SVGSVGElement>
  >;
}

declare module '@config' {
  const config: Record<string, unknown>;
  export default config;
}

declare module '*.yml' {
  const content: Record<string, unknown>;
  export default content;
}
