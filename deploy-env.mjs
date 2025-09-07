#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

// Read .env file
const envPath = join(process.cwd(), ".env");
let envContent = "";

try {
  envContent = readFileSync(envPath, "utf8");
} catch (error) {
  console.log("No .env file found, creating one...");
  // Create a template .env file
  const template = `# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PRICE_ID=price_your_stripe_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
CLIENT_URL=http://localhost:5173

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
`;

  try {
    const fs = await import("fs");
    fs.writeFileSync(envPath, template);
    console.log(
      "Created .env file with template. Please fill in your actual values.",
    );
    process.exit(0);
  } catch (writeError) {
    console.error("Failed to create .env file:", writeError);
    process.exit(1);
  }
}

// Parse .env file
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const [key, ...valueParts] = trimmed.split("=");
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join("=");
    }
  }
});

// Stripe environment variables to set
const stripeVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "CLIENT_URL",
];

console.log("Setting Convex environment variables from .env file...");

// Set each environment variable
for (const varName of stripeVars) {
  const value = envVars[varName];
  if (value && value !== `${varName.toLowerCase()}_here`) {
    try {
      console.log(`Setting ${varName}...`);
      execSync(`npx convex env set ${varName} "${value}"`, {
        stdio: "inherit",
      });
      console.log(`✅ Set ${varName}`);
    } catch (error) {
      console.error(`❌ Failed to set ${varName}:`, error.message);
    }
  } else {
    console.log(`⚠️  Skipping ${varName} - not set or using placeholder value`);
  }
}

console.log("\n🎉 Environment variables updated!");
console.log("\nTo deploy:");
console.log("  npm run build");
console.log("  npx convex deploy");
