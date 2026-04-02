/**
 * x402 Payment Middleware for HITL
 * 
 * Handles three payment methods:
 * 1. x402 (USDC on Base) — agent pays per-request via HTTP 402 flow
 * 2. API key (traditional) — pre-authenticated, metered billing
 * 3. Free tier — limited requests for testing
 * 
 * The x402 flow:
 * - Agent hits POST /api/requests without payment
 * - We return HTTP 402 with pricing + payment instructions
 * - Agent signs USDC payment, retries with X-PAYMENT header
 * - We verify via x402 facilitator, process the request
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from './supabase';
import { getEffortTier } from './capacity';

// Your Base wallet address for receiving USDC payments
const RECEIVER_ADDRESS = process.env.HITL_RECEIVER_WALLET || '';
const X402_FACILITATOR = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';
const BASE_CHAIN_ID = 8453; // Base mainnet

interface PricingInfo {
  effort_tier: string;
  price_usdc: number;
  max_description_chars: number | null;
  max_response_chars: number | null;
}

async function getPricing(effortTier: string): Promise<PricingInfo | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('hitl_pricing')
    .select('*')
    .eq('effort_tier', effortTier)
    .eq('is_active', true)
    .single();
  return data as PricingInfo | null;
}

// Build the 402 response per x402 spec
function build402Response(pricing: PricingInfo, requestType: string) {
  const priceInSmallestUnit = Math.round(pricing.price_usdc * 1_000_000); // USDC has 6 decimals

  return NextResponse.json(
    {
      success: false,
      error: 'Payment required',
      payment_required: {
        protocol: 'x402',
        version: '1.0',
        description: `Human-in-the-loop ${requestType} request (${pricing.effort_tier} tier)`,
        pricing: {
          amount: priceInSmallestUnit.toString(),
          asset: 'USDC',
          network: `eip155:${BASE_CHAIN_ID}`,
          receiver: RECEIVER_ADDRESS,
        },
        facilitator: X402_FACILITATOR,
        accepts: [
          {
            scheme: 'exact',
            network: `eip155:${BASE_CHAIN_ID}`,
            asset: `eip155:${BASE_CHAIN_ID}/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, // USDC on Base
            maxAmountRequired: priceInSmallestUnit.toString(),
            receiver: RECEIVER_ADDRESS,
          },
        ],
        // Char limits so agent knows constraints before paying
        constraints: {
          max_description_chars: pricing.max_description_chars,
          max_response_chars: pricing.max_response_chars,
        },
      },
    },
    {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-Payment-Protocol': 'x402',
      },
    }
  );
}

// Verify x402 payment via facilitator
async function verifyX402Payment(paymentHeader: string): Promise<{
  verified: boolean;
  tx_hash?: string;
  error?: string;
}> {
  try {
    // In production, verify with x402 facilitator
    // The facilitator checks the signed payment payload and settles on-chain
    const res = await fetch(`${X402_FACILITATOR}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment: paymentHeader,
        receiver: RECEIVER_ADDRESS,
      }),
    });

    if (!res.ok) {
      return { verified: false, error: 'Payment verification failed' };
    }

    const data = await res.json();
    return {
      verified: true,
      tx_hash: data.tx_hash || data.transactionHash,
    };
  } catch (err) {
    console.error('x402 verification error:', err);
    return { verified: false, error: 'Payment verification service unavailable' };
  }
}

export interface PaymentResult {
  method: 'x402' | 'api_key' | 'free_tier';
  verified: boolean;
  tx_hash?: string;
  price_usdc: number;
  effort_tier: string;
  max_description_chars: number | null;
  max_response_chars: number | null;
  error?: string;
  response_402?: NextResponse;
}

/**
 * Check payment for a request.
 * Returns either a verified payment result or a 402 response to send back.
 */
export async function checkPayment(
  req: NextRequest,
  requestType: string,
  apiKeyId?: string
): Promise<PaymentResult> {
  const effortTier = getEffortTier(requestType);
  const pricing = await getPricing(effortTier);

  if (!pricing) {
    return {
      method: 'free_tier',
      verified: true,
      price_usdc: 0,
      effort_tier: effortTier,
      max_description_chars: null,
      max_response_chars: null,
    };
  }

  // Check for x402 payment header
  const paymentHeader = req.headers.get('x-payment') || req.headers.get('X-PAYMENT');

  if (paymentHeader) {
    // Verify the x402 payment
    const verification = await verifyX402Payment(paymentHeader);

    if (verification.verified) {
      return {
        method: 'x402',
        verified: true,
        tx_hash: verification.tx_hash,
        price_usdc: pricing.price_usdc,
        effort_tier: effortTier,
        max_description_chars: pricing.max_description_chars,
        max_response_chars: pricing.max_response_chars,
      };
    }

    return {
      method: 'x402',
      verified: false,
      price_usdc: pricing.price_usdc,
      effort_tier: effortTier,
      max_description_chars: pricing.max_description_chars,
      max_response_chars: pricing.max_response_chars,
      error: verification.error,
    };
  }

  // If authenticated via API key, allow (metered billing)
  if (apiKeyId) {
    return {
      method: 'api_key',
      verified: true,
      price_usdc: pricing.price_usdc,
      effort_tier: effortTier,
      max_description_chars: pricing.max_description_chars,
      max_response_chars: pricing.max_response_chars,
    };
  }

  // No payment and no API key — return 402
  return {
    method: 'x402',
    verified: false,
    price_usdc: pricing.price_usdc,
    effort_tier: effortTier,
    max_description_chars: pricing.max_description_chars,
    max_response_chars: pricing.max_response_chars,
    response_402: build402Response(pricing, requestType),
  };
}
