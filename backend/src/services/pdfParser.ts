import pdfParse from 'pdf-parse';

export interface ParsedTaxBillData {
  parcelNumber: string | null;
  propertyAddress: string | null;
  ownerName: string | null;
  assessedValueOld: number | null;
  assessedValueNew: number | null;
  supplementalValue: number | null;
  taxRate: number | null;
  annualTaxAmount: number | null;
  proratedTaxAmount: number | null;
  fiscalYear: string | null;
  eventDate: string | null;
  dueDate: string | null;
  billType: string | null;
  eventType: string | null;
  penaltyAmount: number | null;
  rawText: string;
  confidence: number; // 0-1 indicating how many fields were successfully extracted
}

/**
 * Parse a CA supplemental tax bill PDF and attempt to extract structured data.
 * Uses regex patterns common to CA county tax bill formats.
 */
export async function parseTaxBillPdf(buffer: Buffer): Promise<ParsedTaxBillData> {
  let rawText = '';

  try {
    const pdfData = await pdfParse(buffer);
    rawText = pdfData.text;
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`);
  }

  const text = rawText;

  // Track how many fields we successfully extract
  let fieldsFound = 0;
  const totalFields = 14;

  // --- Parcel Number (APN) ---
  const parcelNumber = extractParcelNumber(text);
  if (parcelNumber) fieldsFound++;

  // --- Property Address ---
  const propertyAddress = extractPropertyAddress(text);
  if (propertyAddress) fieldsFound++;

  // --- Owner Name ---
  const ownerName = extractOwnerName(text);
  if (ownerName) fieldsFound++;

  // --- Assessed Values ---
  const assessedValueOld = extractDollarAmount(text, [
    /(?:old|prior|previous|former)\s*(?:assessed)?\s*(?:value|assessment)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:assessed\s*value\s*before)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:prior\s*value)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  ]);
  if (assessedValueOld !== null) fieldsFound++;

  const assessedValueNew = extractDollarAmount(text, [
    /(?:new|current|revised)\s*(?:assessed)?\s*(?:value|assessment)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:assessed\s*value\s*after)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:new\s*value)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  ]);
  if (assessedValueNew !== null) fieldsFound++;

  // --- Supplemental Value ---
  const supplementalValue = extractDollarAmount(text, [
    /(?:supplemental|difference)\s*(?:assessed)?\s*(?:value)?[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:net\s*(?:supplemental\s*)?(?:value|change))[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  ]);
  if (supplementalValue !== null) fieldsFound++;

  // --- Tax Rate ---
  const taxRate = extractTaxRate(text);
  if (taxRate !== null) fieldsFound++;

  // --- Tax Amounts ---
  const annualTaxAmount = extractDollarAmount(text, [
    /(?:annual|yearly)\s*(?:tax(?:es)?)\s*(?:amount)?[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:total\s*tax(?:es)?)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  ]);
  if (annualTaxAmount !== null) fieldsFound++;

  const proratedTaxAmount = extractDollarAmount(text, [
    /(?:prorated|pro-rated|proration)\s*(?:tax)?\s*(?:amount)?[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:supplemental\s*tax\s*(?:amount|due))[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:amount\s*due)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  ]);
  if (proratedTaxAmount !== null) fieldsFound++;

  // --- Fiscal Year ---
  const fiscalYear = extractFiscalYear(text);
  if (fiscalYear) fieldsFound++;

  // --- Event Date ---
  const eventDate = extractDate(text, [
    /(?:date\s*of\s*(?:change|transfer|event|ownership|completion))[:\s]*([\d\/\-]+)/i,
    /(?:event\s*date|effective\s*date)[:\s]*([\d\/\-]+)/i,
    /(?:recording\s*date)[:\s]*([\d\/\-]+)/i,
  ]);
  if (eventDate) fieldsFound++;

  // --- Due Date ---
  const dueDate = extractDate(text, [
    /(?:due\s*date|payment\s*due)[:\s]*([\d\/\-]+)/i,
    /(?:delinquent\s*(?:after|if\s*not\s*paid\s*by))[:\s]*([\d\/\-]+)/i,
  ]);
  if (dueDate) fieldsFound++;

  // --- Bill Type ---
  const billType = extractBillType(text);
  if (billType) fieldsFound++;

  // --- Event Type ---
  const eventType = extractEventType(text);
  if (eventType) fieldsFound++;

  // --- Penalty Amount ---
  const penaltyAmount = extractDollarAmount(text, [
    /(?:penalty|penalties)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /(?:delinquent\s*(?:amount|penalty))[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  ]);

  const confidence = totalFields > 0 ? Math.round((fieldsFound / totalFields) * 100) / 100 : 0;

  return {
    parcelNumber,
    propertyAddress,
    ownerName,
    assessedValueOld,
    assessedValueNew,
    supplementalValue,
    taxRate,
    annualTaxAmount,
    proratedTaxAmount,
    fiscalYear,
    eventDate,
    dueDate,
    billType,
    eventType,
    penaltyAmount,
    rawText,
    confidence,
  };
}

function extractParcelNumber(text: string): string | null {
  const patterns = [
    /(?:parcel\s*(?:number|no\.?|#)|APN|assessor'?s?\s*parcel)[:\s#]*([\d\-\.]+)/i,
    /(?:apn|parcel)[:\s]*([\d]{3,4}[\-\s][\d]{3,4}[\-\s][\d]{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function extractPropertyAddress(text: string): string | null {
  const patterns = [
    /(?:property\s*(?:address|location)|situs\s*(?:address)?|located\s*at)[:\s]*([^\n]{10,80})/i,
    /(?:property)[:\s]*(\d+\s+[A-Z][a-zA-Z\s]+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl|Cir)\.?[^\n]{0,40})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  return null;
}

function extractOwnerName(text: string): string | null {
  const patterns = [
    /(?:owner|assessee|taxpayer|property\s*owner)[:\s]*([A-Z][A-Za-z\s,\.]+?)(?:\n|$)/i,
    /(?:name\s*of\s*(?:owner|assessee))[:\s]*([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Basic sanity check: name should be short-ish and not contain numbers
      if (name.length > 3 && name.length < 100 && !/\d{3,}/.test(name)) {
        return name;
      }
    }
  }
  return null;
}

function extractDollarAmount(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const value = parseFloat(cleaned);
      if (!isNaN(value) && value >= 0) {
        return value;
      }
    }
  }
  return null;
}

function extractTaxRate(text: string): number | null {
  const patterns = [
    /(?:tax\s*rate)[:\s]*([\d]+\.[\d]+)\s*%/i,
    /(?:rate)[:\s]*(1\.\d{2,6})\s*%/i,
    /(\d\.\d{2,6})\s*%\s*(?:tax\s*rate)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rate = parseFloat(match[1]);
      // CA tax rates are typically between 0.5% and 2.5%
      if (!isNaN(rate) && rate >= 0.5 && rate <= 3.0) {
        return rate;
      }
    }
  }
  return null;
}

function extractFiscalYear(text: string): string | null {
  const patterns = [
    /(?:fiscal\s*year|tax\s*year|fy)[:\s]*(20\d{2})\s*[\-\/]\s*(20\d{2})/i,
    /(?:fiscal\s*year|tax\s*year|fy)[:\s]*(20\d{2})\s*[\-\/]\s*(\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[2]) {
      const startYear = match[1];
      let endYear = match[2];
      if (endYear.length === 2) {
        endYear = '20' + endYear;
      }
      return `${startYear}-${endYear}`;
    }
  }
  return null;
}

function extractDate(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const dateStr = match[1].trim();
      return normalizeDate(dateStr);
    }
  }
  return null;
}

function normalizeDate(dateStr: string): string | null {
  // Try MM/DD/YYYY
  let match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    return `${match[3]}-${month}-${day}`;
  }

  // Try YYYY-MM-DD (already ISO)
  match = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${match[1]}-${month}-${day}`;
  }

  // Try MM/DD/YY
  match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const year = parseInt(match[3], 10) >= 50 ? '19' + match[3] : '20' + match[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

function extractBillType(text: string): string | null {
  const lower = text.toLowerCase();
  if (/first\s*supplemental/i.test(lower) || /1st\s*supplemental/i.test(lower)) {
    return 'first_supplemental';
  }
  if (/second\s*supplemental/i.test(lower) || /2nd\s*supplemental/i.test(lower)) {
    return 'second_supplemental';
  }
  if (/supplemental/i.test(lower)) {
    // Default to first if not specified
    return 'first_supplemental';
  }
  return null;
}

function extractEventType(text: string): string | null {
  const lower = text.toLowerCase();
  if (/change\s*(?:of|in)\s*ownership/i.test(lower) || /transfer/i.test(lower) || /sale/i.test(lower)) {
    return 'change_of_ownership';
  }
  if (/new\s*construction/i.test(lower) || /construction\s*(?:completion|completed)/i.test(lower)) {
    return 'new_construction';
  }
  return null;
}
