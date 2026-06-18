import React, { useState } from 'react';

export default function MobileAccordionRow({ summaryLeft, summaryRight, children, actions }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`accordion-row ${isExpanded ? 'expanded' : ''}`}>
      <div className="accordion-summary" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="accordion-chevron">▶</span>
        <div className="accordion-summary-content">
          <div className="accordion-summary-left">{summaryLeft}</div>
          <div className="accordion-summary-right">{summaryRight}</div>
        </div>
      </div>
      
      {isExpanded && (
        <>
          <div className="accordion-details">
            {children}
          </div>
          {actions && (
            <div className="accordion-actions">
              {actions}
            </div>
          )}
        </>
      )}
    </div>
  );
}
