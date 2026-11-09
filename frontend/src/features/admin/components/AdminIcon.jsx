const paths = {
  orders: <><path d="M5 3h12v13M8 7h6M8 11h4M5 3v18h5M14 18l5-5 2 2-5 5-3 1z" /></>,
  products: <><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M8 4l9 5v5" /></>,
  categories: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  list: <><path d="M8 5h13M8 12h13M8 19h13" /><path d="M3 5h.01M3 12h.01M3 19h.01" /></>,
  add: <><path d="M2 9h20M5 9l2 12h10l2-12M7 3l-3 6m13-6 3 6M12 12v6m-3-3h6" /></>,
  logout: <><path d="M10 3H3v18h7m4-14 5 5-5 5M8 12h13" /></>,
  edit: <><path d="m4 16-1 5 5-1L20 8l-4-4zM14 6l4 4M17 3l1-1 4 4-1 1" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>,
  search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
  image: <><path d="M21 13v8H3V3h10M3 17l5-5 4 4 3-3 6 6M18 2v6m-3-3h6" /><circle cx="8" cy="8" r="1" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  home: <><path d="m2 11 10-9 10 9M5 9v13h14V9M9 22v-9h6v9" /></>,
};
export default function AdminIcon({ name }) {
  return <svg className="admin-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
