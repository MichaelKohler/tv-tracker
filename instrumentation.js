const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { PrismaInstrumentation } = require("@prisma/instrumentation");
const { RemixInstrumentation } = require("opentelemetry-instrumentation-remix");

// This is needed because this file gets loaded through
// the NODE_OPTIONS, not remix itself.
require("dotenv").config();

// We are directly injecting the following environment variables
// through the hosting provider.
// Variables:
//   - OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
//   - OTEL_EXPORTER_OTLP_PROTOCOL
//   - OTEL_SERVICE_NAME
//   - OTEL_RESOURCE_ATTRIBUTES

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
    }),
    new PrismaInstrumentation(),
    new RemixInstrumentation(),
  ],
});

sdk.start();
