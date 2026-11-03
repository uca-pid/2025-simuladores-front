import React, { useId, useState } from "react";

const TagInput = ({ tags, onChange, suggestions = [], placeholder = "Agregar etiqueta (presiona Enter)" }) => {
  const [input, setInput] = useState("");
  const listId = useId();

  const addTag = () => {
    const value = input.trim();
    if (value && !tags.includes(value)) {
      onChange([...tags, value]);
    }
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div>
      <div className="d-flex gap-2 mb-2">
        <input
          type="text"
          className="form-control"
          placeholder={placeholder}
          list={suggestions.length > 0 ? listId : undefined}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            padding: "0.75rem 1rem",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
          }}
        />
        {suggestions.length > 0 && (
          <datalist id={listId}>
            {suggestions.filter((t) => !tags.includes(t)).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        )}
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={addTag}
          style={{ minWidth: "80px" }}
        >
          <i className="fas fa-plus me-1"></i>
          Agregar
        </button>
      </div>
      {tags.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="badge"
              style={{
                backgroundColor: "var(--primary-color)",
                color: "white",
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                borderRadius: "6px",
              }}
            >
              {tag}
              <i
                className="fas fa-times"
                style={{ cursor: "pointer" }}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
              ></i>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
