import React from 'react';
import '../styles/button.css';

const Button = ({ children, onClick, variant = "primary", className = "", icon: Icon, type = "button" }) => {
  return (
    <button 
      type={type}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Button;