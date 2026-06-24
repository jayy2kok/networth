package com.networth.model.document;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Result returned by CasImportService.importCas() */
@Data
@Builder
public class CasImportResult {
    private String fileType;
    private String investorName;
    private String periodFrom;
    private String periodTo;
    private int schemesImported;
    private int schemesUpdated;
    private int transactionsAdded;
    private int transactionsSkipped;
    private List<CasImportSchemeResult> schemes;
    private List<String> warnings;
}
