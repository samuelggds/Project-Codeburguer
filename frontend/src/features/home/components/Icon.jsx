const paths = {
  user: <><circle cx="12" cy="7" r="5" /><path d="M2 22a10 10 0 0 1 20 0" /></>,
  orders: <path d="M14 3h3v9M9 3H5v18h6M9 2h5v4H9zM8 10h6M8 14h3M15 20l-3 1 1-3 6-6 2 2-6 6z" />,
  basket: <path d="m8 3-4 7m12-7 4 7M2 10h20M4 10l2 11h12l2-11M9 13v5m6-5v5M12 5v2" />,
  left: <path d="m16 5-9 9 9 9" />,
  right: <path d="m8 5 9 9-9 9" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  heart: <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />,
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2 2 9.3l6.9-1L12 2Z" />,
};

export default function Icon({ name }) {
  return (
    <svg className="icon" viewBox={name === 'left' || name === 'right' ? '0 0 24 28' : '0 0 24 24'} aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
