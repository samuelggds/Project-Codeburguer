import { useState } from 'react';
export default function CatalogImage({ src, style, ...props }) {
  const [size, setSize] = useState(null);
  const natural = size?.src === src ? size.width : undefined;
  return <img {...props} src={src} style={{ ...style, ...(natural ? { maxWidth: natural } : {}) }}
    onLoad={(event) => setSize({ src, width: event.currentTarget.naturalWidth })} />;
}
