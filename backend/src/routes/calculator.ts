import { Router, Request, Response } from 'express';
import {
  calculateSupplementalTax,
  calculateEscrowShortage,
  getDefaultTaxRate,
  SupplementalTaxInput,
} from '../services/taxCalculator';

const router = Router();

/**
 * POST /api/calculator/supplemental
 * Calculate supplemental tax without saving to DB.
 * Body: { eventDate, oldAssessedValue, newAssessedValue, taxRate }
 * Optional: { county } - if provided and taxRate not provided, uses default rate for the county.
 */
router.post('/supplemental', (req: Request, res: Response) => {
  try {
    const { eventDate, oldAssessedValue, newAssessedValue, taxRate, county } = req.body;

    if (!eventDate) {
      res.status(400).json({ success: false, error: 'eventDate is required (ISO date string, e.g., "2024-09-15")' });
      return;
    }

    // Validate date format
    const dateObj = new Date(eventDate);
    if (isNaN(dateObj.getTime())) {
      res.status(400).json({ success: false, error: 'eventDate is not a valid date' });
      return;
    }

    if (oldAssessedValue === undefined || oldAssessedValue === null || typeof oldAssessedValue !== 'number' || oldAssessedValue < 0) {
      res.status(400).json({ success: false, error: 'oldAssessedValue is required and must be a non-negative number' });
      return;
    }

    if (newAssessedValue === undefined || newAssessedValue === null || typeof newAssessedValue !== 'number' || newAssessedValue < 0) {
      res.status(400).json({ success: false, error: 'newAssessedValue is required and must be a non-negative number' });
      return;
    }

    // Resolve tax rate: use provided rate, or look up by county, or return error
    let resolvedTaxRate = taxRate;
    if (resolvedTaxRate === undefined || resolvedTaxRate === null) {
      if (county && typeof county === 'string') {
        resolvedTaxRate = getDefaultTaxRate(county);
      } else {
        res.status(400).json({ success: false, error: 'taxRate or county is required' });
        return;
      }
    }

    if (typeof resolvedTaxRate !== 'number' || resolvedTaxRate <= 0) {
      res.status(400).json({ success: false, error: 'taxRate must be a positive number (e.g., 1.25 for 1.25%)' });
      return;
    }

    const input: SupplementalTaxInput = {
      eventDate,
      oldAssessedValue,
      newAssessedValue,
      taxRate: resolvedTaxRate,
    };

    const result = calculateSupplementalTax(input);

    res.json({
      success: true,
      data: {
        input: {
          ...input,
          county: county || null,
        },
        result,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/calculator/escrow-shortage
 * Calculate escrow shortage analysis.
 * Body: { currentBalance, annualTaxBudget, monthlyEscrowAmount, monthsRemaining, expectedSupplementalTax }
 */
router.post('/escrow-shortage', (req: Request, res: Response) => {
  try {
    const {
      currentBalance,
      annualTaxBudget,
      monthlyEscrowAmount,
      monthsRemaining,
      expectedSupplementalTax,
    } = req.body;

    if (currentBalance === undefined || typeof currentBalance !== 'number') {
      res.status(400).json({ success: false, error: 'currentBalance is required and must be a number' });
      return;
    }

    if (annualTaxBudget === undefined || typeof annualTaxBudget !== 'number') {
      res.status(400).json({ success: false, error: 'annualTaxBudget is required and must be a number' });
      return;
    }

    if (monthlyEscrowAmount === undefined || typeof monthlyEscrowAmount !== 'number') {
      res.status(400).json({ success: false, error: 'monthlyEscrowAmount is required and must be a number' });
      return;
    }

    if (monthsRemaining === undefined || typeof monthsRemaining !== 'number' || monthsRemaining < 0) {
      res.status(400).json({ success: false, error: 'monthsRemaining is required and must be a non-negative number' });
      return;
    }

    if (expectedSupplementalTax === undefined || typeof expectedSupplementalTax !== 'number') {
      res.status(400).json({ success: false, error: 'expectedSupplementalTax is required and must be a number' });
      return;
    }

    const result = calculateEscrowShortage(
      currentBalance,
      annualTaxBudget,
      monthlyEscrowAmount,
      monthsRemaining,
      expectedSupplementalTax
    );

    res.json({
      success: true,
      data: {
        input: {
          currentBalance,
          annualTaxBudget,
          monthlyEscrowAmount,
          monthsRemaining,
          expectedSupplementalTax,
        },
        result,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
