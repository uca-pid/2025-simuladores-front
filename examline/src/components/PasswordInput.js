import React, { useState } from "react";

const PasswordInput = ({
  id = "password",
  label = "Contraseña",
  value,
  onChange,
  disabled = false,
  placeholder,
  className = "",
  inputStyle = {},
  required = false,
  autoComplete = "current-password",
  labelStyle = {},
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <label
        htmlFor={id}
        className="form-label d-flex align-items-center gap-2 mb-1"
        style={labelStyle}
      >
        <i className="fas fa-lock text-muted"></i>
        {label}
      </label>

      <div style={{ position: "relative" }}>
        <input
          type={showPassword ? "text" : "password"}
          className={`form-control ${className}`}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          style={{ paddingRight: "2.5rem", ...inputStyle }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="btn btn-link p-0"
          disabled={disabled}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          style={{
            position: "absolute",
            right: "0.6rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--primary-color)",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
        </button>
      </div>
    </>
  );
};

export default PasswordInput;
