import React from 'react';
import '../styles/card.css';

const Card = ({ children, className = "" }) => (
  <div className={`custom-card ${className}`}>
    {children}
  </div>
);

export default Card;