# OpenTelemetry Collector Logs Exporter for web and node with HTTP

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides a logs-exporter for OTLP (http/json).

## Installation

```bash
npm install --save @askluna/exporter-logs-otlp-http-wintercg
```

## Use

```typescript
/**
 * Registers an OpenTelemetry logger with the specified parameters.
 * @param params - The parameters for registering the logger.
 * @param params.otelIdentifier - The identifier for the OpenTelemetry logger.
 * @param params.apiKey - The API key for authentication.
 * @param params.endpoint - The endpoint for sending logs.
 * @param reregister - Optional. Specifies whether to re-register the logger if it already exists. Default is false.
 * @returns A promise that resolves to a Result object containing the logger if successful, or an error if unsuccessful.
 */
export const registerOtelLogger = async (
  params: {
    otelIdentifier: CreateOtelLogProviderParams['otelIdentifier'];
    auth:
      | {
          kind: 'api-key';
          value: string;
        }
      | {
          kind: 'dns';
          value: string;
        };
    endpoint: string;
  },
  reregister: boolean = false
): Promise<Logger | null> => {
  const otelLogger: Logger | null = null;
  // make sure fetch is in the right state when using with https://github.com/evanderkoogh/otel-cf-workers
  // you may have to wait for the fetch proxy to be ready

  const logProvider = await createOtelLogProvider({
    otelIdentifier: params.otelIdentifier,
    exportOptions: {
      url: params.endpoint,
      headers: { [params.auth.kind]: params.auth.value },
      compression: 'gzip' as never,
      fetch: (input, init) => {
        return fetch(input, init);
      },
    },
  });

  if (logProvider) {
    otelLogger = createOtelLogger(logProvider, { name: params.otelIdentifier.name });
    return otelLogger;
  } else {
    otelLogger = null;
  }

  return otelLogger;
};
```

## Further Documentation

Please see **@opentelemetry/exporter-logs-otlp-http** for futher details. [Github link](https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/exporter-logs-otlp-http/README.md?plain=1)

This is a shim that works to make **@opentelemetry/exporter-logs-otlp-http compatible with**

## Environment Variable Configuration

In addition to settings passed to the constructor, the exporter also supports configuration via environment variables:

| Environment variable             | Description                                                                                                                                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OTEL_EXPORTER_OTLP_ENDPOINT      | The endpoint to send logs to. This will also be used for the traces exporter if `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` is not configured. By default `http://localhost:4318` will be used. `/v1/logs` will be automatically appended to configured values. |
| OTEL_EXPORTER_OTLP_LOGS_ENDPOINT | The endpoint to send logs to. By default `https://localhost:4318/v1/logs` will be used. `v1/logs` will not be appended automatically and has to be added explicitly.                                                                                     |
| OTEL_EXPORTER_OTLP_LOGS_TIMEOUT  | The maximum waiting time, in milliseconds, allowed to send each OTLP log batch. Default is 10000.                                                                                                                                                        |
| OTEL_EXPORTER_OTLP_TIMEOUT       | The maximum waiting time, in milliseconds, allowed to send each OTLP trace/metric/log batch. Default is 10000.                                                                                                                                           |

> Settings configured programmatically take precedence over environment variables. Per-signal environment variables take precedence over non-per-signal environment variables.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions](https://github.com/open-telemetry/opentelemetry-js/discussions)

## License

Apache 2.0 - See [LICENSE](https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE) for more information.
