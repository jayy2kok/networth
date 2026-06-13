package com.networth.model.document;

import lombok.*;

/**
 * Embedded user settings stored inside the UserDocument.
 * Defaults: INR, retirement at 60, 12% return, 6% inflation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSettingsDocument {
    private String dateOfBirth;
    private String currencyCode;
    private Integer retirementAge;
    private Double expectedReturnRate;
    private Double inflationRate;
}
