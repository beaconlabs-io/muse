export const baseUrl =
  process.env.NEXT_PUBLIC_ENV === "production"
    ? "https://muse.beaconlabs.io"
    : "https://dev.muse.beaconlabs.io";
