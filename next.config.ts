import type { NextConfig } from "next";
import os from "os";

// Dynamically discover local network IPv4 addresses to allow local dev testing on mobile devices
function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Collect all external IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    ...getLocalIpAddresses(),
  ],
};

export default nextConfig;
