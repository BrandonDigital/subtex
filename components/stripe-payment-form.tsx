"use client";

import { forwardRef, useImperativeHandle } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

export interface StripePaymentFormHandle {
  confirmPayment: (returnUrl: string) => Promise<{
    error?: { message?: string; type?: string };
  }>;
}

export const StripePaymentForm = forwardRef<StripePaymentFormHandle>(
  function StripePaymentForm(_props, ref) {
    const stripe = useStripe();
    const elements = useElements();

    useImperativeHandle(ref, () => ({
      async confirmPayment(returnUrl: string) {
        if (!stripe || !elements) {
          return {
            error: {
              message: "Payment system is still loading. Please wait.",
              type: "validation_error",
            },
          };
        }

        // Trigger form validation and wallet collection
        const { error: submitError } = await elements.submit();
        if (submitError) {
          return {
            error: {
              message: submitError.message,
              type: submitError.type,
            },
          };
        }

        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: returnUrl,
          },
        });

        // This point is only reached if there's an immediate error
        // (e.g. card declined). Otherwise, the customer is redirected.
        if (error) {
          return {
            error: {
              message: error.message,
              type: error.type,
            },
          };
        }

        return {};
      },
    }));

    return (
      <div className="space-y-4">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>
    );
  }
);
