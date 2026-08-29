export const COMPANY = {
  name: "CHAMUNDA ENTERPRISE",
  address:
    "526/A/2/1, Shed No E-130, Krish Industrial Park, Opp Hanumanji Mandir, Hathijan, Vatva Road, Vatva, Ahmedabad - 382445",
  gstin: "24DVJPM3750A1ZV",
  email: "sales.chamundaenterprise@gmail.com",
  bank: "BANK OF BARODA",
  branch: "SARANGPUR BRANCH",
  accNo: "70890200002014",
  ifsc: "BARB0DBSNPR",
};

export const TERMS = [
  "We do not hold responsible for any breakage/demage/shortage/leakage in transit.",
  "Our responsibility ceases when the goods are delivered to the carrier.",
  "Goods once sold will not be accepted back.",
  "Interest @ 24% p.a. will be charged. If invoice is not paid on or before due date.",
  "Subject to Ahmedabad Jurisdiction.",
];

export const PAYMENT_STATUSES = ["Pending", "Partial", "Paid"] as const;
export const DELIVERY_STATUSES = ["Pending", "Ready to Dispatch", "Delivered"] as const;
