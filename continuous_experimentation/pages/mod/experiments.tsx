import { useEffect, useState } from 'react';

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState([]);
  const [results, setResults] = useState({});

  useEffect(() => {
    fetch('/api/mod/experiments/list')
      .then(r => r.json())
      .then(setExperiments);
  }, []);

  const fetchResults = (key) => {
    fetch(`/api/mod/experiments/results?experimentKey=${key}`)
      .then(r => r.json())
      .then(data => setResults(prev => ({ ...prev, [key]: data.results })));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Experiments</h1>
      {experiments.map(exp => (
        <div key={exp.key} className="mb-6">
          <h2 className="text-xl">{exp.key}</h2>
          <button onClick={() => fetchResults(exp.key)} className="px-2 py-1 bg-blue-500 text-white rounded">
            Show Results
          </button>
          {results[exp.key] && (
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-x-auto">
              {JSON.stringify(results[exp.key], null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
)
}
