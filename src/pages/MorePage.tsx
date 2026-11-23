// The More tab: weight tracker, batches and Settings.
import { useNav } from '../nav';

export default function MorePage() {
  const { open } = useNav();
  return (
    <>
      <h1>More</h1>
      <button className="btn big" onClick={() => open({ name: 'weight' })}>Weight</button>
      <button className="btn big" onClick={() => open({ name: 'batches' })}>Your batches</button>
      <button className="btn big" onClick={() => open({ name: 'settings' })}>Settings</button>
    </>
  );
}
