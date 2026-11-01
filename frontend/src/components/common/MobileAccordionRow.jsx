import React, { useId, useState } from 'react';

export default function MobileAccordionRow({ summaryLeft, summaryRight, children, actions }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();

  return (
    <div className={`accordion-row ${isExpanded ? 'expanded' : ''}`}>
      <div className="accordion-summary" role="button" tabIndex={0} aria-expanded={isExpanded} aria-controls={detailsId}
        onClick={() => setIsExpanded(expanded => !expanded)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsExpanded(expanded => !expanded);
          }
        }}>
        <span className="accordion-chevron" aria-hidden="true">▶</span>
        <div className="accordion-summary-content">
          <div className="accordion-summary-left">{summaryLeft}</div>
          <div className="accordion-summary-right">{summaryRight}</div>
        </div>
      </div>
      
      <div id={detailsId} hidden={!isExpanded}>
        {isExpanded && <>
          <div className="accordion-details">
            {children}
          </div>
          {actions && (
            <div className="accordion-actions">
              {actions}
            </div>
          )}
        </>}
      </div>
    </div>
  );
}
