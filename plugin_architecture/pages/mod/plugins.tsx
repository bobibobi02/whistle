import { useEffect, useState } from 'react';

export default function PluginsPage() {
  const [plugins, setPlugins] = useState([]);

  useEffect(() => {
    fetch('/api/mod/plugins/list')
      .then(res => res.json())
      .then(setPlugins);
  }, []);

  const toggle = async (key, enabled) => {
    await fetch('/api/mod/plugins/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, enabled }),
    });
    setPlugins(plugins.map(p => p.key === key ? { ...p, enabled } : p));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Plugin Management</h1>
      <ul className="space-y-3">
        {plugins.map(p => (
          <li key={p.key} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <div className="font-semibold">{p.subforum}</div>
              <div className="text-sm text-gray-600">{p.description}</div>
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={e => toggle(p.key, e.target.checked)}
              />
              <span>{p.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
);
}
