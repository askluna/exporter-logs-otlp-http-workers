# OpenTelemetry Collector Logs Exporter for web and node with HTTP

This module provides a logs-exporter for OTLP (http/json).   This adds otel logs support for workers.  

## Installation

```bash
npm install -D @askluna/exporter-logs-otlp-http-workers
```

## Use

Below is an example use case of a logmanager for a custom logger.   You can also alternatively override console.log and call your own logger.  See otel nodejs libraries (perhaps autoinstrumentation) for different implementations.  

The implementation below allows for multiple loggers (aka you can log to multiple otel providers like newrelic, baselime etc at teh same time)

```typescript

type OtelLoggerResult = { success: true; logger: Logger } | { success: false; error: Error };
type OtelLoggerProviderResult = { success: true; provider: LoggerProvider } | { success: false; error: Error };

/**
 * Manager for OpenTelemetry loggers.
 */
export class OtelHttpLoggerManager {
	private registeredOtelLoggers: Map<string, OtelLoggerResult | null> = new Map();
	private registeredOtelLoggerProviders: Map<string, OtelLoggerProviderResult | null> = new Map();

	registerLoggers(params: HttpLoggersConfig, fetchHander: typeof fetch): OtelLoggerResult[] {
		const results = params.httpExportersConfig.map((httpExporterConfig) => {
			const param = { ...params, httpExporterConfig } satisfies SingleHttpLoggerConfig;
			return this.registerLogger(param, fetchHander, false);
		});

		return results;
	}

	loggerId(params: SingleHttpLoggerConfig): string {
		return `${params.httpExporterConfig.id}/${params.serviceIdentifier.name}-${params.serviceIdentifier.namespace}`;
	}

	registerLogger(
		params: SingleHttpLoggerConfig,
		fetchHander: typeof fetch,
		reregister: boolean = false
	): OtelLoggerResult {
		const loggerConfig = params.httpExporterConfig;
		const id = this.loggerId(params);

		try {
			const url = loggerConfig.httpOtlpEndpoint;

			const exportOptions = {
				url,
				headers: loggerConfig.headers,
				compression: 'gzip' as never,
				concurrencyLimit: params.concurrencyLimit ?? 1,
				fetchHandler: fetchHander,
			} satisfies OTLPLogExporterWorkersConfig;

			const currentLoggerResult = this.registeredOtelLoggers.get(id);
			if (currentLoggerResult?.success && !reregister) {
				return currentLoggerResult;
			}

			const logProvider = createOtelLoggerProvider({
				serviceIdentifier: params.serviceIdentifier,
				exportOptions,
			});

			if (logProvider) {
				const logger = createOtelLogger(logProvider, { name: 'askluna' });
				const loggerResult: OtelLoggerResult = { success: true, logger };
				this.registeredOtelLoggerProviders.set(id, { success: true, provider: logProvider });
				this.registeredOtelLoggers.set(id, loggerResult);
				return loggerResult;
			} else {
				throw new Error('Failed to setup OpenTelemetry log provider.');
			}
		} catch (error) {
			console.error(`Error registering logger ${id}: `, error);
			const errorResult: OtelLoggerResult = {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
			this.registeredOtelLoggers.set(id, errorResult);
			return errorResult;
		}
	}

	emitToLoggers(log: LogRecord): void {
		try {
			const span = traceApi().getActiveSpan();
			if (span && log.attributes && !log.attributes['traceId'] && !log.attributes['spanId']) {
				log.attributes['traceId'] = span.spanContext().traceId;
				log.attributes['spanId'] = span.spanContext().spanId;
			}
		} catch (cause) {
			/** do nothing */
		}

		this.registeredOtelLoggers.forEach((result) => {
			if (result?.success) {
				try {
					result.logger.emit(log as never);
				} catch (cause) {}
			}
		});
	}

	async flushLoggers(): Promise<void> {
		const promises = Array.from(this.registeredOtelLoggerProviders.entries()).map(async ([_id, result]) => {
			if (result?.success) {
				try {
					await sleep(0);
					await result.provider.forceFlush();
					await sleep(0);
				} catch (error) {
					console.error('Error during logger flush', error);
				}
			}
		});

		await Promise.allSettled(promises);
	}

	async shutdownLoggers(): Promise<void> {
		const promises = Array.from(this.registeredOtelLoggerProviders.entries()).map(async ([id, result]) => {
			if (result?.success) {
				try {
					await result.provider.shutdown();
					this.registeredOtelLoggerProviders.delete(id);
					this.registeredOtelLoggers.delete(id);
				} catch (error) {
					console.error('Error during logger shutdown', error);

					this.registeredOtelLoggerProviders.delete(id);
					this.registeredOtelLoggers.delete(id);
				}
			}
		});

		await Promise.allSettled(promises);
	}
}

/**
 * Singleton instance of the OtelLoggerManager.
 */
export const otelLoggerManager = new OtelHttpLoggerManager();

```

It is then used like this

```typescript
const appLogging = (entry: LogEntry, severityText: SeverityLevel, ...logArgs: any[]): void => {
	const HEADER = 'askluna';
	const log = makeLogEntry(entry, severityText, logArgs);
	otelLoggerManager.emitToLoggers(log);
};

```

You can probably also override `console.log`

### Notes

- `createOtelLoggerProvider` usess `SimpleLogRecordProcessor` to create a log provider

## Further Documentation

Please see **@opentelemetry/exporter-logs-otlp-http** for futher details. [Github link](https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/exporter-logs-otlp-http/README.md?plain=1)

This is a shim that works to make **@opentelemetry/exporter-logs-otlp-http compatible with**

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this otel, join in [GitHub Discussions](https://github.com/open-telemetry/opentelemetry-js/discussions)

## License

Apache 2.0 - See [LICENSE](https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE) for more information.
