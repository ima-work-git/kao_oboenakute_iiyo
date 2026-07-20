export const CURRENT_POLICY_VERSION = "2026-07-21.2";

export type PolicyConsent = {
  policyVersion?: string;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  imageConsentAccepted?: boolean;
};

export function hasCurrentPolicyConsent(value: PolicyConsent | null | undefined) {
  return Boolean(
    value &&
    value.policyVersion === CURRENT_POLICY_VERSION &&
    value.termsAccepted &&
    value.privacyAccepted &&
    value.imageConsentAccepted
  );
}
