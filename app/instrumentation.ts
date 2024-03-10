import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { RemixInstrumentation } from "opentelemetry-instrumentation-remix";

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
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
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

export const init = () => sdk.start();
