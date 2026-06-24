package com.networth.model.document;

import lombok.Builder;
import lombok.Data;

/** Per-scheme result within a CasImportResult */
@Data
@Builder
public class CasImportSchemeResult {
    private String schemeName;
    private String folio;
    private String amfiCode;
    /** IMPORTED | UPDATED */
    private String status;
    private double units;
    private double currentValue;
    private int transactionsAdded;
    private int transactionsSkipped;
    private String warning;
}
