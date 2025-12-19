"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Separator } from "@base-ui/react/separator";
import {
  button,
  pricingCard,
  pricingBadge,
  pricingPrice,
  pricingPeriod,
  pricingFeature,
  pricingFeatureIcon,
  billingToggleGroup,
  billingToggle,
  billingSavingsBadge,
} from "@/styles";

const plans = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For personal use and getting started",
    features: [
      { name: "Up to 3 calendar sources", included: true },
      { name: "Aggregate iCal feed", included: true },
      { name: "Push to external calendars", included: true },
      { name: "Email support", included: false },
      { name: "Priority sync (every 5 min)", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 8,
    yearlyPrice: 48,
    description: "For power users who need more",
    popular: true,
    features: [
      { name: "Unlimited calendar sources", included: true },
      { name: "Aggregate iCal feed", included: true },
      { name: "Push to external calendars", included: true },
      { name: "Priority email support", included: true },
      { name: "Priority sync (every 5 min)", included: true },
    ],
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

type BillingPeriod = "monthly" | "yearly";

export default function BillingPage() {
  const currentPlan = "free";
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const isYearly = billingPeriod === "yearly";

  return (
    <div className="flex-1 flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Subscription Plan
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your subscription and billing details
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ToggleGroup
            value={[billingPeriod]}
            onValueChange={(value) => {
              if (value.length > 0) {
                setBillingPeriod(value[0] as BillingPeriod);
              }
            }}
            className={billingToggleGroup()}
          >
            <Toggle value="monthly" className={billingToggle()}>
              Monthly
            </Toggle>
            <Toggle value="yearly" className={billingToggle()}>
              Yearly
              <span className={billingSavingsBadge()}>-50%</span>
            </Toggle>
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const period = isYearly ? "/year" : "/month";

            return (
              <div key={plan.id} className={pricingCard({ current: isCurrent, featured: plan.popular, muted: !plan.popular })}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <div className="flex gap-1.5">
                    {plan.popular && (
                      <span className={pricingBadge({ variant: "popular" })}>
                        Popular
                      </span>
                    )}
                    {isCurrent && (
                      <span className={pricingBadge({ variant: "current" })}>
                        Current
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <span className={pricingPrice()}>${price}</span>
                  <span className={pricingPeriod()}>{period}</span>
                </div>

                <p className="text-sm text-gray-500 mb-6">{plan.description}</p>

                <ul className="flex flex-col gap-3 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className={pricingFeature()}>
                      {feature.included ? (
                        <CheckIcon
                          className={pricingFeatureIcon({ included: true })}
                        />
                      ) : (
                        <XIcon
                          className={pricingFeatureIcon({ included: false })}
                        />
                      )}
                      <span
                        className={feature.included ? "" : "text-gray-400"}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button
                    className={button({ variant: "secondary" })}
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button className={button({ variant: "primary" })}>
                    Upgrade to {plan.name}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Separator className="bg-gray-200 h-px" />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Billing History
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            View your past invoices and payment history
          </p>
        </div>
        <div className="text-sm text-gray-500 py-4 border border-gray-200 rounded-lg text-center">
          No billing history yet
        </div>
      </section>
    </div>
  );
}
