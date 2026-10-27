import React from 'react';
import logoImage from '../assets/lode-hexosa-logo.png';

export default function Logo({ className = '' }) {
  return (
    <img
      className={`logo-image ${className}`.trim()}
      src={logoImage}
      alt="Lode Hexosa Administration logo"
    />
  );
}
