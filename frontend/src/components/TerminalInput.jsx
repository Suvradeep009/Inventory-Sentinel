import { useState } from 'react';

export default function TerminalInput({ onSubmit, placeholder = 'type command...', prefix = '>' }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="input-group">
      <span className="input-group__prefix">{prefix}</span>
      <input
        type="text"
        className="input-group__field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
      />
      <button type="submit" className="btn btn--primary" style={{ borderLeft: '1px solid var(--border-color)', margin: 0 }}>
        EXECUTE
      </button>
    </form>
  );
}
