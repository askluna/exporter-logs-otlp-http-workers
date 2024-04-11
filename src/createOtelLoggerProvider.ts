import { Resource } from '@opentelemetry/resources';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

import { type OTLPLogExporterConfigWinterCG } from '~~/OTLPLogExporterWinterCG';
import { OTLPLogExporterWinterCG } from '~~/OTLPLogExporterWinterCG';

export type CreateOtelLoggerProviderParams = {
	serviceIdentifier: {
		name: string;
		namespace: string;
	};
	exportOptions: OTLPLogExporterConfigWinterCG;
};

export const createOtelLoggerProvider = (params: CreateOtelLoggerProviderParams): LoggerProvider | null => {
	try {
		const resource = new Resource({
			[SemanticResourceAttributes.SERVICE_NAME]: params.serviceIdentifier.name,
			[SemanticResourceAttributes.SERVICE_NAMESPACE]: params.serviceIdentifier.namespace,
		});

		const collectorOptions = {
			...params.exportOptions,
		} satisfies OTLPLogExporterConfigWinterCG;

		const logExporter = new OTLPLogExporterWinterCG(collectorOptions);

		const loggerProvider = new LoggerProvider({
			resource: resource,
		});

		loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));

		return loggerProvider;
	} catch (cause) {
		console.error('Could not setup otel logging (otelSetupLogProvider) ', cause);
		return null;
	}
};
