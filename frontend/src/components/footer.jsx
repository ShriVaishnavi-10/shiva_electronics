import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopyright } from '@fortawesome/free-solid-svg-icons';
import "../style/Footer.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <FontAwesomeIcon icon={faCopyright} className="me-2 text-warning" />
          <span>{currentYear} Shiva Electronics. All rights reserved.</span>
        </div>
        <div className="footer-right">
          <span className="footer-version">ERP v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
